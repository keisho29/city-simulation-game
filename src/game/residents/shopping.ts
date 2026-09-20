import { BUILDING_XP_SHOP_VISIT, HUNGER_SHOP_THRESHOLD } from '../constants.ts'
import { collectShopCut } from '../economy/circulation.ts'
import type { Treasury } from '../economy/treasury.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { isWorkHours } from './commute.ts'
import { buyFood, canAffordFood } from './needs.ts'
import { ResidentState, type Resident } from './resident.ts'

export function maybeStartShopping(
  resident: Resident,
  map: WorldMap,
  hour: number,
  isHoliday: boolean,
): void {
  if (
    resident.state === ResidentState.SeekingHome ||
    resident.state === ResidentState.MovingIn ||
    resident.state === ResidentState.MovingToWork ||
    resident.state === ResidentState.Working ||
    resident.state === ResidentState.MovingToShop ||
    resident.state === ResidentState.Shopping ||
    resident.state === ResidentState.MovingToHome ||
    resident.state === ResidentState.MovingToPickup ||
    resident.state === ResidentState.Hauling
  ) {
    return
  }

  if (resident.state !== ResidentState.Home || !resident.home) {
    return
  }

  const idleNow = isHoliday || !isWorkHours(hour) || !resident.workplace
  if (!idleNow) {
    return
  }

  if (resident.hunger < HUNGER_SHOP_THRESHOLD || !canAffordFood(resident)) {
    return
  }

  const shop = map.findNearestShop(resident.home, { minFood: 1 })
  if (!shop) {
    return
  }

  resident.shopTarget = shop
  resident.state = ResidentState.MovingToShop
}

export function finishShopping(resident: Resident, map?: WorldMap, treasury?: Treasury): void {
  const shop = resident.shopTarget
  const bought = buyFood(resident, map, shop)
  if (bought && shop && map) {
    map.grantXp(shop.x, shop.y, BUILDING_XP_SHOP_VISIT)
  }
  if (bought && treasury) {
    collectShopCut(treasury)
  }
  resident.shopTarget = undefined
  resident.state = resident.home ? ResidentState.MovingToHome : ResidentState.SeekingHome
}
