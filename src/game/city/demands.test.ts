import { describe, expect, it } from 'vitest'
import { cityDemands } from './demands.ts'
import { TileType } from '../map/tile.ts'
import { WorldMap } from '../map/WorldMap.ts'
import { createResident } from '../residents/resident.ts'

describe('city demands', () => {
  it('asks for houses when people are homeless', () => {
    const map = new WorldMap(5, 5, 32)
    const residents = [createResident({ id: 'r1' })]
    expect(cityDemands(map, residents)).toContain('住宅不足')
  })

  it('asks for jobs when housed people have nowhere to work', () => {
    const map = new WorldMap(5, 5, 32)
    map.place(0, 0, TileType.House)
    map.occupyHouse(0, 0, 'r1')
    const residents = [createResident({ id: 'r1', home: { x: 0, y: 0 } })]
    expect(cityDemands(map, residents)).toContain('仕事不足')
  })

  it('asks for a shop once the town has several people', () => {
    const map = new WorldMap(5, 5, 32)
    const residents = Array.from({ length: 5 }, (_, index) =>
      createResident({ id: `r${index}` }),
    )
    expect(cityDemands(map, residents)).toContain('商店不足')
  })

  it('asks for food when the town has little grain', () => {
    const map = new WorldMap(5, 5, 32)
    const residents = Array.from({ length: 3 }, (_, index) =>
      createResident({ id: `r${index}`, hunger: 70 }),
    )
    expect(cityDemands(map, residents)).toContain('食料不足')
  })

  it('asks for a well and clinic as the town grows', () => {
    const map = new WorldMap(5, 5, 32)
    const residents = Array.from({ length: 12 }, (_, index) =>
      createResident({ id: `r${index}` }),
    )
    const demands = cityDemands(map, residents)
    expect(demands).toContain('水不足')
    expect(demands).toContain('診療不足')
  })
})
