import {
  HUNGER_PER_GAME_HOUR,
  HUNGER_WORK_MULTIPLIER,
  MS_PER_DAY_AT_SPEED_1,
  SHOP_HUNGER_RELIEF,
  SHOP_PRICE,
  WAGE_CLINIC_PER_HOUR,
  WAGE_FARM_PER_HOUR,
  WAGE_LEVEL_BONUS,
  WAGE_MARKET_PER_HOUR,
  WAGE_SCHOOL_PER_HOUR,
  WAGE_FACTORY_PER_HOUR,
  WAGE_AIRPORT_PER_HOUR,
  WAGE_PORT_PER_HOUR,
  WAGE_SHOP_PER_HOUR,
  WAGE_STATION_PER_HOUR,
  WAGE_WAREHOUSE_PER_HOUR,
  WAGE_WORKSHOP_PER_HOUR,
  type GameSpeed,
} from '../constants.ts'
import { StockKind } from '../economy/goods.ts'
import { TileType } from '../map/tile.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { ResidentState, type Resident, type TileRef } from './resident.ts'

export function gameHoursFromDelta(deltaMs: number, speed: GameSpeed): number {
  if (speed === 0 || deltaMs <= 0) {
    return 0
  }

  return ((deltaMs * speed) / MS_PER_DAY_AT_SPEED_1) * 24
}

export function wagePerHour(type: TileType | undefined): number {
  switch (type) {
    case TileType.Farm:
      return WAGE_FARM_PER_HOUR
    case TileType.Shop:
      return WAGE_SHOP_PER_HOUR
    case TileType.Workshop:
      return WAGE_WORKSHOP_PER_HOUR
    case TileType.Warehouse:
      return WAGE_WAREHOUSE_PER_HOUR
    case TileType.Market:
      return WAGE_MARKET_PER_HOUR
    case TileType.Clinic:
      return WAGE_CLINIC_PER_HOUR
    case TileType.School:
      return WAGE_SCHOOL_PER_HOUR
    case TileType.Factory:
      return WAGE_FACTORY_PER_HOUR
    case TileType.Station:
      return WAGE_STATION_PER_HOUR
    case TileType.Port:
      return WAGE_PORT_PER_HOUR
    case TileType.Airport:
      return WAGE_AIRPORT_PER_HOUR
    default:
      return 0
  }
}

export function wageForTile(type: TileType | undefined, level: number): number {
  return wagePerHour(type) * (1 + Math.max(0, level - 1) * WAGE_LEVEL_BONUS)
}

export function canAffordFood(resident: Resident): boolean {
  return resident.money >= SHOP_PRICE
}

export function buyFood(
  resident: Resident,
  map?: WorldMap,
  shop?: TileRef,
): boolean {
  if (!canAffordFood(resident)) {
    return false
  }

  if (shop && map) {
    const tile = map.getTile(shop.x, shop.y)
    if (!tile || tile.food < 1) {
      return false
    }
    map.takeStock(shop.x, shop.y, StockKind.Food, 1)
  }

  resident.money -= SHOP_PRICE
  resident.hunger = Math.max(0, resident.hunger - SHOP_HUNGER_RELIEF)
  return true
}

export function tickNeeds(resident: Resident, map: WorldMap, gameHours: number): void {
  if (gameHours <= 0) {
    return
  }

  const working =
    resident.state === ResidentState.Working ||
    resident.state === ResidentState.MovingToPickup ||
    resident.state === ResidentState.Hauling
  const hungerRate = HUNGER_PER_GAME_HOUR * (working ? HUNGER_WORK_MULTIPLIER : 1)
  resident.hunger = Math.max(0, Math.min(100, resident.hunger + hungerRate * gameHours))

  if (!working || !resident.workplace) {
    return
  }

  const job = map.getTile(resident.workplace.x, resident.workplace.y)
  resident.money += wageForTile(job?.type, job?.level ?? 1) * gameHours
}
