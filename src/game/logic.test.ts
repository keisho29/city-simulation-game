import { describe, expect, it } from 'vitest'
import {
  BAR_BOTTOM,
  BAR_HIT,
  BASE_SPEED,
  CLEAR_AFTER_JUMP,
  CLEAR_AFTER_SLIDE,
  FIRST_SPAWN_METERS,
  HURDLE_HIT,
  RUN_HIT,
  SLIDE_HIT,
  SLIDE_MAX_MS,
  SLIDE_MIN_MS,
  SPEED_PER_KM,
} from './constants.ts'
import {
  canJump,
  clearanceDelay,
  distanceScore,
  firstObstacleReady,
  hitsObstacle,
  jumpHangSeconds,
  jumpHeightAt,
  nextSlideMs,
  obstacleBox,
  overlaps,
  pickObstacle,
  playerBox,
  runSpeed,
  spawnDelay,
  spawnWait,
} from './logic.ts'

const GROUND = 400
const PLAYER_X = 160
const NEAR = 160

describe('playerBox', () => {
  it('走りは足元から高い箱になる', () => {
    const box = playerBox(PLAYER_X, GROUND, 'run')
    expect(box.h).toBe(RUN_HIT.h)
    expect(box.y + box.h).toBe(GROUND)
  })

  it('スライディングは低い箱になる', () => {
    const box = playerBox(PLAYER_X, GROUND, 'slide')
    expect(box.h).toBe(SLIDE_HIT.h)
    expect(box.w).toBe(SLIDE_HIT.w)
    expect(box.y + box.h).toBe(GROUND)
  })
})

describe('hitsObstacle', () => {
  it('走りは低い障害に当たる', () => {
    expect(hitsObstacle(PLAYER_X, GROUND, 'run', NEAR, GROUND, 'hurdle')).toBe(true)
  })

  it('ジャンプは低い障害を越える', () => {
    const feet = GROUND - HURDLE_HIT.h - 8
    expect(hitsObstacle(PLAYER_X, feet, 'jump', NEAR, GROUND, 'hurdle')).toBe(false)
  })

  it('走りは高い障害に当たる', () => {
    expect(hitsObstacle(PLAYER_X, GROUND, 'run', NEAR, GROUND, 'bar')).toBe(true)
  })

  it('スライディングは高い障害をくぐる', () => {
    expect(hitsObstacle(PLAYER_X, GROUND, 'slide', NEAR, GROUND, 'bar')).toBe(false)
  })

  it('ジャンプでは高い障害を越えられない', () => {
    expect(hitsObstacle(PLAYER_X, GROUND - 140, 'jump', NEAR, GROUND, 'bar')).toBe(true)
  })

  it('スライディングは低い障害に当たる', () => {
    expect(hitsObstacle(PLAYER_X, GROUND, 'slide', NEAR, GROUND, 'hurdle')).toBe(true)
  })

  it('離れていれば当たらない', () => {
    expect(hitsObstacle(PLAYER_X, GROUND, 'run', 400, GROUND, 'hurdle')).toBe(false)
  })
})

describe('overlaps', () => {
  it('端が接しているだけでは当たらない', () => {
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false)
  })
})

describe('obstacleBox', () => {
  it('高い障害は足元から浮いている', () => {
    const box = obstacleBox(0, GROUND, 'bar')
    expect(box.y + box.h).toBe(GROUND - BAR_BOTTOM)
    expect(box.h).toBe(BAR_HIT.h)
  })
})

describe('canJump', () => {
  it('地面にいる走りだけ跳べる', () => {
    expect(canJump('run', true)).toBe(true)
    expect(canJump('slide', true)).toBe(false)
    expect(canJump('run', false)).toBe(false)
    expect(canJump('dead', true)).toBe(false)
  })
})

describe('firstObstacleReady', () => {
  it('10mから最初の障害が出る', () => {
    expect(firstObstacleReady((FIRST_SPAWN_METERS - 1) * 10)).toBe(false)
    expect(firstObstacleReady(FIRST_SPAWN_METERS * 10)).toBe(true)
  })
})

describe('scoring', () => {
  it('10pxで1mになる', () => {
    expect(distanceScore(99)).toBe(9)
    expect(distanceScore(100)).toBe(10)
  })

  it('1000mを超えてから段階的に速くなる', () => {
    expect(runSpeed(9990)).toBe(BASE_SPEED)
    expect(runSpeed(12_500)).toBe(BASE_SPEED + SPEED_PER_KM)
    expect(runSpeed(22_500)).toBe(BASE_SPEED + SPEED_PER_KM * 2)
    expect(runSpeed(12_500)).toBeGreaterThan(runSpeed(10_500))
  })
})

describe('pickObstacle', () => {
  it('乱数で低い障害と高い障害を分ける', () => {
    expect(pickObstacle(0.1)).toBe('hurdle')
    expect(pickObstacle(0.9)).toBe('bar')
  })
})

describe('nextSlideMs', () => {
  it('押しているあいだは最短時間を保つ', () => {
    expect(nextSlideMs(true, 40, SLIDE_MIN_MS, SLIDE_MAX_MS)).toBe(SLIDE_MIN_MS)
    expect(nextSlideMs(false, 500, SLIDE_MIN_MS, SLIDE_MAX_MS)).toBe(500)
  })
})

describe('spawnWait', () => {
  const far = 100_000

  it('低い箱のあとの高い障害は着地してからスライドできる', () => {
    const wait = spawnWait(far, 'hurdle', 'bar')
    expect(wait).toBeGreaterThanOrEqual(jumpHangSeconds() + CLEAR_AFTER_JUMP)
    expect(wait).toBeGreaterThan(spawnDelay(far))
  })

  it('高い障害のあとの低い箱はスライドからジャンプできる', () => {
    expect(clearanceDelay('bar', 'hurdle')).toBe(SLIDE_MIN_MS / 1000 + CLEAR_AFTER_SLIDE)
    expect(spawnWait(far, 'bar', 'hurdle')).toBeGreaterThanOrEqual(SLIDE_MIN_MS / 1000 + CLEAR_AFTER_SLIDE)
  })

  it('同じ種類は距離どおりの間隔のまま短くできる', () => {
    expect(spawnWait(far, 'hurdle', 'hurdle')).toBe(spawnDelay(far))
    expect(spawnWait(far, 'bar', 'bar')).toBe(spawnDelay(far))
    expect(jumpHeightAt(spawnDelay(far))).toBeGreaterThan(HURDLE_HIT.h)
  })
})
