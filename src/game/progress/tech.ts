import {
  TECH_COST_CRAFT,
  TECH_COST_FARMING,
  TECH_COST_HYGIENE,
  TECH_COST_INDUSTRY,
  TECH_COST_LITERACY,
  TECH_COST_LOGISTICS,
  TECH_COST_TRADE,
} from '../constants.ts'
import { EraId } from './era.ts'

export const TechId = {
  Farming: 'farming',
  Trade: 'trade',
  Craft: 'craft',
  Hygiene: 'hygiene',
  Logistics: 'logistics',
  Literacy: 'literacy',
  Industry: 'industry',
} as const

export type TechId = (typeof TechId)[keyof typeof TechId]

export type TechDef = {
  id: TechId
  name: string
  era: EraId
  cost: number
  requires?: readonly TechId[]
  unlockBuildings?: readonly string[]
}

export const TECHS: Record<TechId, TechDef> = {
  farming: {
    id: TechId.Farming,
    name: '農法',
    era: EraId.Edo,
    cost: TECH_COST_FARMING,
  },
  trade: {
    id: TechId.Trade,
    name: '商業',
    era: EraId.Edo,
    cost: TECH_COST_TRADE,
  },
  craft: {
    id: TechId.Craft,
    name: '手工業',
    era: EraId.Edo,
    cost: TECH_COST_CRAFT,
  },
  hygiene: {
    id: TechId.Hygiene,
    name: '衛生',
    era: EraId.Edo,
    cost: TECH_COST_HYGIENE,
  },
  logistics: {
    id: TechId.Logistics,
    name: '物流',
    era: EraId.Edo,
    cost: TECH_COST_LOGISTICS,
  },
  literacy: {
    id: TechId.Literacy,
    name: '学問',
    era: EraId.Edo,
    cost: TECH_COST_LITERACY,
    unlockBuildings: ['school'],
  },
  industry: {
    id: TechId.Industry,
    name: '工業',
    era: EraId.Meiji,
    cost: TECH_COST_INDUSTRY,
    requires: [TechId.Craft],
    unlockBuildings: ['factory'],
  },
}

export function isTechId(value: unknown): value is TechId {
  return typeof value === 'string' && Object.hasOwn(TECHS, value)
}

export function techName(id: TechId): string {
  return TECHS[id].name
}
