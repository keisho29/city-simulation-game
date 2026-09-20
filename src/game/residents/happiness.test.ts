import { describe, expect, it } from 'vitest'
import { averageHappiness, residentHappiness } from './happiness.ts'
import { createResident, ResidentState } from './resident.ts'
import { TileType } from '../map/tile.ts'
import { WorldMap } from '../map/WorldMap.ts'

describe('residentHappiness', () => {
  it('is lower without a home or job', () => {
    expect(residentHappiness(createResident())).toBe(25)
  })

  it('rises when the resident has a nearby job', () => {
    const resident = createResident({
      home: { x: 0, y: 0 },
      workplace: { x: 2, y: 1 },
    })
    expect(residentHappiness(resident)).toBe(80)
  })

  it('falls when the commute is long', () => {
    const nearby = createResident({
      home: { x: 0, y: 0 },
      workplace: { x: 1, y: 0 },
    })
    const far = createResident({
      home: { x: 0, y: 0 },
      workplace: { x: 20, y: 0 },
    })
    expect(residentHappiness(nearby)).toBeGreaterThan(residentHappiness(far))
  })

  it('falls when the resident is hungry or broke', () => {
    const fed = createResident({
      home: { x: 0, y: 0 },
      workplace: { x: 1, y: 0 },
      hunger: 10,
      money: 60,
    })
    const hungry = createResident({
      home: { x: 0, y: 0 },
      workplace: { x: 1, y: 0 },
      hunger: 90,
      money: 0,
    })
    expect(residentHappiness(fed)).toBeGreaterThan(residentHappiness(hungry))
  })

  it('rises a little on a holiday spent at home', () => {
    const resident = createResident({
      home: { x: 0, y: 0 },
      workplace: { x: 1, y: 0 },
      state: ResidentState.Home,
    })
    expect(residentHappiness(resident, { isHoliday: true })).toBeGreaterThan(
      residentHappiness(resident, { isHoliday: false }),
    )
  })

  it('rises during a festival and near a well', () => {
    const map = new WorldMap(8, 8, 32)
    map.place(1, 0, TileType.Well)
    const resident = createResident({
      home: { x: 0, y: 0 },
      workplace: { x: 1, y: 0 },
    })
    expect(residentHappiness(resident, { map, festival: true })).toBeGreaterThan(
      residentHappiness(resident),
    )
  })
})

describe('averageHappiness', () => {
  it('rounds the mean happiness', () => {
    expect(
      averageHappiness([
        createResident({ happiness: 40 }),
        createResident({ happiness: 41 }),
      ]),
    ).toBe(41)
  })
})
