import {
  BUILDING_XP_HOME_PER_HOUR,
  BUILDING_XP_WORK_PER_HOUR,
  HOUSE_TAX_PER_LEVEL_PER_HOUR,
  SHOP_CITY_CUT,
  WORK_TAX_RATIO,
} from '../constants.ts'
import { houseSlots } from '../map/growth.ts'
import { landValue } from '../map/landValue.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { ResidentState, type Resident } from '../residents/resident.ts'
import { wageForTile } from '../residents/needs.ts'
import type { Treasury } from './treasury.ts'

export function collectShopCut(treasury: Treasury): void {
  treasury.receive(SHOP_CITY_CUT)
}

export function tickCityEconomy(
  resident: Resident,
  map: WorldMap,
  treasury: Treasury,
  gameHours: number,
): void {
  if (gameHours <= 0) {
    return
  }

  if (
    (resident.state === ResidentState.Working ||
      resident.state === ResidentState.MovingToPickup ||
      resident.state === ResidentState.Hauling) &&
    resident.workplace
  ) {
    const job = map.getTile(resident.workplace.x, resident.workplace.y)
    const wage = wageForTile(job?.type, job?.level ?? 1) * gameHours
    treasury.receive(wage * WORK_TAX_RATIO)
    map.grantXp(resident.workplace.x, resident.workplace.y, BUILDING_XP_WORK_PER_HOUR * gameHours)
  }

  if (
    resident.home &&
    (resident.state === ResidentState.Home || resident.state === ResidentState.MovingIn)
  ) {
    const home = map.getTile(resident.home.x, resident.home.y)
    if (home && houseSlots(home) > 0) {
      const value = landValue(map, resident.home.x, resident.home.y)
      const tax = HOUSE_TAX_PER_LEVEL_PER_HOUR * home.level * (1 + value / 200) * gameHours
      const paid = Math.min(resident.money, tax)
      resident.money = Math.max(0, resident.money - paid)
      treasury.receive(paid)
      map.grantXp(resident.home.x, resident.home.y, BUILDING_XP_HOME_PER_HOUR * gameHours)
    }
  }
}
