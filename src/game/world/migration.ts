import { MIGRATION_INTERVAL_HOURS } from '../constants.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { averageHappiness } from '../residents/happiness.ts'
import { clearRide, ResidentState, type Resident } from '../residents/resident.ts'
import { clearHaul } from '../economy/logistics.ts'
import { isOverseas, linkedRegions, regionName, type RegionId } from './regions.ts'

export function tickMigration(
  maps: ReadonlyMap<RegionId, WorldMap>,
  people: Map<RegionId, Resident[]>,
  unlocked: ReadonlySet<RegionId>,
  gameHours: number,
  accum: { hours: number },
): string[] {
  accum.hours += gameHours
  if (accum.hours < MIGRATION_INTERVAL_HOURS) {
    return []
  }
  accum.hours = 0

  const notes: string[] = []
  for (const [fromId, fromPeople] of people) {
    if (!unlocked.has(fromId) || fromPeople.length === 0) {
      continue
    }
    const fromMap = maps.get(fromId)
    if (!fromMap) {
      continue
    }

    const candidate = fromPeople.find(
      (resident) =>
        !resident.home ||
        resident.happiness < 35 ||
        (resident.home && !resident.workplace && fromMap.vacantJobSlots() === 0),
    )
    if (!candidate) {
      continue
    }

    const dest = pickDest(fromId, maps, people, unlocked)
    if (!dest) {
      continue
    }

    leaveRegion(fromMap, fromPeople, candidate)
    joinRegion(dest.map, dest.people, candidate)
    notes.push(
      isOverseas(dest.id)
        ? `${candidate.name}が${regionName(dest.id)}へ渡った`
        : `${candidate.name}が${regionName(dest.id)}へ移った`,
    )
  }

  return notes
}

function pickDest(
  fromId: RegionId,
  maps: ReadonlyMap<RegionId, WorldMap>,
  people: Map<RegionId, Resident[]>,
  unlocked: ReadonlySet<RegionId>,
): { id: RegionId; map: WorldMap; people: Resident[] } | undefined {
  let best: { id: RegionId; map: WorldMap; people: Resident[]; score: number } | undefined
  for (const link of linkedRegions(fromId, maps, unlocked)) {
    const map = maps.get(link.id)
    const list = people.get(link.id)
    if (!map || !list) {
      continue
    }
    const houses = map.vacantHouseSlots()
    const jobs = map.vacantJobSlots()
    if (houses <= 0) {
      continue
    }
    const mood = averageHappiness(list)
    const score = houses * 3 + jobs * 2 + mood
    if (!best || score > best.score) {
      best = { id: link.id, map, people: list, score }
    }
  }
  return best
}

function leaveRegion(map: WorldMap, residents: Resident[], resident: Resident): void {
  if (resident.home) {
    map.vacateOccupant(resident.home.x, resident.home.y, resident.id)
  }
  if (resident.workplace) {
    map.vacateOccupant(resident.workplace.x, resident.workplace.y, resident.id)
  }
  resident.home = undefined
  resident.workplace = undefined
  resident.shopTarget = undefined
  clearHaul(resident)
  clearRide(resident)
  resident.state = ResidentState.SeekingHome
  const index = residents.indexOf(resident)
  if (index >= 0) {
    residents.splice(index, 1)
  }
}

function joinRegion(map: WorldMap, residents: Resident[], resident: Resident): void {
  const spawn = map.tileCenter(Math.floor(map.width / 2), Math.floor(map.height / 2))
  resident.worldX = spawn.x
  resident.worldY = spawn.y
  residents.push(resident)
}
