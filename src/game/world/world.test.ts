import { describe, expect, it } from 'vitest'
import { GameSpeed } from '../constants.ts'
import { StockKind } from '../economy/goods.ts'
import { Terrain, TileType } from '../map/tile.ts'
import type { WorldMap } from '../map/WorldMap.ts'
import { EraId } from '../progress/era.ts'
import { createProgress } from '../progress/progress.ts'
import { TechId } from '../progress/tech.ts'
import { parseSnapshot } from '../save/save.ts'
import { tickMigration } from './migration.ts'
import {
  AreaId,
  CountryId,
  JAPAN_REGION_IDS,
  OVERSEAS_REGION_IDS,
  REGIONS,
  RegionId,
  openLinkMode,
} from './regions.ts'
import { tickInterRegionTrade } from './trade.ts'
import { WorldSession } from './WorldSession.ts'

describe('kanto regions', () => {
  it('keeps Edo open and names the other Kanto towns', () => {
    expect(REGIONS[RegionId.Edo].name).toBe('江戸')
    expect(REGIONS[RegionId.Yokohama].name).toBe('横浜')
    expect(REGIONS[RegionId.Kawagoe].climate).toBe('内陸')
    expect(REGIONS[RegionId.Takasaki].harvest).toBeLessThan(1)
    expect(REGIONS[RegionId.Mito].wood).toBeGreaterThan(1)
  })

  it('unlocks Yokohama after logistics and six housed people', () => {
    const world = new WorldSession()
    world.progress.discovered.push(TechId.Logistics)
    expect(placeMany(world.active.map, TileType.House, 6)).toBe(true)
    world.active.sim.refreshHousing()
    expect(world.active.sim.housedCount() >= 6).toBe(true)
    expect(world.tryUnlock()).toContain(RegionId.Yokohama)
    expect(world.region(RegionId.Yokohama)?.unlocked).toBe(true)
    expect(world.switchTo(RegionId.Yokohama)).toBe(true)
  })

  it('connects Edo and Yokohama by ship after both have ports', () => {
    const world = new WorldSession()
    const edoWater = world.active.map.getTile(8, 7)
    if (edoWater) {
      edoWater.terrain = Terrain.Water
    }
    expect(world.active.map.place(8, 8, TileType.Port)).toBe(true)
    const yokohamaMap = world.mapOf(RegionId.Yokohama)!
    world.region(RegionId.Yokohama)!.unlocked = true
    const yokoWater = yokohamaMap.getTile(6, 5)
    if (yokoWater) {
      yokoWater.terrain = Terrain.Water
    }
    expect(yokohamaMap.place(6, 6, TileType.Port)).toBe(true)
    const maps = new Map([
      [RegionId.Edo, world.active.map],
      [RegionId.Yokohama, yokohamaMap],
    ])
    const unlocked = new Set([RegionId.Edo, RegionId.Yokohama])
    expect(openLinkMode(RegionId.Edo, RegionId.Yokohama, maps, unlocked)).toBe('water')
  })
})

describe('japan and world regions', () => {
  it('covers Hokkaido through Okinawa plus overseas ports', () => {
    expect(JAPAN_REGION_IDS.map((id) => REGIONS[id].area).sort()).toEqual(
      [
        AreaId.Chubu,
        AreaId.Chugoku,
        AreaId.Hokkaido,
        AreaId.Kansai,
        AreaId.Kansai,
        AreaId.Kanto,
        AreaId.Kanto,
        AreaId.Kanto,
        AreaId.Kanto,
        AreaId.Kanto,
        AreaId.Kyushu,
        AreaId.Okinawa,
        AreaId.Shikoku,
        AreaId.Tohoku,
      ].sort(),
    )
    expect(REGIONS[RegionId.Hakodate].country).toBe(CountryId.Japan)
    expect(REGIONS[RegionId.Naha].area).toBe(AreaId.Okinawa)
    expect(OVERSEAS_REGION_IDS).toContain(RegionId.Shanghai)
    expect(REGIONS[RegionId.London].country).toBe(CountryId.Britain)
    expect(REGIONS[RegionId.SanFrancisco].industry).toBe('鉱業')
  })

  it('keeps locked cities without a map until they open', () => {
    const world = new WorldSession()
    expect(world.region(RegionId.Osaka)?.map).toBeUndefined()
    expect(world.census().unlocked).toBe(1)
    expect(world.census().countries).toBe(1)
  })

  it('unlocks Sendai after Edo grows along the north road', () => {
    const world = new WorldSession()
    expect(placeMany(world.active.map, TileType.House, 8)).toBe(true)
    world.active.sim.refreshHousing()
    expect(world.tryUnlock()).toContain(RegionId.Sendai)
  })

  it('opens an air link once both cities have airports', () => {
    const world = unlockYokohama(new WorldSession())
    expect(placeMany(world.active.map, TileType.Airport, 1)).toBe(true)
    expect(placeMany(world.region(RegionId.Yokohama)!.map!, TileType.Airport, 1)).toBe(true)
    expect(
      openLinkMode(
        RegionId.Edo,
        RegionId.Yokohama,
        regionMaps(world),
        new Set([RegionId.Edo, RegionId.Yokohama]),
      ),
    ).toBe('air')
  })
})

describe('world session', () => {
  it('starts in Edo and can switch after unlock', () => {
    const world = new WorldSession()
    expect(world.activeId).toBe(RegionId.Edo)
    expect(world.active.unlocked).toBe(true)
    expect(world.region(RegionId.Yokohama)?.unlocked).toBe(false)
    expect(world.switchTo(RegionId.Yokohama)).toBe(false)
  })

  it('saves the whole world with defaults for old saves', () => {
    const world = new WorldSession()
    const snap = world.snapshot()
    expect(snap.active).toBe(RegionId.Edo)
    expect(snap.regions.some((region) => region.id === RegionId.Edo && region.unlocked)).toBe(true)
    const parsed = parseSnapshot({
      version: 1,
      year: 1700,
      month: 1,
      day: 1,
      elapsedMs: 0,
      speed: GameSpeed.X1,
      funds: 9000,
      mapWidth: world.active.map.width,
      mapHeight: world.active.map.height,
      tiles: world.active.map.snapshotTiles(),
      residents: world.active.sim.residents,
    })
    expect(parsed?.world.active).toBe(RegionId.Edo)
    expect(parsed?.world.regions[0]?.id).toBe(RegionId.Edo)
    expect(parsed?.world.history).toEqual([])
    expect(parsed?.world.worldEvent?.kind).toBe('none')
    expect(world.region(RegionId.London)?.unlocked).toBe(false)
  })

  it('applies cooler harvest in Mito than in Kawagoe', () => {
    const progress = createProgress({ era: EraId.Meiji, discovered: [TechId.Farming, TechId.Logistics] })
    const world = new WorldSession(progress)
    expect(REGIONS[RegionId.Kawagoe].harvest).toBeGreaterThan(REGIONS[RegionId.Mito].harvest)
    expect(REGIONS[RegionId.Hakodate].harvest).toBeLessThan(REGIONS[RegionId.Naha].harvest)
    expect(world.progress.era).toBe(EraId.Meiji)
  })

  it('moves an unhappy resident along an open rail link', () => {
    const world = unlockYokohama(new WorldSession())
    const edo = world.active
    const yokohama = world.region(RegionId.Yokohama)!
    expect(placeMany(edo.map, TileType.Station, 1)).toBe(true)
    expect(placeMany(yokohama.map!, TileType.Station, 1)).toBe(true)
    expect(placeMany(yokohama.map!, TileType.House, 4)).toBe(true)

    const edoCount = edo.sim.residents.length
    const notes = tickMigration(
      regionMaps(world),
      regionPeople(world),
      new Set([RegionId.Edo, RegionId.Yokohama]),
      8,
      { hours: 0 },
    )
    expect(notes.length).toBeGreaterThan(0)
    expect(edo.sim.residents.length).toBe(edoCount - 1)
    expect(yokohama.sim!.residents.length).toBeGreaterThan(6)
  })

  it('ships surplus food from Edo to Yokohama through stations', () => {
    const world = unlockYokohama(new WorldSession())
    const edo = world.active.map
    const yokohama = world.region(RegionId.Yokohama)!.map!
    expect(placeMany(edo, TileType.Station, 1)).toBe(true)
    expect(placeMany(yokohama, TileType.Station, 1)).toBe(true)
    const fromHub = findType(edo, TileType.Station)
    const toHub = findType(yokohama, TileType.Station)
    expect(fromHub && toHub).toBeTruthy()
    edo.addStock(fromHub!.x, fromHub!.y, StockKind.Food, 40)
    yokohama.addStock(toHub!.x, toHub!.y, StockKind.Food, 1)
    const moved = tickInterRegionTrade(
      regionMaps(world),
      new Set([RegionId.Edo, RegionId.Yokohama]),
      1,
    )
    expect(moved.food).toBeGreaterThan(0)
  })

  it('treats later eras as enough to open Meiji-gated overseas ports', () => {
    const progress = createProgress({
      era: EraId.Industrial,
      discovered: [TechId.Trade, TechId.Logistics, TechId.Industry, TechId.Railways],
    })
    const world = new WorldSession(progress)
    world.region(RegionId.Nagasaki)!.unlocked = true
    world.mapOf(RegionId.Nagasaki)
    expect(world.tryUnlock()).toContain(RegionId.Naha)
  })

  it('records world history and keeps prosperity on a long tick', () => {
    const world = new WorldSession()
    expect(world.history).toEqual([])
    expect(world.worldEvent.kind).toBe('none')
    expect(world.active.sim.fortune).toBeGreaterThanOrEqual(8)
    world.tick(3 * 60 * 1000, GameSpeed.X20, 12, false, undefined, { year: 1700, month: 1 })
    expect(world.active.sim.fortune).toBeGreaterThanOrEqual(8)
    expect(world.history.length).toBeLessThanOrEqual(80)
  })
})

function unlockYokohama(world: WorldSession): WorldSession {
  world.progress.discovered.push(TechId.Logistics)
  placeMany(world.active.map, TileType.House, 6)
  world.active.sim.refreshHousing()
  world.tryUnlock()
  return world
}

function placeMany(map: WorldMap, type: TileType, count: number): boolean {
  let placed = 0
  map.forEachTile((x, y) => {
    if (placed < count && map.place(x, y, type)) {
      placed += 1
    }
  })
  return placed >= count
}

function findType(map: WorldMap, type: TileType): { x: number; y: number } | undefined {
  let found: { x: number; y: number } | undefined
  map.forEachTile((x, y, tile) => {
    if (!found && tile.type === type) {
      found = { x, y }
    }
  })
  return found
}

function regionMaps(world: WorldSession) {
  return new Map(
    world.regions
      .filter((region) => region.unlocked && region.map)
      .map((region) => [region.id, region.map!]),
  )
}

function regionPeople(world: WorldSession) {
  return new Map(
    world.regions
      .filter((region) => region.sim)
      .map((region) => [region.id, region.sim!.residents]),
  )
}
