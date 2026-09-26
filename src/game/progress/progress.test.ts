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
    expect(nextEra(EraId.Meiji)).toBe(EraId.Industrial)
    expect(nextEra(EraId.Industrial)).toBe(EraId.Contemporary)
    expect(nextEra(EraId.Contemporary)).toBe(EraId.Future)
    expect(nextEra(EraId.Future)).toBeUndefined()
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
    expect(isBuildingUnlocked('station', progress)).toBe(false)
    expect(canDiscover(progress, TechId.Railways)).toBe(true)
    addTechProgress(progress, TechId.Railways, 80)
    expect(isBuildingUnlocked('station', progress)).toBe(true)
    expect(isBuildingUnlocked('rail', progress)).toBe(true)
    expect(isBuildingUnlocked('airport', progress)).toBe(false)
    expect(canDiscover(progress, TechId.Aviation)).toBe(true)
    addTechProgress(progress, TechId.Aviation, 80)
    expect(isBuildingUnlocked('airport', progress)).toBe(true)
    expect(canDiscover(progress, TechId.Automobiles)).toBe(false)
    progress.era = EraId.Industrial
    expect(canDiscover(progress, TechId.Automobiles)).toBe(true)
    addTechProgress(progress, TechId.Automobiles, 80)
    addTechProgress(progress, TechId.Electricity, 80)
    addTechProgress(progress, TechId.Trade, 80)
    addTechProgress(progress, TechId.Literacy, 80)
    progress.era = EraId.Contemporary
    expect(canDiscover(progress, TechId.Services)).toBe(true)
    addTechProgress(progress, TechId.Services, 80)
    addTechProgress(progress, TechId.Computing, 80)
    progress.era = EraId.Future
    expect(canDiscover(progress, TechId.Aerial)).toBe(true)
  })

  it('unlocks a port after logistics is found', () => {
    const progress = createProgress()
    expect(isBuildingUnlocked('port', progress)).toBe(false)
    addTechProgress(progress, TechId.Logistics, 80)
    expect(isBuildingUnlocked('port', progress)).toBe(true)
  })
})

describe('city development', () => {
  it('rises as the town gains homes and jobs', () => {
    const empty = new WorldMap(6, 6, 32)
    const emptyScore = cityDevelopment(empty, [createResident()])
    const grown = new WorldMap(6, 6, 32)
    grown.place(0, 0, TileType.House)
    grown.place(2, 0, TileType.Farm)
    grown.place(3, 0, TileType.Shop)
    grown.occupyHouse(0, 0, 'r1')
    grown.occupyJob(2, 0, 'r1')
    const grownScore = cityDevelopment(grown, [
      createResident({ id: 'r1', home: { x: 0, y: 0 }, workplace: { x: 2, y: 0 }, happiness: 80 }),
    ])
    expect(grownScore).toBeGreaterThan(emptyScore)
  })
})

describe('era advance', () => {
  it('lets the city move to the 1800s when growth and techs are ready', () => {
    const map = new WorldMap(8, 8, 32)
    map.place(0, 0, TileType.House)
    map.place(2, 0, TileType.House)
    map.place(4, 0, TileType.House)
    map.place(6, 0, TileType.House)
    map.place(0, 2, TileType.Farm)
    map.place(2, 2, TileType.Shop)
    map.place(4, 2, TileType.Workshop)
    const residents = [0, 2, 4, 6].map((x) =>
      createResident({
        id: `r${x}`,
        home: { x, y: 0 },
        workplace: { x: x === 6 ? 4 : x, y: 2 },
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

  it('opens 1900s after industry and railways take hold', () => {
    const map = new WorldMap(8, 8, 32)
    const homes: Array<{ x: number; y: number }> = []
    for (let y = 0; y <= 4; y += 2) {
      for (let x = 0; x <= 6; x += 2) {
        if (homes.length >= 10) {
          break
        }
        map.place(x, y, TileType.House)
        homes.push({ x, y })
      }
    }
    map.place(4, 6, TileType.Factory)
    const residents = homes.map((home, index) =>
      createResident({
        id: `r${index}`,
        home,
        workplace: { x: 4, y: 6 },
        happiness: 70,
      }),
    )
    const progress = createProgress({
      era: EraId.Meiji,
      discovered: [TechId.Industry, TechId.Railways, TechId.Aviation, TechId.Automobiles],
    })
    expect(eraAdvanceView(progress, map, residents).ready).toBe(true)
    expect(advanceEra(progress)).toBe(EraId.Industrial)
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
