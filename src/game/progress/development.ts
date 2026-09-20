import { LAND_VALUE_MAX } from '../constants.ts'
import { averageLandValue } from '../map/landValue.ts'
import { TileType } from '../map/tile.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { averageHappiness } from '../residents/happiness.ts'
import type { Resident } from '../residents/resident.ts'

export function cityDevelopment(map: WorldMap, residents: readonly Resident[]): number {
  const housed = residents.filter((resident) => resident.home).length
  const employed = residents.filter((resident) => resident.workplace).length
  const happiness = averageHappiness(residents)
  const kinds = new Set<string>()
  let levels = 0
  map.forEachTile((_x, _y, tile) => {
    if (
      tile.type !== TileType.Vacant &&
      tile.type !== TileType.Road &&
      tile.type !== TileType.Rail
    ) {
      kinds.add(tile.type)
      levels += tile.level
    }
  })

  const housing = Math.min(30, housed * 4)
  const jobs = Math.min(20, employed * 3)
  const mood = Math.min(18, Math.round(happiness * 0.18))
  const variety = Math.min(18, kinds.size * 3)
  const growth = Math.min(10, levels)
  const land = Math.min(8, Math.round((averageLandValue(map) / LAND_VALUE_MAX) * 8))

  return Math.max(0, Math.min(100, housing + jobs + mood + variety + growth + land))
}
