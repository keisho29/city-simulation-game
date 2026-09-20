import {
  HAPPINESS_BASE,
  HAPPINESS_HAS_JOB,
  HAPPINESS_LONG_COMMUTE,
  HAPPINESS_NO_HOME,
  HAPPINESS_NO_JOB,
  HAPPINESS_SHORT_COMMUTE,
  LONG_COMMUTE_DISTANCE,
  SHORT_COMMUTE_DISTANCE,
} from '../constants.ts'
import type { Resident } from './resident.ts'

export function commuteDistance(resident: Resident): number | undefined {
  if (!resident.home || !resident.workplace) {
    return undefined
  }

  return (
    Math.abs(resident.home.x - resident.workplace.x) +
    Math.abs(resident.home.y - resident.workplace.y)
  )
}

export function residentHappiness(resident: Resident): number {
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

  return Math.max(0, Math.min(100, happiness))
}

export function applyHappiness(residents: Resident[]): void {
  for (const resident of residents) {
    resident.happiness = residentHappiness(resident)
  }
}

export function averageHappiness(residents: Resident[]): number {
  if (residents.length === 0) {
    return 0
  }

  const total = residents.reduce((sum, resident) => sum + resident.happiness, 0)
  return Math.round(total / residents.length)
}
