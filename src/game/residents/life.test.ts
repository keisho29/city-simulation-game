import { describe, expect, it } from 'vitest'
import { GameSpeed, SHOP_PRICE, WAGE_FARM_PER_HOUR } from '../constants.ts'
import { TileType } from '../map/tile.ts'
import { WorldMap } from '../map/WorldMap.ts'
import { buyFood, gameHoursFromDelta, tickNeeds } from './needs.ts'
import { createResident, ResidentState } from './resident.ts'
import { maybeStartShopping } from './shopping.ts'
import { relocateIfNeeded } from './housing.ts'
import { ResidentSim } from './ResidentSim.ts'

describe('needs', () => {
  it('increases hunger over game time', () => {
    const map = new WorldMap(3, 3, 32)
    const resident = createResident({ hunger: 20 })
    tickNeeds(resident, map, 4)
    expect(resident.hunger).toBeGreaterThan(20)
  })

  it('pays a higher wage in a grown workplace', () => {
    const map = new WorldMap(3, 3, 32)
    map.place(1, 1, TileType.Farm)
    const tile = map.getTile(1, 1)
    if (tile) {
      tile.level = 3
    }
    const resident = createResident({
      workplace: { x: 1, y: 1 },
      state: ResidentState.Working,
      money: 10,
    })
    tickNeeds(resident, map, 2)
    expect(resident.money).toBeCloseTo(10 + WAGE_FARM_PER_HOUR * 1.5 * 2)
  })

  it('spends money and lowers hunger when buying food', () => {
    const resident = createResident({ hunger: 70, money: 20 })
    expect(buyFood(resident)).toBe(true)
    expect(resident.money).toBe(20 - SHOP_PRICE)
    expect(resident.hunger).toBeLessThan(70)
  })

  it('converts real time into game hours', () => {
    expect(gameHoursFromDelta(3 * 60 * 1000, GameSpeed.X1)).toBe(24)
  })
})

describe('shopping', () => {
  it('sends a hungry resident to the nearest shop after work', () => {
    const map = new WorldMap(5, 5, 32)
    map.place(0, 0, TileType.House)
    map.place(3, 0, TileType.Shop)
    const shop = map.getTile(3, 0)
    if (shop) {
      shop.food = 8
    }
    const resident = createResident({
      home: { x: 0, y: 0 },
      workplace: { x: 2, y: 2 },
      state: ResidentState.Home,
      hunger: 55,
      money: 20,
    })

    maybeStartShopping(resident, map, 18, false)

    expect(resident.state).toBe(ResidentState.MovingToShop)
    expect(resident.shopTarget).toEqual({ x: 3, y: 0 })
  })

  it('does not shop during work hours on a weekday', () => {
    const map = new WorldMap(5, 5, 32)
    map.place(3, 0, TileType.Shop)
    const resident = createResident({
      home: { x: 0, y: 0 },
      workplace: { x: 2, y: 2 },
      state: ResidentState.Home,
      hunger: 80,
      money: 40,
    })

    maybeStartShopping(resident, map, 10, false)
    expect(resident.state).toBe(ResidentState.Home)
  })

  it('walks to a shop, spends money, and returns home', () => {
    const map = new WorldMap(5, 5, 32)
    map.place(0, 0, TileType.House)
    map.place(3, 0, TileType.Shop)
    const shop = map.getTile(3, 0)
    if (shop) {
      shop.food = 8
    }
    const sim = new ResidentSim(map, [
      createResident({
        id: 'resident-1',
        home: { x: 0, y: 0 },
        workplace: undefined,
        state: ResidentState.Home,
        hunger: 70,
        money: 30,
        worldX: map.tileCenter(0, 0).x,
        worldY: map.tileCenter(0, 0).y,
      }),
    ])
    map.occupyHouse(0, 0, 'resident-1')
    const resident = sim.residents[0]
    const moneyBefore = resident.money

    sim.update(16, GameSpeed.X1, 18)
    expect(resident.state).toBe(ResidentState.MovingToShop)

    for (let i = 0; i < 200; i += 1) {
      sim.update(250, GameSpeed.X1, 18)
    }

    expect(resident.money).toBeLessThan(moneyBefore)
    expect(resident.hunger).toBeLessThan(70)
    expect(resident.state).toBe(ResidentState.Home)
    expect(map.getTile(3, 0)?.xp).toBeGreaterThan(0)
    const home = map.tileCenter(0, 0)
    expect(resident.worldX).toBe(home.x)
    expect(resident.worldY).toBe(home.y)
  })
})

describe('moving house', () => {
  it('relocates to a vacant house closer to work', () => {
    const map = new WorldMap(20, 3, 32)
    map.place(0, 0, TileType.House)
    map.place(16, 0, TileType.House)
    map.place(18, 0, TileType.Farm)
    map.occupyHouse(0, 0, 'r1')
    const resident = createResident({
      id: 'r1',
      home: { x: 0, y: 0 },
      workplace: { x: 18, y: 0 },
      state: ResidentState.Home,
    })

    relocateIfNeeded(map, [resident])

    expect(resident.home).toEqual({ x: 16, y: 0 })
    expect(resident.state).toBe(ResidentState.MovingIn)
    expect(map.getTile(0, 0)?.occupantIds).toEqual([])
    expect(map.getTile(16, 0)?.occupantIds).toEqual(['r1'])
  })
})
