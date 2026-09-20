import { MOVE_COMMUTE_THRESHOLD, MOVE_MIN_IMPROVEMENT } from '../constants.ts'
import { TileType } from '../map/tile.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { commuteDistance } from './happiness.ts'
import { ResidentState, type Resident } from './resident.ts'

export function assignHomes(map: WorldMap, residents: Resident[]): void {
  for (const resident of residents) {
    if (resident.home) {
      const homeTile = map.getTile(resident.home.x, resident.home.y)
      if (
        homeTile?.type === TileType.House &&
        homeTile.occupantIds.includes(resident.id)
      ) {
        continue
      }

      resident.home = undefined
      if (
        resident.state === ResidentState.Home ||
        resident.state === ResidentState.MovingIn ||
        resident.state === ResidentState.MovingToHome
      ) {
        resident.state = ResidentState.SeekingHome
      }
    }

    if (resident.home) {
      continue
    }

    const house = map.findVacantHouse()
    if (!house || !map.occupyHouse(house.x, house.y, resident.id)) {
      continue
    }

    resident.home = house
    resident.state = ResidentState.MovingIn
  }
}

export function relocateIfNeeded(map: WorldMap, residents: Resident[]): void {
  for (const resident of residents) {
    if (resident.state !== ResidentState.Home || !resident.home || !resident.workplace) {
      continue
    }

    const distance = commuteDistance(resident) ?? 0
    if (distance < MOVE_COMMUTE_THRESHOLD) {
      continue
    }

    const closer = map.findCloserVacantHouse(
      resident.workplace,
      resident.home,
      MOVE_MIN_IMPROVEMENT,
    )
    if (!closer) {
      continue
    }

    map.vacateOccupant(resident.home.x, resident.home.y, resident.id)
    if (!map.occupyHouse(closer.x, closer.y, resident.id)) {
      map.occupyHouse(resident.home.x, resident.home.y, resident.id)
      continue
    }

    resident.home = closer
    resident.state = ResidentState.MovingIn
  }
}
