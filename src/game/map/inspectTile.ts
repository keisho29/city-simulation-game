import { stockLabel } from '../economy/goods.ts'
import { buildingDisplayName, xpToReach } from './growth.ts'
import { landValue } from './landValue.ts'
import { terrainDisplayName } from './landscape.ts'
import { isWorkplaceType, TileType, type Tile } from './tile.ts'
import type { WorldMap } from './WorldMap.ts'

export type TileDetailView = {
  name: string
  level: string
  xp: string
  value: string
  capacity: string
  stock: string
}

export function tileDetailView(map: WorldMap, x: number, y: number): TileDetailView | undefined {
  const tile = map.getTile(x, y)
  if (!tile) {
    return undefined
  }

  return {
    name: tile.type === TileType.Vacant ? terrainDisplayName(tile.terrain) : buildingDisplayName(tile.type, tile.level, tile.variant),
    level: growableLevelLabel(tile),
    xp: growableXpLabel(tile),
    value: `${landValue(map, x, y)}`,
    capacity: capacityLabel(tile),
    stock: stockLabel(tile),
  }
}

function growableLevelLabel(tile: Tile): string {
  if (tile.type === TileType.Vacant || tile.type === TileType.Road) {
    return '-'
  }
  return `Lv.${tile.level}`
}

function growableXpLabel(tile: Tile): string {
  if (tile.type === TileType.Vacant || tile.type === TileType.Road) {
    return '-'
  }
  const next = xpToReach(tile.level)
  if (next === undefined) {
    return '最大'
  }
  return `${Math.floor(tile.xp)} / ${next}`
}

function capacityLabel(tile: Tile): string {
  if (tile.type === TileType.House) {
    return `住居 ${tile.occupantIds.length}/${tile.level}`
  }
  if (isWorkplaceType(tile.type)) {
    return `仕事 ${tile.occupantIds.length}/${tile.level}`
  }
  return '-'
}
