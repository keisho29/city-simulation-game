import {
  WORLD_EVENT_COOLDOWN_HOURS,
  WORLD_EVENT_DURATION_HOURS,
} from '../constants.ts'
import { EraId, eraAtLeast } from '../progress/era.ts'

export const WorldEventKind = {
  None: 'none',
  Boom: 'boom',
  Crash: 'crash',
  Plague: 'plague',
  Expo: 'expo',
  Climate: 'climate',
} as const

export type WorldEventKind = (typeof WorldEventKind)[keyof typeof WorldEventKind]

export type WorldEventState = {
  kind: WorldEventKind
  remainingHours: number
  cooldownHours: number
}

export function createWorldEvent(): WorldEventState {
  return {
    kind: WorldEventKind.None,
    remainingHours: 0,
    cooldownHours: WORLD_EVENT_COOLDOWN_HOURS,
  }
}

export function worldEventName(event: WorldEventState): string {
  switch (event.kind) {
    case WorldEventKind.Boom:
      return '好景気'
    case WorldEventKind.Crash:
      return '恐慌'
    case WorldEventKind.Plague:
      return '疫病'
    case WorldEventKind.Expo:
      return '万国博'
    case WorldEventKind.Climate:
      return '気候異変'
    default:
      return 'なし'
  }
}

export function worldHarvestMult(event: WorldEventState): number {
  if (event.kind === WorldEventKind.Climate) {
    return 0.72
  }
  if (event.kind === WorldEventKind.Boom) {
    return 1.12
  }
  if (event.kind === WorldEventKind.Crash) {
    return 0.88
  }
  return 1
}

export function worldGoodsMult(event: WorldEventState): number {
  if (event.kind === WorldEventKind.Boom || event.kind === WorldEventKind.Expo) {
    return 1.2
  }
  if (event.kind === WorldEventKind.Crash) {
    return 0.7
  }
  return 1
}

export function worldHappinessDelta(event: WorldEventState): number {
  if (event.kind === WorldEventKind.Expo) {
    return 8
  }
  if (event.kind === WorldEventKind.Boom) {
    return 4
  }
  if (event.kind === WorldEventKind.Crash) {
    return -8
  }
  if (event.kind === WorldEventKind.Plague) {
    return -12
  }
  return 0
}

export function tickWorldEvents(
  event: WorldEventState,
  gameHours: number,
  era: EraId,
  roll: () => number = Math.random,
): WorldEventState {
  if (gameHours <= 0) {
    return event
  }

  if (event.kind !== WorldEventKind.None) {
    const remaining = event.remainingHours - gameHours
    if (remaining > 0) {
      return { ...event, remainingHours: remaining }
    }
    return {
      kind: WorldEventKind.None,
      remainingHours: 0,
      cooldownHours: WORLD_EVENT_COOLDOWN_HOURS,
    }
  }

  const cooldown = event.cooldownHours - gameHours
  if (cooldown > 0) {
    return { ...event, cooldownHours: cooldown }
  }

  const chance = roll()
  if (chance < 0.16) {
    return start(WorldEventKind.Boom)
  }
  if (chance < 0.28) {
    return start(WorldEventKind.Crash)
  }
  if (chance < 0.38 && eraAtLeast(era, EraId.Meiji)) {
    return start(WorldEventKind.Plague)
  }
  if (chance < 0.5 && eraAtLeast(era, EraId.Industrial)) {
    return start(WorldEventKind.Expo)
  }
  if (chance < 0.6) {
    return start(WorldEventKind.Climate)
  }

  return {
    kind: WorldEventKind.None,
    remainingHours: 0,
    cooldownHours: WORLD_EVENT_COOLDOWN_HOURS,
  }
}

function start(kind: WorldEventKind): WorldEventState {
  return {
    kind,
    remainingHours: WORLD_EVENT_DURATION_HOURS,
    cooldownHours: 0,
  }
}

export function isWorldEventKind(value: unknown): value is WorldEventKind {
  return typeof value === 'string' && Object.values(WorldEventKind).includes(value as WorldEventKind)
}

export function parseWorldEvent(raw: unknown): WorldEventState {
  if (!raw || typeof raw !== 'object') {
    return createWorldEvent()
  }
  const record = raw as Record<string, unknown>
  if (!isWorldEventKind(record.kind)) {
    return createWorldEvent()
  }
  return {
    kind: record.kind,
    remainingHours:
      typeof record.remainingHours === 'number' && Number.isFinite(record.remainingHours)
        ? Math.max(0, record.remainingHours)
        : 0,
    cooldownHours:
      typeof record.cooldownHours === 'number' && Number.isFinite(record.cooldownHours)
        ? Math.max(0, record.cooldownHours)
        : 0,
  }
}
