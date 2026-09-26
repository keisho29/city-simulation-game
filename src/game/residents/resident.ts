import { HAPPINESS_BASE, INITIAL_HUNGER, INITIAL_RESIDENT_MONEY } from '../constants.ts'
import type { StockKind } from '../economy/goods.ts'
import { ResidentGender as NamedGender, genderFromName } from './names.ts'

export const ResidentState = {
  SeekingHome: 'SEEKING_HOME',
  MovingIn: 'MOVING_IN',
  Home: 'HOME',
  MovingToWork: 'MOVING_TO_WORK',
  Working: 'WORKING',
  MovingToHome: 'MOVING_TO_HOME',
  MovingToShop: 'MOVING_TO_SHOP',
  Shopping: 'SHOPPING',
  MovingToPickup: 'MOVING_TO_PICKUP',
  Hauling: 'HAULING',
  Riding: 'RIDING',
} as const

export type ResidentState = (typeof ResidentState)[keyof typeof ResidentState]

export type TileRef = {
  x: number
  y: number
}

export type ResidentGender = 'male' | 'female'

export type Resident = {
  id: string
  name: string
  gender: ResidentGender
  age: number
  home: TileRef | undefined
  workplace: TileRef | undefined
  shopTarget: TileRef | undefined
  haulKind: StockKind | undefined
  haulAmount: number | undefined
  haulPickup: TileRef | undefined
  haulDrop: TileRef | undefined
  rideKind: 'rail' | 'water' | undefined
  ridePath: TileRef[] | undefined
  rideIndex: number | undefined
  rideDest: TileRef | undefined
  rideArrive: ResidentState | undefined
  happiness: number
  hunger: number
  money: number
  state: ResidentState
  worldX: number
  worldY: number
}

export function clearRide(resident: Resident): void {
  resident.rideKind = undefined
  resident.ridePath = undefined
  resident.rideIndex = undefined
  resident.rideDest = undefined
  resident.rideArrive = undefined
}

export function createResident(overrides: Partial<Resident> = {}): Resident {
  return {
    id: overrides.id ?? 'resident-1',
    name: overrides.name ?? '太助',
    gender: overrides.gender ?? genderFromName(overrides.name ?? '太助') ?? NamedGender.Male,
    age: overrides.age ?? 28,
    home: overrides.home,
    workplace: overrides.workplace,
    shopTarget: overrides.shopTarget,
    haulKind: overrides.haulKind,
    haulAmount: overrides.haulAmount,
    haulPickup: overrides.haulPickup,
    haulDrop: overrides.haulDrop,
    rideKind: overrides.rideKind,
    ridePath: overrides.ridePath,
    rideIndex: overrides.rideIndex,
    rideDest: overrides.rideDest,
    rideArrive: overrides.rideArrive,
    happiness: overrides.happiness ?? HAPPINESS_BASE,
    hunger: overrides.hunger ?? INITIAL_HUNGER,
    money: overrides.money ?? INITIAL_RESIDENT_MONEY,
    state: overrides.state ?? ResidentState.SeekingHome,
    worldX: overrides.worldX ?? 0,
    worldY: overrides.worldY ?? 0,
  }
}
