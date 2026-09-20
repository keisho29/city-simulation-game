import { INFLOW_MIN_HAPPINESS, MAX_POPULATION } from '../constants.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { averageHappiness } from '../residents/happiness.ts'
import { residentAge, residentName } from '../residents/names.ts'
import { createResident, type Resident } from '../residents/resident.ts'

export function canAcceptInflow(
  map: WorldMap,
  residents: readonly Resident[],
  maxPopulation = MAX_POPULATION,
  fortune = 100,
): boolean {
  if (residents.length >= maxPopulation) {
    return false
  }
  if (fortune < 35) {
    return false
  }
  if (map.vacantHouseSlots() <= 0) {
    return false
  }
  return averageHappiness(residents) >= INFLOW_MIN_HAPPINESS
}

export function createInflowResident(
  map: WorldMap,
  index: number,
): Resident {
  const spawn = map.tileCenter(Math.floor(map.width / 2), Math.floor(map.height / 2))
  const angle = (index % 12) * 0.52
  return createResident({
    id: `resident-${index + 1}`,
    name: residentName(index),
    age: residentAge(index),
    worldX: spawn.x + Math.cos(angle) * map.tileSize,
    worldY: spawn.y + Math.sin(angle) * map.tileSize,
  })
}
