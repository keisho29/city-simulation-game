import { describe, expect, it } from 'vitest'
import { GameSpeed } from '../constants.ts'
import { WorldMap } from '../map/WorldMap.ts'
import { TileType } from '../map/tile.ts'
import { GameTime } from '../time/gameTime.ts'
import { SAVE_STORAGE_KEY, loadSnapshot, parseSnapshot, writeSnapshot } from './save.ts'
import { ResidentState } from '../residents/resident.ts'

function sampleSnapshot() {
  return {
    version: 1,
    year: 1701,
    month: 3,
    day: 12,
    elapsedMs: 90_000,
    speed: GameSpeed.X2,
    funds: 870,
    mapWidth: 2,
    mapHeight: 2,
    tiles: [
      { type: TileType.House, occupantIds: ['resident-1'] },
      { type: TileType.Farm, occupantIds: ['resident-1'] },
      { type: TileType.Vacant, occupantIds: [] },
      { type: TileType.Road, occupantIds: [] },
    ],
    residents: [
      {
        id: 'resident-1',
        name: '太助',
        age: 28,
        home: { x: 0, y: 0 },
        workplace: { x: 1, y: 0 },
        happiness: 80,
        hunger: 44,
        money: 31,
        state: ResidentState.Working,
        worldX: 48,
        worldY: 16,
      },
    ],
  }
}

describe('parseSnapshot', () => {
  it('round-trips a valid save', () => {
    const parsed = parseSnapshot(sampleSnapshot())
    expect(parsed?.year).toBe(1701)
    expect(parsed?.funds).toBe(870)
    expect(parsed?.residents[0]?.name).toBe('太助')
    expect(parsed?.residents[0]?.hunger).toBe(44)
    expect(parsed?.residents[0]?.money).toBe(31)
    expect(parsed?.tiles[0]?.occupantIds).toEqual(['resident-1'])
  })

  it('fills hunger and money when an older save omits them', () => {
    const raw = sampleSnapshot()
    const resident = raw.residents[0] as { hunger?: number; money?: number }
    delete resident.hunger
    delete resident.money
    const parsed = parseSnapshot(raw)
    expect(parsed?.residents[0]?.hunger).toBe(35)
    expect(parsed?.residents[0]?.money).toBe(24)
  })

  it('rejects a save with the wrong version', () => {
    expect(parseSnapshot({ ...sampleSnapshot(), version: 2 })).toBeUndefined()
  })

  it('rejects a save with a broken tile list', () => {
    const broken = sampleSnapshot()
    broken.tiles = broken.tiles.slice(0, 1)
    expect(parseSnapshot(broken)).toBeUndefined()
  })
})

describe('storage', () => {
  it('writes and loads through a storage object', () => {
    const memory = new Map<string, string>()
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value)
      },
    }

    const snapshot = parseSnapshot(sampleSnapshot())
    expect(snapshot).toBeDefined()
    if (!snapshot) {
      return
    }

    expect(writeSnapshot(storage, snapshot)).toBe(true)
    expect(memory.has(SAVE_STORAGE_KEY)).toBe(true)
    expect(loadSnapshot(storage)?.day).toBe(12)
  })
})

describe('restore helpers', () => {
  it('restores the clock on GameTime', () => {
    const time = new GameTime(1700, 1, 1, 30_000)
    time.restore({
      year: 1702,
      month: 4,
      day: 8,
      elapsedMs: time.msPerDay / 2,
      speed: GameSpeed.Pause,
    })
    expect(time.formatDate()).toBe('1702年 4月 8日（土）')
    expect(time.formatClock()).toBe('12時00分')
    expect(time.speed).toBe(GameSpeed.Pause)
  })

  it('restores map occupancy', () => {
    const map = new WorldMap(2, 2, 32)
    map.place(0, 0, TileType.House)
    map.occupyHouse(0, 0, 'resident-1')

    const copy = new WorldMap(2, 2, 32)
    expect(copy.restoreTiles(map.snapshotTiles())).toBe(true)
    expect(copy.getTile(0, 0)?.type).toBe(TileType.House)
    expect(copy.getTile(0, 0)?.occupantIds).toEqual(['resident-1'])
  })
})
