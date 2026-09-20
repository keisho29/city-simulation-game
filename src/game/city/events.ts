import {
  EVENT_COOLDOWN_HOURS,
  EVENT_DURATION_HOURS,
  HARVEST_BUMPER,
  HARVEST_DROUGHT,
} from '../constants.ts'

export const CityEventKind = {
  None: 'none',
  Bumper: 'bumper',
  Drought: 'drought',
  Festival: 'festival',
} as const

export type CityEventKind = (typeof CityEventKind)[keyof typeof CityEventKind]

export type CityEventState = {
  kind: CityEventKind
  remainingHours: number
  cooldownHours: number
}

export function createCityEvent(): CityEventState {
  return {
    kind: CityEventKind.None,
    remainingHours: 0,
    cooldownHours: EVENT_COOLDOWN_HOURS,
  }
}

export function harvestMultiplier(event: CityEventState): number {
  if (event.kind === CityEventKind.Bumper) {
    return HARVEST_BUMPER
  }
  if (event.kind === CityEventKind.Drought) {
    return HARVEST_DROUGHT
  }
  return 1
}

export function eventDisplayName(event: CityEventState): string {
  switch (event.kind) {
    case CityEventKind.Bumper:
      return '豊作'
    case CityEventKind.Drought:
      return '凶作'
    case CityEventKind.Festival:
      return '祭り'
    default:
      return 'なし'
  }
}

export function tickCityEvents(
  event: CityEventState,
  gameHours: number,
  roll: () => number = Math.random,
): CityEventState {
  if (gameHours <= 0) {
    return event
  }

  if (event.kind !== CityEventKind.None) {
    const remaining = event.remainingHours - gameHours
    if (remaining > 0) {
      return { ...event, remainingHours: remaining }
    }

    return {
      kind: CityEventKind.None,
      remainingHours: 0,
      cooldownHours: EVENT_COOLDOWN_HOURS,
    }
  }

  const cooldown = event.cooldownHours - gameHours
  if (cooldown > 0) {
    return { ...event, cooldownHours: cooldown }
  }

  const chance = roll()
  if (chance < 0.18) {
    return { kind: CityEventKind.Bumper, remainingHours: EVENT_DURATION_HOURS, cooldownHours: 0 }
  }
  if (chance < 0.36) {
    return { kind: CityEventKind.Drought, remainingHours: EVENT_DURATION_HOURS, cooldownHours: 0 }
  }
  if (chance < 0.52) {
    return { kind: CityEventKind.Festival, remainingHours: EVENT_DURATION_HOURS, cooldownHours: 0 }
  }

  return {
    kind: CityEventKind.None,
    remainingHours: 0,
    cooldownHours: EVENT_COOLDOWN_HOURS,
  }
}
