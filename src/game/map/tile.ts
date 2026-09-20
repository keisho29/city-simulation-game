export const TileType = {
  Vacant: 'vacant',
  Road: 'road',
  House: 'house',
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

export type TileType = (typeof TileType)[keyof typeof TileType]

export const Terrain = {
  Grass: 'grass',
  Water: 'water',
  River: 'river',
  Forest: 'forest',
  Rock: 'rock',
} as const

export type Terrain = (typeof Terrain)[keyof typeof Terrain]

export type Tile = {
  type: TileType
  terrain: Terrain
  occupantIds: string[]
  level: number
  xp: number
  variant: number
  food: number
  wood: number
  goods: number
}

export function isWorkplaceType(type: TileType): boolean {
  return (
    type === TileType.Farm ||
    type === TileType.Shop ||
    type === TileType.Workshop ||
    type === TileType.Market ||
    type === TileType.Warehouse ||
    type === TileType.Clinic ||
    type === TileType.School ||
    type === TileType.Factory ||
    type === TileType.Station ||
    type === TileType.Port ||
    type === TileType.Airport
  )
}

export function isTrackType(type: TileType): boolean {
  return type === TileType.Rail || type === TileType.Station
}

export function isFoodStallType(type: TileType): boolean {
  return type === TileType.Shop || type === TileType.Market
}

export function isGrowableType(type: TileType): boolean {
  return type === TileType.House || isWorkplaceType(type)
}

export function isBuildableTerrain(terrain: Terrain): boolean {
  return terrain === Terrain.Grass
}

export function isWaterTerrain(terrain: Terrain): boolean {
  return terrain === Terrain.Water || terrain === Terrain.River
}

export function createTile(
  type: TileType = TileType.Vacant,
  variant = 0,
  terrain: Terrain = Terrain.Grass,
): Tile {
  return {
    type,
    terrain,
    occupantIds: [],
    level: 1,
    xp: 0,
    variant: isGrowableType(type) ? variant : 0,
    food: 0,
    wood: 0,
    goods: 0,
  }
}
