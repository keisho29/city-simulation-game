export const EraId = {
  Edo: 'edo',
  Meiji: 'meiji',
} as const

export type EraId = (typeof EraId)[keyof typeof EraId]

export type EraDef = {
  id: EraId
  name: string
  startYear: number
  next?: EraId
}

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

export function eraGrassTint(era: EraId): number {
  return era === EraId.Meiji ? 0xb8d890 : 0xffffff
}

export function eraRoadTint(era: EraId): number {
  return era === EraId.Meiji ? 0xc5c9d4 : 0xffffff
}

export function eraMapEdge(era: EraId): number {
  return era === EraId.Meiji ? 0x4a7a38 : 0x3d7a18
}
