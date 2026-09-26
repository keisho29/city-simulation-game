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
    expect(terrainDisplayName(Terrain.Hill)).toBe('丘陵')
    expect(terrainDisplayName(Terrain.Fertile)).toBe('肥沃な土地')
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
    expect(map.canPlace(10, 10, TileType.House)).toBe(true)
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

  it('lays out Tokyo starting zones', () => {
    const profile = { preset: 'tokyo' as const }
    const first = generateLandscapeLayout(50, 50, 1700, profile)
    const second = generateLandscapeLayout(50, 50, 1700, profile)
    expect(first).toEqual(second)
    expect(first).toContain(Terrain.Forest)
    expect(first).toContain(Terrain.River)
    expect(first).toContain(Terrain.Water)
    expect(first).toContain(Terrain.Rock)
    expect(first).toContain(Terrain.Hill)
    expect(first).toContain(Terrain.Fertile)

    let forestTop = 0
    let forestBottom = 0
    let hillsNorthEast = 0
    let rocksSouthWest = 0
    let fertileSouth = 0
    first.forEach((terrain, index) => {
      const x = index % 50
      const y = Math.floor(index / 50)
      if (terrain === Terrain.Forest) {
        if (x + y < 40) {
          forestTop += 1
        } else {
          forestBottom += 1
        }
      }
      if (terrain === Terrain.Hill && x > 28 && y < 18) {
        hillsNorthEast += 1
      }
      if (terrain === Terrain.Rock && x < 18 && y > 30) {
        rocksSouthWest += 1
      }
      if (terrain === Terrain.Fertile && y > 32) {
        fertileSouth += 1
      }
    })
    expect(forestTop).toBeGreaterThan(forestBottom)
    expect(hillsNorthEast).toBeGreaterThan(8)
    expect(rocksSouthWest).toBeGreaterThan(8)
    expect(fertileSouth).toBeGreaterThan(20)

    const map = new WorldMap(50, 50, 32)
    map.generateLandscape(1700, profile)
    let startPlot = false
    for (let y = 22; y <= 28; y += 1) {
      for (let x = 22; x <= 28; x += 1) {
        if (map.canPlace(x, y, TileType.House)) {
          startPlot = true
        }
      }
    }
    expect(startPlot).toBe(true)
    let roads = 0
    map.forEachTile((_x, _y, tile) => {
      if (tile.type === TileType.Road) {
        roads += 1
      }
    })
    expect(roads).toBeGreaterThan(8)
    let bridges = 0
    map.forEachTile((_x, _y, tile) => {
      if (tile.type === TileType.Road && (tile.terrain === Terrain.River || tile.terrain === Terrain.Water)) {
        bridges += 1
      }
    })
    expect(bridges).toBeGreaterThan(0)
    const hillIndex = first.indexOf(Terrain.Hill)
    const rockIndex = first.indexOf(Terrain.Rock)
    expect(map.canPlace(hillIndex % 50, Math.floor(hillIndex / 50), TileType.House)).toBe(false)
    expect(map.canPlace(rockIndex % 50, Math.floor(rockIndex / 50), TileType.House)).toBe(false)
  })
})
