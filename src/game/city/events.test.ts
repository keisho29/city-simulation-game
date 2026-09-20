import { describe, expect, it } from 'vitest'
import { EVENT_DURATION_HOURS, HARVEST_BUMPER, HARVEST_DROUGHT } from '../constants.ts'
import {
  CityEventKind,
  createCityEvent,
  eventDisplayName,
  harvestMultiplier,
  tickCityEvents,
} from './events.ts'

describe('city events', () => {
  it('starts idle and waits through the cooldown', () => {
    const idle = createCityEvent()
    expect(eventDisplayName(idle)).toBe('なし')
    expect(harvestMultiplier(idle)).toBe(1)
    const stillIdle = tickCityEvents(idle, 10, () => 0)
    expect(stillIdle.kind).toBe(CityEventKind.None)
  })

  it('can roll a bumper harvest after the cooldown', () => {
    const ready = { kind: CityEventKind.None, remainingHours: 0, cooldownHours: 0 }
    const bumper = tickCityEvents(ready, 1, () => 0.05)
    expect(bumper.kind).toBe(CityEventKind.Bumper)
    expect(eventDisplayName(bumper)).toBe('豊作')
    expect(harvestMultiplier(bumper)).toBe(HARVEST_BUMPER)
    expect(bumper.remainingHours).toBe(EVENT_DURATION_HOURS)
  })

  it('can roll a drought or festival', () => {
    const ready = { kind: CityEventKind.None, remainingHours: 0, cooldownHours: 0 }
    expect(tickCityEvents(ready, 1, () => 0.2).kind).toBe(CityEventKind.Drought)
    expect(harvestMultiplier({ kind: CityEventKind.Drought, remainingHours: 10, cooldownHours: 0 })).toBe(
      HARVEST_DROUGHT,
    )
    expect(eventDisplayName(tickCityEvents(ready, 1, () => 0.4))).toBe('祭り')
  })
})
