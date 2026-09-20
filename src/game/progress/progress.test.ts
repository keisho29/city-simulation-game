import { describe, expect, it } from 'vitest'
import { EraId, eraName, nextEra } from './era.ts'
import { TechId } from './tech.ts'
import {
  addTechProgress,
  advanceEra,
  canDiscover,
  createProgress,
  eraAdvanceView,
  hasTech,
  isBuildingUnlocked,
} from './progress.ts'
import { cityDevelopment } from './development.ts'
import { WorldMap } from '../map/WorldMap.ts'
import { TileType } from '../map/tile.ts'
import { createResident } from '../residents/resident.ts'
import { tickTechDiscovery } from './discovery.ts'
import { ResidentState } from '../residents/resident.ts'

describe('era', () => {
  it('starts in the 1700s and can name the next era', () => {
    expect(eraName(EraId.Edo)).toBe('1700年代')
    expect(nextEra(EraId.Edo)).toBe(EraId.Meiji)
    expect(nextEra(EraId.Meiji)).toBeUndefined()
  })
})

describe('tech progress', () => {
  it('discovers a technology when enough work is recorded', () => {
    const progress = createProgress()
    expect(addTechProgress(progress, TechId.Farming, 8)).toBeUndefined()
    expect(hasTech(progress, TechId.Farming)).toBe(false)
    expect(addTechProgress(progress, TechId.Farming, 20)).toBe(TechId.Farming)
    expect(hasTech(progress, TechId.Farming)).toBe(true)
  })

  it('unlocks a school after literacy is found', () => {
    const progress = createProgress()
    expect(isBuildingUnlocked('school', progress)).toBe(false)
    addTechProgress(progress, TechId.Literacy, 80)
    expect(isBuildingUnlocked('school', progress)).toBe(true)
    expect(isBuildingUnlocked('house', progress)).toBe(true)
  })

  it('keeps industry closed until the 1800s', () => {
    const progress = createProgress()
    addTechProgress(progress, TechId.Craft, 80)
    expect(canDiscover(progress, TechId.Industry)).toBe(false)
    progress.era = EraId.Meiji
    expect(canDiscover(progress, TechId.Industry)).toBe(true)
    addTechProgress(progress, TechId.Industry, 80)
    expect(isBuildingUnlocked('factory', progress)).toBe(true)
  })
})

describe('city development', () => {
  it('rises as the town gains homes and jobs', () => {
    const empty = new WorldMap(6, 6, 32)
    const emptyScore = cityDevelopment(empty, [createResident()])
    const grown = new WorldMap(6, 6, 32)
    grown.place(1, 1, TileType.House)
    grown.place(2, 1, TileType.Farm)
    grown.place(3, 1, TileType.Shop)
    grown.occupyHouse(1, 1, 'r1')
    grown.occupyJob(2, 1, 'r1')
    const grownScore = cityDevelopment(grown, [
      createResident({ id: 'r1', home: { x: 1, y: 1 }, workplace: { x: 2, y: 1 }, happiness: 80 }),
    ])
    expect(grownScore).toBeGreaterThan(emptyScore)
  })
})

describe('era advance', () => {
  it('lets the city move to the 1800s when growth and techs are ready', () => {
    const map = new WorldMap(8, 8, 32)
    map.place(0, 0, TileType.House)
    map.place(1, 0, TileType.House)
    map.place(2, 0, TileType.House)
    map.place(3, 0, TileType.House)
    map.place(0, 1, TileType.Farm)
    map.place(1, 1, TileType.Shop)
    map.place(2, 1, TileType.Workshop)
    const residents = [0, 1, 2, 3].map((index) =>
      createResident({
        id: `r${index}`,
        home: { x: index, y: 0 },
        workplace: { x: index % 3, y: 1 },
        happiness: 70,
      }),
    )
    const progress = createProgress()
    expect(eraAdvanceView(progress, map, residents).ready).toBe(false)
    addTechProgress(progress, TechId.Farming, 80)
    addTechProgress(progress, TechId.Trade, 80)
    addTechProgress(progress, TechId.Craft, 80)
    expect(eraAdvanceView(progress, map, residents).ready).toBe(true)
    expect(advanceEra(progress)).toBe(EraId.Meiji)
    expect(progress.era).toBe(EraId.Meiji)
  })
})

describe('tech discovery from life', () => {
  it('learns farming from farm work', () => {
    const map = new WorldMap(4, 4, 32)
    map.place(0, 0, TileType.Farm)
    const progress = createProgress()
    const resident = createResident({
      workplace: { x: 0, y: 0 },
      state: ResidentState.Working,
    })
    const found = tickTechDiscovery(progress, map, [resident], 20)
    expect(found).toContain(TechId.Farming)
    expect(hasTech(progress, TechId.Farming)).toBe(true)
  })
})
