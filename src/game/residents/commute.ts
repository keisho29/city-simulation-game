import { REST_END_HOUR, REST_START_HOUR, WORK_END_HOUR, WORK_START_HOUR } from '../constants.ts'
import { abortHaul, isHauling } from '../economy/logistics.ts'
import { clearLeisure, isLeisureState, ResidentState, type Resident } from './resident.ts'

export function isWorkHours(hour: number): boolean {
  return hour >= WORK_START_HOUR && hour < WORK_END_HOUR
}

export function isRestHours(hour: number): boolean {
  return hour >= REST_START_HOUR || hour < REST_END_HOUR
}

export function applySchedule(resident: Resident, hour: number, isHoliday = false): void {
  if (resident.state === ResidentState.MovingIn || resident.state === ResidentState.Riding) {
    return
  }

  if (isHauling(resident)) {
    if (isHoliday || !isWorkHours(hour)) {
      if (resident.state === ResidentState.Hauling) {
        return
      }
      abortHaul(resident)
      clearLeisure(resident)
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
      clearLeisure(resident)
      resident.state = ResidentState.MovingToWork
    }
    return
  }

  if (isRestHours(hour) && resident.home && resident.state !== ResidentState.MovingToHome) {
    if (isLeisureState(resident.state) || resident.state === ResidentState.SeekingHome) {
      clearLeisure(resident)
      resident.state = ResidentState.MovingToHome
    }
  }

  if (!isHoliday && isWorkHours(hour) && resident.workplace) {
    if (
      resident.state === ResidentState.Home ||
      resident.state === ResidentState.MovingToHome ||
      isLeisureState(resident.state)
    ) {
      clearLeisure(resident)
      resident.state = ResidentState.MovingToWork
    }
    return
  }

  if (!resident.home || !resident.workplace) {
    if (
      resident.state === ResidentState.Working ||
      resident.state === ResidentState.MovingToWork
    ) {
      clearLeisure(resident)
      resident.state = resident.home ? ResidentState.Wandering : ResidentState.SeekingHome
    }
    return
  }

  if (isHoliday) {
    if (
      resident.state === ResidentState.Working ||
      resident.state === ResidentState.MovingToWork
    ) {
      clearLeisure(resident)
      resident.state = ResidentState.Wandering
    }
    return
  }

  if (
    resident.state === ResidentState.Working ||
    resident.state === ResidentState.MovingToWork
  ) {
    clearLeisure(resident)
    resident.state = ResidentState.Wandering
  }
}
