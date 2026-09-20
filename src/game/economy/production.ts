import {
  FARM_STALL_LEAK_PER_HOUR,
  FOOD_PER_WORKER_HOUR,
  GOODS_PER_WORKER_HOUR,
  WOOD_PER_WORKER_HOUR,
} from '../constants.ts'
import { Terrain, TileType } from '../map/tile.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { StockKind } from './goods.ts'

export function tickProduction(
  map: WorldMap,
  gameHours: number,
  harvestMult = 1,
  woodMult = 1,
  goodsMult = 1,
): void {
  if (gameHours <= 0) {
    return
  }

  const forest = map.hasTerrain(Terrain.Forest)
  map.forEachTile((x, y, tile) => {
    const workers = tile.occupantIds.length
    if (workers <= 0) {
      return
    }

    const levelBoost = 1 + 0.2 * (tile.level - 1)
    if (tile.type === TileType.Farm) {
      map.addStock(
        x,
        y,
        StockKind.Food,
        FOOD_PER_WORKER_HOUR * workers * harvestMult * levelBoost * gameHours,
      )
      return
    }

    if (tile.type === TileType.Factory) {
      if (forest) {
        map.addStock(x, y, StockKind.Wood, WOOD_PER_WORKER_HOUR * workers * woodMult * gameHours)
      }
      const converted = map.takeStock(
        x,
        y,
        StockKind.Wood,
        GOODS_PER_WORKER_HOUR * 1.5 * workers * goodsMult * gameHours,
      )
      if (converted > 0) {
        map.addStock(x, y, StockKind.Goods, converted)
      }
      return
    }

    if (tile.type === TileType.Warehouse && forest) {
      map.addStock(x, y, StockKind.Wood, WOOD_PER_WORKER_HOUR * workers * woodMult * gameHours)
      return
    }

    if (tile.type === TileType.Workshop) {
      if (forest && tile.wood < 1) {
        map.addStock(
          x,
          y,
          StockKind.Wood,
          WOOD_PER_WORKER_HOUR * 0.6 * workers * woodMult * gameHours,
        )
      }
      const converted = map.takeStock(
        x,
        y,
        StockKind.Wood,
        GOODS_PER_WORKER_HOUR * workers * goodsMult * gameHours,
      )
      if (converted > 0) {
        map.addStock(x, y, StockKind.Goods, converted)
      }
    }
  })

  leakFarmFoodToStalls(map, gameHours)
}

function leakFarmFoodToStalls(map: WorldMap, gameHours: number): void {
  map.forEachTile((x, y, tile) => {
    if (tile.type !== TileType.Farm || tile.food <= 2) {
      return
    }

    const stall = map.findNearestShop({ x, y })
    if (!stall) {
      return
    }

    map.transferStock(
      x,
      y,
      stall.x,
      stall.y,
      StockKind.Food,
      FARM_STALL_LEAK_PER_HOUR * Math.max(1, tile.occupantIds.length) * gameHours,
    )
  })
}
