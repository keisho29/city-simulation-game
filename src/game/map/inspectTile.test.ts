import { describe, expect, it } from 'vitest'
import { Terrain, TileType } from './tile.ts'
import { WorldMap } from './WorldMap.ts'
import { tileDetailView } from './inspectTile.ts'

describe('tile inspect', () => {
  it('shows name, level, experience, and capacity', () => {
    const map = new WorldMap(3, 3, 32)
    map.place(1, 1, TileType.House)
    map.occupyHouse(1, 1, 'r1')
    const view = tileDetailView(map, 1, 1)
    expect(view?.name).toBe('木造住宅')
    expect(view?.level).toBe('Lv.1')
    expect(view?.xp).toBe('0 / 60')
    expect(view?.capacity).toBe('住居 1/1')
    expect(view?.stock).toBe('-')
    expect(Number(view?.value)).toBeGreaterThan(0)
  })

  it('names a lake when the tile is water', () => {
    const map = new WorldMap(3, 3, 32)
    const tile = map.getTile(1, 1)
    if (tile) {
      tile.terrain = Terrain.Water
    }
    expect(tileDetailView(map, 1, 1)?.name).toBe('湖')
  })
})
