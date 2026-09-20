import { TileType } from '../map/tile.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { ResidentState, type Resident } from '../residents/resident.ts'
import { addTechProgress, type ProgressState } from './progress.ts'
import { TechId, type TechId as TechIdType } from './tech.ts'

export function tickTechDiscovery(
  state: ProgressState,
  map: WorldMap,
  residents: readonly Resident[],
  gameHours: number,
): TechIdType[] {
  if (gameHours <= 0) {
    return []
  }

  const gained: TechIdType[] = []
  const add = (id: TechIdType, amount: number) => {
    const discovered = addTechProgress(state, id, amount)
    if (discovered) {
      gained.push(discovered)
    }
  }

  for (const resident of residents) {
    if (
      (resident.state === ResidentState.Working ||
        resident.state === ResidentState.MovingToPickup ||
        resident.state === ResidentState.Hauling) &&
      resident.workplace
    ) {
      const job = map.getTile(resident.workplace.x, resident.workplace.y)?.type
      if (job === TileType.Farm) {
        add(TechId.Farming, gameHours)
      }
      if (job === TileType.Shop || job === TileType.Market) {
        add(TechId.Trade, gameHours)
      }
      if (job === TileType.Workshop) {
        add(TechId.Craft, gameHours)
        add(TechId.Industry, gameHours)
      }
      if (job === TileType.Clinic) {
        add(TechId.Hygiene, gameHours)
      }
      if (job === TileType.Warehouse || resident.state === ResidentState.Hauling) {
        add(TechId.Logistics, gameHours)
      }
      if (job === TileType.School) {
        add(TechId.Literacy, gameHours * 1.4)
      }
      if (job === TileType.Factory) {
        add(TechId.Industry, gameHours * 1.4)
        add(TechId.Railways, gameHours * 0.6)
      }
      if (job === TileType.Station) {
        add(TechId.Railways, gameHours * 1.4)
      }
      if (job === TileType.Port) {
        add(TechId.Logistics, gameHours * 1.2)
      }
    }

    if (resident.state === ResidentState.Riding) {
      add(TechId.Railways, gameHours)
      add(TechId.Logistics, gameHours * 0.4)
    }

    if (
      resident.home &&
      (resident.state === ResidentState.Home || resident.state === ResidentState.Shopping)
    ) {
      add(TechId.Literacy, gameHours * 0.35)
    }

    if (resident.state === ResidentState.Shopping) {
      add(TechId.Trade, gameHours * 0.8)
    }
  }

  return [...new Set(gained)]
}
