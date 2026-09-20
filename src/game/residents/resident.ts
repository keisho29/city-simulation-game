import { HAPPINESS_BASE, INITIAL_HUNGER, INITIAL_RESIDENT_MONEY } from '../constants.ts'

export const ResidentState = {
  SeekingHome: 'SEEKING_HOME',
  MovingIn: 'MOVING_IN',
  Home: 'HOME',
  MovingToWork: 'MOVING_TO_WORK',
  Working: 'WORKING',
  MovingToHome: 'MOVING_TO_HOME',
  MovingToShop: 'MOVING_TO_SHOP',
  Shopping: 'SHOPPING',
} as const

export type ResidentState = (typeof ResidentState)[keyof typeof ResidentState]

export type TileRef = {
  x: number
  y: number
}

export type Resident = {
  id: string
  name: string
  age: number
  home: TileRef | undefined
  workplace: TileRef | undefined
  shopTarget: TileRef | undefined
  happiness: number
  hunger: number
  money: number
  state: ResidentState
  worldX: number
  worldY: number
}

export function createResident(overrides: Partial<Resident> = {}): Resident {
  return {
    id: overrides.id ?? 'resident-1',
    name: overrides.name ?? '太助',
    age: overrides.age ?? 28,
    home: overrides.home,
    workplace: overrides.workplace,
    shopTarget: overrides.shopTarget,
    happiness: overrides.happiness ?? HAPPINESS_BASE,
    hunger: overrides.hunger ?? INITIAL_HUNGER,
    money: overrides.money ?? INITIAL_RESIDENT_MONEY,
    state: overrides.state ?? ResidentState.SeekingHome,
    worldX: overrides.worldX ?? 0,
    worldY: overrides.worldY ?? 0,
  }
}
