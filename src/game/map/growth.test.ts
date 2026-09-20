import { describe, expect, it } from 'vitest'
import { BUILDING_XP_LEVEL_2, BUILDING_XP_LEVEL_3, MAX_BUILDING_LEVEL } from '../constants.ts'
import { addBuildingXp, buildingDisplayName, houseSlots, jobSlots } from './growth.ts'
import { createTile, TileType } from './tile.ts'
import { WorldMap } from './WorldMap.ts'

describe('building growth', () => {
  it('starts at level 1 and grows with experience', () => {
    const house = createTile(TileType.House)
    expect(house.level).toBe(1)
    expect(addBuildingXp(house, BUILDING_XP_LEVEL_2)).toBe(true)
    expect(house.level).toBe(2)
    expect(houseSlots(house)).toBe(2)
  })

  it('lets a level 2 house hold two residents', () => {
    const map = new WorldMap(3, 3, 32)
    map.place(1, 1, TileType.House)
    const tile = map.getTile(1, 1)
    if (tile) {
      tile.level = 2
    }
    expect(map.occupyHouse(1, 1, 'a')).toBe(true)
    expect(map.occupyHouse(1, 1, 'b')).toBe(true)
    expect(map.occupyHouse(1, 1, 'c')).toBe(false)
  })

  it('lets a level 2 workplace hold two jobs', () => {
    const map = new WorldMap(3, 3, 32)
    map.place(0, 0, TileType.Farm)
    const tile = map.getTile(0, 0)
    if (tile) {
      tile.level = 2
    }
    expect(jobSlots(tile!)).toBe(2)
    expect(map.occupyJob(0, 0, 'a')).toBe(true)
    expect(map.occupyJob(0, 0, 'b')).toBe(true)
  })

  it('grants experience through the map', () => {
    const map = new WorldMap(2, 2, 32)
    map.place(0, 0, TileType.Shop)
    expect(map.grantXp(0, 0, BUILDING_XP_LEVEL_2)).toBe(true)
    expect(map.getTile(0, 0)?.level).toBe(2)
  })

  it('stops at level 3 and changes the building name', () => {
    const house = createTile(TileType.House, 0)
    addBuildingXp(house, BUILDING_XP_LEVEL_3)
    expect(house.level).toBe(MAX_BUILDING_LEVEL)
    expect(addBuildingXp(house, 999)).toBe(false)
    expect(buildingDisplayName(TileType.House, 1, 0)).toBe('木造住宅')
    expect(buildingDisplayName(TileType.House, 2, 0)).toBe('瓦屋根の家')
    expect(buildingDisplayName(TileType.House, 2, 1)).toBe('塗り壁の家')
    expect(buildingDisplayName(TileType.House, 2, 2)).toBe('商家風の家')
    expect(buildingDisplayName(TileType.House, 3, 0)).toBe('瓦屋根の豪邸')
    expect(buildingDisplayName(TileType.Shop, 3, 0)).toBe('問屋')
    expect(buildingDisplayName(TileType.House, 1, 0, 'future')).toBe('タワー住居')
    expect(buildingDisplayName(TileType.Shop, 1, 0, 'contemporary')).toBe('スーパー')
    expect(buildingDisplayName(TileType.Factory, 1, 0, 'industrial')).toBe('コンビナート')
  })
})
