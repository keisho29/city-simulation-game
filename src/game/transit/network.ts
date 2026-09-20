import {
  RAIL_SPEED_MULT,
  ROAD_SPEED_MULT,
  TRANSIT_WALK_MAX,
  WALK_SPEED_MULT,
  WATER_SPEED_MULT,
} from '../constants.ts'
import { isTrackType, isWaterTerrain, Terrain, TileType } from '../map/tile.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import type { TileRef } from '../residents/resident.ts'

export const TransitMode = {
  Walk: 'walk',
  Road: 'road',
  Rail: 'rail',
  Water: 'water',
} as const

export type TransitMode = (typeof TransitMode)[keyof typeof TransitMode]

export type TransitPlan =
  | { mode: 'walk' }
  | { mode: 'rail' | 'water'; board: TileRef; alight: TileRef; path: TileRef[] }

const DIRS: Array<[number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]

export function manhattan(a: TileRef, b: TileRef): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

export function sameTile(a: TileRef, b: TileRef): boolean {
  return a.x === b.x && a.y === b.y
}

export function tilesOfType(map: WorldMap, type: TileType): TileRef[] {
  const tiles: TileRef[] = []
  map.forEachTile((x, y, tile) => {
    if (tile.type === type) {
      tiles.push({ x, y })
    }
  })
  return tiles
}

export function moveSpeedMultiplier(
  map: WorldMap,
  worldX: number,
  worldY: number,
  rideKind?: 'rail' | 'water',
): number {
  if (rideKind === 'rail') {
    return RAIL_SPEED_MULT
  }
  if (rideKind === 'water') {
    return WATER_SPEED_MULT
  }

  const tile = map.worldToTile(worldX, worldY)
  if (!tile) {
    return WALK_SPEED_MULT
  }
  if (map.getTile(tile.x, tile.y)?.type === TileType.Road) {
    return ROAD_SPEED_MULT
  }
  return WALK_SPEED_MULT
}

export function findPath(
  map: WorldMap,
  start: TileRef,
  goal: TileRef,
  passable: (x: number, y: number) => boolean,
): TileRef[] | undefined {
  if (!map.inBounds(start.x, start.y) || !map.inBounds(goal.x, goal.y)) {
    return undefined
  }
  if (sameTile(start, goal)) {
    return [{ ...start }]
  }

  const width = map.width
  const keyOf = (x: number, y: number) => y * width + x
  const visited = new Uint8Array(map.tileCount)
  const from = new Int32Array(map.tileCount).fill(-1)
  const queue: number[] = [keyOf(start.x, start.y)]
  visited[keyOf(start.x, start.y)] = 1
  const goalKey = keyOf(goal.x, goal.y)

  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head] ?? 0
    const cx = current % width
    const cy = Math.floor(current / width)
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx
      const ny = cy + dy
      if (!map.inBounds(nx, ny) || !passable(nx, ny)) {
        continue
      }
      const next = keyOf(nx, ny)
      if (visited[next] === 1) {
        continue
      }
      visited[next] = 1
      from[next] = current
      if (next === goalKey) {
        return reconstruct(from, width, start, goal)
      }
      queue.push(next)
    }
  }

  return undefined
}

export function findRailPath(map: WorldMap, start: TileRef, goal: TileRef): TileRef[] | undefined {
  return findPath(map, start, goal, (x, y) => {
    const type = map.getTile(x, y)?.type
    return type !== undefined && isTrackType(type)
  })
}

export function findWaterRoute(map: WorldMap, from: TileRef, to: TileRef): TileRef[] | undefined {
  const starts = waterNeighbors(map, from)
  const ends = waterNeighbors(map, to)
  if (starts.length === 0 || ends.length === 0) {
    return undefined
  }

  let best: TileRef[] | undefined
  for (const start of starts) {
    for (const end of ends) {
      const water = findPath(map, start, end, (x, y) =>
        isWaterTerrain(map.getTile(x, y)?.terrain ?? Terrain.Grass),
      )
      if (!water) {
        continue
      }
      const path = [{ ...from }, ...water, { ...to }]
      if (!best || path.length < best.length) {
        best = path
      }
    }
  }
  return best
}

export function nearestHub(
  hubs: readonly TileRef[],
  from: TileRef,
  maxDistance = TRANSIT_WALK_MAX,
): TileRef | undefined {
  let best: TileRef | undefined
  let bestDistance = maxDistance
  for (const hub of hubs) {
    const distance = manhattan(from, hub)
    if (distance < bestDistance || (distance === bestDistance && !best)) {
      best = hub
      bestDistance = distance
    }
  }
  return bestDistance <= maxDistance ? best : undefined
}

export function connectedHubs(
  map: WorldMap,
  hub: TileRef,
  kind: 'rail' | 'water',
): TileRef[] {
  const type = kind === 'rail' ? TileType.Station : TileType.Port
  return tilesOfType(map, type).filter((other) => {
    if (sameTile(hub, other)) {
      return false
    }
    return kind === 'rail' ? Boolean(findRailPath(map, hub, other)) : Boolean(findWaterRoute(map, hub, other))
  })
}

export function planTransit(map: WorldMap, from: TileRef, to: TileRef): TransitPlan {
  const walkCost = manhattan(from, to) / WALK_SPEED_MULT
  let best: TransitPlan = { mode: 'walk' }
  let bestCost = walkCost

  const consider = (
    mode: 'rail' | 'water',
    board: TileRef,
    alight: TileRef,
    path: TileRef[],
    rideSpeed: number,
  ) => {
    if (sameTile(board, alight) || path.length < 2) {
      return
    }
    const cost =
      manhattan(from, board) / WALK_SPEED_MULT +
      (path.length - 1) / rideSpeed +
      manhattan(alight, to) / WALK_SPEED_MULT
    if (cost + 0.35 < bestCost) {
      best = { mode, board, alight, path }
      bestCost = cost
    }
  }

  const stations = tilesOfType(map, TileType.Station)
  const fromStation = nearestHub(stations, from)
  const toStation = nearestHub(stations, to)
  if (fromStation && toStation && !sameTile(fromStation, toStation)) {
    const path = findRailPath(map, fromStation, toStation)
    if (path) {
      consider('rail', fromStation, toStation, path, RAIL_SPEED_MULT)
    }
  }

  const ports = tilesOfType(map, TileType.Port)
  const fromPort = nearestHub(ports, from)
  const toPort = nearestHub(ports, to)
  if (fromPort && toPort && !sameTile(fromPort, toPort)) {
    const path = findWaterRoute(map, fromPort, toPort)
    if (path) {
      consider('water', fromPort, toPort, path, WATER_SPEED_MULT)
    }
  }

  return best
}

function waterNeighbors(map: WorldMap, hub: TileRef): TileRef[] {
  const tiles: TileRef[] = []
  for (const [dx, dy] of DIRS) {
    const x = hub.x + dx
    const y = hub.y + dy
    const tile = map.getTile(x, y)
    if (tile && isWaterTerrain(tile.terrain)) {
      tiles.push({ x, y })
    }
  }
  return tiles
}

function reconstruct(from: Int32Array, width: number, start: TileRef, goal: TileRef): TileRef[] {
  const path: TileRef[] = [{ ...goal }]
  let current = goal.y * width + goal.x
  while (current !== start.y * width + start.x) {
    current = from[current] ?? -1
    if (current < 0) {
      return undefined as unknown as TileRef[]
    }
    path.push({ x: current % width, y: Math.floor(current / width) })
  }
  path.reverse()
  return path
}
