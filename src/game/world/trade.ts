import { INTER_TRADE_PER_HOUR } from '../constants.ts'
import { StockKind, stockOf, transferStock } from '../economy/goods.ts'
import type { Treasury } from '../economy/treasury.ts'
import { TileType } from '../map/tile.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { linkedRegions, regionName, type RegionId } from './regions.ts'

export type TradeMoved = {
  food: number
  wood: number
  goods: number
}

const STOCKS: StockKind[] = [StockKind.Food, StockKind.Wood, StockKind.Goods]

export function tickInterRegionTrade(
  maps: ReadonlyMap<RegionId, WorldMap>,
  unlocked: ReadonlySet<RegionId>,
  gameHours: number,
  treasury?: Treasury,
): TradeMoved {
  const moved: TradeMoved = { food: 0, wood: 0, goods: 0 }
  if (gameHours <= 0) {
    return moved
  }

  const amount = INTER_TRADE_PER_HOUR * gameHours
  for (const [fromId, fromMap] of maps) {
    if (!unlocked.has(fromId)) {
      continue
    }
    for (const link of linkedRegions(fromId, maps, unlocked)) {
      const toMap = maps.get(link.id)
      if (!toMap) {
        continue
      }
      for (const kind of STOCKS) {
        const shipped = shipSurplus(fromMap, toMap, kind, amount)
        if (kind === StockKind.Food) {
          moved.food += shipped
        } else if (kind === StockKind.Wood) {
          moved.wood += shipped
        } else {
          moved.goods += shipped
        }
        if (shipped > 0) {
          treasury?.receive(shipped * 0.2)
        }
      }
    }
  }

  return moved
}

export function extraSupplyFromLinks(
  id: RegionId,
  maps: ReadonlyMap<RegionId, WorldMap>,
  unlocked: ReadonlySet<RegionId>,
): TradeMoved {
  const extra: TradeMoved = { food: 0, wood: 0, goods: 0 }
  for (const link of linkedRegions(id, maps, unlocked)) {
    const map = maps.get(link.id)
    if (!map) {
      continue
    }
    extra.food += map.totalStock(StockKind.Food)
    extra.wood += map.totalStock(StockKind.Wood)
    extra.goods += map.totalStock(StockKind.Goods)
  }
  return extra
}

export function tradeHint(
  id: RegionId,
  maps: ReadonlyMap<RegionId, WorldMap>,
  unlocked: ReadonlySet<RegionId>,
): string | undefined {
  const links = linkedRegions(id, maps, unlocked)
  if (links.length === 0) {
    return undefined
  }
  const extra = extraSupplyFromLinks(id, maps, unlocked)
  if (extra.food + extra.wood + extra.goods < 4) {
    return undefined
  }
  return `${regionName(links[0]!.id)}などから移入`
}

function shipSurplus(
  from: WorldMap,
  to: WorldMap,
  kind: StockKind,
  amount: number,
): number {
  const fromTotal = from.totalStock(kind)
  const toTotal = to.totalStock(kind)
  if (fromTotal < toTotal + 6) {
    return 0
  }

  const source = findHub(from, kind, 'take')
  const dest = findHub(to, kind, 'store')
  if (!source || !dest) {
    return 0
  }
  const fromTile = from.getTile(source.x, source.y)
  const toTile = to.getTile(dest.x, dest.y)
  if (!fromTile || !toTile) {
    return 0
  }
  return transferStock(fromTile, toTile, kind, Math.min(amount, stockOf(fromTile, kind) - 2))
}

function findHub(
  map: WorldMap,
  kind: StockKind,
  intent: 'take' | 'store',
): { x: number; y: number } | undefined {
  let best: { x: number; y: number; score: number } | undefined
  map.forEachTile((x, y, tile) => {
    if (
      tile.type !== TileType.Warehouse &&
      tile.type !== TileType.Station &&
      tile.type !== TileType.Port &&
      tile.type !== TileType.Airport
    ) {
      return
    }
    const score = intent === 'take' ? stockOf(tile, kind) : -stockOf(tile, kind)
    if (!best || score > best.score) {
      best = { x, y, score }
    }
  })
  return best && (intent === 'store' || best.score > 1) ? best : undefined
}
