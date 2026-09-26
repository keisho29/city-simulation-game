import { HUNGER_SHOP_THRESHOLD, LEISURE_HOME_STAY_HOURS, LEISURE_STAY_HOURS, LEISURE_TALK_HOURS } from '../constants.ts'
import { isWaterTerrain, TileType } from '../map/tile.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { isRestHours, isWorkHours } from './commute.ts'
import { canAffordFood } from './needs.ts'
import { clearLeisure, isLeisureState, ResidentState, type Resident, type TileRef } from './resident.ts'

export const LEISURE_STATES = [
  ResidentState.Wandering,
  ResidentState.Talking,
  ResidentState.Playing,
  ResidentState.Exercising,
  ResidentState.Sporting,
] as const

export type LeisureKind = 'home' | 'wander' | 'talk' | 'play' | 'exercise' | 'sport' | 'shop'

export function isWalkableTile(map: WorldMap, x: number, y: number): boolean {
  const tile = map.getTile(x, y)
  if (!tile) {
    return false
  }
  if (isWaterTerrain(tile.terrain) && tile.type !== TileType.Road) {
    return false
  }
  return true
}

export function pickWalkableNear(
  map: WorldMap,
  origin: TileRef,
  minRadius: number,
  maxRadius: number,
  salt: number,
): TileRef | undefined {
  for (let attempt = 0; attempt < 28; attempt += 1) {
    const span = maxRadius - minRadius + 1
    const radius = minRadius + ((salt + attempt * 7) % span)
    const angle = ((salt + attempt * 13) % 360) * (Math.PI / 180)
    const x = Math.round(origin.x + Math.cos(angle) * radius)
    const y = Math.round(origin.y + Math.sin(angle) * radius)
    if ((x !== origin.x || y !== origin.y) && isWalkableTile(map, x, y)) {
      return { x, y }
    }
  }

  let found: TileRef | undefined
  map.forEachTile((x, y) => {
    if (found) {
      return
    }
    const distance = Math.abs(x - origin.x) + Math.abs(y - origin.y)
    if (distance >= minRadius && distance <= maxRadius && isWalkableTile(map, x, y)) {
      found = { x, y }
    }
  })
  return found
}

export function rollLeisureKind(resident: Resident, hasShop: boolean): LeisureKind {
  const hungry = resident.hunger >= HUNGER_SHOP_THRESHOLD && canAffordFood(resident) && hasShop
  const roll = unitRoll(resident, Math.floor(resident.hunger + resident.money))
  if (hungry && roll < 0.22) {
    return 'shop'
  }
  if (!resident.home) {
    if (resident.age < 16 && roll < 0.45) {
      return 'play'
    }
    return roll < 0.7 ? 'wander' : 'talk'
  }
  if (resident.age < 16) {
    if (roll < 0.38) {
      return 'play'
    }
    if (roll < 0.58) {
      return 'wander'
    }
    if (roll < 0.78) {
      return 'talk'
    }
    return 'home'
  }
  if (resident.age >= 60) {
    if (roll < 0.28) {
      return 'talk'
    }
    if (roll < 0.5) {
      return 'wander'
    }
    if (roll < 0.62) {
      return 'exercise'
    }
    return 'home'
  }
  if (roll < 0.22) {
    return 'wander'
  }
  if (roll < 0.4) {
    return 'talk'
  }
  if (roll < 0.55) {
    return 'exercise'
  }
  if (roll < 0.68) {
    return 'sport'
  }
  return 'home'
}

export function startLeisure(
  resident: Resident,
  residents: readonly Resident[],
  map: WorldMap,
  kind: LeisureKind,
): void {
  const here = map.worldToTile(resident.worldX, resident.worldY) ?? resident.home ?? { x: 0, y: 0 }
  const salt = saltOf(resident.id, here.x + here.y * 50)

  if (kind === 'home') {
    clearLeisure(resident)
    if (resident.home) {
      resident.activityHours = LEISURE_HOME_STAY_HOURS
      resident.state = resident.state === ResidentState.Home ? ResidentState.Home : ResidentState.MovingToHome
      return
    }
    kind = 'wander'
  }

  if (kind === 'shop') {
    const origin = resident.home ?? here
    const shop = map.findNearestShop(origin, { minFood: 1 })
    if (!shop) {
      startLeisure(resident, residents, map, 'wander')
      return
    }
    clearLeisure(resident)
    resident.shopTarget = shop
    resident.state = ResidentState.MovingToShop
    return
  }

  if (kind === 'talk') {
    const partner = findTalkPartner(resident, residents, map)
    if (!partner) {
      startLeisure(resident, residents, map, 'wander')
      return
    }
    const dest = map.worldToTile(partner.worldX, partner.worldY) ?? here
    resident.strollTarget = dest
    resident.talkWith = partner.id
    resident.activityHours = undefined
    resident.state = ResidentState.Talking
    if (!isBusy(partner) && !isLeisureState(partner.state) && partner.state !== ResidentState.Home) {
      partner.talkWith = resident.id
      partner.strollTarget = here
      partner.state = ResidentState.Talking
    }
    return
  }

  const radius =
    kind === 'play' ? [2, 7] : kind === 'exercise' || kind === 'sport' ? [8, 18] : [4, 12]
  const dest = pickWalkableNear(map, here, radius[0]!, radius[1]!, salt)
  if (!dest) {
    if (resident.home) {
      resident.state = ResidentState.MovingToHome
      clearLeisure(resident)
    }
    return
  }

  resident.strollTarget = dest
  resident.talkWith = undefined
  resident.activityHours = undefined
  resident.state =
    kind === 'play'
      ? ResidentState.Playing
      : kind === 'exercise'
        ? ResidentState.Exercising
        : kind === 'sport'
          ? ResidentState.Sporting
          : ResidentState.Wandering
}

export function tickLeisure(
  resident: Resident,
  residents: readonly Resident[],
  map: WorldMap,
  hour: number,
  isHoliday: boolean,
  gameHours: number,
): void {
  if (isBusy(resident) && !isLeisureState(resident.state) && resident.state !== ResidentState.SeekingHome) {
    return
  }

  if (isRestHours(hour) && resident.home) {
    if (isLeisureState(resident.state) || resident.state === ResidentState.SeekingHome) {
      clearLeisure(resident)
      resident.state = ResidentState.MovingToHome
    }
    return
  }

  if (!isHoliday && isWorkHours(hour) && resident.workplace) {
    return
  }

  if (isLeisureState(resident.state)) {
    continueLeisure(resident, residents, map, gameHours)
    return
  }

  if (resident.state === ResidentState.SeekingHome) {
    startLeisure(resident, residents, map, resident.age < 16 ? 'play' : 'wander')
    return
  }

  if (resident.state !== ResidentState.Home) {
    return
  }

  if ((resident.activityHours ?? 0) > 0) {
    resident.activityHours = Math.max(0, (resident.activityHours ?? 0) - gameHours)
    return
  }

  if (unitRoll(resident, hour * 10 + Math.floor(resident.worldX)) > Math.min(0.95, gameHours * 3.2)) {
    resident.activityHours = LEISURE_HOME_STAY_HOURS
    return
  }

  const hasShop = Boolean((resident.home && map.findNearestShop(resident.home, { minFood: 1 })) || map.findNearestShop(hereOf(resident, map), { minFood: 1 }))
  startLeisure(resident, residents, map, rollLeisureKind(resident, hasShop))
}

function continueLeisure(
  resident: Resident,
  residents: readonly Resident[],
  map: WorldMap,
  gameHours: number,
): void {
  if (resident.state === ResidentState.Talking && resident.talkWith) {
    const partner = residents.find((other) => other.id === resident.talkWith)
    if (!partner || (isBusy(partner) && partner.state !== ResidentState.Talking)) {
      finishLeisure(resident, residents, map)
      return
    }
    const dest = map.worldToTile(partner.worldX, partner.worldY)
    if (dest && resident.strollTarget) {
      resident.strollTarget = dest
    }
  }

  if (resident.strollTarget) {
    return
  }

  if (resident.activityHours === undefined) {
    const origin = hereOf(resident, map)
    const hasShop = Boolean(map.findNearestShop(origin, { minFood: 1 }))
    startLeisure(resident, residents, map, rollLeisureKind(resident, hasShop))
    return
  }

  resident.activityHours = resident.activityHours - gameHours
  if (resident.activityHours > 0) {
    return
  }

  finishLeisure(resident, residents, map)
}

export function arriveLeisure(resident: Resident, residents: readonly Resident[], map: WorldMap): void {
  resident.strollTarget = undefined
  if (resident.state === ResidentState.Talking) {
    const partner = residents.find((other) => other.id === resident.talkWith)
    resident.activityHours = LEISURE_TALK_HOURS
    if (partner && !isBusy(partner)) {
      partner.talkWith = resident.id
      partner.strollTarget = undefined
      partner.activityHours = LEISURE_TALK_HOURS
      partner.state = ResidentState.Talking
    }
    return
  }

  if (!resident.home) {
    startLeisure(resident, residents, map, resident.age < 16 ? 'play' : 'wander')
    return
  }

  resident.activityHours = LEISURE_STAY_HOURS
}

function finishLeisure(resident: Resident, residents: readonly Resident[], map: WorldMap): void {
  if (!resident.home) {
    clearLeisure(resident)
    resident.state = ResidentState.SeekingHome
    return
  }
  const origin = hereOf(resident, map)
  const hasShop = Boolean(map.findNearestShop(origin, { minFood: 1 }))
  startLeisure(resident, residents, map, rollLeisureKind(resident, hasShop))
}

function findTalkPartner(
  resident: Resident,
  residents: readonly Resident[],
  map: WorldMap,
): Resident | undefined {
  const here = hereOf(resident, map)
  let best: Resident | undefined
  let bestDistance = 18
  for (const other of residents) {
    if (other.id === resident.id || isBusy(other) || isResidentIndoorState(other.state)) {
      continue
    }
    const tile = map.worldToTile(other.worldX, other.worldY)
    if (!tile) {
      continue
    }
    const distance = Math.abs(tile.x - here.x) + Math.abs(tile.y - here.y)
    if (distance > 0 && distance < bestDistance) {
      best = other
      bestDistance = distance
    }
  }
  return best
}

function isBusy(resident: Resident): boolean {
  return (
    resident.state === ResidentState.MovingIn ||
    resident.state === ResidentState.MovingToWork ||
    resident.state === ResidentState.Working ||
    resident.state === ResidentState.MovingToShop ||
    resident.state === ResidentState.Shopping ||
    resident.state === ResidentState.MovingToHome ||
    resident.state === ResidentState.MovingToPickup ||
    resident.state === ResidentState.Hauling ||
    resident.state === ResidentState.Riding
  )
}

function isResidentIndoorState(state: ResidentState): boolean {
  return (
    state === ResidentState.Home ||
    state === ResidentState.Working ||
    state === ResidentState.Shopping
  )
}

function hereOf(resident: Resident, map: WorldMap): TileRef {
  return map.worldToTile(resident.worldX, resident.worldY) ?? resident.home ?? { x: 0, y: 0 }
}

function saltOf(id: string, extra: number): number {
  let hash = extra
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 33 + id.charCodeAt(index)) >>> 0
  }
  return hash
}

function unitRoll(resident: Resident, extra: number): number {
  return (saltOf(resident.id, extra) % 1000) / 1000
}
