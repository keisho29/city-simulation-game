import { describe, expect, it } from 'vitest'
import { GameSpeed } from '../constants.ts'
import { TileType } from '../map/tile.ts'
import { WorldMap } from '../map/WorldMap.ts'
import { applySchedule, isWorkHours } from './commute.ts'
import { ResidentSim } from './ResidentSim.ts'
import { createResident, ResidentState } from './resident.ts'

describe('isWorkHours', () => {
  it('is true from 8:00 until 17:00', () => {
    expect(isWorkHours(7)).toBe(false)
    expect(isWorkHours(8)).toBe(true)
    expect(isWorkHours(16)).toBe(true)
    expect(isWorkHours(17)).toBe(false)
  })
})

describe('applySchedule', () => {
  it('leaves for work at 8:00 when housed and employed', () => {
    const resident = createResident({
      home: { x: 1, y: 1 },
      workplace: { x: 3, y: 1 },
      state: ResidentState.Home,
    })
    applySchedule(resident, 8)
    expect(resident.state).toBe(ResidentState.MovingToWork)
  })

  it('stays home before work hours', () => {
    const resident = createResident({
      home: { x: 1, y: 1 },
      workplace: { x: 3, y: 1 },
      state: ResidentState.Home,
    })
    applySchedule(resident, 7)
    expect(resident.state).toBe(ResidentState.Home)
  })

  it('leaves work at 17:00', () => {
    const resident = createResident({
      home: { x: 1, y: 1 },
      workplace: { x: 3, y: 1 },
      state: ResidentState.Working,
    })
    applySchedule(resident, 17)
    expect(resident.state).toBe(ResidentState.MovingToHome)
  })

  it('keeps working during work hours', () => {
    const resident = createResident({
      home: { x: 1, y: 1 },
      workplace: { x: 3, y: 1 },
      state: ResidentState.Working,
    })
    applySchedule(resident, 12)
    expect(resident.state).toBe(ResidentState.Working)
  })

  it('does not commute while still moving in', () => {
    const resident = createResident({
      home: { x: 1, y: 1 },
      workplace: { x: 3, y: 1 },
      state: ResidentState.MovingIn,
    })
    applySchedule(resident, 8)
    expect(resident.state).toBe(ResidentState.MovingIn)
  })

  it('does not leave if there is no workplace', () => {
    const resident = createResident({
      home: { x: 1, y: 1 },
      workplace: undefined,
      state: ResidentState.Home,
    })
    applySchedule(resident, 8)
    expect(resident.state).toBe(ResidentState.Home)
  })

  it('sends an unemployed worker home', () => {
    const resident = createResident({
      home: { x: 1, y: 1 },
      workplace: undefined,
      state: ResidentState.Working,
    })
    applySchedule(resident, 12)
    expect(resident.state).toBe(ResidentState.MovingToHome)
  })

  it('stays home on a holiday instead of going to work', () => {
    const resident = createResident({
      home: { x: 1, y: 1 },
      workplace: { x: 3, y: 1 },
      state: ResidentState.Home,
    })
    applySchedule(resident, 8, true)
    expect(resident.state).toBe(ResidentState.Home)
  })

  it('sends a worker home when a holiday begins', () => {
    const resident = createResident({
      home: { x: 1, y: 1 },
      workplace: { x: 3, y: 1 },
      state: ResidentState.Working,
    })
    applySchedule(resident, 10, true)
    expect(resident.state).toBe(ResidentState.MovingToHome)
  })
})

describe('commute walking', () => {
  it('walks from home to work after 8:00 and returns after 17:00', () => {
    const map = new WorldMap(5, 5, 32)
    map.place(0, 0, TileType.House)
    map.place(4, 0, TileType.Farm)
    const sim = new ResidentSim(map)
    const resident = sim.residents[0]
    const home = map.tileCenter(0, 0)
    resident.worldX = home.x
    resident.worldY = home.y
    resident.state = ResidentState.Home
    resident.hunger = 10
    resident.money = 0

    sim.update(16, GameSpeed.X1, 8)
    expect(resident.state).toBe(ResidentState.MovingToWork)

    for (let i = 0; i < 200; i += 1) {
      sim.update(250, GameSpeed.X1, 8)
    }

    expect(resident.state).toBe(ResidentState.Working)
    const work = map.tileCenter(4, 0)
    expect(resident.worldX).toBe(work.x)
    expect(resident.worldY).toBe(work.y)

    sim.update(16, GameSpeed.X1, 17)
    expect(resident.state).toBe(ResidentState.MovingToHome)

    for (let i = 0; i < 200; i += 1) {
      sim.update(250, GameSpeed.X1, 17)
    }

    expect(resident.state).toBe(ResidentState.Home)
    expect(resident.worldX).toBe(home.x)
    expect(resident.worldY).toBe(home.y)
  })
})
