import { describe, expect, it } from 'vitest'
import { ResidentState, type Resident } from './resident.ts'
import { averageHappiness, residentHappiness } from './happiness.ts'

function makeResident(overrides: Partial<Resident> = {}): Resident {
  return {
    id: 'r1',
    name: '太助',
    age: 28,
    home: undefined,
    workplace: undefined,
    happiness: 50,
    state: ResidentState.SeekingHome,
    worldX: 0,
    worldY: 0,
    ...overrides,
  }
}

describe('residentHappiness', () => {
  it('is lower without a home or job', () => {
    expect(residentHappiness(makeResident())).toBe(25)
  })

  it('rises when the resident has a nearby job', () => {
    const resident = makeResident({
      home: { x: 0, y: 0 },
      workplace: { x: 2, y: 1 },
    })
    expect(residentHappiness(resident)).toBe(80)
  })

  it('falls when the commute is long', () => {
    const nearby = makeResident({
      home: { x: 0, y: 0 },
      workplace: { x: 1, y: 0 },
    })
    const far = makeResident({
      home: { x: 0, y: 0 },
      workplace: { x: 20, y: 0 },
    })
    expect(residentHappiness(nearby)).toBeGreaterThan(residentHappiness(far))
  })
})

describe('averageHappiness', () => {
  it('rounds the mean happiness', () => {
    expect(
      averageHappiness([
        makeResident({ happiness: 40 }),
        makeResident({ happiness: 41 }),
      ]),
    ).toBe(41)
  })
})
