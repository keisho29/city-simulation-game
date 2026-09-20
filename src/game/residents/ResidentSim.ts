import {
  INITIAL_RESIDENT_COUNT,
  RESIDENT_MOVE_SPEED,
  type GameSpeed,
} from '../constants.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { applySchedule } from './commute.ts'
import { assignJobs } from './employment.ts'
import { applyHappiness, averageHappiness } from './happiness.ts'
import { assignHomes, relocateIfNeeded } from './housing.ts'
import { gameHoursFromDelta, tickNeeds } from './needs.ts'
import { residentAge, residentName } from './names.ts'
import { createResident, ResidentState, type Resident, type TileRef } from './resident.ts'
import { finishShopping, maybeStartShopping } from './shopping.ts'

const ARRIVE_DISTANCE = 2

export class ResidentSim {
  readonly residents: Resident[]
  private readonly map: WorldMap

  constructor(map: WorldMap, residents?: Resident[]) {
    this.map = map
    if (residents) {
      this.residents = residents.map((resident) => createResident(resident))
      return
    }

    const spawn = map.tileCenter(Math.floor(map.width / 2), Math.floor(map.height / 2))
    this.residents = Array.from({ length: INITIAL_RESIDENT_COUNT }, (_, index) => {
      const angle = (index / INITIAL_RESIDENT_COUNT) * Math.PI * 2
      const radius = map.tileSize * 0.8
      return createResident({
        id: `resident-${index + 1}`,
        name: residentName(index),
        age: residentAge(index),
        worldX: spawn.x + Math.cos(angle) * radius,
        worldY: spawn.y + Math.sin(angle) * radius,
      })
    })
    this.refreshHousing()
    this.refreshJobs()
  }

  refreshHousing(): void {
    assignHomes(this.map, this.residents)
    relocateIfNeeded(this.map, this.residents)
    applyHappiness(this.residents)
  }

  refreshJobs(): void {
    assignJobs(this.map, this.residents)
    applyHappiness(this.residents)
  }

  housedCount(): number {
    return this.residents.filter((resident) => resident.home).length
  }

  employedCount(): number {
    return this.residents.filter((resident) => resident.workplace).length
  }

  averageHappiness(): number {
    return averageHappiness(this.residents)
  }

  update(deltaMs: number, speed: GameSpeed, hour: number, isHoliday = false): void {
    if (speed === 0 || deltaMs <= 0) {
      return
    }

    const step = RESIDENT_MOVE_SPEED * (speed / 1) * (deltaMs / 1000)
    const gameHours = gameHoursFromDelta(deltaMs, speed)

    for (const resident of this.residents) {
      tickNeeds(resident, this.map, gameHours)
      applySchedule(resident, hour, isHoliday)
      maybeStartShopping(resident, this.map, hour, isHoliday)
      relocateIfNeeded(this.map, [resident])
      this.walkTowardGoal(resident, step)
    }

    applyHappiness(this.residents, { isHoliday })
  }

  private walkTowardGoal(resident: Resident, step: number): void {
    const goal = this.walkGoal(resident)
    if (!goal) {
      return
    }

    const target = this.map.tileCenter(goal.tile.x, goal.tile.y)
    const dx = target.x - resident.worldX
    const dy = target.y - resident.worldY
    const distance = Math.hypot(dx, dy)

    if (distance <= ARRIVE_DISTANCE || distance <= step) {
      resident.worldX = target.x
      resident.worldY = target.y
      resident.state = goal.arriveState
      if (goal.arriveState === ResidentState.Shopping) {
        finishShopping(resident)
      }
      return
    }

    resident.worldX += (dx / distance) * step
    resident.worldY += (dy / distance) * step
  }

  private walkGoal(
    resident: Resident,
  ): { tile: TileRef; arriveState: ResidentState } | undefined {
    if (
      (resident.state === ResidentState.MovingIn ||
        resident.state === ResidentState.MovingToHome) &&
      resident.home
    ) {
      return { tile: resident.home, arriveState: ResidentState.Home }
    }

    if (resident.state === ResidentState.MovingToWork && resident.workplace) {
      return { tile: resident.workplace, arriveState: ResidentState.Working }
    }

    if (
      (resident.state === ResidentState.MovingToShop ||
        resident.state === ResidentState.Shopping) &&
      resident.shopTarget
    ) {
      return { tile: resident.shopTarget, arriveState: ResidentState.Shopping }
    }

    return undefined
  }
}
