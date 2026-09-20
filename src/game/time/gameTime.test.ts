import { describe, expect, it } from 'vitest'
import { DAYS_PER_MONTH, GameSpeed } from '../constants.ts'
import { GameTime } from './gameTime.ts'

describe('GameTime', () => {
  it('starts at 1700-01-01 on ×1', () => {
    const time = new GameTime()
    expect(time.year).toBe(1700)
    expect(time.month).toBe(1)
    expect(time.day).toBe(1)
    expect(time.speed).toBe(GameSpeed.X1)
    expect(time.formatDate()).toBe('1700年 1月 1日（月）')
    expect(time.formatClock()).toBe('0時00分')
    expect(time.msPerDay).toBe(3 * 60 * 1000)
    expect(time.weekday).toBe(1)
    expect(time.isHoliday).toBe(false)
  })

  it('treats Sunday as a holiday', () => {
    const time = new GameTime()
    expect(time.update(time.msPerDay * 6)).toBe(true)
    expect(time.formatDate()).toBe('1700年 1月 7日（日）')
    expect(time.isHoliday).toBe(true)

    time.update(time.msPerDay)
    expect(time.formatDate()).toBe('1700年 1月 8日（月）')
    expect(time.isHoliday).toBe(false)
  })

  it('reports hour and minute within a day', () => {
    const time = new GameTime(1700, 1, 1, 30_000)
    const minutesPerDay = 24 * 60

    expect(time.update((time.msPerDay * 60) / minutesPerDay)).toBe(false)
    expect(time.formatClock()).toBe('1時00分')

    time.update((time.msPerDay * (12 * 60 + 30 - 60)) / minutesPerDay)
    expect(time.formatClock()).toBe('12時30分')
  })

  it('does not advance while paused', () => {
    const time = new GameTime(1700, 1, 1, 30_000)
    time.setSpeed(GameSpeed.Pause)
    expect(time.update(60_000)).toBe(false)
    expect(time.day).toBe(1)
  })

  it('advances one day after one day of real time at ×1', () => {
    const time = new GameTime(1700, 1, 1, 30_000)
    expect(time.update(time.msPerDay)).toBe(true)
    expect(time.day).toBe(2)
  })

  it('rolls over to the next month after 30 days', () => {
    const time = new GameTime(1700, 1, 1, 30_000)
    time.update(time.msPerDay * DAYS_PER_MONTH)
    expect(time.month).toBe(2)
    expect(time.day).toBe(1)
  })

  it('rolls over to the next year after December', () => {
    const time = new GameTime(1700, 12, DAYS_PER_MONTH, 30_000)
    time.update(time.msPerDay)
    expect(time.year).toBe(1701)
    expect(time.month).toBe(1)
    expect(time.day).toBe(1)
  })

  it('advances five times faster at ×5 than at ×1', () => {
    const slow = new GameTime(1700, 1, 1, 30_000)
    const fast = new GameTime(1700, 1, 1, 30_000)
    fast.setSpeed(GameSpeed.X5)
    slow.update(slow.msPerDay)
    fast.update(slow.msPerDay)
    expect(slow.day).toBe(2)
    expect(fast.day).toBe(6)
  })

  it('resets to the first morning on ×1', () => {
    const time = new GameTime()
    time.setSpeed(GameSpeed.Pause)
    time.update(time.msPerDay * 40)
    time.restore({
      year: 1702,
      month: 4,
      day: 8,
      elapsedMs: time.msPerDay / 2,
      speed: GameSpeed.Pause,
    })
    time.reset()
    expect(time.formatDate()).toBe('1700年 1月 1日（月）')
    expect(time.formatClock()).toBe('0時00分')
    expect(time.speed).toBe(GameSpeed.X1)
  })
})
