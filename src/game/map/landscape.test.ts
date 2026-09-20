import { describe, expect, it } from 'vitest'
import { generateLandscapeLayout, terrainDisplayName } from './landscape.ts'
import { Terrain, TileType } from './tile.ts'
import { WorldMap } from './WorldMap.ts'

describe('landscape', () => {
  it('names natural tiles in Japanese', () => {
    expect(terrainDisplayName(Terrain.Grass)).toBe('空き地')
    expect(terrainDisplayName(Terrain.Water)).toBe('湖')
    expect(terrainDisplayName(Terrain.River)).toBe('川')
    expect(terrainDisplayName(Terrain.Forest)).toBe('森')
    expect(terrainDisplayName(Terrain.Rock)).toBe('岩場')
  })

  it('paints the same features for the same seed', () => {
    const first = generateLandscapeLayout(50, 50, 42)
    const second = generateLandscapeLayout(50, 50, 42)
    expect(first).toEqual(second)
    expect(first).toContain(Terrain.Water)
    expect(first).toContain(Terrain.River)
    expect(first).toContain(Terrain.Forest)
    expect(first).toContain(Terrain.Rock)
  })

  it('keeps nature sparse and spread out', () => {
    const cells = generateLandscapeLayout(50, 50, 7)
    const nature = cells.filter((terrain) => terrain !== Terrain.Grass)
    expect(nature.length / cells.length).toBeLessThan(0.08)

    const quadrants = [false, false, false, false]
    cells.forEach((terrain, index) => {
      if (terrain === Terrain.Grass) {
        return
      }
      const x = index % 50
      const y = Math.floor(index / 50)
      const quad = (x >= 25 ? 1 : 0) + (y >= 25 ? 2 : 0)
      quadrants[quad] = true
    })
    expect(quadrants.filter(Boolean).length).toBeGreaterThanOrEqual(3)
  })

  it('keeps trees from sitting on neighboring tiles', () => {
    const width = 50
    const cells = generateLandscapeLayout(width, 50, 11)
    for (let y = 0; y < 50; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (cells[y * width + x] !== Terrain.Forest) {
          continue
        }
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) {
              continue
            }
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= width || ny >= 50) {
              continue
            }
            expect(cells[ny * width + nx]).not.toBe(Terrain.Forest)
          }
        }
      }
    }
  })

  it('keeps the map center buildable', () => {
    const map = new WorldMap(20, 20, 32)
    map.generateLandscape(99)
    expect(map.canPlace(10, 10)).toBe(true)
    expect(map.place(10, 10, TileType.House)).toBe(true)
  })

  it('blocks buildings on water, woods, and rock', () => {
    const map = new WorldMap(8, 8, 32)
    const tile = map.getTile(0, 0)
    if (tile) {
      tile.terrain = Terrain.Water
    }
    expect(map.canPlace(0, 0)).toBe(false)
    expect(map.place(0, 0, TileType.Road)).toBe(false)
    expect(map.canClear(0, 0)).toBe(false)
  })
})
