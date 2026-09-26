import {
  INACTIVE_TICK_BATCH,
  MS_PER_DAY_AT_SPEED_1,
  PROSPERITY_START,
  TECH_SPREAD_HOURS,
  type GameSpeed,
} from '../constants.ts'
import { createCityEvent } from '../city/events.ts'
import type { Treasury } from '../economy/treasury.ts'
import { WorldMap } from '../map/WorldMap.ts'
import { createProgress, type ProgressState } from '../progress/progress.ts'
import { isTechId, techName, TechId } from '../progress/tech.ts'
import type { Resident } from '../residents/resident.ts'
import { ResidentSim } from '../residents/ResidentSim.ts'
import type { TransitStats } from '../transit/service.ts'
import {
  parseWorldEvent,
  tickWorldEvents,
  worldEventName,
  worldGoodsMult,
  worldHappinessDelta,
  worldHarvestMult,
  type WorldEventState,
} from './events.ts'
import { parseProsperity, tickProsperity } from './fortune.ts'
import { parseHistory, pushHistory, type HistoryEntry } from './history.ts'
import {
  CountryId,
  JAPAN_REGION_IDS,
  OVERSEAS_REGION_IDS,
  REGION_IDS,
  REGIONS,
  RegionId,
  isRegionId,
  linkedRegions,
  regionName,
  type RegionId as RegionIdType,
} from './regions.ts'
import { extraSupplyFromLinks, tradeHint, type TradeMoved } from './trade.ts'

type TechSpread = {
  id: TechId
  remainingHours: number
}

export type RegionSave = {
  id: RegionIdType
  unlocked: boolean
  tiles?: ReturnType<WorldMap['snapshotTiles']>
  residents?: Resident[]
  event?: ResidentSim['cityEvent']
  transit?: TransitStats
  fortune?: number
}

export type WorldSave = {
  active: RegionIdType
  regions: RegionSave[]
  worldEvent?: WorldEventState
  history?: HistoryEntry[]
  spreads?: TechSpread[]
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
  worldEvent: WorldEventState
  history: HistoryEntry[]
  lastUnlocks: RegionIdType[] = []
  lastMoves: string[] = []
  lastNews: string[] = []
  lastTrade: TradeMoved = { food: 0, wood: 0, goods: 0 }
  private spreads: TechSpread[] = []
  private inactiveCursor = 0

  constructor(progress?: ProgressState, saved?: WorldSave) {
    this.progress = progress ?? createProgress()
    this.activeId = RegionId.Edo
    this.worldEvent = parseWorldEvent(saved?.worldEvent)
    this.history = parseHistory(saved?.history)
    this.spreads = parseSpreads(saved?.spreads)
    const savedRegions = new Map(
      (saved?.regions ?? [])
        .filter((entry) => isRegionId(entry.id))
        .map((entry) => [entry.id, entry]),
    )

    this.regions = REGION_IDS.map((id) => this.createRegion(id, savedRegions.get(id)))
    if (!this.region(this.activeId)?.unlocked) {
      this.activeId = RegionId.Edo
    }
    this.applyWorldEffects()
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
    clock?: { year: number; month: number },
  ): void {
    this.applyWorldEffects()
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

    this.lastUnlocks = []
    this.lastTrade = { food: 0, wood: 0, goods: 0 }
    this.lastMoves = []
    if (speed === 0 || deltaMs <= 0) {
      return
    }

    const gameHours = ((deltaMs * speed) / MS_PER_DAY_AT_SPEED_1) * 24
    const year = clock?.year ?? 1700
    const month = clock?.month ?? 1
    this.tickWorldPulse(gameHours, year, month)
  }

  recordHistory(year: number, month: number, text: string): void {
    pushHistory(this.history, year, month, text)
  }

  tryUnlock(): RegionIdType[] {
    return []
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
      worldEvent: this.worldEvent,
      history: this.history,
      spreads: this.spreads,
      regions: this.regions.map((region) => ({
        id: region.id,
        unlocked: region.unlocked,
        tiles: region.unlocked && region.map ? region.map.snapshotTiles() : undefined,
        residents: region.sim?.residents,
        event: region.sim?.cityEvent,
        transit: region.sim?.transit.stats,
        fortune: region.sim?.fortune,
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

  private createRegion(id: RegionIdType, saved?: RegionSave): RegionRuntime {
    const unlocked = id === RegionId.Edo
    if (!unlocked) {
      return { id, unlocked: false, map: undefined, sim: undefined, pendingMs: 0 }
    }

    const def = REGIONS[id]
    const map = new WorldMap()
    if (saved?.tiles && saved.tiles.length === map.tileCount) {
      map.restoreTiles(saved.tiles)
    } else {
      map.generateLandscape(def.seed, def.landscape)
    }
    return {
      id,
      unlocked: true,
      map,
      sim: this.makeSim(id, map, saved?.residents, saved?.event, saved?.transit, saved?.fortune),
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
    fortune?: number,
  ): ResidentSim {
    const sim = new ResidentSim(map, residents, event ?? createCityEvent(), this.progress, transit)
    if (residents) {
      for (const resident of sim.residents) {
        map.alignToIso(resident)
      }
    }
    const def = REGIONS[id]
    sim.climateHarvest = def.harvest
    sim.climateWood = def.wood
    sim.fortune = parseProsperity(fortune ?? PROSPERITY_START)
    return sim
  }

  private applyWorldEffects(): void {
    const harvest = worldHarvestMult(this.worldEvent)
    const goods = worldGoodsMult(this.worldEvent)
    const mood = worldHappinessDelta(this.worldEvent)
    for (const region of this.regions) {
      if (!region.sim) {
        continue
      }
      region.sim.worldHarvest = harvest
      region.sim.goodsMult = goods
      region.sim.worldMood = mood
    }
  }

  private tickWorldPulse(gameHours: number, year: number, month: number): void {
    this.lastNews = []
    const previous = this.worldEvent.kind
    this.worldEvent = tickWorldEvents(this.worldEvent, gameHours, this.progress.era)
    if (this.worldEvent.kind !== previous && this.worldEvent.kind !== 'none') {
      const text = `世界で${worldEventName(this.worldEvent)}が起きた`
      this.recordHistory(year, month, text)
      this.lastNews.push(text)
    }

    for (const region of this.regions) {
      if (!region.unlocked || !region.sim || !region.map) {
        continue
      }
      region.sim.fortune = tickProsperity(
        region.sim.fortune,
        region.map,
        region.sim.residents,
        this.worldEvent,
        gameHours,
      )
      for (const note of region.sim.lastOutflow) {
        const text = `${regionName(region.id)}：${note}`
        this.recordHistory(year, month, text)
        this.lastNews.push(text)
      }
      region.sim.lastOutflow = []
      for (const id of region.sim.lastDiscoveries) {
        if (!this.spreads.some((spread) => spread.id === id)) {
          this.spreads.push({ id, remainingHours: TECH_SPREAD_HOURS })
        }
      }
    }

    const remaining: TechSpread[] = []
    for (const spread of this.spreads) {
      const hours = spread.remainingHours - gameHours
      if (hours <= 0) {
        const text = `${techName(spread.id)}が各地へ伝わった`
        this.recordHistory(year, month, text)
        this.lastNews.push(text)
      } else {
        remaining.push({ id: spread.id, remainingHours: hours })
      }
    }
    this.spreads = remaining

    for (const id of this.lastUnlocks) {
      const text = `${regionName(id)}が開かれた`
      this.recordHistory(year, month, text)
    }
  }

  private mapTable(): Map<RegionIdType, WorldMap> {
    return new Map(
      this.regions
        .filter((region) => region.unlocked && region.map)
        .map((region) => [region.id, region.map!]),
    )
  }

  private unlockedSet(): Set<RegionIdType> {
    return new Set(this.regions.filter((region) => region.unlocked).map((region) => region.id))
  }
}

function parseSpreads(raw: unknown): TechSpread[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const spreads: TechSpread[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue
    }
    const record = entry as Record<string, unknown>
    if (!isTechId(record.id) || typeof record.remainingHours !== 'number' || !Number.isFinite(record.remainingHours)) {
      continue
    }
    spreads.push({
      id: record.id,
      remainingHours: Math.max(0, record.remainingHours),
    })
  }
  return spreads
}
