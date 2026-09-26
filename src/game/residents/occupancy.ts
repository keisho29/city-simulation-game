import { ResidentState, type Resident, type TileRef } from './resident.ts'

export function indoorTileOf(resident: Pick<Resident, 'state' | 'home' | 'workplace' | 'shopTarget'>): TileRef | undefined {
  if (resident.state === ResidentState.Home) {
    return resident.home
  }
  if (resident.state === ResidentState.Working) {
    return resident.workplace
  }
  if (resident.state === ResidentState.Shopping) {
    return resident.shopTarget
  }
  return undefined
}

export function isResidentIndoor(resident: Pick<Resident, 'state' | 'home' | 'workplace' | 'shopTarget'>): boolean {
  return indoorTileOf(resident) !== undefined
}

export type BuildingOccupancy = {
  x: number
  y: number
  count: number
}

export function indoorOccupancy(
  residents: ReadonlyArray<Pick<Resident, 'state' | 'home' | 'workplace' | 'shopTarget'>>,
): BuildingOccupancy[] {
  const counts = new Map<string, BuildingOccupancy>()
  for (const resident of residents) {
    const tile = indoorTileOf(resident)
    if (!tile) {
      continue
    }
    const key = `${tile.x},${tile.y}`
    const current = counts.get(key)
    if (current) {
      current.count += 1
      continue
    }
    counts.set(key, { x: tile.x, y: tile.y, count: 1 })
  }
  return [...counts.values()]
}
