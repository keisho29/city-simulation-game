import { describe, expect, it } from 'vitest'
import { indoorOccupancy, indoorTileOf, isResidentIndoor } from './occupancy.ts'
import { createResident, ResidentState } from './resident.ts'

describe('indoor occupancy', () => {
  it('hides residents who have stopped at home, work, or a shop', () => {
    const home = createResident({ state: ResidentState.Home, home: { x: 2, y: 3 } })
    const work = createResident({ state: ResidentState.Working, workplace: { x: 5, y: 1 } })
    const shop = createResident({
      state: ResidentState.Shopping,
      shopTarget: { x: 8, y: 4 },
    })
    const walking = createResident({
      state: ResidentState.MovingToWork,
      workplace: { x: 5, y: 1 },
    })

    expect(indoorTileOf(home)).toEqual({ x: 2, y: 3 })
    expect(indoorTileOf(work)).toEqual({ x: 5, y: 1 })
    expect(indoorTileOf(shop)).toEqual({ x: 8, y: 4 })
    expect(isResidentIndoor(walking)).toBe(false)
  })

  it('counts people inside the same building', () => {
    const occupants = indoorOccupancy([
      createResident({ id: 'a', state: ResidentState.Home, home: { x: 1, y: 1 } }),
      createResident({ id: 'b', state: ResidentState.Home, home: { x: 1, y: 1 } }),
      createResident({ id: 'c', state: ResidentState.Working, workplace: { x: 4, y: 2 } }),
      createResident({ id: 'd', state: ResidentState.SeekingHome }),
    ])

    expect(occupants).toEqual(
      expect.arrayContaining([
        { x: 1, y: 1, count: 2 },
        { x: 4, y: 2, count: 1 },
      ]),
    )
    expect(occupants).toHaveLength(2)
  })
})
