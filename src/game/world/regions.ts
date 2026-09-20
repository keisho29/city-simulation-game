import type { LandscapeProfile } from '../map/landscape.ts'
import { TileType } from '../map/tile.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { cityDevelopment } from '../progress/development.ts'
import { EraId, eraAtLeast, eraGrassTint } from '../progress/era.ts'
import { hasTech, type ProgressState } from '../progress/progress.ts'
import { TechId } from '../progress/tech.ts'
import type { Resident } from '../residents/resident.ts'

export const CountryId = {
  Japan: 'japan',
  Korea: 'korea',
  China: 'china',
  America: 'america',
  Britain: 'britain',
} as const

export type CountryId = (typeof CountryId)[keyof typeof CountryId]

export const AreaId = {
  Hokkaido: 'hokkaido',
  Tohoku: 'tohoku',
  Kanto: 'kanto',
  Chubu: 'chubu',
  Kansai: 'kansai',
  Chugoku: 'chugoku',
  Shikoku: 'shikoku',
  Kyushu: 'kyushu',
  Okinawa: 'okinawa',
  Korea: 'korea',
  EastChina: 'east-china',
  WestCoast: 'west-coast',
  England: 'england',
} as const

export type AreaId = (typeof AreaId)[keyof typeof AreaId]

export const COUNTRIES: Record<CountryId, { id: CountryId; name: string }> = {
  japan: { id: CountryId.Japan, name: '日本' },
  korea: { id: CountryId.Korea, name: '朝鮮' },
  china: { id: CountryId.China, name: '清' },
  america: { id: CountryId.America, name: 'アメリカ' },
  britain: { id: CountryId.Britain, name: 'イギリス' },
}

export const AREAS: Record<AreaId, { id: AreaId; name: string; country: CountryId }> = {
  hokkaido: { id: AreaId.Hokkaido, name: '北海道', country: CountryId.Japan },
  tohoku: { id: AreaId.Tohoku, name: '東北', country: CountryId.Japan },
  kanto: { id: AreaId.Kanto, name: '関東', country: CountryId.Japan },
  chubu: { id: AreaId.Chubu, name: '中部', country: CountryId.Japan },
  kansai: { id: AreaId.Kansai, name: '近畿', country: CountryId.Japan },
  chugoku: { id: AreaId.Chugoku, name: '中国', country: CountryId.Japan },
  shikoku: { id: AreaId.Shikoku, name: '四国', country: CountryId.Japan },
  kyushu: { id: AreaId.Kyushu, name: '九州', country: CountryId.Japan },
  okinawa: { id: AreaId.Okinawa, name: '沖縄', country: CountryId.Japan },
  korea: { id: AreaId.Korea, name: '朝鮮', country: CountryId.Korea },
  'east-china': { id: AreaId.EastChina, name: '華東', country: CountryId.China },
  'west-coast': { id: AreaId.WestCoast, name: '西海岸', country: CountryId.America },
  england: { id: AreaId.England, name: 'イングランド', country: CountryId.Britain },
}

export const RegionId = {
  Edo: 'edo-city',
  Yokohama: 'yokohama',
  Kawagoe: 'kawagoe',
  Mito: 'mito',
  Takasaki: 'takasaki',
  Hakodate: 'hakodate',
  Sendai: 'sendai',
  Nagoya: 'nagoya',
  Kyoto: 'kyoto',
  Osaka: 'osaka',
  Hiroshima: 'hiroshima',
  Takamatsu: 'takamatsu',
  Nagasaki: 'nagasaki',
  Naha: 'naha',
  Busan: 'busan',
  Shanghai: 'shanghai',
  SanFrancisco: 'sanfrancisco',
  London: 'london',
} as const

export type RegionId = (typeof RegionId)[keyof typeof RegionId]

export const TransitLinkMode = {
  Rail: 'rail',
  Water: 'water',
  Air: 'air',
} as const

export type TransitLinkMode = (typeof TransitLinkMode)[keyof typeof TransitLinkMode]

export type RegionLink = {
  to: RegionId
  modes: readonly TransitLinkMode[]
}

export type RegionDef = {
  id: RegionId
  name: string
  country: CountryId
  area: AreaId
  climate: string
  industry: string
  harvest: number
  wood: number
  land: number
  seed: number
  landscape: LandscapeProfile
  grassTint: number
  japan: { x: number; y: number }
  world: { x: number; y: number }
  links: RegionLink[]
}

type RegionSeed = Omit<RegionDef, 'links'>

const SEEDS: RegionSeed[] = [
  {
    id: RegionId.Edo,
    name: '江戸',
    country: CountryId.Japan,
    area: AreaId.Kanto,
    climate: '温暖',
    industry: '商業',
    harvest: 1,
    wood: 1,
    land: 1,
    seed: 1700,
    landscape: {},
    grassTint: 0xffffff,
    japan: { x: 76, y: 42 },
    world: { x: 86, y: 40 },
  },
  {
    id: RegionId.Yokohama,
    name: '横浜',
    country: CountryId.Japan,
    area: AreaId.Kanto,
    climate: '海辺',
    industry: '港湾',
    harvest: 0.92,
    wood: 0.85,
    land: 1.12,
    seed: 1859,
    landscape: { lakes: 2, rivers: 1, forests: 1, rocks: 1 },
    grassTint: 0xd0e8d4,
    japan: { x: 78, y: 50 },
    world: { x: 88, y: 46 },
  },
  {
    id: RegionId.Kawagoe,
    name: '川越',
    country: CountryId.Japan,
    area: AreaId.Kanto,
    climate: '内陸',
    industry: '米作',
    harvest: 1.25,
    wood: 0.9,
    land: 0.95,
    seed: 1457,
    landscape: { lakes: 0, rivers: 1, forests: 2, rocks: 0 },
    grassTint: 0xe8f4b8,
    japan: { x: 70, y: 40 },
    world: { x: 82, y: 38 },
  },
  {
    id: RegionId.Mito,
    name: '水戸',
    country: CountryId.Japan,
    area: AreaId.Kanto,
    climate: '冷涼',
    industry: '林業',
    harvest: 0.88,
    wood: 1.2,
    land: 0.9,
    seed: 1609,
    landscape: { lakes: 1, rivers: 1, forests: 4, rocks: 2 },
    grassTint: 0xc4dcc8,
    japan: { x: 82, y: 36 },
    world: { x: 88, y: 34 },
  },
  {
    id: RegionId.Takasaki,
    name: '高崎',
    country: CountryId.Japan,
    area: AreaId.Kanto,
    climate: '山地',
    industry: '絹織',
    harvest: 0.82,
    wood: 1.4,
    land: 0.86,
    seed: 1617,
    landscape: { lakes: 0, rivers: 0, forests: 5, rocks: 4 },
    grassTint: 0xd8e0b0,
    japan: { x: 64, y: 38 },
    world: { x: 80, y: 36 },
  },
  {
    id: RegionId.Hakodate,
    name: '函館',
    country: CountryId.Japan,
    area: AreaId.Hokkaido,
    climate: '寒冷',
    industry: '漁労',
    harvest: 0.72,
    wood: 1.35,
    land: 0.84,
    seed: 1854,
    landscape: { lakes: 1, rivers: 1, forests: 5, rocks: 3 },
    grassTint: 0xc8dce8,
    japan: { x: 72, y: 8 },
    world: { x: 84, y: 18 },
  },
  {
    id: RegionId.Sendai,
    name: '仙台',
    country: CountryId.Japan,
    area: AreaId.Tohoku,
    climate: '冷涼',
    industry: '米作',
    harvest: 1.12,
    wood: 1.15,
    land: 0.92,
    seed: 1600,
    landscape: { lakes: 0, rivers: 2, forests: 3, rocks: 1 },
    grassTint: 0xd4e8c0,
    japan: { x: 78, y: 26 },
    world: { x: 86, y: 28 },
  },
  {
    id: RegionId.Nagoya,
    name: '名古屋',
    country: CountryId.Japan,
    area: AreaId.Chubu,
    climate: '温暖',
    industry: '手工業',
    harvest: 1.08,
    wood: 0.95,
    land: 1.04,
    seed: 1610,
    landscape: { lakes: 0, rivers: 1, forests: 2, rocks: 1 },
    grassTint: 0xe4f0b8,
    japan: { x: 52, y: 50 },
    world: { x: 78, y: 48 },
  },
  {
    id: RegionId.Kyoto,
    name: '京都',
    country: CountryId.Japan,
    area: AreaId.Kansai,
    climate: '内陸',
    industry: '工芸',
    harvest: 1.05,
    wood: 0.88,
    land: 1.18,
    seed: 794,
    landscape: { lakes: 0, rivers: 1, forests: 2, rocks: 1 },
    grassTint: 0xe8f0c8,
    japan: { x: 40, y: 48 },
    world: { x: 76, y: 46 },
  },
  {
    id: RegionId.Osaka,
    name: '大阪',
    country: CountryId.Japan,
    area: AreaId.Kansai,
    climate: '温暖',
    industry: '問屋',
    harvest: 1.02,
    wood: 0.8,
    land: 1.22,
    seed: 1583,
    landscape: { lakes: 0, rivers: 2, forests: 1, rocks: 0 },
    grassTint: 0xdce8b0,
    japan: { x: 38, y: 54 },
    world: { x: 74, y: 50 },
  },
  {
    id: RegionId.Hiroshima,
    name: '広島',
    country: CountryId.Japan,
    area: AreaId.Chugoku,
    climate: '温暖',
    industry: '港湾',
    harvest: 0.98,
    wood: 1.05,
    land: 0.96,
    seed: 1589,
    landscape: { lakes: 1, rivers: 1, forests: 2, rocks: 1 },
    grassTint: 0xd0e4c4,
    japan: { x: 24, y: 52 },
    world: { x: 70, y: 48 },
  },
  {
    id: RegionId.Takamatsu,
    name: '高松',
    country: CountryId.Japan,
    area: AreaId.Shikoku,
    climate: '温暖',
    industry: '漁労',
    harvest: 0.94,
    wood: 0.9,
    land: 0.9,
    seed: 1588,
    landscape: { lakes: 1, rivers: 1, forests: 2, rocks: 1 },
    grassTint: 0xd8ecc8,
    japan: { x: 34, y: 60 },
    world: { x: 72, y: 54 },
  },
  {
    id: RegionId.Nagasaki,
    name: '長崎',
    country: CountryId.Japan,
    area: AreaId.Kyushu,
    climate: '海辺',
    industry: '交易',
    harvest: 0.9,
    wood: 0.86,
    land: 1.08,
    seed: 1571,
    landscape: { lakes: 2, rivers: 1, forests: 2, rocks: 2 },
    grassTint: 0xc8e0d4,
    japan: { x: 10, y: 64 },
    world: { x: 68, y: 58 },
  },
  {
    id: RegionId.Naha,
    name: '那覇',
    country: CountryId.Japan,
    area: AreaId.Okinawa,
    climate: '亜熱帯',
    industry: '砂糖',
    harvest: 1.18,
    wood: 0.7,
    land: 0.88,
    seed: 1429,
    landscape: { lakes: 1, rivers: 0, forests: 2, rocks: 1 },
    grassTint: 0xb8e0b0,
    japan: { x: 16, y: 88 },
    world: { x: 70, y: 74 },
  },
  {
    id: RegionId.Busan,
    name: '釜山',
    country: CountryId.Korea,
    area: AreaId.Korea,
    climate: '冷涼',
    industry: '漁労',
    harvest: 0.9,
    wood: 1.1,
    land: 0.94,
    seed: 1470,
    landscape: { lakes: 1, rivers: 1, forests: 3, rocks: 2 },
    grassTint: 0xc4d8c8,
    japan: { x: -1, y: -1 },
    world: { x: 62, y: 42 },
  },
  {
    id: RegionId.Shanghai,
    name: '上海',
    country: CountryId.China,
    area: AreaId.EastChina,
    climate: '温暖',
    industry: '絹織',
    harvest: 1.15,
    wood: 0.78,
    land: 1.16,
    seed: 1843,
    landscape: { lakes: 2, rivers: 2, forests: 1, rocks: 0 },
    grassTint: 0xd8e8b4,
    japan: { x: -1, y: -1 },
    world: { x: 54, y: 52 },
  },
  {
    id: RegionId.SanFrancisco,
    name: 'サンフランシスコ',
    country: CountryId.America,
    area: AreaId.WestCoast,
    climate: '霧',
    industry: '鉱業',
    harvest: 0.86,
    wood: 1.22,
    land: 1.2,
    seed: 1849,
    landscape: { lakes: 1, rivers: 0, forests: 3, rocks: 4 },
    grassTint: 0xd0dcc0,
    japan: { x: -1, y: -1 },
    world: { x: 14, y: 40 },
  },
  {
    id: RegionId.London,
    name: 'ロンドン',
    country: CountryId.Britain,
    area: AreaId.England,
    climate: '海洋性',
    industry: '工業',
    harvest: 0.84,
    wood: 0.75,
    land: 1.28,
    seed: 1700,
    landscape: { lakes: 1, rivers: 2, forests: 1, rocks: 1 },
    grassTint: 0xc8d4b8,
    japan: { x: -1, y: -1 },
    world: { x: 22, y: 28 },
  },
]

const LINK_PAIRS: Array<[RegionId, RegionId, readonly TransitLinkMode[]]> = [
  [RegionId.Edo, RegionId.Yokohama, ['water', 'rail', 'air']],
  [RegionId.Edo, RegionId.Kawagoe, ['rail']],
  [RegionId.Edo, RegionId.Mito, ['rail']],
  [RegionId.Edo, RegionId.Takasaki, ['rail']],
  [RegionId.Edo, RegionId.Sendai, ['rail', 'water']],
  [RegionId.Edo, RegionId.Nagoya, ['rail']],
  [RegionId.Edo, RegionId.Osaka, ['air']],
  [RegionId.Edo, RegionId.Nagasaki, ['air']],
  [RegionId.Yokohama, RegionId.Hakodate, ['water', 'air']],
  [RegionId.Yokohama, RegionId.SanFrancisco, ['water', 'air']],
  [RegionId.Sendai, RegionId.Hakodate, ['rail', 'water']],
  [RegionId.Takasaki, RegionId.Nagoya, ['rail']],
  [RegionId.Nagoya, RegionId.Osaka, ['rail']],
  [RegionId.Nagoya, RegionId.Kyoto, ['rail']],
  [RegionId.Osaka, RegionId.Kyoto, ['rail']],
  [RegionId.Osaka, RegionId.Hiroshima, ['rail', 'water']],
  [RegionId.Osaka, RegionId.Takamatsu, ['water']],
  [RegionId.Osaka, RegionId.Nagasaki, ['water', 'air']],
  [RegionId.Osaka, RegionId.London, ['air']],
  [RegionId.Hiroshima, RegionId.Nagasaki, ['water', 'rail']],
  [RegionId.Nagasaki, RegionId.Naha, ['water', 'air']],
  [RegionId.Nagasaki, RegionId.Busan, ['water']],
  [RegionId.Nagasaki, RegionId.Shanghai, ['water', 'air']],
  [RegionId.Nagasaki, RegionId.London, ['water', 'air']],
]

export const REGIONS: Record<RegionId, RegionDef> = Object.fromEntries(
  SEEDS.map((seed) => [seed.id, { ...seed, links: [] as RegionLink[] }]),
) as Record<RegionId, RegionDef>

for (const [from, to, modes] of LINK_PAIRS) {
  REGIONS[from].links.push({ to, modes })
  REGIONS[to].links.push({ to: from, modes })
}

export const REGION_IDS = Object.keys(REGIONS) as RegionId[]
export const JAPAN_REGION_IDS = REGION_IDS.filter((id) => REGIONS[id].country === CountryId.Japan)
export const OVERSEAS_REGION_IDS = REGION_IDS.filter((id) => REGIONS[id].country !== CountryId.Japan)

export function isRegionId(value: unknown): value is RegionId {
  return typeof value === 'string' && Object.hasOwn(REGIONS, value)
}

export function regionName(id: RegionId): string {
  return REGIONS[id].name
}

export function countryName(id: CountryId): string {
  return COUNTRIES[id].name
}

export function areaName(id: AreaId): string {
  return AREAS[id].name
}

export function isOverseas(id: RegionId): boolean {
  return REGIONS[id].country !== CountryId.Japan
}

export function regionGrassTint(id: RegionId, era: EraId): number {
  if (eraAtLeast(era, EraId.Industrial)) {
    return eraGrassTint(era)
  }
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

  const edo = stats(RegionId.Edo, maps, residents)
  const missing: string[] = []
  const meiji = eraAtLeast(progress.era, EraId.Meiji)
  const open = (city: RegionId) => maps.has(city)
  const needOpen = (city: RegionId, label?: string) => {
    if (!open(city)) {
      missing.push(label ?? regionName(city))
    }
  }
  const needAnyOpen = (cities: RegionId[], label: string) => {
    if (!cities.some((city) => open(city))) {
      missing.push(label)
    }
  }

  if (id === RegionId.Yokohama) {
    if (!edo.has(TileType.Port) && !hasTech(progress, TechId.Logistics)) {
      missing.push('港か物流')
    }
    if (edo.housed < 6) {
      missing.push('入居6人')
    }
  } else if (id === RegionId.Kawagoe) {
    if (!hasTech(progress, TechId.Farming)) {
      missing.push('農法')
    }
    if (edo.dev < 16) {
      missing.push('発展16')
    }
  } else if (id === RegionId.Mito) {
    if (!meiji && edo.housed < 10) {
      missing.push('入居10人か1800年代')
    }
    if (!meiji && edo.dev < 24) {
      missing.push('発展24')
    }
  } else if (id === RegionId.Takasaki) {
    if (!hasTech(progress, TechId.Logistics)) {
      missing.push('物流')
    }
    if (edo.dev < 20) {
      missing.push('発展20')
    }
  } else if (id === RegionId.Sendai) {
    if (edo.housed < 8) {
      missing.push('入居8人')
    }
    if (edo.dev < 16) {
      missing.push('発展16')
    }
  } else if (id === RegionId.Hakodate) {
    needOpen(RegionId.Yokohama)
    if (!hasTech(progress, TechId.Logistics) && !edo.has(TileType.Port) && !stats(RegionId.Yokohama, maps, residents).has(TileType.Port)) {
      missing.push('港か物流')
    }
  } else if (id === RegionId.Nagoya) {
    if (!hasTech(progress, TechId.Farming)) {
      missing.push('農法')
    }
    if (edo.dev < 18 && !open(RegionId.Takasaki)) {
      missing.push('発展18か高崎')
    }
  } else if (id === RegionId.Osaka) {
    if (!open(RegionId.Nagoya) && (edo.dev < 28 || !hasTech(progress, TechId.Trade))) {
      missing.push('名古屋か商業と発展28')
    }
  } else if (id === RegionId.Kyoto) {
    needOpen(RegionId.Osaka)
  } else if (id === RegionId.Hiroshima) {
    needOpen(RegionId.Osaka)
    if (!hasTech(progress, TechId.Logistics)) {
      missing.push('物流')
    }
  } else if (id === RegionId.Takamatsu) {
    needOpen(RegionId.Osaka)
    if (!hasTech(progress, TechId.Logistics)) {
      missing.push('物流')
    }
  } else if (id === RegionId.Nagasaki) {
    needAnyOpen([RegionId.Osaka, RegionId.Hiroshima], '大阪か広島')
    if (!hasTech(progress, TechId.Trade)) {
      missing.push('商業')
    }
  } else if (id === RegionId.Naha) {
    needOpen(RegionId.Nagasaki)
    if (!meiji) {
      missing.push('1800年代')
    }
  } else if (id === RegionId.Busan) {
    needOpen(RegionId.Nagasaki)
    if (!meiji) {
      missing.push('1800年代')
    }
    if (!hasTech(progress, TechId.Logistics) && !stats(RegionId.Nagasaki, maps, residents).has(TileType.Port)) {
      missing.push('港か物流')
    }
  } else if (id === RegionId.Shanghai) {
    needOpen(RegionId.Nagasaki)
    if (!hasTech(progress, TechId.Trade)) {
      missing.push('商業')
    }
    if (!hasTech(progress, TechId.Logistics)) {
      missing.push('物流')
    }
  } else if (id === RegionId.SanFrancisco) {
    needOpen(RegionId.Yokohama)
    if (!meiji) {
      missing.push('1800年代')
    }
    if (!hasTech(progress, TechId.Industry)) {
      missing.push('工業')
    }
  } else if (id === RegionId.London) {
    needAnyOpen([RegionId.Nagasaki, RegionId.Yokohama], '長崎か横浜')
    if (!meiji) {
      missing.push('1800年代')
    }
    if (!hasTech(progress, TechId.Railways)) {
      missing.push('鉄道')
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
  if (link.modes.includes('air') && fromMap.hasType(TileType.Airport) && toMap.hasType(TileType.Airport)) {
    return 'air'
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

export function linkModeName(mode: TransitLinkMode): string {
  if (mode === 'rail') {
    return '鉄道'
  }
  if (mode === 'water') {
    return '船'
  }
  return '空路'
}

export function linkLabel(id: RegionId, maps: ReadonlyMap<RegionId, WorldMap>, unlocked: ReadonlySet<RegionId>): string {
  const links = linkedRegions(id, maps, unlocked)
  if (links.length === 0) {
    return '未接続'
  }
  return links.map((link) => `${regionName(link.id)}（${linkModeName(link.mode)}）`).join('、')
}

function stats(
  id: RegionId,
  maps: ReadonlyMap<RegionId, WorldMap>,
  residents: ReadonlyMap<RegionId, readonly Resident[]>,
) {
  const map = maps.get(id)
  const people = residents.get(id) ?? []
  return {
    housed: people.filter((resident) => resident.home).length,
    dev: map ? cityDevelopment(map, people) : 0,
    has: (type: TileType) => map?.hasType(type) ?? false,
  }
}
