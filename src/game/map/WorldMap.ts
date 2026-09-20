import { HOUSE_CAPACITY, JOB_CAPACITY, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE } from '../constants.ts'
import { isWorkplaceType, TileType, type Tile } from './tile.ts'

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
      occupantIds: [],
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
    tile.occupantIds = []
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

  findVacantHouse(): { x: number; y: number } | undefined {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (this.isHouseVacant(x, y)) {
          return { x, y }
        }
      }
    }

    return undefined
  }

  isHouseVacant(x: number, y: number): boolean {
    const tile = this.getTile(x, y)
    return tile?.type === TileType.House && tile.occupantIds.length < HOUSE_CAPACITY
  }

  occupyHouse(x: number, y: number, residentId: string): boolean {
    const tile = this.getTile(x, y)
    if (!tile || tile.type !== TileType.House || tile.occupantIds.length >= HOUSE_CAPACITY) {
      return false
    }

    if (!tile.occupantIds.includes(residentId)) {
      tile.occupantIds.push(residentId)
    }

    return true
  }

  findVacantJob(near?: { x: number; y: number }): { x: number; y: number } | undefined {
    let best: { x: number; y: number; distance: number } | undefined

    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (!this.isJobVacant(x, y)) {
          continue
        }

        const distance = near ? Math.abs(x - near.x) + Math.abs(y - near.y) : 0
        if (!best || distance < best.distance) {
          best = { x, y, distance }
          if (!near) {
            return { x, y }
          }
        }
      }
    }

    return best ? { x: best.x, y: best.y } : undefined
  }

  isJobVacant(x: number, y: number): boolean {
    const tile = this.getTile(x, y)
    return tile !== undefined && isWorkplaceType(tile.type) && tile.occupantIds.length < JOB_CAPACITY
  }

  occupyJob(x: number, y: number, residentId: string): boolean {
    const tile = this.getTile(x, y)
    if (!tile || !isWorkplaceType(tile.type) || tile.occupantIds.length >= JOB_CAPACITY) {
      return false
    }

    if (!tile.occupantIds.includes(residentId)) {
      tile.occupantIds.push(residentId)
    }

    return true
  }

  tileCenter(x: number, y: number): { x: number; y: number } {
    return {
      x: (x + 0.5) * this.tileSize,
      y: (y + 0.5) * this.tileSize,
    }
  }

  forEachTile(callback: (x: number, y: number, tile: Tile) => void): void {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        callback(x, y, this.tiles[this.index(x, y)])
      }
    }
  }

  snapshotTiles(): Tile[] {
    return this.tiles.map((tile) => ({
      type: tile.type,
      occupantIds: [...tile.occupantIds],
    }))
  }

  restoreTiles(tiles: Tile[]): boolean {
    if (tiles.length !== this.tiles.length) {
      return false
    }

    for (let index = 0; index < tiles.length; index += 1) {
      const source = tiles[index]
      const target = this.tiles[index]
      target.type = source.type
      target.occupantIds = [...source.occupantIds]
    }

    return true
  }

  isRoad(x: number, y: number): boolean {
    return this.getTile(x, y)?.type === TileType.Road
  }

  roadConnections(x: number, y: number): number {
    let mask = 0
    if (this.isRoad(x, y - 1)) {
      mask |= 1
    }
    if (this.isRoad(x + 1, y)) {
      mask |= 2
    }
    if (this.isRoad(x, y + 1)) {
      mask |= 4
    }
    if (this.isRoad(x - 1, y)) {
      mask |= 8
    }
    return mask
  }

  private index(x: number, y: number): number {
    return y * this.width + x
  }
}
