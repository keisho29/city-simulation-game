import { WORK_END_HOUR, WORK_START_HOUR } from '../constants.ts'
import { abortHaul, isHauling } from '../economy/logistics.ts'
import { ResidentState, type Resident } from './resident.ts'

export function isWorkHours(hour: number): boolean {
  return hour >= WORK_START_HOUR && hour < WORK_END_HOUR
}

export function applySchedule(resident: Resident, hour: number, isHoliday = false): void {
  if (
    resident.state === ResidentState.SeekingHome ||
    resident.state === ResidentState.MovingIn
  ) {
    return
  }

  if (isHauling(resident)) {
    if (isHoliday || !isWorkHours(hour)) {
      if (resident.state === ResidentState.Hauling) {
        return
      }
      abortHaul(resident)
      resident.state = resident.home ? ResidentState.MovingToHome : ResidentState.SeekingHome
    }
    return
  }

  if (
    resident.state === ResidentState.MovingToShop ||
    resident.state === ResidentState.Shopping
  ) {
    if (!isHoliday && isWorkHours(hour) && resident.workplace) {
      resident.shopTarget = undefined
      resident.state = ResidentState.MovingToWork
    }
    return
  }

  if (!resident.home || !resident.workplace) {
    if (
      resident.state === ResidentState.Working ||
      resident.state === ResidentState.MovingToWork
    ) {
      resident.state = resident.home
        ? ResidentState.MovingToHome
        : ResidentState.SeekingHome
    }
    return
  }

  if (isHoliday) {
    if (
      resident.state === ResidentState.Working ||
      resident.state === ResidentState.MovingToWork
    ) {
      resident.state = ResidentState.MovingToHome
    }
    return
  }

  if (isWorkHours(hour)) {
    if (
      resident.state === ResidentState.Home ||
      resident.state === ResidentState.MovingToHome
    ) {
      resident.state = ResidentState.MovingToWork
    }
    return
  }

  if (
    resident.state === ResidentState.Working ||
    resident.state === ResidentState.MovingToWork
  ) {
    resident.state = ResidentState.MovingToHome
  }
}
