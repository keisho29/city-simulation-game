import { describe, expect, it } from 'vitest'
import { WorldMap } from '../map/WorldMap.ts'
import { isoTileCenter, isoWorldToTile } from './iso.ts'

describe('isometric tiles', () => {
  it('round-trips a tile center back to the same cell', () => {
    const map = new WorldMap(8, 8, 32)
    for (const x of [0, 3, 7]) {
      for (const y of [0, 2, 7]) {
        const center = map.tileCenter(x, y)
        expect(map.worldToTile(center.x, center.y)).toEqual({ x, y })
      }
    }
  })

  it('keeps neighbors as diagonal steps on screen', () => {
    const east = isoTileCenter(1, 0, 8, 8)
    const origin = isoTileCenter(0, 0, 8, 8)
    expect(east.x).toBeGreaterThan(origin.x)
    expect(east.y).toBeGreaterThan(origin.y)
    expect(isoWorldToTile(east.x, east.y, 8, 8)).toEqual({ x: 1, y: 0 })
  })

  it('sizes the map to the isometric bounding box', () => {
    const map = new WorldMap(8, 8, 32)
    expect(map.pixelWidth).toBe(512)
    expect(map.pixelHeight).toBe(272)
  })

  it('snaps leftover square coordinates onto an iso home', () => {
    const map = new WorldMap(8, 8, 32)
    const occupant = { worldX: 16, worldY: 16, home: { x: 3, y: 2 } }
    map.alignToIso(occupant)
    expect(occupant.worldX).toBe(map.tileCenter(3, 2).x)
    expect(occupant.worldY).toBe(map.tileCenter(3, 2).y)
  })
})
