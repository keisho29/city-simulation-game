import { describe, expect, it } from 'vitest'
import { DEV_FIXED_FUNDS } from '../constants.ts'
import { Treasury } from './treasury.ts'

describe('Treasury', () => {
  it('starts with the given funds', () => {
    const treasury = new Treasury(1000, false)
    expect(treasury.funds).toBe(1000)
    expect(treasury.canAfford(1000)).toBe(true)
    expect(treasury.canAfford(1001)).toBe(false)
  })

  it('spends construction cost when affordable', () => {
    const treasury = new Treasury(1000, false)
    expect(treasury.spend(50)).toBe(true)
    expect(treasury.funds).toBe(950)
  })

  it('does not spend when funds are short', () => {
    const treasury = new Treasury(40, false)
    expect(treasury.spend(50)).toBe(false)
    expect(treasury.funds).toBe(40)
  })

  it('keeps funds frozen for development', () => {
    const treasury = new Treasury(1000, true)
    expect(treasury.funds).toBe(DEV_FIXED_FUNDS)
    expect(treasury.canAfford(99_999)).toBe(true)
    expect(treasury.spend(150)).toBe(true)
    expect(treasury.funds).toBe(DEV_FIXED_FUNDS)
    treasury.receive(40)
    expect(treasury.funds).toBe(DEV_FIXED_FUNDS)
    treasury.applyLoadedFunds(810)
    expect(treasury.funds).toBe(DEV_FIXED_FUNDS)
  })

  it('receives tax when funds are not frozen', () => {
    const treasury = new Treasury(1000, false)
    treasury.receive(25)
    expect(treasury.funds).toBe(1025)
  })
})
