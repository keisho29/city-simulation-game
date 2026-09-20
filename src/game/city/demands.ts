import { HUNGER_HUNGRY } from '../constants.ts'
import { StockKind } from '../economy/goods.ts'
import { isFoodStallType, TileType } from '../map/tile.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { EraId, eraAtLeast } from '../progress/era.ts'
import { hasTech, type ProgressState } from '../progress/progress.ts'
import { TechId } from '../progress/tech.ts'
import type { Resident } from '../residents/resident.ts'

export function cityDemands(
  map: WorldMap,
  residents: readonly Resident[],
  extra?: { food?: number; wood?: number; era?: EraId; fortune?: number; progress?: ProgressState },
): string[] {
  const demands: string[] = []
  const homeless = residents.filter((resident) => !resident.home).length
  const jobless = residents.filter((resident) => resident.home && !resident.workplace).length
  const hungry = residents.filter((resident) => resident.hunger >= HUNGER_HUNGRY).length
  const linkedFood = extra?.food ?? 0
  const linkedWood = extra?.wood ?? 0
  const era = extra?.era
  const fortune = extra?.fortune
  const progress = extra?.progress

  if (homeless > 0 || (residents.length > 0 && map.vacantHouseSlots() === 0)) {
    demands.push('住宅不足')
  }

  if (jobless > 0 && map.vacantJobSlots() === 0) {
    demands.push('仕事不足')
  }

  if (residents.length >= 5 && !hasStall(map)) {
    demands.push('商店不足')
  }

  if (
    residents.length >= 3 &&
    (hungry >= 2 || map.totalStock(StockKind.Food) + linkedFood < residents.length * 0.4)
  ) {
    demands.push('食料不足')
  }

  if (residents.length >= 8 && !map.hasType(TileType.Well)) {
    demands.push('水不足')
  }

  if (residents.length >= 12 && !map.hasType(TileType.Clinic)) {
    demands.push('診療不足')
  }

  if (map.hasType(TileType.Workshop) && map.totalStock(StockKind.Wood) + linkedWood < 2) {
    demands.push('木材不足')
  }

  if (fortune !== undefined && fortune < 32) {
    demands.push('町の衰退を食い止めてほしい')
  }

  if (era && eraAtLeast(era, EraId.Industrial) && !map.hasType(TileType.Factory)) {
    demands.push('工業化が遅れている')
  }

  if (progress && hasTech(progress, TechId.Automobiles) && !map.hasType(TileType.Road)) {
    demands.push('道路の整備')
  }

  if (era && eraAtLeast(era, EraId.Contemporary) && !map.hasType(TileType.School)) {
    demands.push('教育の拡充')
  }

  if (era && eraAtLeast(era, EraId.Contemporary) && !map.hasType(TileType.Clinic)) {
    demands.push('医療の拡充')
  }

  if (era === EraId.Future && !map.hasType(TileType.Airport)) {
    demands.push('未来交通の整備')
  }

  return demands
}

function hasStall(map: WorldMap): boolean {
  let found = false
  map.forEachTile((_x, _y, tile) => {
    if (isFoodStallType(tile.type)) {
      found = true
    }
  })
  return found
}
