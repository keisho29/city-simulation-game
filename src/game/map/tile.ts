export const TileType = {
  Vacant: 'vacant',
  Road: 'road',
  House: 'house',
  Farm: 'farm',
  Shop: 'shop',
  Workshop: 'workshop',
} as const

export type TileType = (typeof TileType)[keyof typeof TileType]

export type Tile = {
  type: TileType
  occupantIds: string[]
  level: number
  xp: number
  variant: number
}

export function isWorkplaceType(type: TileType): boolean {
  return type === TileType.Farm || type === TileType.Shop || type === TileType.Workshop
}

export function isGrowableType(type: TileType): boolean {
  return type === TileType.House || isWorkplaceType(type)
}

export function createTile(type: TileType = TileType.Vacant, variant = 0): Tile {
  return {
    type,
    occupantIds: [],
    level: 1,
    xp: 0,
    variant: isGrowableType(type) ? variant : 0,
  }
}
