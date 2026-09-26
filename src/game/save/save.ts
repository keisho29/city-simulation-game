import { GameSpeed } from '../constants.ts'
import {
  CityEventKind,
  createCityEvent,
  type CityEventState,
} from '../city/events.ts'
import { StockKind, type StockKind as StockKindType } from '../economy/goods.ts'
import type { Tile } from '../map/tile.ts'
import { Terrain, TileType } from '../map/tile.ts'
import { createResident, ResidentState, type Resident, type TileRef } from '../residents/resident.ts'
import { parseProgress, type ProgressState } from '../progress/progress.ts'
import type { TransitStats } from '../transit/service.ts'
import { parseWorldEvent } from '../world/events.ts'
import { parseHistory } from '../world/history.ts'
import { parseProsperity } from '../world/fortune.ts'
import { RegionId, isRegionId } from '../world/regions.ts'
import type { WorldSave } from '../world/WorldSession.ts'

export const SAVE_VERSION = 1
export const SAVE_STORAGE_KEY = 'city-simulation-game.save'

export type SaveSnapshot = {
  version: number
  year: number
  month: number
  day: number
  elapsedMs: number
  speed: GameSpeed
  funds: number
  mapWidth: number
  mapHeight: number
  tiles: Tile[]
  residents: Resident[]
  event: CityEventState
  progress: ProgressState
  transit: TransitStats
  world: WorldSave
}

const TILE_TYPES = new Set<string>(Object.values(TileType))
const TERRAIN_TYPES = new Set<string>(Object.values(Terrain))
const RESIDENT_STATES = new Set<string>(Object.values(ResidentState))
const GAME_SPEEDS = new Set<number>(Object.values(GameSpeed))
const CITY_EVENTS = new Set<string>(Object.values(CityEventKind))
const STOCK_KINDS = new Set<string>(Object.values(StockKind))

export function parseSnapshot(raw: unknown): SaveSnapshot | undefined {
  if (!isRecord(raw) || raw.version !== SAVE_VERSION) {
    return undefined
  }

  if (
    !isFiniteNumber(raw.year) ||
    !isFiniteNumber(raw.month) ||
    !isFiniteNumber(raw.day) ||
    !isFiniteNumber(raw.elapsedMs) ||
    !isFiniteNumber(raw.funds) ||
    !isFiniteNumber(raw.mapWidth) ||
    !isFiniteNumber(raw.mapHeight) ||
    !GAME_SPEEDS.has(raw.speed as number) ||
    !Array.isArray(raw.tiles) ||
    !Array.isArray(raw.residents)
  ) {
    return undefined
  }

  if (raw.tiles.length !== raw.mapWidth * raw.mapHeight) {
    return undefined
  }

  const tiles: Tile[] = []
  for (const tile of raw.tiles) {
    const parsed = parseTile(tile)
    if (!parsed) {
      return undefined
    }
    tiles.push(parsed)
  }

  const residents: Resident[] = []
  for (const resident of raw.residents) {
    const parsed = parseResident(resident)
    if (!parsed) {
      return undefined
    }
    residents.push(parsed)
  }

  return {
    version: SAVE_VERSION,
    year: raw.year,
    month: raw.month,
    day: raw.day,
    elapsedMs: Math.max(0, raw.elapsedMs),
    speed: raw.speed as GameSpeed,
    funds: raw.funds,
    mapWidth: raw.mapWidth,
    mapHeight: raw.mapHeight,
    tiles,
    residents,
    event: parseEvent(raw.event),
    progress: parseProgress(raw.progress),
    transit: parseTransit(raw.transit),
    world: parseWorld(raw.world, {
      tiles,
      residents,
      event: parseEvent(raw.event),
      transit: parseTransit(raw.transit),
    }),
  }
}

export function peekSaveLabel(storage: Pick<Storage, 'getItem'>): string | undefined {
  const snapshot = loadSnapshot(storage)
  if (!snapshot) {
    return undefined
  }
  return `${snapshot.year}年${snapshot.month}月${snapshot.day}日`
}

export function loadSnapshot(storage: Pick<Storage, 'getItem'>): SaveSnapshot | undefined {
  try {
    const raw = storage.getItem(SAVE_STORAGE_KEY)
    if (!raw) {
      return undefined
    }
    return parseSnapshot(JSON.parse(raw) as unknown)
  } catch {
    return undefined
  }
}

export function writeSnapshot(
  storage: Pick<Storage, 'setItem'>,
  snapshot: SaveSnapshot,
): boolean {
  try {
    storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(snapshot))
    return true
  } catch {
    return false
  }
}

export function clearSnapshot(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(SAVE_STORAGE_KEY)
}

function parseTile(raw: unknown): Tile | undefined {
  if (!isRecord(raw) || !TILE_TYPES.has(raw.type as string) || !Array.isArray(raw.occupantIds)) {
    return undefined
  }

  const occupantIds = raw.occupantIds.filter((id): id is string => typeof id === 'string')
  const type = raw.type as Tile['type']
  const level = isFiniteNumber(raw.level) ? Math.max(1, Math.min(3, Math.floor(raw.level))) : 1
  const xp = isFiniteNumber(raw.xp) ? Math.max(0, raw.xp) : 0
  const variant = isFiniteNumber(raw.variant) ? Math.max(0, Math.floor(raw.variant) % 3) : 0
  const terrain = TERRAIN_TYPES.has(raw.terrain as string) ? (raw.terrain as Tile['terrain']) : Terrain.Grass
  return {
    type,
    terrain,
    occupantIds,
    level,
    xp,
    variant,
    food: isFiniteNumber(raw.food) ? Math.max(0, raw.food) : 0,
    wood: isFiniteNumber(raw.wood) ? Math.max(0, raw.wood) : 0,
    goods: isFiniteNumber(raw.goods) ? Math.max(0, raw.goods) : 0,
    anchor: parseTileRef(raw.anchor),
  }
}

function parseResident(raw: unknown): Resident | undefined {
  if (
    !isRecord(raw) ||
    typeof raw.id !== 'string' ||
    typeof raw.name !== 'string' ||
    !isFiniteNumber(raw.age) ||
    !isFiniteNumber(raw.happiness) ||
    !isFiniteNumber(raw.worldX) ||
    !isFiniteNumber(raw.worldY) ||
    !RESIDENT_STATES.has(raw.state as string)
  ) {
    return undefined
  }

  const ridePath = parseRidePath(raw.ridePath)
  const rideKind = raw.rideKind === 'rail' || raw.rideKind === 'water' ? raw.rideKind : undefined
  let state = raw.state as ResidentState
  if (state === ResidentState.Riding && (!ridePath || ridePath.length < 2)) {
    state = parseTileRef(raw.home) ? ResidentState.MovingToHome : ResidentState.SeekingHome
  }

  return createResident({
    gender:
      raw.gender === 'female' || raw.gender === 'male'
        ? raw.gender
        : undefined,
    home: parseTileRef(raw.home),
    workplace: parseTileRef(raw.workplace),
    shopTarget: parseTileRef(raw.shopTarget),
    strollTarget: parseTileRef(raw.strollTarget),
    talkWith: typeof raw.talkWith === 'string' ? raw.talkWith : undefined,
    activityHours: isFiniteNumber(raw.activityHours) ? Math.max(0, raw.activityHours) : undefined,
    haulKind: STOCK_KINDS.has(raw.haulKind as string)
      ? (raw.haulKind as StockKindType)
      : undefined,
    haulAmount: isFiniteNumber(raw.haulAmount) ? Math.max(0, raw.haulAmount) : undefined,
    haulPickup: parseTileRef(raw.haulPickup),
    haulDrop: parseTileRef(raw.haulDrop),
    rideKind,
    ridePath,
    rideIndex: isFiniteNumber(raw.rideIndex) ? Math.max(0, Math.floor(raw.rideIndex)) : undefined,
    rideDest: parseTileRef(raw.rideDest),
    rideArrive:
      typeof raw.rideArrive === 'string' && RESIDENT_STATES.has(raw.rideArrive)
        ? (raw.rideArrive as ResidentState)
        : undefined,
    happiness: raw.happiness,
    hunger: isFiniteNumber(raw.hunger) ? Math.max(0, Math.min(100, raw.hunger)) : undefined,
    money: isFiniteNumber(raw.money) ? Math.max(0, raw.money) : undefined,
    state,
    worldX: raw.worldX,
    worldY: raw.worldY,
  })
}

function parseRidePath(raw: unknown): TileRef[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined
  }
  const path: TileRef[] = []
  for (const entry of raw) {
    const ref = parseTileRef(entry)
    if (!ref) {
      return undefined
    }
    path.push(ref)
  }
  return path.length > 0 ? path : undefined
}

function parseTransit(raw: unknown): TransitStats {
  if (!isRecord(raw)) {
    return { riders: 0, fares: 0, freight: 0 }
  }
  return {
    riders: isFiniteNumber(raw.riders) ? Math.max(0, raw.riders) : 0,
    fares: isFiniteNumber(raw.fares) ? Math.max(0, raw.fares) : 0,
    freight: isFiniteNumber(raw.freight) ? Math.max(0, raw.freight) : 0,
  }
}

function parseWorld(
  raw: unknown,
  edo: {
    tiles: Tile[]
    residents: Resident[]
    event: CityEventState
    transit: TransitStats
  },
): WorldSave {
  if (!isRecord(raw) || !Array.isArray(raw.regions)) {
    return {
      active: RegionId.Edo,
      regions: [
        {
          id: RegionId.Edo,
          unlocked: true,
          tiles: edo.tiles,
          residents: edo.residents,
          event: edo.event,
          transit: edo.transit,
          fortune: parseProsperity(undefined),
        },
      ],
      worldEvent: parseWorldEvent(undefined),
      history: [],
      spreads: [],
    }
  }

  const regions = []
  for (const entry of raw.regions) {
    if (!isRecord(entry) || !isRegionId(entry.id)) {
      continue
    }
    const tiles = Array.isArray(entry.tiles)
      ? entry.tiles.map((tile) => parseTile(tile)).filter((tile): tile is Tile => Boolean(tile))
      : undefined
    const residents = Array.isArray(entry.residents)
      ? entry.residents
          .map((resident) => parseResident(resident))
          .filter((resident): resident is Resident => Boolean(resident))
      : undefined
    regions.push({
      id: entry.id,
      unlocked: Boolean(entry.unlocked),
      tiles: tiles && tiles.length > 0 ? tiles : undefined,
      residents,
      event: parseEvent(entry.event),
      transit: parseTransit(entry.transit),
      fortune: parseProsperity(entry.fortune),
    })
  }

  if (!regions.some((region) => region.id === RegionId.Edo)) {
    regions.unshift({
      id: RegionId.Edo,
      unlocked: true,
      tiles: edo.tiles,
      residents: edo.residents,
      event: edo.event,
      transit: edo.transit,
    })
  }

  const active = isRegionId(raw.active) ? raw.active : RegionId.Edo
  return {
    active,
    regions,
    worldEvent: parseWorldEvent(raw.worldEvent),
    history: parseHistory(raw.history),
    spreads: Array.isArray(raw.spreads) ? raw.spreads : [],
  }
}

function parseEvent(raw: unknown): CityEventState {
  if (
    isRecord(raw) &&
    CITY_EVENTS.has(raw.kind as string) &&
    isFiniteNumber(raw.remainingHours) &&
    isFiniteNumber(raw.cooldownHours)
  ) {
    return {
      kind: raw.kind as CityEventKind,
      remainingHours: Math.max(0, raw.remainingHours),
      cooldownHours: Math.max(0, raw.cooldownHours),
    }
  }

  return createCityEvent()
}

function parseTileRef(raw: unknown): TileRef | undefined {
  if (raw === null || raw === undefined) {
    return undefined
  }

  if (!isRecord(raw) || !isFiniteNumber(raw.x) || !isFiniteNumber(raw.y)) {
    return undefined
  }

  return { x: raw.x, y: raw.y }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
