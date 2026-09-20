import { TileType } from '../map/tile.ts'

export const BuildTool = {
  None: 'none',
  Erase: 'erase',
  House: 'house',
  Road: 'road',
  Farm: 'farm',
  Shop: 'shop',
  Workshop: 'workshop',
  Market: 'market',
  Well: 'well',
  Warehouse: 'warehouse',
  Clinic: 'clinic',
  School: 'school',
  Factory: 'factory',
  Station: 'station',
  Rail: 'rail',
  Port: 'port',
  Airport: 'airport',
} as const

export type BuildTool = (typeof BuildTool)[keyof typeof BuildTool]
export type BuildingId = Exclude<BuildTool, 'none' | 'erase'>

export const PaintMode = {
  Click: 'click',
  Drag: 'drag',
} as const

export type PaintMode = (typeof PaintMode)[keyof typeof PaintMode]

export type BuildingDef = {
  id: BuildingId
  name: string
  tileType: TileType
  cost: number
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  house: {
    id: 'house',
    name: '木造住宅',
    tileType: TileType.House,
    cost: 50,
  },
  road: {
    id: 'road',
    name: '道路',
    tileType: TileType.Road,
    cost: 5,
  },
  farm: {
    id: 'farm',
    name: '農地',
    tileType: TileType.Farm,
    cost: 80,
  },
  shop: {
    id: 'shop',
    name: '商店',
    tileType: TileType.Shop,
    cost: 100,
  },
  workshop: {
    id: 'workshop',
    name: '工房',
    tileType: TileType.Workshop,
    cost: 150,
  },
  market: {
    id: 'market',
    name: '市場',
    tileType: TileType.Market,
    cost: 130,
  },
  well: {
    id: 'well',
    name: '井戸',
    tileType: TileType.Well,
    cost: 40,
  },
  warehouse: {
    id: 'warehouse',
    name: '倉庫',
    tileType: TileType.Warehouse,
    cost: 110,
  },
  clinic: {
    id: 'clinic',
    name: '診療所',
    tileType: TileType.Clinic,
    cost: 160,
  },
  school: {
    id: 'school',
    name: '寺子屋',
    tileType: TileType.School,
    cost: 180,
  },
  factory: {
    id: 'factory',
    name: '工場',
    tileType: TileType.Factory,
    cost: 220,
  },
  station: {
    id: 'station',
    name: '駅',
    tileType: TileType.Station,
    cost: 240,
  },
  rail: {
    id: 'rail',
    name: '線路',
    tileType: TileType.Rail,
    cost: 8,
  },
  port: {
    id: 'port',
    name: '港',
    tileType: TileType.Port,
    cost: 200,
  },
  airport: {
    id: 'airport',
    name: '空港',
    tileType: TileType.Airport,
    cost: 320,
  },
}

export function isBuildingTool(tool: string): tool is BuildingId {
  return Object.hasOwn(BUILDINGS, tool)
}

export function isEditTool(tool: string): tool is BuildingId | typeof BuildTool.Erase {
  return isBuildingTool(tool) || tool === BuildTool.Erase
}
