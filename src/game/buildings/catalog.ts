import { TileType } from '../map/tile.ts'

export const BuildTool = {
  None: 'none',
  Erase: 'erase',
  House: 'house',
  Road: 'road',
  Farm: 'farm',
  Shop: 'shop',
  Workshop: 'workshop',
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
}

export function isBuildingTool(tool: string): tool is BuildingId {
  return Object.hasOwn(BUILDINGS, tool)
}

export function isEditTool(tool: string): tool is BuildingId | typeof BuildTool.Erase {
  return isBuildingTool(tool) || tool === BuildTool.Erase
}
