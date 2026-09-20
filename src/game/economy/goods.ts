import {
  STOCK_CAP_BASE,
  STOCK_CAP_PER_LEVEL,
  WAREHOUSE_STOCK_BONUS,
} from '../constants.ts'
import { TileType, type Tile } from '../map/tile.ts'

export const StockKind = {
  Food: 'food',
  Wood: 'wood',
  Goods: 'goods',
} as const

export type StockKind = (typeof StockKind)[keyof typeof StockKind]

export function canStore(type: TileType, kind: StockKind): boolean {
  if (kind === StockKind.Food) {
    return (
      type === TileType.Farm ||
      type === TileType.Shop ||
      type === TileType.Market ||
      type === TileType.Warehouse
    )
  }
  if (kind === StockKind.Wood) {
    return type === TileType.Warehouse || type === TileType.Workshop
  }
  return (
    type === TileType.Workshop ||
    type === TileType.Warehouse ||
    type === TileType.Market ||
    type === TileType.Shop
  )
}

export function stockCapacity(tile: Tile): number {
  const bonus = tile.type === TileType.Warehouse ? WAREHOUSE_STOCK_BONUS : 0
  return STOCK_CAP_BASE + STOCK_CAP_PER_LEVEL * tile.level + bonus
}

export function stockOf(tile: Tile, kind: StockKind): number {
  if (kind === StockKind.Food) {
    return tile.food
  }
  if (kind === StockKind.Wood) {
    return tile.wood
  }
  return tile.goods
}

export function setStock(tile: Tile, kind: StockKind, value: number): void {
  const next = Math.max(0, value)
  if (kind === StockKind.Food) {
    tile.food = next
    return
  }
  if (kind === StockKind.Wood) {
    tile.wood = next
    return
  }
  tile.goods = next
}

export function addStock(tile: Tile, kind: StockKind, amount: number): number {
  if (amount <= 0 || !canStore(tile.type, kind)) {
    return 0
  }

  const room = Math.max(0, stockCapacity(tile) - stockOf(tile, kind))
  const added = Math.min(room, amount)
  setStock(tile, kind, stockOf(tile, kind) + added)
  return added
}

export function takeStock(tile: Tile, kind: StockKind, amount: number): number {
  if (amount <= 0) {
    return 0
  }

  const taken = Math.min(stockOf(tile, kind), amount)
  setStock(tile, kind, stockOf(tile, kind) - taken)
  return taken
}

export function transferStock(
  from: Tile,
  to: Tile,
  kind: StockKind,
  amount: number,
): number {
  const room = Math.max(0, stockCapacity(to) - stockOf(to, kind))
  const moved = takeStock(from, kind, Math.min(amount, room))
  if (moved <= 0) {
    return 0
  }

  const stored = addStock(to, kind, moved)
  if (stored < moved) {
    addStock(from, kind, moved - stored)
  }
  return stored
}

export function stockLabel(tile: Tile): string {
  const parts: string[] = []
  if (tile.food > 0.05) {
    parts.push(`米${Math.floor(tile.food)}`)
  }
  if (tile.wood > 0.05) {
    parts.push(`木${Math.floor(tile.wood)}`)
  }
  if (tile.goods > 0.05) {
    parts.push(`品${Math.floor(tile.goods)}`)
  }
  return parts.length > 0 ? parts.join(' ') : '-'
}
