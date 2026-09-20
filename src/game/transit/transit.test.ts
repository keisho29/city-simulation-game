import { describe, expect, it } from 'vitest'
import { RAIL_SPEED_MULT, ROAD_SPEED_MULT, WALK_SPEED_MULT } from '../constants.ts'
import { StockKind } from '../economy/goods.ts'
import { Terrain, TileType } from '../map/tile.ts'
import { WorldMap } from '../map/WorldMap.ts'
import { tileDetailView } from '../map/inspectTile.ts'
import { createResident, ResidentState } from '../residents/resident.ts'
import {
  findRailPath,
  findWaterRoute,
  moveSpeedMultiplier,
  planTransit,
} from './network.ts'
import { tickFreight, TransitService, transitUpkeepPerHour } from './service.ts'

function grassMap(width = 10, height = 6): WorldMap {
  return new WorldMap(width, height, 32)
}

describe('roads speed', () => {
  it('moves faster on a road than on grass', () => {
    const map = grassMap(4, 2)
    map.place(1, 0, TileType.Road)
    const grass = moveSpeedMultiplier(map, 16, 16)
    const road = moveSpeedMultiplier(map, 48, 16)
    expect(grass).toBe(WALK_SPEED_MULT)
    expect(road).toBe(ROAD_SPEED_MULT)
    expect(road).toBeGreaterThan(grass)
  })
})

describe('stations and rails', () => {
  it('lets the player place a station and connect it with rails', () => {
    const map = grassMap()
    expect(map.place(1, 1, TileType.Station)).toBe(true)
    expect(map.place(2, 1, TileType.Rail)).toBe(true)
    expect(map.place(3, 1, TileType.Rail)).toBe(true)
    expect(map.place(4, 1, TileType.Station)).toBe(true)
    expect(map.railConnections(2, 1)).toBeGreaterThan(0)
    expect(findRailPath(map, { x: 1, y: 1 }, { x: 4, y: 1 })?.length).toBe(4)
  })

  it('picks rail when the walk is long and stations are linked', () => {
    const map = grassMap(16, 4)
    map.place(1, 1, TileType.Station)
    for (let x = 2; x <= 12; x += 1) {
      map.place(x, 1, TileType.Rail)
    }
    map.place(13, 1, TileType.Station)
    const plan = planTransit(map, { x: 1, y: 1 }, { x: 13, y: 1 })
    expect(plan.mode).toBe('rail')
    if (plan.mode !== 'rail') {
      return
    }
    expect(plan.path.length).toBeGreaterThan(2)
    expect(RAIL_SPEED_MULT).toBeGreaterThan(WALK_SPEED_MULT)
  })
})

describe('freight and ports', () => {
  it('moves farm food onto a connected station', () => {
    const map = grassMap()
    map.place(1, 1, TileType.Station)
    map.place(2, 1, TileType.Rail)
    map.place(3, 1, TileType.Station)
    map.place(1, 2, TileType.Farm)
    map.addStock(1, 2, StockKind.Food, 8)
    const moved = tickFreight(map, 2)
    expect(moved).toBeGreaterThan(0)
    expect((map.getTile(1, 1)?.food ?? 0) + (map.getTile(3, 1)?.food ?? 0)).toBeGreaterThan(0)
  })

  it('places a port only next to water', () => {
    const map = grassMap(5, 5)
    const water = map.getTile(2, 1)
    if (water) {
      water.terrain = Terrain.Water
    }
    expect(map.canPlace(2, 2, TileType.Port)).toBe(true)
    expect(map.canPlace(4, 4, TileType.Port)).toBe(false)
    expect(map.place(2, 2, TileType.Port)).toBe(true)
    expect(map.place(4, 4, TileType.Port)).toBe(false)
  })

  it('finds a water route between two ports', () => {
    const map = grassMap(6, 4)
    for (let x = 1; x <= 4; x += 1) {
      const tile = map.getTile(x, 1)
      if (tile) {
        tile.terrain = Terrain.River
      }
    }
    map.place(1, 2, TileType.Port)
    map.place(4, 2, TileType.Port)
    const route = findWaterRoute(map, { x: 1, y: 2 }, { x: 4, y: 2 })
    expect(route?.length).toBeGreaterThan(2)
    const plan = planTransit(map, { x: 1, y: 2 }, { x: 4, y: 2 })
    expect(plan.mode).toBe('water')
  })
})

describe('transit demand', () => {
  it('charges a fare when a resident boards and counts upkeep', () => {
    const map = grassMap()
    map.place(1, 1, TileType.Station)
    map.place(2, 1, TileType.Rail)
    map.place(3, 1, TileType.Station)
    const transit = new TransitService()
    transit.tick(map, 16, 1, 0)
    expect(transit.vehicles.some((vehicle) => vehicle.kind === 'train')).toBe(true)
    expect(transitUpkeepPerHour(map)).toBeGreaterThan(0)
    const rider = createResident({ money: 10, state: ResidentState.Riding })
    transit.board(rider)
    expect(transit.stats.riders).toBe(1)
    expect(rider.money).toBe(8)
    expect(tileDetailView(map, 1, 1)?.transit).toContain('接続')
  })
})
