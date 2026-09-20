import {
  BOAT_MOVE_SPEED,
  FREIGHT_FARE_PER_UNIT,
  FREIGHT_PER_HOUR,
  HUB_CATCH_RADIUS,
  PORT_UPKEEP_PER_HOUR,
  AIRPORT_UPKEEP_PER_HOUR,
  RAIL_UPKEEP_PER_TILE_HOUR,
  STATION_UPKEEP_PER_HOUR,
  TRAIN_MOVE_SPEED,
  TRANSIT_FARE,
} from '../constants.ts'
import { StockKind, stockOf, transferStock } from '../economy/goods.ts'
import type { Treasury } from '../economy/treasury.ts'
import { isFoodStallType, TileType, type Tile } from '../map/tile.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { ResidentState, type Resident, type TileRef } from '../residents/resident.ts'
import {
  connectedHubs,
  findRailPath,
  findWaterRoute,
  manhattan,
  tilesOfType,
} from './network.ts'

export type TransitVehicle = {
  id: string
  kind: 'train' | 'boat'
  path: TileRef[]
  t: number
  dir: 1 | -1
  worldX: number
  worldY: number
  cargoKind: StockKind | undefined
  cargoAmount: number
}

export type TransitStats = {
  riders: number
  fares: number
  freight: number
}

export type TransitSummary = {
  riders: number
  riding: number
  fares: number
  freight: number
  upkeep: number
}

const STOCKS: StockKind[] = [StockKind.Food, StockKind.Wood, StockKind.Goods]

export class TransitService {
  vehicles: TransitVehicle[] = []
  stats: TransitStats
  private lastKey = ''

  constructor(stats?: Partial<TransitStats>) {
    this.stats = {
      riders: stats?.riders ?? 0,
      fares: stats?.fares ?? 0,
      freight: stats?.freight ?? 0,
    }
  }

  summary(map: WorldMap, residents: readonly Resident[]): TransitSummary {
    return {
      riders: Math.floor(this.stats.riders),
      riding: residents.filter((resident) => resident.state === ResidentState.Riding).length,
      fares: Math.floor(this.stats.fares),
      freight: Math.floor(this.stats.freight),
      upkeep: Number(transitUpkeepPerHour(map).toFixed(1)),
    }
  }

  tick(
    map: WorldMap,
    deltaMs: number,
    speed: number,
    gameHours: number,
    treasury?: Treasury,
    animate = true,
  ): void {
    this.rebuildIfNeeded(map)
    if (animate) {
      this.moveVehicles(map, deltaMs, speed, treasury)
    }
    if (gameHours > 0) {
      this.stats.freight += tickFreight(map, gameHours)
      const upkeep = transitUpkeepPerHour(map) * gameHours
      treasury?.spend(upkeep)
    }
  }

  board(resident: Resident, treasury?: Treasury): void {
    this.stats.riders += 1
    const fare = Math.min(resident.money, TRANSIT_FARE)
    resident.money = Math.max(0, resident.money - fare)
    this.stats.fares += fare
    treasury?.receive(fare)
  }

  private rebuildIfNeeded(map: WorldMap): void {
    const key = transitLayoutKey(map)
    if (key === this.lastKey) {
      return
    }
    this.lastKey = key
    this.vehicles = createVehicles(map)
  }

  private moveVehicles(
    map: WorldMap,
    deltaMs: number,
    speed: number,
    treasury?: Treasury,
  ): void {
    if (speed <= 0 || deltaMs <= 0) {
      return
    }

    for (const vehicle of this.vehicles) {
      if (vehicle.path.length < 2) {
        continue
      }
      const pxSpeed = vehicle.kind === 'train' ? TRAIN_MOVE_SPEED : BOAT_MOVE_SPEED
      const step = (pxSpeed * speed * (deltaMs / 1000)) / map.tileSize
      vehicle.t += step * vehicle.dir
      const max = vehicle.path.length - 1
      if (vehicle.t >= max) {
        vehicle.t = max
        vehicle.dir = -1
        exchangeCargo(map, vehicle, vehicle.path[max]!, treasury)
      } else if (vehicle.t <= 0) {
        vehicle.t = 0
        vehicle.dir = 1
        exchangeCargo(map, vehicle, vehicle.path[0]!, treasury)
      }
      const point = pointAlong(map, vehicle.path, vehicle.t)
      vehicle.worldX = point.x
      vehicle.worldY = point.y
    }
  }
}

export function transitUpkeepPerHour(map: WorldMap): number {
  let upkeep = 0
  map.forEachTile((_x, _y, tile) => {
    if (tile.type === TileType.Rail) {
      upkeep += RAIL_UPKEEP_PER_TILE_HOUR
    }
    if (tile.type === TileType.Station) {
      upkeep += STATION_UPKEEP_PER_HOUR
    }
    if (tile.type === TileType.Port) {
      upkeep += PORT_UPKEEP_PER_HOUR
    }
    if (tile.type === TileType.Airport) {
      upkeep += AIRPORT_UPKEEP_PER_HOUR
    }
  })
  return upkeep
}

export function tickFreight(map: WorldMap, gameHours: number): number {
  if (gameHours <= 0) {
    return 0
  }

  let moved = 0
  const amount = FREIGHT_PER_HOUR * gameHours
  for (const station of tilesOfType(map, TileType.Station)) {
    moved += collectAround(map, station, amount)
    moved += distributeAround(map, station, amount)
  }
  for (const port of tilesOfType(map, TileType.Port)) {
    moved += collectAround(map, port, amount)
    moved += distributeAround(map, port, amount)
  }
  for (const airport of tilesOfType(map, TileType.Airport)) {
    moved += collectAround(map, airport, amount)
    moved += distributeAround(map, airport, amount)
  }
  moved += balanceHubs(map, TileType.Station, 'rail', amount)
  moved += balanceHubs(map, TileType.Port, 'water', amount)
  return moved
}

function createVehicles(map: WorldMap): TransitVehicle[] {
  const vehicles: TransitVehicle[] = []
  for (const path of hubLines(map, 'rail')) {
    const start = map.tileCenter(path[0]!.x, path[0]!.y)
    vehicles.push({
      id: `train-${vehicles.length + 1}`,
      kind: 'train',
      path,
      t: 0,
      dir: 1,
      worldX: start.x,
      worldY: start.y,
      cargoKind: undefined,
      cargoAmount: 0,
    })
  }
  for (const path of hubLines(map, 'water')) {
    const start = map.tileCenter(path[0]!.x, path[0]!.y)
    vehicles.push({
      id: `boat-${vehicles.length + 1}`,
      kind: 'boat',
      path,
      t: 0,
      dir: 1,
      worldX: start.x,
      worldY: start.y,
      cargoKind: undefined,
      cargoAmount: 0,
    })
  }
  return vehicles
}

function hubLines(map: WorldMap, kind: 'rail' | 'water'): TileRef[][] {
  const type = kind === 'rail' ? TileType.Station : TileType.Port
  const hubs = tilesOfType(map, type)
  const used = new Set<string>()
  const lines: TileRef[][] = []

  for (const hub of hubs) {
    const key = `${hub.x},${hub.y}`
    if (used.has(key)) {
      continue
    }
    const component = [hub, ...connectedHubs(map, hub, kind)]
    for (const tile of component) {
      used.add(`${tile.x},${tile.y}`)
    }
    if (component.length < 2) {
      continue
    }
    let farthest: { a: TileRef; b: TileRef; distance: number } | undefined
    for (let i = 0; i < component.length; i += 1) {
      for (let j = i + 1; j < component.length; j += 1) {
        const a = component[i]!
        const b = component[j]!
        const distance = manhattan(a, b)
        if (!farthest || distance > farthest.distance) {
          farthest = { a, b, distance }
        }
      }
    }
    if (!farthest) {
      continue
    }
    const path =
      kind === 'rail'
        ? findRailPath(map, farthest.a, farthest.b)
        : findWaterRoute(map, farthest.a, farthest.b)
    if (path && path.length >= 2) {
      lines.push(path)
    }
  }

  return lines
}

function transitLayoutKey(map: WorldMap): string {
  const parts: string[] = []
  map.forEachTile((x, y, tile) => {
    if (
      tile.type === TileType.Station ||
      tile.type === TileType.Rail ||
      tile.type === TileType.Port ||
      tile.type === TileType.Airport
    ) {
      parts.push(`${tile.type}:${x},${y}`)
    }
  })
  return parts.join('|')
}

function pointAlong(map: WorldMap, path: TileRef[], t: number): { x: number; y: number } {
  const max = path.length - 1
  const clamped = Math.max(0, Math.min(max, t))
  const index = Math.floor(clamped)
  const next = Math.min(max, index + 1)
  const frac = clamped - index
  const a = map.tileCenter(path[index]!.x, path[index]!.y)
  const b = map.tileCenter(path[next]!.x, path[next]!.y)
  return {
    x: a.x + (b.x - a.x) * frac,
    y: a.y + (b.y - a.y) * frac,
  }
}

function exchangeCargo(
  map: WorldMap,
  vehicle: TransitVehicle,
  hub: TileRef,
  treasury?: Treasury,
): void {
  const tile = map.getTile(hub.x, hub.y)
  if (!tile) {
    return
  }

  if (vehicle.cargoKind && vehicle.cargoAmount > 0) {
    const stored = map.addStock(hub.x, hub.y, vehicle.cargoKind, vehicle.cargoAmount)
    const leftover = vehicle.cargoAmount - stored
    vehicle.cargoAmount = leftover
    if (leftover <= 0) {
      vehicle.cargoKind = undefined
      vehicle.cargoAmount = 0
    }
  }

  if (vehicle.cargoAmount > 0) {
    return
  }

  let best: { kind: StockKind; amount: number } | undefined
  for (const kind of STOCKS) {
    const amount = stockOf(tile, kind)
    if (amount >= 1 && (!best || amount > best.amount)) {
      best = { kind, amount }
    }
  }
  if (!best) {
    return
  }

  const taken = map.takeStock(hub.x, hub.y, best.kind, Math.min(6, best.amount))
  if (taken <= 0) {
    return
  }
  vehicle.cargoKind = best.kind
  vehicle.cargoAmount = taken
  const fare = taken * FREIGHT_FARE_PER_UNIT
  treasury?.receive(fare)
}

function collectAround(map: WorldMap, hub: TileRef, amount: number): number {
  const dest = map.getTile(hub.x, hub.y)
  if (!dest) {
    return 0
  }
  let moved = 0
  visitAround(map, hub, (tile) => {
    if (tile.type === TileType.Farm) {
      moved += transferStock(tile, dest, StockKind.Food, amount)
    }
    if (tile.type === TileType.Workshop || tile.type === TileType.Factory) {
      moved += transferStock(tile, dest, StockKind.Wood, amount)
      moved += transferStock(tile, dest, StockKind.Goods, amount)
    }
    if (tile.type === TileType.Warehouse) {
      for (const kind of STOCKS) {
        moved += transferStock(tile, dest, kind, amount)
      }
    }
  })
  return moved
}

function distributeAround(map: WorldMap, hub: TileRef, amount: number): number {
  const source = map.getTile(hub.x, hub.y)
  if (!source) {
    return 0
  }
  let moved = 0
  visitAround(map, hub, (tile) => {
    if (isFoodStallType(tile.type) || tile.type === TileType.Warehouse) {
      moved += transferStock(source, tile, StockKind.Food, amount)
    }
    if (tile.type === TileType.Workshop || tile.type === TileType.Factory) {
      moved += transferStock(source, tile, StockKind.Wood, amount)
    }
    if (
      tile.type === TileType.Shop ||
      tile.type === TileType.Market ||
      tile.type === TileType.Warehouse
    ) {
      moved += transferStock(source, tile, StockKind.Goods, amount)
    }
  })
  return moved
}

function balanceHubs(
  map: WorldMap,
  type: TileType,
  kind: 'rail' | 'water',
  amount: number,
): number {
  const hubs = tilesOfType(map, type)
  let moved = 0
  for (const hub of hubs) {
    const tile = map.getTile(hub.x, hub.y)
    if (!tile) {
      continue
    }
    for (const other of connectedHubs(map, hub, kind)) {
      const dest = map.getTile(other.x, other.y)
      if (!dest) {
        continue
      }
      for (const stock of STOCKS) {
        if (stockOf(tile, stock) > stockOf(dest, stock) + 1) {
          moved += transferStock(tile, dest, stock, amount)
        }
      }
    }
  }
  return moved
}

function visitAround(map: WorldMap, hub: TileRef, visit: (tile: Tile) => void): void {
  for (let dy = -HUB_CATCH_RADIUS; dy <= HUB_CATCH_RADIUS; dy += 1) {
    for (let dx = -HUB_CATCH_RADIUS; dx <= HUB_CATCH_RADIUS; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue
      }
      if (Math.abs(dx) + Math.abs(dy) > HUB_CATCH_RADIUS) {
        continue
      }
      const tile = map.getTile(hub.x + dx, hub.y + dy)
      if (tile) {
        visit(tile)
      }
    }
  }
}
