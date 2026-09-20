export const ResidentState = {
  SeekingHome: 'SEEKING_HOME',
  MovingIn: 'MOVING_IN',
  Home: 'HOME',
  MovingToWork: 'MOVING_TO_WORK',
  Working: 'WORKING',
  MovingToHome: 'MOVING_TO_HOME',
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
  happiness: number
  state: ResidentState
  worldX: number
  worldY: number
}
