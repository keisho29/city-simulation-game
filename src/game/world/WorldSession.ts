import {
  MS_PER_DAY_AT_SPEED_1,
  NEW_REGION_RESIDENT_COUNT,
  type GameSpeed,
} from '../constants.ts'
import { createCityEvent } from '../city/events.ts'
import type { Treasury } from '../economy/treasury.ts'
import { WorldMap } from '../map/WorldMap.ts'
import { createProgress, type ProgressState } from '../progress/progress.ts'
import { residentAge, residentName } from '../residents/names.ts'
import { createResident, type Resident } from '../residents/resident.ts'
import { ResidentSim } from '../residents/ResidentSim.ts'
import type { TransitStats } from '../transit/service.ts'
import { tickMigration } from './migration.ts'
import {
  REGION_IDS,
  REGIONS,
  RegionId,
  isRegionId,
  linkedRegions,
  regionUnlockView,
  type RegionId as RegionIdType,
} from './regions.ts'
import { extraSupplyFromLinks, tickInterRegionTrade, tradeHint, type TradeMoved } from './trade.ts'
import { TechId } from '../progress/tech.ts'

export type RegionSave = {
  id: RegionIdType
  unlocked: boolean
  tiles?: ReturnType<WorldMap['snapshotTiles']>
  residents?: Resident[]
  event?: ResidentSim['cityEvent']
  transit?: TransitStats
}

export type WorldSave = {
  active: RegionIdType
  regions: RegionSave[]
}

export type RegionRuntime = {
  id: RegionIdType
  unlocked: boolean
  map: WorldMap
  sim: ResidentSim | undefined
}

export class WorldSession {
  readonly progress: ProgressState
  activeId: RegionIdType
  readonly regions: RegionRuntime[]
  lastUnlocks: RegionIdType[] = []
  lastMoves: string[] = []
  lastTrade: TradeMoved = { food: 0, wood: 0, goods: 0 }
  private migrateHours = { hours: 0 }

  constructor(progress?: ProgressState, saved?: WorldSave) {
    this.progress = progress ?? createProgress()
    this.activeId = saved?.active && isRegionId(saved.active) ? saved.active : RegionId.Edo
    const savedRegions = new Map(
      (saved?.regions ?? [])
        .filter((entry) => isRegionId(entry.id))
        .map((entry) => [entry.id, entry]),
    )

    this.regions = REGION_IDS.map((id) => this.createRegion(id, savedRegions.get(id)))
    if (!this.region(this.activeId)?.unlocked) {
      this.activeId = RegionId.Edo
    }
  }

  get active(): RegionRuntime {
    return this.region(this.activeId) ?? this.regions[0]!
  }

  region(id: RegionIdType): RegionRuntime | undefined {
    return this.regions.find((entry) => entry.id === id)
  }

  switchTo(id: RegionIdType): boolean {
    const next = this.region(id)
    if (!next?.unlocked || !next.sim) {
      return false
    }
    this.activeId = id
    return true
  }

  tick(
    deltaMs: number,
    speed: GameSpeed,
    hour: number,
    isHoliday: boolean,
    treasury?: Treasury,
  ): void {
    for (const region of this.regions) {
      if (!region.unlocked || !region.sim) {
        continue
      }
      region.sim.update(deltaMs, speed, hour, isHoliday, treasury, region.id === this.activeId)
    }

    this.lastUnlocks = this.tryUnlock()
    if (speed === 0 || deltaMs <= 0) {
      return
    }

    const gameHours = ((deltaMs * speed) / MS_PER_DAY_AT_SPEED_1) * 24
    this.lastTrade = tickInterRegionTrade(this.mapTable(), this.unlockedSet(), gameHours, treasury)
    this.lastMoves = tickMigration(
      this.mapTable(),
      this.peopleTable(),
      this.unlockedSet(),
      gameHours,
      this.migrateHours,
    )
    if (this.lastMoves.length > 0) {
      for (const region of this.regions) {
        region.sim?.refreshHousing()
        region.sim?.refreshJobs()
      }
    }
  }

  tryUnlock(): RegionIdType[] {
    const maps = this.mapTable()
    const people = this.peopleTable()
    const gained: RegionIdType[] = []
    for (const region of this.regions) {
      if (region.unlocked) {
        continue
      }
      const view = regionUnlockView(region.id, this.progress, maps, people)
      if (!view.ready) {
        continue
      }
      this.unlockRegion(region)
      gained.push(region.id)
    }
    return gained
  }

  takeDiscoveries(): TechId[] {
    const gained = new Set<TechId>()
    for (const region of this.regions) {
      for (const id of region.sim?.lastDiscoveries ?? []) {
        gained.add(id)
      }
      if (region.sim) {
        region.sim.lastDiscoveries = []
      }
    }
    return [...gained]
  }

  snapshot(): WorldSave {
    return {
      active: this.activeId,
      regions: this.regions.map((region) => ({
        id: region.id,
        unlocked: region.unlocked,
        tiles: region.unlocked ? region.map.snapshotTiles() : undefined,
        residents: region.sim?.residents,
        event: region.sim?.cityEvent,
        transit: region.sim?.transit.stats,
      })),
    }
  }

  supplyFor(id: RegionIdType) {
    return extraSupplyFromLinks(id, this.mapTable(), this.unlockedSet())
  }

  tradeHintFor(id: RegionIdType) {
    return tradeHint(id, this.mapTable(), this.unlockedSet())
  }

  linksFor(id: RegionIdType) {
    return linkedRegions(id, this.mapTable(), this.unlockedSet())
  }

  private unlockRegion(region: RegionRuntime): void {
    const def = REGIONS[region.id]
    region.map.generateLandscape(def.seed, def.landscape)
    region.unlocked = true
    region.sim = this.makeSim(
      region.id,
      region.map,
      starterResidents(region.id, region.map, NEW_REGION_RESIDENT_COUNT),
    )
  }

  private createRegion(id: RegionIdType, saved?: RegionSave): RegionRuntime {
    const def = REGIONS[id]
    const map = new WorldMap()
    const unlocked = id === RegionId.Edo || Boolean(saved?.unlocked)
    if (saved?.tiles && saved.tiles.length === map.tileCount) {
      map.restoreTiles(saved.tiles)
    } else if (unlocked) {
      map.generateLandscape(id === RegionId.Edo ? undefined : def.seed, def.landscape)
    }

    const sim = unlocked
      ? this.makeSim(id, map, saved?.residents, saved?.event, saved?.transit)
      : undefined
    return { id, unlocked, map, sim }
  }

  private makeSim(
    id: RegionIdType,
    map: WorldMap,
    residents?: Resident[],
    event?: ResidentSim['cityEvent'],
    transit?: TransitStats,
  ): ResidentSim {
    const sim = new ResidentSim(map, residents, event ?? createCityEvent(), this.progress, transit)
    const def = REGIONS[id]
    sim.climateHarvest = def.harvest
    sim.climateWood = def.wood
    return sim
  }

  private mapTable(): Map<RegionIdType, WorldMap> {
    return new Map(
      this.regions.filter((region) => region.unlocked).map((region) => [region.id, region.map]),
    )
  }

  private peopleTable(): Map<RegionIdType, Resident[]> {
    return new Map(
      this.regions
        .filter((region) => region.sim)
        .map((region) => [region.id, region.sim!.residents]),
    )
  }

  private unlockedSet(): Set<RegionIdType> {
    return new Set(this.regions.filter((region) => region.unlocked).map((region) => region.id))
  }
}

function starterResidents(id: RegionIdType, map: WorldMap, count: number): Resident[] {
  const spawn = map.tileCenter(Math.floor(map.width / 2), Math.floor(map.height / 2))
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2
    return createResident({
      id: `resident-${id}-${index + 1}`,
      name: residentName(index + 40),
      age: residentAge(index + 3),
      worldX: spawn.x + Math.cos(angle) * map.tileSize,
      worldY: spawn.y + Math.sin(angle) * map.tileSize,
    })
  })
}
