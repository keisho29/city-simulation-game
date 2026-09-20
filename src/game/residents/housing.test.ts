import { describe, expect, it } from 'vitest'
import { WorldMap } from '../map/WorldMap.ts'
import { TileType } from '../map/tile.ts'
import { assignHomes } from './housing.ts'
import { ResidentState, type Resident } from './resident.ts'

function makeResident(id: string, worldX = 0, worldY = 0): Resident {
  return {
    id,
    name: id,
    age: 28,
    home: undefined,
    workplace: undefined,
    happiness: 50,
    state: ResidentState.SeekingHome,
    worldX,
    worldY,
  }
}

describe('assignHomes', () => {
  it('moves a resident into a vacant house', () => {
    const map = new WorldMap(5, 5, 32)
    map.place(2, 2, TileType.House)
    const resident = makeResident('r1')

    assignHomes(map, [resident])

    expect(resident.home).toEqual({ x: 2, y: 2 })
    expect(resident.state).toBe(ResidentState.MovingIn)
    expect(map.getTile(2, 2)?.occupantIds).toEqual(['r1'])
  })

  it('does not put two residents in the same house', () => {
    const map = new WorldMap(5, 5, 32)
    map.place(1, 1, TileType.House)
    const first = makeResident('r1')
    const second = makeResident('r2')

    assignHomes(map, [first, second])

    expect(first.home).toEqual({ x: 1, y: 1 })
    expect(second.home).toBeUndefined()
    expect(second.state).toBe(ResidentState.SeekingHome)
  })

  it('finds another house after the first is full', () => {
    const map = new WorldMap(5, 5, 32)
    map.place(1, 1, TileType.House)
    map.place(3, 3, TileType.House)
    const first = makeResident('r1')
    const second = makeResident('r2')

    assignHomes(map, [first, second])

    expect(first.home).toEqual({ x: 1, y: 1 })
    expect(second.home).toEqual({ x: 3, y: 3 })
  })

  it('clears the home when the house is removed', () => {
    const map = new WorldMap(5, 5, 32)
    map.place(2, 2, TileType.House)
    const resident = makeResident('r1')
    assignHomes(map, [resident])

    map.clear(2, 2)
    assignHomes(map, [resident])

    expect(resident.home).toBeUndefined()
    expect(resident.state).toBe(ResidentState.SeekingHome)
  })
})
