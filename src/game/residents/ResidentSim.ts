import {
  FARMING_HARVEST_BONUS,
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
import { eraGoodsMult, eraHarvestMult, eraMaxPopulation, eraRailSpeed, eraRoadSpeed, eraWaterSpeed, eraWoodMult } from '../progress/eraBalance.ts'
import type { Treasury } from '../economy/treasury.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { tickTechDiscovery } from '../progress/discovery.ts'
import { createProgress, hasTech, type ProgressState } from '../progress/progress.ts'
import { TechId } from '../progress/tech.ts'
import { applySchedule } from './commute.ts'
import { assignJobs } from './employment.ts'
import { applyHappiness, averageHappiness } from './happiness.ts'
import { assignHomes, relocateIfNeeded } from './housing.ts'
import { gameHoursFromDelta, tickNeeds } from './needs.ts'
import { residentAge, residentName } from './names.ts'
import { clearRide, createResident, ResidentState, type Resident, type TileRef } from './resident.ts'
import { finishShopping, maybeStartShopping } from './shopping.ts'
import { moveSpeedMultiplier, planTransit, sameTile } from '../transit/network.ts'
import { TransitService, type TransitStats } from '../transit/service.ts'

const ARRIVE_DISTANCE = 2

export class ResidentSim {
  readonly residents: Resident[]
  cityEvent: CityEventState
  cityProgress: ProgressState
  lastDiscoveries: ReturnType<typeof tickTechDiscovery> = []
  readonly transit: TransitService
  climateHarvest = 1
  climateWood = 1
  worldHarvest = 1
  goodsMult = 1
  fortune = 55
  maxPopulation = 48
  worldMood = 0
  lastOutflow: string[] = []
  private readonly map: WorldMap
  private inflowHours = 0
  private outflowHours = 0

  constructor(
    map: WorldMap,
    residents?: Resident[],
    cityEvent?: CityEventState,
    progress?: ProgressState,
    transit?: Partial<TransitStats>,
  ) {
    this.map = map
    this.cityEvent = cityEvent ? { ...cityEvent } : createCityEvent()
    this.cityProgress = progress ?? createProgress()
    this.transit = new TransitService(transit)
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
    move = true,
  ): void {
    if (speed === 0 || deltaMs <= 0) {
      return
    }

    const gameHours = gameHoursFromDelta(deltaMs, speed)
    this.maxPopulation = eraMaxPopulation(this.cityProgress.era)
    this.transit.tick(this.map, deltaMs, speed, gameHours, treasury, move)
    this.cityEvent = tickCityEvents(this.cityEvent, gameHours)
    const harvest =
      harvestMultiplier(this.cityEvent) *
      (hasTech(this.cityProgress, TechId.Farming) ? FARMING_HARVEST_BONUS : 1) *
      this.climateHarvest *
      this.worldHarvest *
      eraHarvestMult(this.cityProgress)
    tickProduction(
      this.map,
      gameHours,
      harvest,
      this.climateWood * eraWoodMult(this.cityProgress),
      this.goodsMult * eraGoodsMult(this.cityProgress),
    )

    for (const resident of this.residents) {
      tickNeeds(resident, this.map, gameHours)
      if (treasury) {
        tickCityEconomy(resident, this.map, treasury, gameHours)
      }
      applySchedule(resident, hour, isHoliday)
      tryStartHaul(resident, this.map)
      maybeStartShopping(resident, this.map, hour, isHoliday)
      relocateIfNeeded(this.map, [resident])
      if (move) {
        this.walkTowardGoal(resident, deltaMs, speed, hour, isHoliday, treasury)
      }
    }

    this.fillOpenedSlots()
    this.tryInflow(gameHours)
    this.tryOutflow(gameHours)
    this.lastDiscoveries = tickTechDiscovery(
      this.cityProgress,
      this.map,
      this.residents,
      gameHours,
    )
    applyHappiness(this.residents, { ...this.happinessContext(), isHoliday })
  }

  private happinessContext() {
    return {
      festival: this.cityEvent.kind === CityEventKind.Festival,
      map: this.map,
      worldMood: this.worldMood,
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
    if (!canAcceptInflow(this.map, this.residents, this.maxPopulation, this.fortune)) {
      return
    }

    const next = createInflowResident(this.map, this.residents.length)
    this.residents.push(next)
    this.refreshHousing()
    this.refreshJobs()
  }

  private tryOutflow(gameHours: number): void {
    this.lastOutflow = []
    this.outflowHours += gameHours
    if (this.outflowHours < INFLOW_INTERVAL_HOURS) {
      return
    }
    this.outflowHours = 0
    if (this.fortune >= 32 || this.residents.length <= 8) {
      return
    }

    const candidate = this.residents.find(
      (resident) => !resident.home || resident.happiness < 32,
    )
    if (!candidate) {
      return
    }
    if (candidate.home) {
      this.map.vacateOccupant(candidate.home.x, candidate.home.y, candidate.id)
    }
    if (candidate.workplace) {
      this.map.vacateOccupant(candidate.workplace.x, candidate.workplace.y, candidate.id)
    }
    this.residents.splice(this.residents.indexOf(candidate), 1)
    this.lastOutflow.push(`${candidate.name}が町を出た`)
  }

  private walkTowardGoal(
    resident: Resident,
    deltaMs: number,
    speed: GameSpeed,
    hour: number,
    isHoliday: boolean,
    treasury?: Treasury,
  ): void {
    this.prepareTransit(resident)
    const rideKind = resident.state === ResidentState.Riding ? resident.rideKind : undefined
    const step =
      RESIDENT_MOVE_SPEED *
      moveSpeedMultiplier(this.map, resident.worldX, resident.worldY, rideKind, {
        road: eraRoadSpeed(this.cityProgress),
        rail: eraRailSpeed(this.cityProgress),
        water: eraWaterSpeed(this.cityProgress),
      }) *
      (speed / 1) *
      (deltaMs / 1000)

    if (resident.state === ResidentState.Riding) {
      this.rideAlong(resident, step)
      return
    }

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
      if (goal.arriveState === ResidentState.Riding) {
        this.transit.board(resident, treasury)
        resident.state = ResidentState.Riding
        resident.rideIndex = 0
        return
      }
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

  private prepareTransit(resident: Resident): void {
    if (resident.state === ResidentState.Riding) {
      return
    }

    const goal = this.finalWalkGoal(resident)
    if (!goal) {
      clearRide(resident)
      return
    }

    if (resident.rideDest && sameTile(resident.rideDest, goal.tile)) {
      return
    }

    clearRide(resident)
    const from = this.map.worldToTile(resident.worldX, resident.worldY)
    if (!from) {
      return
    }

    const plan = planTransit(this.map, from, goal.tile)
    if (plan.mode === 'walk') {
      return
    }

    resident.rideKind = plan.mode
    resident.ridePath = plan.path
    resident.rideIndex = 0
    resident.rideDest = goal.tile
    resident.rideArrive = goal.arriveState
  }

  private rideAlong(resident: Resident, step: number): void {
    const path = resident.ridePath
    if (!path || path.length < 2) {
      this.finishRide(resident)
      return
    }

    const index = resident.rideIndex ?? 0
    const nextIndex = Math.min(path.length - 1, index + 1)
    const next = path[nextIndex]
    if (!next) {
      this.finishRide(resident)
      return
    }

    const target = this.map.tileCenter(next.x, next.y)
    const dx = target.x - resident.worldX
    const dy = target.y - resident.worldY
    const distance = Math.hypot(dx, dy)
    if (distance <= ARRIVE_DISTANCE || distance <= step) {
      resident.worldX = target.x
      resident.worldY = target.y
      resident.rideIndex = nextIndex
      if (nextIndex >= path.length - 1) {
        this.finishRide(resident)
      }
      return
    }

    resident.worldX += (dx / distance) * step
    resident.worldY += (dy / distance) * step
  }

  private finishRide(resident: Resident): void {
    const dest = resident.rideDest
    const arrive = resident.rideArrive
    resident.rideKind = undefined
    resident.ridePath = undefined
    resident.rideIndex = undefined
    resident.rideDest = dest
    resident.rideArrive = arrive
    if (arrive === ResidentState.Working) {
      resident.state = ResidentState.MovingToWork
      return
    }
    if (arrive === ResidentState.Home) {
      resident.state = ResidentState.MovingToHome
      return
    }
    if (arrive === ResidentState.Shopping) {
      resident.state = ResidentState.MovingToShop
      return
    }
    if (arrive === ResidentState.Hauling) {
      resident.state = ResidentState.MovingToPickup
      return
    }
    if (arrive === ResidentState.MovingToWork) {
      resident.state = ResidentState.Hauling
      return
    }
    resident.state = dest && resident.home ? ResidentState.MovingToHome : ResidentState.SeekingHome
  }

  private walkGoal(
    resident: Resident,
  ): { tile: TileRef; arriveState: ResidentState } | undefined {
    if (
      resident.ridePath &&
      resident.ridePath[0] &&
      resident.state !== ResidentState.Riding
    ) {
      return { tile: resident.ridePath[0], arriveState: ResidentState.Riding }
    }
    return this.finalWalkGoal(resident)
  }

  private finalWalkGoal(
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
