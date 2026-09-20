import {
  HUNGER_PER_GAME_HOUR,
  HUNGER_WORK_MULTIPLIER,
  MS_PER_DAY_AT_SPEED_1,
  SHOP_HUNGER_RELIEF,
  SHOP_PRICE,
  WAGE_FARM_PER_HOUR,
  WAGE_SHOP_PER_HOUR,
  WAGE_WORKSHOP_PER_HOUR,
  type GameSpeed,
} from '../constants.ts'
import { TileType } from '../map/tile.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { ResidentState, type Resident } from './resident.ts'

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
    default:
      return 0
  }
}

export function canAffordFood(resident: Resident): boolean {
  return resident.money >= SHOP_PRICE
}

export function buyFood(resident: Resident): boolean {
  if (!canAffordFood(resident)) {
    return false
  }

  resident.money -= SHOP_PRICE
  resident.hunger = Math.max(0, resident.hunger - SHOP_HUNGER_RELIEF)
  return true
}

export function tickNeeds(resident: Resident, map: WorldMap, gameHours: number): void {
  if (gameHours <= 0) {
    return
  }

  const working = resident.state === ResidentState.Working
  const hungerRate = HUNGER_PER_GAME_HOUR * (working ? HUNGER_WORK_MULTIPLIER : 1)
  resident.hunger = Math.max(0, Math.min(100, resident.hunger + hungerRate * gameHours))

  if (!working || !resident.workplace) {
    return
  }

  const job = map.getTile(resident.workplace.x, resident.workplace.y)
  resident.money += wagePerHour(job?.type) * gameHours
}
