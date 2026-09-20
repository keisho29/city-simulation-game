import { TileType } from '../map/tile.ts'
import { ResidentState, type Resident, type TileRef } from './resident.ts'

export const RESIDENT_PICK_RADIUS = 28

export const RESIDENT_STATE_LABELS: Record<ResidentState, string> = {
  [ResidentState.SeekingHome]: '住宅を探している',
  [ResidentState.MovingIn]: '入居中',
  [ResidentState.Home]: '自宅にいる',
  [ResidentState.MovingToWork]: '出勤中',
  [ResidentState.Working]: '勤務中',
  [ResidentState.MovingToHome]: '帰宅中',
  [ResidentState.MovingToShop]: '買い物へ向かっている',
  [ResidentState.Shopping]: '買い物中',
}

export type ResidentDetailView = {
  id: string
  name: string
  age: string
  state: string
  home: string
  job: string
  workplace: string
  hunger: string
  money: string
  happiness: string
}

export function residentStateLabel(state: ResidentState): string {
  return RESIDENT_STATE_LABELS[state]
}

export function workplaceLabel(type: TileType | undefined): string {
  switch (type) {
    case TileType.Farm:
      return '農地'
    case TileType.Shop:
      return '商店'
    case TileType.Workshop:
      return '工房'
    default:
      return '未就職'
  }
}

export function tileRefLabel(ref: TileRef | undefined, empty: string): string {
  if (!ref) {
    return empty
  }

  return `${ref.x}, ${ref.y}`
}

export function pickNearestResident(
  residents: readonly Resident[],
  worldX: number,
  worldY: number,
  radius = RESIDENT_PICK_RADIUS,
): Resident | undefined {
  let nearest: Resident | undefined
  let nearestDistance = radius

  for (const resident of residents) {
    const distance = Math.hypot(resident.worldX - worldX, resident.worldY - worldY)
    if (distance <= nearestDistance) {
      nearest = resident
      nearestDistance = distance
    }
  }

  return nearest
}

export function pickResidentOnTile(
  residents: readonly Resident[],
  tile: TileRef,
): Resident | undefined {
  return residents.find(
    (resident) =>
      (resident.home?.x === tile.x && resident.home.y === tile.y) ||
      (resident.workplace?.x === tile.x && resident.workplace.y === tile.y) ||
      (resident.shopTarget?.x === tile.x && resident.shopTarget.y === tile.y),
  )
}

export function inspectResident(
  residents: readonly Resident[],
  worldX: number,
  worldY: number,
  tile: TileRef | undefined,
  radius = RESIDENT_PICK_RADIUS,
): Resident | undefined {
  const nearest = pickNearestResident(residents, worldX, worldY, radius)
  if (nearest) {
    return nearest
  }

  if (!tile) {
    return undefined
  }

  return pickResidentOnTile(residents, tile)
}

export function residentDetailView(
  resident: Resident,
  jobType: TileType | undefined,
): ResidentDetailView {
  return {
    id: resident.id,
    name: resident.name,
    age: `${resident.age}歳`,
    state: residentStateLabel(resident.state),
    home: tileRefLabel(resident.home, '未入居'),
    job: workplaceLabel(jobType),
    workplace: tileRefLabel(resident.workplace, 'なし'),
    hunger: `${Math.round(resident.hunger)}%`,
    money: Math.round(resident.money).toLocaleString('ja-JP'),
    happiness: `${resident.happiness}%`,
  }
}
