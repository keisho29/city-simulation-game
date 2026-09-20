import { describe, expect, it } from 'vitest'
import { LAND_VALUE_MIN } from '../constants.ts'
import { landValue } from './landValue.ts'
import { TileType } from './tile.ts'
import { WorldMap } from './WorldMap.ts'

describe('land value', () => {
  it('starts near the baseline on empty land', () => {
    const map = new WorldMap(7, 7, 32)
    expect(landValue(map, 3, 3)).toBe(LAND_VALUE_MIN)
  })

  it('rises when shops and roads are nearby', () => {
    const map = new WorldMap(7, 7, 32)
    map.place(3, 2, TileType.Road)
    map.place(4, 3, TileType.Shop)
    map.place(2, 3, TileType.House)
    expect(landValue(map, 3, 3)).toBeGreaterThan(LAND_VALUE_MIN + 10)
  })
})
