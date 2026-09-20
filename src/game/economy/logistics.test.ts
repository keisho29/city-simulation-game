import { describe, expect, it } from 'vitest'
import { TileType } from '../map/tile.ts'
import { WorldMap } from '../map/WorldMap.ts'
import { createResident, ResidentState } from '../residents/resident.ts'
import { StockKind } from './goods.ts'
import { completeDrop, completePickup, tryStartHaul } from './logistics.ts'

describe('logistics', () => {
  it('sends a warehouse worker to pick up farm food', () => {
    const map = new WorldMap(5, 5, 32)
    map.place(0, 0, TileType.Farm)
    map.place(4, 0, TileType.Warehouse)
    const farm = map.getTile(0, 0)
    if (farm) {
      farm.food = 8
    }
    const hauler = createResident({
      workplace: { x: 4, y: 0 },
      state: ResidentState.Working,
    })
    expect(tryStartHaul(hauler, map)).toBe(true)
    expect(hauler.state).toBe(ResidentState.MovingToPickup)
    expect(hauler.haulKind).toBe(StockKind.Food)
    expect(hauler.haulPickup).toEqual({ x: 0, y: 0 })
    expect(hauler.haulDrop).toEqual({ x: 4, y: 0 })

    completePickup(hauler, map)
    expect(hauler.state).toBe(ResidentState.Hauling)
    expect(map.getTile(0, 0)?.food).toBeLessThan(8)

    completeDrop(hauler, map, false)
    expect(map.getTile(4, 0)?.food).toBeGreaterThan(0)
    expect(hauler.state).toBe(ResidentState.MovingToWork)
  })
})
