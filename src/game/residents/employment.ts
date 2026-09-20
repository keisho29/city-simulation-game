import { isWorkplaceType, TileType } from '../map/tile.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import type { Resident } from './resident.ts'

export function assignJobs(map: WorldMap, residents: Resident[]): void {
  for (const resident of residents) {
    if (resident.workplace) {
      const jobTile = map.getTile(resident.workplace.x, resident.workplace.y)
      if (
        jobTile &&
        isWorkplaceType(jobTile.type) &&
        jobTile.occupantIds.includes(resident.id)
      ) {
        continue
      }

      resident.workplace = undefined
    }

    const near = resident.home
    const job = map.findVacantJob(near)
    if (!job || !map.occupyJob(job.x, job.y, resident.id)) {
      continue
    }

    resident.workplace = job
  }
}

export function workplaceLabel(type: TileType | undefined): string | undefined {
  switch (type) {
    case TileType.Farm:
      return '農地'
    case TileType.Shop:
      return '商店'
    case TileType.Workshop:
      return '工房'
    case TileType.Market:
      return '市場'
    case TileType.Warehouse:
      return '倉庫'
    case TileType.Clinic:
      return '診療所'
    case TileType.School:
      return '寺子屋'
    case TileType.Factory:
      return '工場'
    case TileType.Station:
      return '駅'
    case TileType.Port:
      return '港'
    case TileType.Airport:
      return '空港'
    default:
      return undefined
  }
}
