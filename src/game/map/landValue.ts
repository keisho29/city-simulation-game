import { LAND_VALUE_MAX, LAND_VALUE_MIN, LAND_VALUE_RADIUS } from '../constants.ts'
import { TileType } from './tile.ts'
import type { WorldMap } from './WorldMap.ts'

export function landValue(map: WorldMap, x: number, y: number): number {
  let value = LAND_VALUE_MIN

  for (let dy = -LAND_VALUE_RADIUS; dy <= LAND_VALUE_RADIUS; dy += 1) {
    for (let dx = -LAND_VALUE_RADIUS; dx <= LAND_VALUE_RADIUS; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue
      }
      const tile = map.getTile(x + dx, y + dy)
      if (!tile) {
        continue
      }

      const distance = Math.abs(dx) + Math.abs(dy)
      if (distance > LAND_VALUE_RADIUS * 2) {
        continue
      }

      value += neighborScore(tile.type, tile.level, distance)
    }
  }

  return Math.max(LAND_VALUE_MIN, Math.min(LAND_VALUE_MAX, Math.round(value)))
}

export function averageLandValue(map: WorldMap): number {
  let total = 0
  let count = 0
  map.forEachTile((x, y, tile) => {
    if (tile.type === TileType.Vacant) {
      return
    }
    total += landValue(map, x, y)
    count += 1
  })
  if (count === 0) {
    return LAND_VALUE_MIN
  }
  return Math.round(total / count)
}

function neighborScore(type: TileType, level: number, distance: number): number {
  const falloff = distance === 1 ? 1 : distance === 2 ? 0.55 : 0.25
  switch (type) {
    case TileType.Road:
      return (distance === 1 ? 12 : 4) * falloff
    case TileType.House:
      return 3 * level * falloff
    case TileType.Shop:
    case TileType.Market:
      return 6 * level * falloff
    case TileType.Workshop:
      return 5 * level * falloff
    case TileType.Farm:
      return 2 * level * falloff
    case TileType.Warehouse:
      return 3 * level * falloff
    case TileType.Clinic:
      return 4 * level * falloff
    case TileType.School:
      return 5 * level * falloff
    case TileType.Factory:
      return 6 * level * falloff
    case TileType.Station:
      return 7 * level * falloff
    case TileType.Rail:
      return (distance === 1 ? 10 : 3) * falloff
    case TileType.Port:
      return 6 * level * falloff
    case TileType.Well:
      return 3 * falloff
    default:
      return 0
  }
}
