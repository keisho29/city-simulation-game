import { GameSpeed } from '../constants.ts'
import type { Tile } from '../map/tile.ts'
import { TileType } from '../map/tile.ts'
import { createResident, ResidentState, type Resident, type TileRef } from '../residents/resident.ts'

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
}

const TILE_TYPES = new Set<string>(Object.values(TileType))
const RESIDENT_STATES = new Set<string>(Object.values(ResidentState))
const GAME_SPEEDS = new Set<number>(Object.values(GameSpeed))

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
  }
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

function parseTile(raw: unknown): Tile | undefined {
  if (!isRecord(raw) || !TILE_TYPES.has(raw.type as string) || !Array.isArray(raw.occupantIds)) {
    return undefined
  }

  const occupantIds = raw.occupantIds.filter((id): id is string => typeof id === 'string')
  return {
    type: raw.type as Tile['type'],
    occupantIds,
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

  return createResident({
    id: raw.id,
    name: raw.name,
    age: raw.age,
    home: parseTileRef(raw.home),
    workplace: parseTileRef(raw.workplace),
    shopTarget: parseTileRef(raw.shopTarget),
    happiness: raw.happiness,
    hunger: isFiniteNumber(raw.hunger) ? Math.max(0, Math.min(100, raw.hunger)) : undefined,
    money: isFiniteNumber(raw.money) ? Math.max(0, raw.money) : undefined,
    state: raw.state as ResidentState,
    worldX: raw.worldX,
    worldY: raw.worldY,
  })
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
