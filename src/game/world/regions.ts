import type { LandscapeProfile } from '../map/landscape.ts'
import { TileType } from '../map/tile.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { cityDevelopment } from '../progress/development.ts'
import { EraId } from '../progress/era.ts'
import { hasTech, type ProgressState } from '../progress/progress.ts'
import { TechId } from '../progress/tech.ts'
import type { Resident } from '../residents/resident.ts'

export const RegionId = {
  Edo: 'edo-city',
  Yokohama: 'yokohama',
  Kawagoe: 'kawagoe',
  Mito: 'mito',
  Takasaki: 'takasaki',
} as const

export type RegionId = (typeof RegionId)[keyof typeof RegionId]

export const TransitLinkMode = {
  Rail: 'rail',
  Water: 'water',
} as const

export type TransitLinkMode = (typeof TransitLinkMode)[keyof typeof TransitLinkMode]

export type RegionLink = {
  to: RegionId
  modes: readonly TransitLinkMode[]
}

export type RegionDef = {
  id: RegionId
  name: string
  climate: string
  harvest: number
  wood: number
  land: number
  seed: number
  landscape: LandscapeProfile
  grassTint: number
  map: { x: number; y: number }
  links: readonly RegionLink[]
}

export const REGIONS: Record<RegionId, RegionDef> = {
  'edo-city': {
    id: RegionId.Edo,
    name: '江戸',
    climate: '温暖',
    harvest: 1,
    wood: 1,
    land: 1,
    seed: 1700,
    landscape: {},
    grassTint: 0xffffff,
    map: { x: 58, y: 54 },
    links: [
      { to: RegionId.Yokohama, modes: ['water', 'rail'] },
      { to: RegionId.Kawagoe, modes: ['rail'] },
      { to: RegionId.Mito, modes: ['rail'] },
      { to: RegionId.Takasaki, modes: ['rail'] },
    ],
  },
  yokohama: {
    id: RegionId.Yokohama,
    name: '横浜',
    climate: '海辺',
    harvest: 0.92,
    wood: 0.85,
    land: 1.12,
    seed: 1859,
    landscape: { lakes: 2, rivers: 1, forests: 1, rocks: 1 },
    grassTint: 0xd0e8d4,
    map: { x: 64, y: 78 },
    links: [{ to: RegionId.Edo, modes: ['water', 'rail'] }],
  },
  kawagoe: {
    id: RegionId.Kawagoe,
    name: '川越',
    climate: '内陸',
    harvest: 1.25,
    wood: 0.9,
    land: 0.95,
    seed: 1457,
    landscape: { lakes: 0, rivers: 1, forests: 2, rocks: 0 },
    grassTint: 0xe8f4b8,
    map: { x: 36, y: 42 },
    links: [{ to: RegionId.Edo, modes: ['rail'] }],
  },
  mito: {
    id: RegionId.Mito,
    name: '水戸',
    climate: '冷涼',
    harvest: 0.88,
    wood: 1.2,
    land: 0.9,
    seed: 1609,
    landscape: { lakes: 1, rivers: 1, forests: 4, rocks: 2 },
    grassTint: 0xc4dcc8,
    map: { x: 78, y: 18 },
    links: [{ to: RegionId.Edo, modes: ['rail'] }],
  },
  takasaki: {
    id: RegionId.Takasaki,
    name: '高崎',
    climate: '山地',
    harvest: 0.82,
    wood: 1.4,
    land: 0.86,
    seed: 1617,
    landscape: { lakes: 0, rivers: 0, forests: 5, rocks: 4 },
    grassTint: 0xd8e0b0,
    map: { x: 16, y: 34 },
    links: [{ to: RegionId.Edo, modes: ['rail'] }],
  },
}

export const REGION_IDS = Object.keys(REGIONS) as RegionId[]

export function isRegionId(value: unknown): value is RegionId {
  return typeof value === 'string' && Object.hasOwn(REGIONS, value)
}

export function regionName(id: RegionId): string {
  return REGIONS[id].name
}

export function regionGrassTint(id: RegionId, era: EraId): number {
  const base = REGIONS[id].grassTint
  if (era === EraId.Meiji && base === 0xffffff) {
    return 0xb8d890
  }
  if (era === EraId.Meiji) {
    return 0xc4d8a8
  }
  return base
}

export type RegionUnlockView = {
  ready: boolean
  missing: string[]
}

export function regionUnlockView(
  id: RegionId,
  progress: ProgressState,
  maps: ReadonlyMap<RegionId, WorldMap>,
  residents: ReadonlyMap<RegionId, readonly Resident[]>,
): RegionUnlockView {
  if (id === RegionId.Edo) {
    return { ready: true, missing: [] }
  }

  const edoMap = maps.get(RegionId.Edo)
  const edoPeople = residents.get(RegionId.Edo) ?? []
  const edoHoused = edoPeople.filter((resident) => resident.home).length
  const edoDev = edoMap ? cityDevelopment(edoMap, edoPeople) : 0
  const missing: string[] = []

  if (id === RegionId.Yokohama) {
    const hasPort = edoMap?.hasType(TileType.Port) ?? false
    if (!hasPort && !hasTech(progress, TechId.Logistics)) {
      missing.push('港か物流')
    }
    if (edoHoused < 6) {
      missing.push('入居6人')
    }
  }

  if (id === RegionId.Kawagoe) {
    if (!hasTech(progress, TechId.Farming)) {
      missing.push('農法')
    }
    if (edoDev < 16) {
      missing.push('発展16')
    }
  }

  if (id === RegionId.Mito) {
    const meiji = progress.era === EraId.Meiji
    if (!meiji && edoHoused < 10) {
      missing.push('入居10人か1800年代')
    }
    if (!meiji && edoDev < 24) {
      missing.push('発展24')
    }
  }

  if (id === RegionId.Takasaki) {
    if (!hasTech(progress, TechId.Logistics)) {
      missing.push('物流')
    }
    if (edoDev < 20) {
      missing.push('発展20')
    }
  }

  return { ready: missing.length === 0, missing }
}

export function openLinkMode(
  from: RegionId,
  to: RegionId,
  maps: ReadonlyMap<RegionId, WorldMap>,
  unlocked: ReadonlySet<RegionId>,
): TransitLinkMode | undefined {
  if (!unlocked.has(from) || !unlocked.has(to)) {
    return undefined
  }
  const link = REGIONS[from].links.find((entry) => entry.to === to)
  if (!link) {
    return undefined
  }
  const fromMap = maps.get(from)
  const toMap = maps.get(to)
  if (!fromMap || !toMap) {
    return undefined
  }
  if (link.modes.includes('water') && fromMap.hasType(TileType.Port) && toMap.hasType(TileType.Port)) {
    return 'water'
  }
  if (
    link.modes.includes('rail') &&
    fromMap.hasType(TileType.Station) &&
    toMap.hasType(TileType.Station)
  ) {
    return 'rail'
  }
  return undefined
}

export function linkedRegions(
  id: RegionId,
  maps: ReadonlyMap<RegionId, WorldMap>,
  unlocked: ReadonlySet<RegionId>,
): Array<{ id: RegionId; mode: TransitLinkMode }> {
  const found: Array<{ id: RegionId; mode: TransitLinkMode }> = []
  for (const link of REGIONS[id].links) {
    const mode = openLinkMode(id, link.to, maps, unlocked)
    if (mode) {
      found.push({ id: link.to, mode })
    }
  }
  return found
}

export function linkLabel(id: RegionId, maps: ReadonlyMap<RegionId, WorldMap>, unlocked: ReadonlySet<RegionId>): string {
  const links = linkedRegions(id, maps, unlocked)
  if (links.length === 0) {
    return '未接続'
  }
  return links
    .map((link) => `${regionName(link.id)}（${link.mode === 'rail' ? '鉄道' : '船'}）`)
    .join('、')
}
