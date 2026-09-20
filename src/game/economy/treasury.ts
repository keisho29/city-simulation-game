import { DEV_FIXED_FUNDS, DEV_FREEZE_FUNDS } from '../constants.ts'

export class Treasury {
  funds: number
  readonly freeze: boolean

  constructor(funds: number, freeze = DEV_FREEZE_FUNDS) {
    this.freeze = freeze
    this.funds = freeze ? DEV_FIXED_FUNDS : funds
  }

  applyLoadedFunds(funds: number): void {
    this.funds = this.freeze ? DEV_FIXED_FUNDS : funds
  }

  canAfford(cost: number): boolean {
    return this.freeze || cost <= this.funds
  }

  spend(cost: number): boolean {
    if (this.freeze) {
      return true
    }

    if (!this.canAfford(cost)) {
      return false
    }

    this.funds -= cost
    return true
  }
}
