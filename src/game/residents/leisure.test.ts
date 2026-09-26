import { describe, expect, it } from 'vitest'
import { GameSpeed } from '../constants.ts'
import { Terrain, TileType } from '../map/tile.ts'
import { WorldMap } from '../map/WorldMap.ts'
import { applySchedule } from './commute.ts'
import { residentStateLabel } from './inspect.ts'
import {
  arriveLeisure,
  isWalkableTile,
  pickWalkableNear,
  startLeisure,
  tickLeisure,
} from './leisure.ts'
import { createResident, isLeisureState, ResidentState } from './resident.ts'
import { ResidentSim } from './ResidentSim.ts'

describe('leisure', () => {
  it('labels outdoor pastimes in Japanese', () => {
    expect(residentStateLabel(ResidentState.Wandering)).toBe('街を歩いている')
    expect(residentStateLabel(ResidentState.Talking)).toBe('人と話している')
    expect(residentStateLabel(ResidentState.Playing)).toBe('遊んでいる')
    expect(residentStateLabel(ResidentState.Exercising)).toBe('運動している')
    expect(residentStateLabel(ResidentState.Sporting)).toBe('スポーツしている')
  })

  it('sends a homeless resident walking across walkable ground', () => {
    const map = new WorldMap(8, 8, 32)
    const resident = createResident({
      state: ResidentState.SeekingHome,
      worldX: map.tileCenter(2, 2).x,
      worldY: map.tileCenter(2, 2).y,
    })
    tickLeisure(resident, [resident], map, 10, false, 0.2)
    expect(isLeisureState(resident.state)).toBe(true)
    expect(resident.strollTarget).toBeDefined()
    expect(isWalkableTile(map, resident.strollTarget!.x, resident.strollTarget!.y)).toBe(true)
  })

  it('keeps water off the stroll path unless it is a road', () => {
    const map = new WorldMap(5, 5, 32)
    const water = map.getTile(1, 1)
    if (water) {
      water.terrain = Terrain.Water
    }
    expect(isWalkableTile(map, 1, 1)).toBe(false)
    expect(map.place(2, 2, TileType.Road)).toBe(true)
    const road = map.getTile(2, 2)
    if (road) {
      road.terrain = Terrain.Water
    }
    expect(isWalkableTile(map, 2, 2)).toBe(true)
    const dest = pickWalkableNear(map, { x: 0, y: 0 }, 1, 3, 4)
    expect(dest).toBeDefined()
    expect(isWalkableTile(map, dest!.x, dest!.y)).toBe(true)
  })

  it('goes home at night and to work in the morning', () => {
    const wanderer = createResident({
      home: { x: 1, y: 1 },
      workplace: { x: 4, y: 1 },
      state: ResidentState.Wandering,
      strollTarget: { x: 3, y: 2 },
    })
    applySchedule(wanderer, 22, false)
    expect(wanderer.state).toBe(ResidentState.MovingToHome)
    expect(wanderer.strollTarget).toBeUndefined()

    wanderer.state = ResidentState.Playing
    applySchedule(wanderer, 9, false)
    expect(wanderer.state).toBe(ResidentState.MovingToWork)
  })

  it('leaves work into town instead of only going home', () => {
    const resident = createResident({
      home: { x: 0, y: 0 },
      workplace: { x: 3, y: 0 },
      state: ResidentState.Working,
    })
    applySchedule(resident, 18, false)
    expect(resident.state).toBe(ResidentState.Wandering)
  })

  it('lets two people meet and talk', () => {
    const map = new WorldMap(6, 6, 32)
    const a = createResident({
      id: 'a',
      worldX: map.tileCenter(1, 1).x,
      worldY: map.tileCenter(1, 1).y,
    })
    const b = createResident({
      id: 'b',
      worldX: map.tileCenter(2, 1).x,
      worldY: map.tileCenter(2, 1).y,
    })
    startLeisure(a, [a, b], map, 'talk')
    expect(a.state).toBe(ResidentState.Talking)
    expect(a.talkWith).toBe('b')
    expect(a.strollTarget).toEqual({ x: 2, y: 1 })
    a.worldX = b.worldX
    a.worldY = b.worldY
    arriveLeisure(a, [a, b], map)
    expect(a.strollTarget).toBeUndefined()
    expect(b.state).toBe(ResidentState.Talking)
  })

  it('walks a homeless resident during a sim tick', () => {
    const map = new WorldMap(10, 10, 32)
    const spawn = map.tileCenter(4, 4)
    const sim = new ResidentSim(map, [
      createResident({
        id: 'wanderer',
        state: ResidentState.SeekingHome,
        worldX: spawn.x,
        worldY: spawn.y,
      }),
    ])
    const resident = sim.residents[0]!
    sim.update(200, GameSpeed.X1, 11)
    expect(isLeisureState(resident.state)).toBe(true)
    for (let i = 0; i < 40; i += 1) {
      sim.update(200, GameSpeed.X1, 11)
    }
    expect(resident.worldX !== spawn.x || resident.worldY !== spawn.y).toBe(true)
  })
})
