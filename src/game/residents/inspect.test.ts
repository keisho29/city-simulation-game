import { describe, expect, it } from 'vitest'
import { TileType } from '../map/tile.ts'
import {
  inspectResident,
  pickNearestResident,
  pickResidentOnTile,
  residentDetailView,
  residentStateLabel,
  workplaceLabel,
} from './inspect.ts'
import { createResident, ResidentState } from './resident.ts'

describe('resident inspect', () => {
  it('labels existing resident fields in Japanese', () => {
    const view = residentDetailView(
      createResident({
        home: { x: 3, y: 4 },
        workplace: { x: 8, y: 4 },
        happiness: 80,
        hunger: 42,
        money: 18,
        state: ResidentState.Home,
        worldX: 112,
        worldY: 144,
      }),
      TileType.Farm,
    )
    expect(view.name).toBe('太助')
    expect(view.age).toBe('28歳')
    expect(view.state).toBe('自宅にいる')
    expect(view.home).toBe('3, 4')
    expect(view.job).toBe('農地')
    expect(view.workplace).toBe('8, 4')
    expect(view.hunger).toBe('42%')
    expect(view.money).toBe('18')
    expect(view.happiness).toBe('80%')
    expect(residentStateLabel(ResidentState.MovingToWork)).toBe('出勤中')
    expect(residentStateLabel(ResidentState.MovingToShop)).toBe('買い物へ向かっている')
    expect(workplaceLabel(undefined)).toBe('未就職')
  })

  it('picks the nearest resident within reach', () => {
    const far = createResident({ id: 'resident-2', worldX: 400, worldY: 400 })
    const near = createResident({ worldX: 112, worldY: 144 })
    expect(pickNearestResident([far, near], 118, 148)?.id).toBe('resident-1')
    expect(pickNearestResident([far, near], 0, 0)).toBeUndefined()
  })

  it('does not treat an empty workplace click as a resident inspect', () => {
    const resident = createResident({
      home: { x: 3, y: 4 },
      workplace: { x: 8, y: 4 },
      worldX: 112,
      worldY: 144,
    })
    expect(pickResidentOnTile([resident], { x: 3, y: 4 })?.id).toBe('resident-1')
    expect(inspectResident([resident], 0, 0, { x: 8, y: 4 })).toBeUndefined()
    expect(inspectResident([resident], 118, 148, { x: 3, y: 4 })?.id).toBe('resident-1')
  })
})
