import { describe, expect, it } from 'vitest'
import { WorldMap } from '../map/WorldMap.ts'
import { TileType } from '../map/tile.ts'
import { assignJobs } from './employment.ts'
import { createResident } from './resident.ts'

describe('assignJobs', () => {
  it('assigns a vacant farm as a workplace', () => {
    const map = new WorldMap(5, 5, 32)
    map.place(2, 2, TileType.Farm)
    const resident = createResident({ id: 'r1' })

    assignJobs(map, [resident])

    expect(resident.workplace).toEqual({ x: 2, y: 2 })
    expect(map.getTile(2, 2)?.occupantIds).toEqual(['r1'])
  })

  it('does not put two residents in the same workplace', () => {
    const map = new WorldMap(5, 5, 32)
    map.place(1, 1, TileType.Shop)
    const first = createResident({ id: 'r1' })
    const second = createResident({ id: 'r2' })

    assignJobs(map, [first, second])

    expect(first.workplace).toEqual({ x: 1, y: 1 })
    expect(second.workplace).toBeUndefined()
  })

  it('finds another workplace after the first is full', () => {
    const map = new WorldMap(5, 5, 32)
    map.place(1, 1, TileType.Farm)
    map.place(3, 3, TileType.Workshop)
    const first = createResident({ id: 'r1' })
    const second = createResident({ id: 'r2' })

    assignJobs(map, [first, second])

    expect(first.workplace).toEqual({ x: 1, y: 1 })
    expect(second.workplace).toEqual({ x: 3, y: 3 })
  })

  it('prefers the workplace closer to home', () => {
    const map = new WorldMap(5, 5, 32)
    map.place(4, 4, TileType.Farm)
    map.place(1, 0, TileType.Shop)
    const resident = createResident({ id: 'r1', home: { x: 0, y: 0 } })

    assignJobs(map, [resident])

    expect(resident.workplace).toEqual({ x: 1, y: 0 })
  })

  it('clears the job when the workplace is removed', () => {
    const map = new WorldMap(5, 5, 32)
    map.place(2, 2, TileType.Farm)
    const resident = createResident({ id: 'r1' })
    assignJobs(map, [resident])

    map.clear(2, 2)
    assignJobs(map, [resident])

    expect(resident.workplace).toBeUndefined()
  })
})
