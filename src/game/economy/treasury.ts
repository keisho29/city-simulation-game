export class Treasury {
  funds: number

  constructor(funds: number) {
    this.funds = funds
  }

  canAfford(cost: number): boolean {
    return cost <= this.funds
  }

  spend(cost: number): boolean {
    if (!this.canAfford(cost)) {
      return false
    }

    this.funds -= cost
    return true
  }
}
