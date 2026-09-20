import { TileType } from '../map/tile.ts'

export const BuildTool = {
  None: 'none',
  House: 'house',
} as const

export type BuildTool = (typeof BuildTool)[keyof typeof BuildTool]

export const BUILDINGS = {
  house: {
    id: BuildTool.House,
    name: '木造住宅',
    tileType: TileType.House,
    cost: 50,
  },
} as const
