import { describe, expect, it } from 'vitest'
import { FOOD_PER_WORKER_HOUR, HARVEST_BUMPER } from '../constants.ts'
import { Terrain, TileType } from '../map/tile.ts'
import { WorldMap } from '../map/WorldMap.ts'
import { StockKind } from './goods.ts'
import { tickProduction } from './production.ts'

describe('production', () => {
  it('lets farm workers grow food', () => {
    const map = new WorldMap(4, 4, 32)
    map.place(1, 1, TileType.Farm)
    map.occupyJob(1, 1, 'farmer')
    tickProduction(map, 1)
    expect(map.getTile(1, 1)?.food).toBeCloseTo(FOOD_PER_WORKER_HOUR)
  })

  it('boosts harvest during a bumper crop', () => {
    const map = new WorldMap(4, 4, 32)
    map.place(1, 1, TileType.Farm)
    map.occupyJob(1, 1, 'farmer')
    tickProduction(map, 1, HARVEST_BUMPER)
    expect(map.getTile(1, 1)?.food).toBeCloseTo(FOOD_PER_WORKER_HOUR * HARVEST_BUMPER)
  })

  it('turns wood into goods at a workshop', () => {
    const map = new WorldMap(4, 4, 32)
    map.place(0, 0, TileType.Workshop)
    map.occupyJob(0, 0, 'smith')
    const tile = map.getTile(0, 0)
    if (tile) {
      tile.wood = 5
    }
    tickProduction(map, 1)
    expect(map.getTile(0, 0)?.goods).toBeGreaterThan(0)
    expect(map.getTile(0, 0)?.wood).toBeLessThan(5)
  })

  it('gathers wood at a warehouse when a forest exists', () => {
    const map = new WorldMap(4, 4, 32)
    map.place(0, 0, TileType.Warehouse)
    map.occupyJob(0, 0, 'hauler')
    const forest = map.getTile(3, 3)
    if (forest) {
      forest.terrain = Terrain.Forest
    }
    tickProduction(map, 2)
    expect(map.totalStock(StockKind.Wood)).toBeGreaterThan(0)
  })

  it('sends leftover farm food to a nearby shop', () => {
    const map = new WorldMap(4, 4, 32)
    map.place(0, 0, TileType.Farm)
    map.place(2, 0, TileType.Shop)
    const farm = map.getTile(0, 0)
    if (farm) {
      farm.food = 8
    }
    tickProduction(map, 1)
    expect(map.getTile(2, 0)?.food).toBeGreaterThan(0)
  })
})
