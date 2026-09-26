import { describe, expect, it } from 'vitest'
import { TileType } from './tile.ts'
import { WorldMap } from './WorldMap.ts'
import { footprintSpan, isWideBuildingType } from './footprint.ts'

describe('building footprints', () => {
  it('keeps roads and farms on one tile', () => {
    expect(footprintSpan(TileType.Road)).toBe(1)
    expect(footprintSpan(TileType.Farm)).toBe(1)
    expect(footprintSpan(TileType.Rail)).toBe(1)
    expect(isWideBuildingType(TileType.House)).toBe(true)
    expect(isWideBuildingType(TileType.Well)).toBe(true)
    expect(isWideBuildingType(TileType.Road)).toBe(false)

    const map = new WorldMap(8, 8, 32)
    expect(map.place(2, 2, TileType.Road)).toBe(true)
    expect(map.place(3, 2, TileType.Farm)).toBe(true)
    expect(map.getTile(2, 2)?.type).toBe(TileType.Road)
    expect(map.getTile(3, 2)?.type).toBe(TileType.Farm)
    expect(map.getTile(3, 3)?.type).toBe(TileType.Vacant)
  })

  it('places a house on four tiles and a well on four tiles', () => {
    const map = new WorldMap(8, 8, 32)
    expect(map.place(1, 1, TileType.House)).toBe(true)
    expect(map.getTile(1, 1)?.type).toBe(TileType.House)
    expect(map.getTile(2, 1)?.type).toBe(TileType.Extension)
    expect(map.getTile(1, 2)?.type).toBe(TileType.Extension)
    expect(map.getTile(2, 2)?.type).toBe(TileType.Extension)
    expect(map.getTile(2, 2)?.anchor).toEqual({ x: 1, y: 1 })

    expect(map.place(4, 1, TileType.Well)).toBe(true)
    expect(map.placedSpan(4, 1)).toBe(2)
    expect(map.clear(2, 2)).toBe(true)
    expect(map.getTile(1, 1)?.type).toBe(TileType.Vacant)
    expect(map.getTile(2, 2)?.type).toBe(TileType.Vacant)
  })

  it('rejects overlapping houses and keeps old one-tile houses working', () => {
    const map = new WorldMap(8, 8, 32)
    expect(map.place(1, 1, TileType.House)).toBe(true)
    expect(map.place(2, 1, TileType.House)).toBe(false)

    map.setTileType(5, 5, TileType.House)
    expect(map.getTile(5, 5)?.type).toBe(TileType.House)
    expect(map.getTile(6, 5)?.type).toBe(TileType.Vacant)
    expect(map.placedSpan(5, 5)).toBe(1)
    expect(map.occupyHouse(5, 5, 'r1')).toBe(true)
  })
})
