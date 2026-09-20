import { describe, expect, it } from 'vitest'
import { BUILDING_XP_HOME_PER_HOUR, BUILDING_XP_WORK_PER_HOUR, SHOP_CITY_CUT, WORK_TAX_RATIO } from '../constants.ts'
import { TileType } from '../map/tile.ts'
import { WorldMap } from '../map/WorldMap.ts'
import { createResident, ResidentState } from '../residents/resident.ts'
import { wageForTile } from '../residents/needs.ts'
import { collectShopCut, tickCityEconomy } from './circulation.ts'
import { Treasury } from './treasury.ts'

describe('city economy', () => {
  it('takes a cut of wages and grows the workplace', () => {
    const map = new WorldMap(3, 3, 32)
    map.place(1, 1, TileType.Farm)
    const resident = createResident({
      workplace: { x: 1, y: 1 },
      state: ResidentState.Working,
    })
    const treasury = new Treasury(1000, false)
    tickCityEconomy(resident, map, treasury, 2)
    const wage = wageForTile(TileType.Farm, 1) * 2
    expect(treasury.funds).toBe(1000 + wage * WORK_TAX_RATIO)
    expect(map.getTile(1, 1)?.xp).toBe(BUILDING_XP_WORK_PER_HOUR * 2)
  })

  it('collects house tax from the resident and grows the home', () => {
    const map = new WorldMap(3, 3, 32)
    map.place(0, 0, TileType.House)
    const resident = createResident({
      home: { x: 0, y: 0 },
      state: ResidentState.Home,
      money: 40,
    })
    const treasury = new Treasury(1000, false)
    tickCityEconomy(resident, map, treasury, 4)
    expect(resident.money).toBeLessThan(40)
    expect(treasury.funds).toBeGreaterThan(1000)
    expect(map.getTile(0, 0)?.xp).toBe(BUILDING_XP_HOME_PER_HOUR * 4)
  })

  it('adds a city cut when a shop sale completes', () => {
    const treasury = new Treasury(1000, false)
    collectShopCut(treasury)
    expect(treasury.funds).toBe(1000 + SHOP_CITY_CUT)
  })
})
