import {
  CLINIC_RADIUS,
  HAPPINESS_BASE,
  HAPPINESS_BROKE,
  HAPPINESS_CLINIC,
  HAPPINESS_COMFORTABLE,
  HAPPINESS_FESTIVAL,
  HAPPINESS_HAS_JOB,
  HAPPINESS_HOLIDAY_REST,
  HAPPINESS_HUNGRY,
  HAPPINESS_LONG_COMMUTE,
  HAPPINESS_NO_HOME,
  HAPPINESS_NO_JOB,
  HAPPINESS_SHORT_COMMUTE,
  HAPPINESS_STARVING,
  HAPPINESS_WELL,
  HAPPINESS_WELL_FED,
  HUNGER_HUNGRY,
  HUNGER_STARVING,
  HUNGER_WELL_FED,
  LONG_COMMUTE_DISTANCE,
  MONEY_COMFORTABLE,
  SHOP_PRICE,
  SHORT_COMMUTE_DISTANCE,
  WELL_RADIUS,
} from '../constants.ts'
import { TileType } from '../map/tile.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { ResidentState, type Resident } from './resident.ts'

export type HappinessContext = {
  isHoliday?: boolean
  festival?: boolean
  map?: WorldMap
  worldMood?: number
}

export function commuteDistance(resident: Resident): number | undefined {
  if (!resident.home || !resident.workplace) {
    return undefined
  }

  return (
    Math.abs(resident.home.x - resident.workplace.x) +
    Math.abs(resident.home.y - resident.workplace.y)
  )
}

export function residentHappiness(
  resident: Resident,
  context: HappinessContext = {},
): number {
  let happiness = HAPPINESS_BASE

  if (resident.home) {
    if (resident.workplace) {
      happiness += HAPPINESS_HAS_JOB
      const distance = commuteDistance(resident) ?? 0
      if (distance <= SHORT_COMMUTE_DISTANCE) {
        happiness += HAPPINESS_SHORT_COMMUTE
      } else if (distance >= LONG_COMMUTE_DISTANCE) {
        happiness += HAPPINESS_LONG_COMMUTE
      }
    } else {
      happiness += HAPPINESS_NO_JOB
    }
  } else {
    happiness += HAPPINESS_NO_HOME
    happiness += resident.workplace ? HAPPINESS_HAS_JOB : HAPPINESS_NO_JOB
  }

  if (resident.hunger >= HUNGER_STARVING) {
    happiness += HAPPINESS_STARVING
  } else if (resident.hunger >= HUNGER_HUNGRY) {
    happiness += HAPPINESS_HUNGRY
  } else if (resident.hunger <= HUNGER_WELL_FED) {
    happiness += HAPPINESS_WELL_FED
  }

  if (resident.money < SHOP_PRICE) {
    happiness += HAPPINESS_BROKE
  } else if (resident.money >= MONEY_COMFORTABLE) {
    happiness += HAPPINESS_COMFORTABLE
  }

  if (
    context.isHoliday &&
    (resident.state === ResidentState.Home ||
      resident.state === ResidentState.Shopping ||
      resident.state === ResidentState.MovingToShop)
  ) {
    happiness += HAPPINESS_HOLIDAY_REST
  }

  if (context.festival) {
    happiness += HAPPINESS_FESTIVAL
  }

  if (context.worldMood) {
    happiness += context.worldMood
  }

  if (context.map && resident.home) {
    const well = context.map.findNearest(resident.home, (tile, x, y) => {
      return (
        tile.type === TileType.Well &&
        Math.abs(x - resident.home!.x) + Math.abs(y - resident.home!.y) <= WELL_RADIUS
      )
    })
    if (well) {
      happiness += HAPPINESS_WELL
    }

    const clinic = context.map.findNearest(resident.home, (tile, x, y) => {
      return (
        tile.type === TileType.Clinic &&
        Math.abs(x - resident.home!.x) + Math.abs(y - resident.home!.y) <= CLINIC_RADIUS
      )
    })
    if (clinic) {
      happiness += HAPPINESS_CLINIC
    }
  }

  return Math.max(0, Math.min(100, happiness))
}

export function applyHappiness(
  residents: Resident[],
  context: HappinessContext = {},
): void {
  for (const resident of residents) {
    resident.happiness = residentHappiness(resident, context)
  }
}

export function averageHappiness(residents: readonly Resident[]): number {
  if (residents.length === 0) {
    return 0
  }

  const total = residents.reduce((sum, resident) => sum + resident.happiness, 0)
  return Math.round(total / residents.length)
}
