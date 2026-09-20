import { describe, expect, it } from 'vitest'
import { GameSpeed } from '../constants.ts'
import { canAcceptInflow, createInflowResident } from './inflow.ts'
import { TileType } from '../map/tile.ts'
import { WorldMap } from '../map/WorldMap.ts'
import { createResident } from '../residents/resident.ts'
import { ResidentSim } from '../residents/ResidentSim.ts'

describe('population inflow', () => {
  it('accepts a newcomer when there is a vacant house and the town is happy', () => {
    const map = new WorldMap(5, 5, 32)
    map.place(1, 1, TileType.House)
    map.place(2, 1, TileType.House)
    map.occupyHouse(1, 1, 'r1')
    const residents = [
      createResident({
        id: 'r1',
        home: { x: 1, y: 1 },
        workplace: { x: 0, y: 0 },
        happiness: 70,
      }),
    ]
    expect(canAcceptInflow(map, residents)).toBe(true)
  })

  it('rejects a newcomer when every house is full', () => {
    const map = new WorldMap(5, 5, 32)
    map.place(1, 1, TileType.House)
    map.occupyHouse(1, 1, 'r1')
    const residents = [
      createResident({
        id: 'r1',
        home: { x: 1, y: 1 },
        happiness: 80,
      }),
    ]
    expect(canAcceptInflow(map, residents)).toBe(false)
  })

  it('adds a newcomer after enough game time', () => {
    const map = new WorldMap(5, 5, 32)
    map.place(1, 1, TileType.House)
    map.place(2, 1, TileType.House)
    map.occupyHouse(1, 1, 'r1')
    const sim = new ResidentSim(map, [
      createResident({
        id: 'r1',
        home: { x: 1, y: 1 },
        workplace: { x: 0, y: 0 },
        happiness: 70,
        worldX: 48,
        worldY: 48,
      }),
    ])
    sim.update(45_000, GameSpeed.X1, 12)
    expect(sim.residents.length).toBe(2)
    expect(createInflowResident(map, 1).id).toBe('resident-2')
  })
})
