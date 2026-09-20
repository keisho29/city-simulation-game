import {
  INACTIVE_TICK_BATCH,
  MS_PER_DAY_AT_SPEED_1,
  NEW_REGION_RESIDENT_COUNT,
  type GameSpeed,
} from '../constants.ts'
import { createCityEvent } from '../city/events.ts'
import type { Treasury } from '../economy/treasury.ts'
import { WorldMap } from '../map/WorldMap.ts'
import { createProgress, type ProgressState } from '../progress/progress.ts'
import { TechId } from '../progress/tech.ts'
import { residentAge, residentName } from '../residents/names.ts'
import { createResident, type Resident } from '../residents/resident.ts'
import { ResidentSim } from '../residents/ResidentSim.ts'
import type { TransitStats } from '../transit/service.ts'
import { tickMigration } from './migration.ts'
import {
  CountryId,
  JAPAN_REGION_IDS,
  OVERSEAS_REGION_IDS,
  REGION_IDS,
  REGIONS,
  RegionId,
  isRegionId,
  linkedRegions,
  regionUnlockView,
  type RegionId as RegionIdType,
} from './regions.ts'
import { extraSupplyFromLinks, tickInterRegionTrade, tradeHint, type TradeMoved } from './trade.ts'

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
  map: WorldMap | undefined
  sim: ResidentSim | undefined
  pendingMs: number
}

export type WorldCensus = {
  unlocked: number
  total: number
  japanUnlocked: number
  japanTotal: number
  overseasUnlocked: number
  overseasTotal: number
  countries: number
  population: number
  japanPopulation: number
  overseasPopulation: number
}

export class WorldSession {
  readonly progress: ProgressState
  activeId: RegionIdType
  readonly regions: RegionRuntime[]
  lastUnlocks: RegionIdType[] = []
  lastMoves: string[] = []
  lastTrade: TradeMoved = { food: 0, wood: 0, goods: 0 }
  private migrateHours = { hours: 0 }
  private inactiveCursor = 0

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

  get active(): RegionRuntime & { map: WorldMap; sim: ResidentSim } {
    const region = this.region(this.activeId) ?? this.regions[0]!
    this.materialize(region)
    return region as RegionRuntime & { map: WorldMap; sim: ResidentSim }
  }

  region(id: RegionIdType): RegionRuntime | undefined {
    return this.regions.find((entry) => entry.id === id)
  }

  switchTo(id: RegionIdType): boolean {
    const next = this.region(id)
    if (!next?.unlocked) {
      return false
    }
    this.materialize(next)
    if (!next.sim) {
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
    const inactive: RegionRuntime[] = []
    for (const region of this.regions) {
      if (!region.unlocked || !region.sim) {
        continue
      }
      if (region.id === this.activeId) {
        region.pendingMs = 0
        region.sim.update(deltaMs, speed, hour, isHoliday, treasury, true)
        continue
      }
      region.pendingMs += deltaMs
      inactive.push(region)
    }

    if (inactive.length > 0) {
      const batch = Math.min(INACTIVE_TICK_BATCH, inactive.length)
      for (let i = 0; i < batch; i += 1) {
        const region = inactive[(this.inactiveCursor + i) % inactive.length]
        if (!region?.sim || region.pendingMs <= 0) {
          continue
        }
        region.sim.update(region.pendingMs, speed, hour, isHoliday, treasury, false)
        region.pendingMs = 0
      }
      this.inactiveCursor = (this.inactiveCursor + batch) % inactive.length
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
        tiles: region.unlocked && region.map ? region.map.snapshotTiles() : undefined,
        residents: region.sim?.residents,
        event: region.sim?.cityEvent,
        transit: region.sim?.transit.stats,
      })),
    }
  }

  census(): WorldCensus {
    let population = 0
    let japanPopulation = 0
    let overseasPopulation = 0
    const countries = new Set<string>()
    let unlocked = 0
    let japanUnlocked = 0
    let overseasUnlocked = 0
    for (const region of this.regions) {
      if (!region.unlocked) {
        continue
      }
      unlocked += 1
      const def = REGIONS[region.id]
      countries.add(def.country)
      const count = region.sim?.residents.length ?? 0
      population += count
      if (def.country === CountryId.Japan) {
        japanUnlocked += 1
        japanPopulation += count
      } else {
        overseasUnlocked += 1
        overseasPopulation += count
      }
    }
    return {
      unlocked,
      total: REGION_IDS.length,
      japanUnlocked,
      japanTotal: JAPAN_REGION_IDS.length,
      overseasUnlocked,
      overseasTotal: OVERSEAS_REGION_IDS.length,
      countries: countries.size,
      population,
      japanPopulation,
      overseasPopulation,
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

  mapOf(id: RegionIdType): WorldMap | undefined {
    const region = this.region(id)
    if (!region) {
      return undefined
    }
    if (!region.map) {
      region.map = new WorldMap()
    }
    return region.map
  }

  private unlockRegion(region: RegionRuntime): void {
    const def = REGIONS[region.id]
    const map = this.ensureMap(region)
    map.generateLandscape(def.seed, def.landscape)
    region.unlocked = true
    region.sim = this.makeSim(
      region.id,
      map,
      starterResidents(region.id, map, NEW_REGION_RESIDENT_COUNT),
    )
  }

  private createRegion(id: RegionIdType, saved?: RegionSave): RegionRuntime {
    const unlocked = id === RegionId.Edo || Boolean(saved?.unlocked)
    if (!unlocked) {
      return { id, unlocked: false, map: undefined, sim: undefined, pendingMs: 0 }
    }

    const def = REGIONS[id]
    const map = new WorldMap()
    if (saved?.tiles && saved.tiles.length === map.tileCount) {
      map.restoreTiles(saved.tiles)
    } else {
      map.generateLandscape(id === RegionId.Edo ? undefined : def.seed, def.landscape)
    }
    return {
      id,
      unlocked: true,
      map,
      sim: this.makeSim(id, map, saved?.residents, saved?.event, saved?.transit),
      pendingMs: 0,
    }
  }

  private materialize(region: RegionRuntime): void {
    const map = this.ensureMap(region)
    if (!region.sim) {
      region.sim = this.makeSim(region.id, map)
    }
    region.unlocked = true
  }

  private ensureMap(region: RegionRuntime): WorldMap {
    if (!region.map) {
      region.map = new WorldMap()
    }
    return region.map
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
      this.regions
        .filter((region) => region.unlocked && region.map)
        .map((region) => [region.id, region.map!]),
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
