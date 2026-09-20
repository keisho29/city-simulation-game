import { MAP_HEIGHT, MAP_WIDTH, TILE_SIZE } from '../constants.ts'
import { TileType, type Tile } from './tile.ts'

export class WorldMap {
  readonly width: number
  readonly height: number
  readonly tileSize: number
  private readonly tiles: Tile[]

  constructor(
    width = MAP_WIDTH,
    height = MAP_HEIGHT,
    tileSize = TILE_SIZE,
  ) {
    this.width = width
    this.height = height
    this.tileSize = tileSize
    this.tiles = Array.from({ length: width * height }, () => ({
      type: TileType.Vacant,
    }))
  }

  get pixelWidth(): number {
    return this.width * this.tileSize
  }

  get pixelHeight(): number {
    return this.height * this.tileSize
  }

  get tileCount(): number {
    return this.tiles.length
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height
  }

  getTile(x: number, y: number): Tile | undefined {
    if (!this.inBounds(x, y)) {
      return undefined
    }

    return this.tiles[this.index(x, y)]
  }

  setTileType(x: number, y: number, type: TileType): void {
    const tile = this.getTile(x, y)
    if (!tile) {
      return
    }

    tile.type = type
  }

  worldToTile(worldX: number, worldY: number): { x: number; y: number } | undefined {
    const x = Math.floor(worldX / this.tileSize)
    const y = Math.floor(worldY / this.tileSize)
    if (!this.inBounds(x, y)) {
      return undefined
    }

    return { x, y }
  }

  canPlace(x: number, y: number): boolean {
    return this.getTile(x, y)?.type === TileType.Vacant
  }

  place(x: number, y: number, type: TileType): boolean {
    if (!this.canPlace(x, y)) {
      return false
    }

    this.setTileType(x, y, type)
    return true
  }

  canClear(x: number, y: number): boolean {
    const type = this.getTile(x, y)?.type
    return type !== undefined && type !== TileType.Vacant
  }

  clear(x: number, y: number): boolean {
    if (!this.canClear(x, y)) {
      return false
    }

    this.setTileType(x, y, TileType.Vacant)
    return true
  }

  forEachTile(callback: (x: number, y: number, tile: Tile) => void): void {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        callback(x, y, this.tiles[this.index(x, y)])
      }
    }
  }

  private index(x: number, y: number): number {
    return y * this.width + x
  }
}
