import { PROSPERITY_START } from '../constants.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { averageHappiness } from '../residents/happiness.ts'
import type { Resident } from '../residents/resident.ts'
import { worldHappinessDelta, type WorldEventState } from './events.ts'

export function tickProsperity(
  current: number,
  map: WorldMap,
  residents: readonly Resident[],
  worldEvent: WorldEventState,
  gameHours = 24,
): number {
  if (gameHours <= 0) {
    return current
  }
  if (residents.length === 0) {
    return Math.max(8, current - gameHours / 24)
  }

  const happiness = averageHappiness(residents) + worldHappinessDelta(worldEvent)
  const housed = residents.filter((resident) => resident.home).length / residents.length
  const jobs = residents.filter((resident) => resident.workplace).length / residents.length
  const houses = map.houseSlotsTotal()
  const crowded = houses > 0 && residents.length > houses * 1.4

  let delta = 0
  if (happiness >= 62 && housed >= 0.7 && jobs >= 0.55) {
    delta += 1.4
  } else if (happiness < 38 || housed < 0.45 || jobs < 0.35) {
    delta -= 1.8
  } else {
    delta += 0.15
  }
  if (crowded) {
    delta -= 1.2
  }

  return Math.max(8, Math.min(100, current + delta * (gameHours / 24)))
}

export function parseProsperity(raw: unknown): number {
  return typeof raw === 'number' && Number.isFinite(raw)
    ? Math.max(8, Math.min(100, raw))
    : PROSPERITY_START
}

export function fortuneLabel(value: number): string {
  if (value >= 78) {
    return `繁栄 ${Math.round(value)}`
  }
  if (value >= 52) {
    return `安定 ${Math.round(value)}`
  }
  if (value >= 32) {
    return `停滞 ${Math.round(value)}`
  }
  return `衰退 ${Math.round(value)}`
}
