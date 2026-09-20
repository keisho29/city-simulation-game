import { HAUL_AMOUNT } from '../constants.ts'
import { isFoodStallType, TileType } from '../map/tile.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { ResidentState, type Resident, type TileRef } from '../residents/resident.ts'
import { StockKind, stockCapacity, stockOf } from './goods.ts'

export type HaulJob = {
  kind: StockKind
  amount: number
  pickup: TileRef
  drop: TileRef
}

export function clearHaul(resident: Resident): void {
  resident.haulKind = undefined
  resident.haulAmount = undefined
  resident.haulPickup = undefined
  resident.haulDrop = undefined
}

export function isHauling(resident: Resident): boolean {
  return (
    resident.state === ResidentState.MovingToPickup ||
    resident.state === ResidentState.Hauling
  )
}

export function findHaulJob(map: WorldMap, resident: Resident): HaulJob | undefined {
  const workplace = resident.workplace
  if (!workplace) {
    return undefined
  }

  const job = map.getTile(workplace.x, workplace.y)
  if (!job) {
    return undefined
  }

  if (job.type === TileType.Warehouse) {
    return (
      findTransfer(map, TileType.Farm, StockKind.Food, workplace) ??
      findTransfer(map, TileType.Workshop, StockKind.Goods, workplace) ??
      findFromWarehouse(map, workplace, StockKind.Food, isFoodStallType) ??
      findFromWarehouse(map, workplace, StockKind.Wood, (type) => type === TileType.Workshop) ??
      findFromWarehouse(map, workplace, StockKind.Goods, isFoodStallType)
    )
  }

  if (isFoodStallType(job.type) && job.food < 6) {
    return findTransferTo(map, workplace, StockKind.Food, (type) => {
      return type === TileType.Farm || type === TileType.Warehouse
    })
  }

  return undefined
}

export function tryStartHaul(resident: Resident, map: WorldMap): boolean {
  if (resident.state !== ResidentState.Working || isHauling(resident)) {
    return false
  }

  const job = findHaulJob(map, resident)
  if (!job) {
    return false
  }

  resident.haulKind = job.kind
  resident.haulAmount = job.amount
  resident.haulPickup = job.pickup
  resident.haulDrop = job.drop
  resident.state = ResidentState.MovingToPickup
  return true
}

export function completePickup(resident: Resident, map: WorldMap): void {
  const pickup = resident.haulPickup
  const kind = resident.haulKind
  const want = resident.haulAmount ?? HAUL_AMOUNT
  if (!pickup || !kind) {
    abortHaul(resident)
    return
  }

  const taken = map.takeStock(pickup.x, pickup.y, kind, want)
  if (taken <= 0.05) {
    abortHaul(resident)
    return
  }

  resident.haulAmount = taken
  resident.state = ResidentState.Hauling
}

export function completeDrop(resident: Resident, map: WorldMap, goHome: boolean): void {
  const drop = resident.haulDrop
  const kind = resident.haulKind
  const amount = resident.haulAmount ?? 0
  if (drop && kind && amount > 0) {
    const stored = map.addStock(drop.x, drop.y, kind, amount)
    if (stored < amount && resident.haulPickup) {
      map.addStock(resident.haulPickup.x, resident.haulPickup.y, kind, amount - stored)
    }
  }

  clearHaul(resident)
  if (goHome && resident.home) {
    resident.state = ResidentState.MovingToHome
    return
  }

  resident.state = resident.workplace
    ? ResidentState.MovingToWork
    : ResidentState.SeekingHome
}

export function abortHaul(resident: Resident): void {
  clearHaul(resident)
  resident.state = resident.workplace ? ResidentState.Working : ResidentState.SeekingHome
}

function findTransfer(
  map: WorldMap,
  sourceType: TileType,
  kind: StockKind,
  drop: TileRef,
): HaulJob | undefined {
  const dest = map.getTile(drop.x, drop.y)
  if (!dest) {
    return undefined
  }

  const room = stockCapacity(dest) - stockOf(dest, kind)
  if (room < 1) {
    return undefined
  }

  const source = map.findNearest(drop, (tile) => {
    return tile.type === sourceType && stockOf(tile, kind) >= 2
  })
  if (!source) {
    return undefined
  }

  const from = map.getTile(source.x, source.y)
  if (!from) {
    return undefined
  }

  return {
    kind,
    amount: Math.min(HAUL_AMOUNT, stockOf(from, kind), room),
    pickup: source,
    drop,
  }
}

function findFromWarehouse(
  map: WorldMap,
  warehouse: TileRef,
  kind: StockKind,
  matchDrop: (type: TileType) => boolean,
): HaulJob | undefined {
  const source = map.getTile(warehouse.x, warehouse.y)
  if (!source || stockOf(source, kind) < 2) {
    return undefined
  }

  const drop = map.findNearest(warehouse, (tile) => {
    return matchDrop(tile.type) && stockCapacity(tile) - stockOf(tile, kind) >= 1
  })
  if (!drop) {
    return undefined
  }

  const dest = map.getTile(drop.x, drop.y)
  if (!dest) {
    return undefined
  }

  return {
    kind,
    amount: Math.min(HAUL_AMOUNT, stockOf(source, kind), stockCapacity(dest) - stockOf(dest, kind)),
    pickup: warehouse,
    drop,
  }
}

function findTransferTo(
  map: WorldMap,
  drop: TileRef,
  kind: StockKind,
  matchSource: (type: TileType) => boolean,
): HaulJob | undefined {
  const dest = map.getTile(drop.x, drop.y)
  if (!dest) {
    return undefined
  }

  const room = stockCapacity(dest) - stockOf(dest, kind)
  if (room < 1) {
    return undefined
  }

  const source = map.findNearest(drop, (tile) => {
    return matchSource(tile.type) && stockOf(tile, kind) >= 2
  })
  if (!source) {
    return undefined
  }

  const from = map.getTile(source.x, source.y)
  if (!from) {
    return undefined
  }

  return {
    kind,
    amount: Math.min(HAUL_AMOUNT, stockOf(from, kind), room),
    pickup: source,
    drop,
  }
}
