import {
  ERA_ADVANCE_DEVELOPMENT,
  ERA_ADVANCE_HOUSED,
} from '../constants.ts'
import type { BuildingId } from '../buildings/catalog.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import type { Resident } from '../residents/resident.ts'
import { cityDevelopment } from './development.ts'
import { EraId, eraName, isEraId, nextEra } from './era.ts'
import { isTechId, TECHS, TechId, techName } from './tech.ts'

export type ProgressState = {
  era: EraId
  discovered: TechId[]
  progress: Partial<Record<TechId, number>>
}

export type EraAdvanceView = {
  ready: boolean
  missing: string[]
}

export function createProgress(overrides: Partial<ProgressState> = {}): ProgressState {
  return {
    era: overrides.era && isEraId(overrides.era) ? overrides.era : EraId.Edo,
    discovered: (overrides.discovered ?? []).filter(isTechId),
    progress: { ...overrides.progress },
  }
}

export function hasTech(state: ProgressState, id: TechId): boolean {
  return state.discovered.includes(id)
}

export function techProgressOf(state: ProgressState, id: TechId): number {
  return state.progress[id] ?? 0
}

export function canDiscover(state: ProgressState, id: TechId): boolean {
  const def = TECHS[id]
  if (hasTech(state, id)) {
    return false
  }
  if (def.era === EraId.Meiji && state.era === EraId.Edo) {
    return false
  }
  return (def.requires ?? []).every((need) => hasTech(state, need))
}

export function addTechProgress(
  state: ProgressState,
  id: TechId,
  amount: number,
): TechId | undefined {
  if (amount <= 0 || !canDiscover(state, id)) {
    return undefined
  }

  const next = techProgressOf(state, id) + amount
  state.progress[id] = next
  if (next < TECHS[id].cost) {
    return undefined
  }

  state.discovered.push(id)
  return id
}

export function unlockedBuildingIds(state: ProgressState): BuildingId[] {
  const unlocked = new Set<BuildingId>()
  for (const id of state.discovered) {
    for (const building of TECHS[id].unlockBuildings ?? []) {
      unlocked.add(building as BuildingId)
    }
  }
  return [...unlocked]
}

export function isBuildingUnlocked(id: BuildingId, state: ProgressState): boolean {
  const required = Object.values(TECHS).find((tech) => tech.unlockBuildings?.includes(id))
  if (!required) {
    return true
  }
  return hasTech(state, required.id)
}

export function eraAdvanceView(
  state: ProgressState,
  map: WorldMap,
  residents: readonly Resident[],
): EraAdvanceView {
  const upcoming = nextEra(state.era)
  if (!upcoming) {
    return { ready: false, missing: ['これより先の時代はまだない'] }
  }

  const missing: string[] = []
  const development = cityDevelopment(map, residents)
  if (development < ERA_ADVANCE_DEVELOPMENT) {
    missing.push(`発展${ERA_ADVANCE_DEVELOPMENT}`)
  }

  const housed = residents.filter((resident) => resident.home).length
  if (housed < ERA_ADVANCE_HOUSED) {
    missing.push(`入居${ERA_ADVANCE_HOUSED}人`)
  }

  for (const id of [TechId.Farming, TechId.Trade, TechId.Craft] as const) {
    if (!hasTech(state, id)) {
      missing.push(techName(id))
    }
  }

  return { ready: missing.length === 0, missing }
}

export function advanceEra(state: ProgressState): EraId | undefined {
  const upcoming = nextEra(state.era)
  if (!upcoming) {
    return undefined
  }
  state.era = upcoming
  return upcoming
}

export function discoveredTechLabel(state: ProgressState): string {
  if (state.discovered.length === 0) {
    return 'なし'
  }
  return state.discovered.map(techName).join('、')
}

export function parseProgress(raw: unknown): ProgressState {
  if (!raw || typeof raw !== 'object') {
    return createProgress()
  }

  const record = raw as Record<string, unknown>
  const discovered = Array.isArray(record.discovered)
    ? record.discovered.filter(isTechId)
    : []
  const progress: Partial<Record<TechId, number>> = {}
  if (record.progress && typeof record.progress === 'object') {
    for (const [key, value] of Object.entries(record.progress as Record<string, unknown>)) {
      if (isTechId(key) && typeof value === 'number' && Number.isFinite(value)) {
        progress[key] = Math.max(0, value)
      }
    }
  }

  return createProgress({
    era: isEraId(record.era) ? record.era : EraId.Edo,
    discovered,
    progress,
  })
}

export function eraHudName(state: ProgressState): string {
  return eraName(state.era)
}
