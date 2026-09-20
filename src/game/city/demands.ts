import { TileType } from '../map/tile.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import type { Resident } from '../residents/resident.ts'

export function cityDemands(map: WorldMap, residents: readonly Resident[]): string[] {
  const demands: string[] = []
  const homeless = residents.filter((resident) => !resident.home).length
  const jobless = residents.filter((resident) => resident.home && !resident.workplace).length

  if (homeless > 0 || (residents.length > 0 && map.vacantHouseSlots() === 0)) {
    demands.push('住宅不足')
  }

  if (jobless > 0 && map.vacantJobSlots() === 0) {
    demands.push('仕事不足')
  }

  if (residents.length >= 5 && !hasType(map, TileType.Shop)) {
    demands.push('商店不足')
  }

  return demands
}

function hasType(map: WorldMap, type: TileType): boolean {
  let found = false
  map.forEachTile((_x, _y, tile) => {
    if (tile.type === type) {
      found = true
    }
  })
  return found
}
