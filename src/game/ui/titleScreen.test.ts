import { describe, expect, it } from 'vitest'
import { GameSpeed } from '../constants.ts'
import { peekSaveLabel, writeSnapshot, parseSnapshot } from '../save/save.ts'
import { TileType } from '../map/tile.ts'
import { ResidentState } from '../residents/resident.ts'
import { GUIDE_STORAGE_KEY, hasSeenGuide, markGuideSeen } from './titleScreen.ts'

function memoryStorage() {
  const memory = new Map<string, string>()
  return {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value)
    },
    removeItem: (key: string) => {
      memory.delete(key)
    },
  }
}

describe('title screen save peek', () => {
  it('names a stored town and ignores an empty slot', () => {
    const storage = memoryStorage()
    expect(peekSaveLabel(storage)).toBeUndefined()
    const snapshot = parseSnapshot({
      version: 1,
      year: 1702,
      month: 4,
      day: 8,
      elapsedMs: 0,
      speed: GameSpeed.X1,
      funds: 9000,
      mapWidth: 2,
      mapHeight: 2,
      tiles: [
        { type: TileType.House, occupantIds: [] },
        { type: TileType.Vacant, occupantIds: [] },
        { type: TileType.Vacant, occupantIds: [] },
        { type: TileType.Vacant, occupantIds: [] },
      ],
      residents: [
        {
          id: 'resident-1',
          name: '太助',
          age: 28,
          happiness: 80,
          state: ResidentState.Home,
          worldX: 16,
          worldY: 16,
        },
      ],
    })
    expect(snapshot).toBeDefined()
    if (!snapshot) {
      return
    }
    writeSnapshot(storage, snapshot)
    expect(peekSaveLabel(storage)).toBe('1702年4月8日')
  })
})

describe('first-play guide flag', () => {
  it('starts unseen and can be marked', () => {
    const storage = memoryStorage()
    expect(hasSeenGuide(storage)).toBe(false)
    markGuideSeen(storage)
    expect(storage.getItem(GUIDE_STORAGE_KEY)).toBe('1')
    expect(hasSeenGuide(storage)).toBe(true)
  })
})
