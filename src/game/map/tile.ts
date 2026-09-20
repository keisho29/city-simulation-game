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
}
