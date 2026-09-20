import { describe, expect, it } from 'vitest'
import { INITIAL_RESIDENT_COUNT } from '../constants.ts'
import { WorldMap } from '../map/WorldMap.ts'
import { RESIDENT_NAMES } from './names.ts'
import { ResidentSim } from './ResidentSim.ts'

describe('ResidentSim population', () => {
  it('spawns 20 uniquely named residents', () => {
    const sim = new ResidentSim(new WorldMap(5, 5, 32))
    const names = sim.residents.map((resident) => resident.name)

    expect(sim.residents).toHaveLength(INITIAL_RESIDENT_COUNT)
    expect(INITIAL_RESIDENT_COUNT).toBe(20)
    expect(new Set(names).size).toBe(20)
    expect(names[0]).toBe(RESIDENT_NAMES[0])
  })
})
