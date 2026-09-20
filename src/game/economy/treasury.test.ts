import { describe, expect, it } from 'vitest'
import { Treasury } from './treasury.ts'

describe('Treasury', () => {
  it('starts with the given funds', () => {
    const treasury = new Treasury(1000)
    expect(treasury.funds).toBe(1000)
    expect(treasury.canAfford(1000)).toBe(true)
    expect(treasury.canAfford(1001)).toBe(false)
  })

  it('spends construction cost when affordable', () => {
    const treasury = new Treasury(1000)
    expect(treasury.spend(50)).toBe(true)
    expect(treasury.funds).toBe(950)
  })

  it('does not spend when funds are short', () => {
    const treasury = new Treasury(40)
    expect(treasury.spend(50)).toBe(false)
    expect(treasury.funds).toBe(40)
  })
})
