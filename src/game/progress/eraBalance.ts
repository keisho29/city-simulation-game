import { EraId, eraAtLeast } from '../progress/era.ts'
import { hasTech, type ProgressState } from '../progress/progress.ts'
import { TechId } from '../progress/tech.ts'
import {
  RAIL_SPEED_MULT,
  ROAD_SPEED_MULT,
  WATER_SPEED_MULT,
} from '../constants.ts'

export function eraHarvestMult(progress: ProgressState): number {
  const era = progress.era
  let value = 1
  if (era === EraId.Industrial) {
    value = 0.96
  } else if (era === EraId.Contemporary) {
    value = hasTech(progress, TechId.Computing) ? 1.08 : 0.94
  } else if (era === EraId.Future) {
    value = 1.16
  }
  if (hasTech(progress, TechId.Farming)) {
    value *= 1
  }
  return value
}

export function eraGoodsMult(progress: ProgressState): number {
  let value = eraAtLeast(progress.era, EraId.Meiji) ? 1.08 : 0.9
  if (eraAtLeast(progress.era, EraId.Industrial)) {
    value = 1.28
  }
  if (eraAtLeast(progress.era, EraId.Contemporary)) {
    value = hasTech(progress, TechId.Services) ? 1.38 : 1.22
  }
  if (eraAtLeast(progress.era, EraId.Future)) {
    value = 1.55
  }
  if (hasTech(progress, TechId.Electricity)) {
    value *= 1.12
  }
  return value
}

export function eraWoodMult(progress: ProgressState): number {
  let value = 1
  if (hasTech(progress, TechId.Electricity)) {
    value *= 1.1
  }
  if (eraAtLeast(progress.era, EraId.Contemporary)) {
    value *= 0.92
  }
  return value
}

export function eraRoadSpeed(progress: ProgressState): number {
  let value = ROAD_SPEED_MULT
  if (hasTech(progress, TechId.Automobiles)) {
    value *= 1.35
  }
  if (eraAtLeast(progress.era, EraId.Contemporary)) {
    value *= 1.08
  }
  if (hasTech(progress, TechId.Aerial) || eraAtLeast(progress.era, EraId.Future)) {
    value *= 1.12
  }
  return value
}

export function eraRailSpeed(progress: ProgressState): number {
  let value = RAIL_SPEED_MULT
  if (eraAtLeast(progress.era, EraId.Industrial)) {
    value *= 1.1
  }
  if (hasTech(progress, TechId.Aerial)) {
    value *= 1.25
  }
  return value
}

export function eraWaterSpeed(progress: ProgressState): number {
  let value = WATER_SPEED_MULT
  if (eraAtLeast(progress.era, EraId.Meiji)) {
    value *= 1.08
  }
  if (eraAtLeast(progress.era, EraId.Contemporary)) {
    value *= 1.12
  }
  return value
}

export function eraMaxPopulation(era: EraId): number {
  if (era === EraId.Future) {
    return 96
  }
  if (era === EraId.Contemporary) {
    return 80
  }
  if (era === EraId.Industrial) {
    return 64
  }
  if (era === EraId.Meiji) {
    return 56
  }
  return 48
}
