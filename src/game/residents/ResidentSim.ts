import {
  INITIAL_RESIDENT_COUNT,
  INFLOW_INTERVAL_HOURS,
  RESIDENT_MOVE_SPEED,
  WORK_END_HOUR,
  WORK_START_HOUR,
  type GameSpeed,
} from '../constants.ts'
import { canAcceptInflow, createInflowResident } from '../city/inflow.ts'
import {
  CityEventKind,
  createCityEvent,
  harvestMultiplier,
  tickCityEvents,
  type CityEventState,
} from '../city/events.ts'
import { tickCityEconomy } from '../economy/circulation.ts'
import { completeDrop, completePickup, tryStartHaul } from '../economy/logistics.ts'
import { tickProduction } from '../economy/production.ts'
import type { Treasury } from '../economy/treasury.ts'
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
  cityEvent: CityEventState
  private readonly map: WorldMap
  private inflowHours = 0

  constructor(map: WorldMap, residents?: Resident[], cityEvent?: CityEventState) {
    this.map = map
    this.cityEvent = cityEvent ? { ...cityEvent } : createCityEvent()
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
    applyHappiness(this.residents, this.happinessContext())
  }

  refreshJobs(): void {
    assignJobs(this.map, this.residents)
    applyHappiness(this.residents, this.happinessContext())
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

  update(
    deltaMs: number,
    speed: GameSpeed,
    hour: number,
    isHoliday = false,
    treasury?: Treasury,
  ): void {
    if (speed === 0 || deltaMs <= 0) {
      return
    }

    const step = RESIDENT_MOVE_SPEED * (speed / 1) * (deltaMs / 1000)
    const gameHours = gameHoursFromDelta(deltaMs, speed)
    this.cityEvent = tickCityEvents(this.cityEvent, gameHours)
    tickProduction(this.map, gameHours, harvestMultiplier(this.cityEvent))

    for (const resident of this.residents) {
      tickNeeds(resident, this.map, gameHours)
      if (treasury) {
        tickCityEconomy(resident, this.map, treasury, gameHours)
      }
      applySchedule(resident, hour, isHoliday)
      tryStartHaul(resident, this.map)
      maybeStartShopping(resident, this.map, hour, isHoliday)
      relocateIfNeeded(this.map, [resident])
      this.walkTowardGoal(resident, step, hour, isHoliday, treasury)
    }

    this.fillOpenedSlots()
    this.tryInflow(gameHours)
    applyHappiness(this.residents, { ...this.happinessContext(), isHoliday })
  }

  private happinessContext() {
    return {
      festival: this.cityEvent.kind === CityEventKind.Festival,
      map: this.map,
    }
  }

  private fillOpenedSlots(): void {
    const homeless = this.residents.some((resident) => !resident.home)
    const jobless = this.residents.some((resident) => resident.home && !resident.workplace)
    if (homeless && this.map.vacantHouseSlots() > 0) {
      this.refreshHousing()
    }
    if (jobless && this.map.vacantJobSlots() > 0) {
      this.refreshJobs()
    }
  }

  private tryInflow(gameHours: number): void {
    this.inflowHours += gameHours
    if (this.inflowHours < INFLOW_INTERVAL_HOURS) {
      return
    }
    this.inflowHours = 0
    if (!canAcceptInflow(this.map, this.residents)) {
      return
    }

    const next = createInflowResident(this.map, this.residents.length)
    this.residents.push(next)
    this.refreshHousing()
    this.refreshJobs()
  }

  private walkTowardGoal(
    resident: Resident,
    step: number,
    hour: number,
    isHoliday: boolean,
    treasury?: Treasury,
  ): void {
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
      if (goal.arriveState === ResidentState.Shopping) {
        finishShopping(resident, this.map, treasury)
        return
      }
      if (goal.arriveState === ResidentState.Hauling) {
        completePickup(resident, this.map)
        return
      }
      if (goal.arriveState === ResidentState.MovingToWork && resident.state === ResidentState.Hauling) {
        const goHome = isHoliday || hour < WORK_START_HOUR || hour >= WORK_END_HOUR
        completeDrop(resident, this.map, goHome)
        return
      }
      resident.state = goal.arriveState
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

    if (resident.state === ResidentState.MovingToPickup && resident.haulPickup) {
      return { tile: resident.haulPickup, arriveState: ResidentState.Hauling }
    }

    if (resident.state === ResidentState.Hauling && resident.haulDrop) {
      return { tile: resident.haulDrop, arriveState: ResidentState.MovingToWork }
    }

    return undefined
  }
}
