import {
  BAR_BOTTOM,
  BAR_HIT,
  BASE_SPEED,
  CLEAR_AFTER_JUMP,
  CLEAR_AFTER_SLIDE,
  GRAVITY,
  HURDLE_HIT,
  JUMP_VELOCITY,
  MAX_SPEED,
  RUN_HIT,
  SCORE_PER_PIXEL,
  SLIDE_HIT,
  SLIDE_MIN_MS,
  SPEED_PER_KM,
  SPEED_RAMP_METERS,
  FIRST_SPAWN_METERS,
  SPAWN_MIN,
  SPAWN_START,
} from './constants.ts'

export type Pose = 'run' | 'jump' | 'slide' | 'dead'
export type ObstacleKind = 'hurdle' | 'bar'

export type HitBox = {
  x: number
  y: number
  w: number
  h: number
}

export function playerBox(centerX: number, feetY: number, pose: Pose): HitBox {
  if (pose === 'slide') {
    return {
      x: centerX - SLIDE_HIT.w / 2,
      y: feetY - SLIDE_HIT.h,
      w: SLIDE_HIT.w,
      h: SLIDE_HIT.h,
    }
  }
  return {
    x: centerX - RUN_HIT.w / 2,
    y: feetY - RUN_HIT.h,
    w: RUN_HIT.w,
    h: RUN_HIT.h,
  }
}

export function obstacleBox(centerX: number, groundY: number, kind: ObstacleKind): HitBox {
  if (kind === 'hurdle') {
    return {
      x: centerX - HURDLE_HIT.w / 2,
      y: groundY - HURDLE_HIT.h,
      w: HURDLE_HIT.w,
      h: HURDLE_HIT.h,
    }
  }
  return {
    x: centerX - BAR_HIT.w / 2,
    y: groundY - BAR_BOTTOM - BAR_HIT.h,
    w: BAR_HIT.w,
    h: BAR_HIT.h,
  }
}

export function overlaps(a: HitBox, b: HitBox): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function hitsObstacle(
  playerX: number,
  feetY: number,
  pose: Pose,
  obstacleX: number,
  groundY: number,
  kind: ObstacleKind,
): boolean {
  if (pose === 'dead') return false
  return overlaps(playerBox(playerX, feetY, pose), obstacleBox(obstacleX, groundY, kind))
}

export function distanceScore(pixels: number): number {
  return Math.floor(Math.max(0, pixels) / SCORE_PER_PIXEL)
}

export function runSpeed(pixels: number): number {
  const meters = distanceScore(pixels)
  const stage = Math.floor(meters / 1000)
  const from = Math.min(MAX_SPEED, BASE_SPEED + Math.max(0, stage - 1) * SPEED_PER_KM)
  const to = Math.min(MAX_SPEED, BASE_SPEED + stage * SPEED_PER_KM)
  if (stage <= 0) return BASE_SPEED
  const t = Math.min(1, (meters - stage * 1000) / SPEED_RAMP_METERS)
  return from + (to - from) * t
}

export function firstObstacleReady(pixels: number): boolean {
  return distanceScore(pixels) >= FIRST_SPAWN_METERS
}

export function spawnDelay(pixels: number): number {
  const t = Math.min(1, distanceScore(pixels) / 400)
  return SPAWN_START + (SPAWN_MIN - SPAWN_START) * t
}

export function jumpHangSeconds(): number {
  return (2 * Math.abs(JUMP_VELOCITY)) / GRAVITY
}

export function jumpHeightAt(seconds: number): number {
  const rise = -JUMP_VELOCITY
  return Math.max(0, rise * seconds - 0.5 * GRAVITY * seconds * seconds)
}

export function clearanceDelay(previous: ObstacleKind | undefined, next: ObstacleKind): number {
  if (previous === 'hurdle' && next === 'bar') return jumpHangSeconds() + CLEAR_AFTER_JUMP
  if (previous === 'bar' && next === 'hurdle') return SLIDE_MIN_MS / 1000 + CLEAR_AFTER_SLIDE
  return 0
}

export function spawnWait(
  pixels: number,
  previous: ObstacleKind | undefined,
  next: ObstacleKind,
): number {
  let wait = Math.max(spawnDelay(pixels), clearanceDelay(previous, next))
  if (previous === 'hurdle' && next === 'hurdle') {
    const hang = jumpHangSeconds()
    if (wait < hang && jumpHeightAt(wait) < HURDLE_HIT.h + 8) {
      wait = hang + CLEAR_AFTER_JUMP
    }
  }
  return wait
}

export function pickObstacle(roll: number, previous?: ObstacleKind): ObstacleKind {
  const kind: ObstacleKind = roll < 0.5 ? 'hurdle' : 'bar'
  if (kind === previous && roll < 0.72 && roll >= 0.5) return 'hurdle'
  if (kind === previous && roll >= 0.28 && roll < 0.5) return 'bar'
  return kind
}

export function canJump(pose: Pose, grounded: boolean): boolean {
  return grounded && (pose === 'run' || pose === 'jump')
}

export function nextSlideMs(held: boolean, remaining: number, minMs: number, maxMs: number): number {
  if (held) return Math.max(remaining, minMs)
  return Math.min(remaining, maxMs)
}
