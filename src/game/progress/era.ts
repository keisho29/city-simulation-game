export const EraId = {
  Edo: 'edo',
  Meiji: 'meiji',
  Industrial: 'industrial',
  Contemporary: 'contemporary',
  Future: 'future',
} as const

export type EraId = (typeof EraId)[keyof typeof EraId]

export type EraDef = {
  id: EraId
  name: string
  startYear: number
  next?: EraId
}

export const ERA_ORDER: EraId[] = [
  EraId.Edo,
  EraId.Meiji,
  EraId.Industrial,
  EraId.Contemporary,
  EraId.Future,
]

export const ERAS: Record<EraId, EraDef> = {
  edo: {
    id: EraId.Edo,
    name: '1700年代',
    startYear: 1700,
    next: EraId.Meiji,
  },
  meiji: {
    id: EraId.Meiji,
    name: '1800年代',
    startYear: 1800,
    next: EraId.Industrial,
  },
  industrial: {
    id: EraId.Industrial,
    name: '1900年代',
    startYear: 1900,
    next: EraId.Contemporary,
  },
  contemporary: {
    id: EraId.Contemporary,
    name: '2000年代',
    startYear: 2000,
    next: EraId.Future,
  },
  future: {
    id: EraId.Future,
    name: '未来',
    startYear: 2100,
  },
}

export function isEraId(value: unknown): value is EraId {
  return typeof value === 'string' && Object.hasOwn(ERAS, value)
}

export function eraName(era: EraId): string {
  return ERAS[era].name
}

export function nextEra(era: EraId): EraId | undefined {
  return ERAS[era].next
}

export function eraRank(era: EraId): number {
  return Math.max(0, ERA_ORDER.indexOf(era))
}

export function eraAtLeast(era: EraId, need: EraId): boolean {
  return eraRank(era) >= eraRank(need)
}

export function eraGrassTint(era: EraId): number {
  if (era === EraId.Future) {
    return 0x9ad8c8
  }
  if (era === EraId.Contemporary) {
    return 0xb8d090
  }
  if (era === EraId.Industrial) {
    return 0xc4c898
  }
  if (era === EraId.Meiji) {
    return 0xb8d890
  }
  return 0xffffff
}

export function eraRoadTint(era: EraId): number {
  if (era === EraId.Future) {
    return 0xb8c4d8
  }
  if (era === EraId.Contemporary) {
    return 0x9aa4b0
  }
  if (era === EraId.Industrial) {
    return 0x8a8e96
  }
  if (era === EraId.Meiji) {
    return 0xc5c9d4
  }
  return 0xffffff
}

export function eraMapEdge(era: EraId): number {
  if (era === EraId.Future) {
    return 0x2f8a7a
  }
  if (era === EraId.Contemporary) {
    return 0x4a6a38
  }
  if (era === EraId.Industrial) {
    return 0x5a5a48
  }
  if (era === EraId.Meiji) {
    return 0x4a7a38
  }
  return 0x3d7a18
}

export function eraRailTint(era: EraId): number {
  if (era === EraId.Future) {
    return 0xc8f4ff
  }
  if (era === EraId.Contemporary) {
    return 0xb8c4d0
  }
  if (era === EraId.Industrial) {
    return 0x9aa0a8
  }
  if (era === EraId.Meiji) {
    return 0xd0ccc4
  }
  return 0xb8b0a4
}

export function eraTransitLabel(era: EraId): string {
  if (era === EraId.Future) {
    return '未来交通'
  }
  if (era === EraId.Contemporary) {
    return '自動車・航空'
  }
  if (era === EraId.Industrial) {
    return '鉄道・自動車'
  }
  if (era === EraId.Meiji) {
    return '鉄道・汽船'
  }
  return '徒歩・舟'
}
