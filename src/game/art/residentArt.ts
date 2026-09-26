import { TileType } from '../map/tile.ts'
import type { Resident } from '../residents/resident.ts'
import { PixelCanvas } from './pixelCanvas.ts'
import { assertSprite, type PixelSprite } from './pixelTexture.ts'

export const RESIDENT_ART_WIDTH = 20
export const RESIDENT_ART_HEIGHT = 28
export const RESIDENT_DISPLAY_HEIGHT = 19

export const RESIDENT_ATLAS_ORDER = [
  'farmer',
  'artisan',
  'merchant',
  'townsfolk',
  'warehouse',
  'market',
  'unemployed',
  'child',
  'elder',
] as const

export type ResidentAtlasKey = (typeof RESIDENT_ATLAS_ORDER)[number]

export const RESIDENT_WALK_POSES = ['idle', 'a', 'b'] as const
export type ResidentWalkPose = (typeof RESIDENT_WALK_POSES)[number]
export const RESIDENT_WALK_STRIDE = 8

export const RESIDENT_FACINGS = ['front', 'back'] as const
export type ResidentFacing = (typeof RESIDENT_FACINGS)[number]

const PEOPLE: PixelSprite['palette'] = {
  '.': null,
  '#': 0x2a1810,
  H: 0xe0c56a,
  h: 0xb8943c,
  s: 0xf0c8a0,
  e: 0x1a120c,
  n: 0x1c1410,
  N: 0x3a2818,
  k: 0xc4a070,
  K: 0x8a6840,
  r: 0xa43c2c,
  R: 0x7a281c,
  b: 0x3d5c8a,
  B: 0x2a4064,
  t: 0x8a6a48,
  T: 0x6a4c30,
  g: 0xb8b4a8,
  G: 0x7a766c,
  w: 0x6a3a78,
  c: 0x6d4c31,
  p: 0x4a3020,
  l: 0x6b3a24,
  f: 0x3a2218,
  o: 0x6a8a3c,
  O: 0x4a6a24,
  z: 0x4a4a48,
  Z: 0x2e2e2c,
  v: 0x8a8ab8,
  V: 0x5a5a88,
  u: 0xd06030,
  U: 0xa04020,
  m: 0xc43c28,
  M: 0x8a2418,
  y: 0xe8dcc0,
  Y: 0xc4b490,
  d: 0x1a4064,
  D: 0x122848,
  x: 0xa43c2c,
}

type VillagerKind = {
  hat: 'straw' | 'topknot' | 'hair' | 'child' | 'elder' | 'headband' | 'bun'
  body: string
  dark: string
  sash?: string
  staff?: boolean
  cane?: boolean
}

function paint(canvas: PixelCanvas, x: number, y: number, ch: string, w = 1, h = 1): void {
  canvas.fillRect(x, y, w, h, ch)
}

function block(canvas: PixelCanvas, x: number, y: number, w: number, h: number, fill: string): void {
  paint(canvas, x, y, '#', w, h)
  if (w >= 3 && h >= 3) {
    paint(canvas, x + 1, y + 1, fill, w - 2, h - 2)
  } else if (w >= 2 && h >= 2) {
    paint(canvas, x, y, fill, w, h)
    paint(canvas, x, y + h - 1, '#', w, 1)
  } else {
    paint(canvas, x, y, fill, w, h)
  }
}

function drawIsoVillager(
  kind: VillagerKind,
  pose: ResidentWalkPose = 'idle',
  facing: ResidentFacing = 'front',
): PixelSprite {
  const canvas = new PixelCanvas(RESIDENT_ART_WIDTH, RESIDENT_ART_HEIGHT)
  const child = kind.hat === 'child'
  const back = facing === 'back'
  const headTop = child ? 5 : 1
  const cx = 10
  const bodyY = child ? 13 : 11
  const hipY = child ? 19 : 19
  const swing = pose === 'a' ? 1 : pose === 'b' ? -1 : 0

  if (kind.staff) {
    const staffX = back ? cx + 7 : 3
    for (let y = headTop; y <= hipY + 7; y += 1) {
      canvas.set(staffX, y, 'c')
    }
  }

  const farLegX = cx - 4 + (pose === 'a' ? -2 : pose === 'b' ? 1 : 0)
  const nearLegX = cx + 1 + (pose === 'a' ? 1 : pose === 'b' ? -1 : 0)
  const farLegH = Math.min(RESIDENT_ART_HEIGHT - hipY, pose === 'a' ? 9 : pose === 'b' ? 6 : 7)
  const nearLegH = Math.min(RESIDENT_ART_HEIGHT - hipY, pose === 'a' ? 6 : pose === 'b' ? 9 : 7)
  block(canvas, farLegX, hipY, 3, farLegH, 'l')
  canvas.set(farLegX, hipY + farLegH - 1, 'f')
  canvas.set(farLegX + 1, hipY + farLegH - 1, 'f')
  block(canvas, nearLegX, hipY, 3, nearLegH, 'l')
  canvas.set(nearLegX, hipY + nearLegH - 1, 'f')
  canvas.set(nearLegX + 1, hipY + nearLegH - 1, 'f')

  paint(canvas, cx - 4, bodyY, '#', 9, hipY - bodyY + 1)
  paint(canvas, cx - 3, bodyY, kind.body, 7, hipY - bodyY)
  paint(canvas, cx - 4, bodyY + 1, kind.dark, 2, hipY - bodyY - 2)
  paint(canvas, cx + 3, bodyY + 2, kind.dark, 2, 4)
  if (kind.sash) {
    paint(canvas, cx - 3, bodyY + 4, kind.sash, 7, 1)
  }
  paint(canvas, cx - 5, hipY - 1, '#', 11, 1)
  paint(canvas, cx - 4, hipY - 1, kind.body, 9, 1)

  const farArmX = cx - 7 - swing
  const nearArmX = cx + 6 + swing
  const farArmY = bodyY + (pose === 'b' ? 1 : 2)
  const nearArmY = bodyY + (pose === 'a' ? 1 : 2)
  block(canvas, farArmX, farArmY, 3, 7, 's')
  block(canvas, nearArmX, nearArmY, 3, 8, 's')
  canvas.set(farArmX + 1, farArmY, kind.body)
  canvas.set(nearArmX + 1, nearArmY, kind.body)

  if (back) {
    paint(canvas, cx - 4, headTop + 2, '#', 9, 8)
    paint(canvas, cx - 3, headTop + 3, 'n', 7, 6)
    if (kind.hat === 'elder') {
      paint(canvas, cx - 3, headTop + 3, 'g', 7, 6)
    }
    if (kind.hat === 'straw') {
      paint(canvas, cx - 6, headTop + 1, '#', 13, 2)
      paint(canvas, cx - 5, headTop + 1, 'H', 11, 1)
      paint(canvas, cx - 4, headTop, 'h', 9, 1)
    } else if (kind.hat === 'topknot' || kind.hat === 'headband') {
      paint(canvas, cx - 1, headTop, '#', 3, 2)
      paint(canvas, cx, headTop, 'n', 2, 1)
    }
  } else {
    paint(canvas, cx - 4, headTop + 2, '#', 9, 8)
    paint(canvas, cx - 3, headTop + 3, 's', 7, 6)
    paint(canvas, cx - 3, headTop + 3, 'n', 3, 3)
    canvas.set(cx - 1, headTop + 5, 'e')
    canvas.set(cx + 2, headTop + 5, 'e')
    if (kind.hat === 'elder') {
      paint(canvas, cx - 1, headTop + 8, 'g', 4, 1)
    }
    if (kind.hat === 'straw') {
      paint(canvas, cx - 6, headTop + 1, '#', 13, 2)
      paint(canvas, cx - 5, headTop + 1, 'H', 11, 1)
      paint(canvas, cx - 4, headTop, 'h', 9, 1)
    } else if (kind.hat === 'topknot') {
      paint(canvas, cx, headTop, '#', 2, 2)
      paint(canvas, cx, headTop + 1, 'n', 2, 1)
    } else if (kind.hat === 'headband') {
      paint(canvas, cx - 3, headTop + 4, 'x', 7, 1)
    } else if (kind.hat === 'bun' || kind.hat === 'hair') {
      paint(canvas, cx - 3, headTop + 2, 'n', 4, 2)
      paint(canvas, cx, headTop, '#', 3, 2)
      paint(canvas, cx, headTop, 'n', 2, 1)
    } else if (kind.hat === 'elder') {
      paint(canvas, cx - 3, headTop + 2, 'g', 5, 2)
    } else {
      paint(canvas, cx - 2, headTop + 3, 'n', 4, 1)
    }
  }

  if (kind.cane && !back) {
    for (let y = bodyY + 2; y <= hipY + 7; y += 1) {
      canvas.set(cx + 8, y, 'c')
    }
  }

  return canvas.toSprite(PEOPLE)
}

function villagerKind(key: ResidentAtlasKey, gender: Resident['gender'] = 'male'): VillagerKind {
  const female = gender === 'female'
  switch (key) {
    case 'farmer':
      return { hat: 'straw', body: 'o', dark: 'O', sash: 'O', staff: !female }
    case 'artisan':
      return { hat: 'headband', body: 'z', dark: 'Z', sash: 'x' }
    case 'merchant':
      return { hat: female ? 'bun' : 'topknot', body: female ? 'r' : 'd', dark: female ? 'R' : 'D', sash: female ? 'b' : 'd' }
    case 'townsfolk':
      return { hat: female ? 'bun' : 'topknot', body: 'v', dark: 'V' }
    case 'warehouse':
      return { hat: female ? 'bun' : 'topknot', body: 'u', dark: 'U' }
    case 'market':
      return { hat: female ? 'bun' : 'topknot', body: 'm', dark: 'M' }
    case 'unemployed':
      return { hat: female ? 'bun' : 'topknot', body: 'y', dark: 'Y' }
    case 'child':
      return { hat: female ? 'bun' : 'child', body: female ? 'r' : 't', dark: female ? 'R' : 'T' }
    case 'elder':
      return { hat: 'elder', body: 'G', dark: 'N', cane: true }
  }
}

export function residentSprite(
  key: ResidentAtlasKey,
  pose: ResidentWalkPose = 'idle',
  facing: ResidentFacing = 'front',
  gender: Resident['gender'] = 'male',
): PixelSprite {
  return drawIsoVillager(villagerKind(key, gender), pose, facing)
}

export const RESIDENT_SPRITES: Record<ResidentAtlasKey, PixelSprite> = {
  farmer: residentSprite('farmer'),
  artisan: residentSprite('artisan'),
  merchant: residentSprite('merchant'),
  townsfolk: residentSprite('townsfolk'),
  warehouse: residentSprite('warehouse'),
  market: residentSprite('market'),
  unemployed: residentSprite('unemployed'),
  child: residentSprite('child'),
  elder: residentSprite('elder'),
}

export function residentWalkPose(moving: boolean, distance: number): ResidentWalkPose {
  if (!moving) {
    return 'idle'
  }
  return Math.floor(Math.max(0, distance) / RESIDENT_WALK_STRIDE) % 2 === 0 ? 'a' : 'b'
}

export function residentFacingFromDelta(
  dx: number,
  dy: number,
): { facing: ResidentFacing; flipX: boolean } | undefined {
  if (Math.hypot(dx, dy) < 0.35) {
    return undefined
  }
  return {
    facing: dy >= 0 ? 'front' : 'back',
    flipX: dx < 0,
  }
}

export function residentWalkTextureKey(
  kind: ResidentAtlasKey,
  pose: ResidentWalkPose = 'idle',
  facing: ResidentFacing = 'front',
  gender: Resident['gender'] = 'male',
): string {
  const base = `${kind}-${gender}-${facing}`
  if (pose === 'idle') {
    return base
  }
  return `${base}-${pose}`
}

export function residentArtKey(
  resident: Pick<Resident, 'age'>,
  jobType: TileType | undefined,
): ResidentAtlasKey {
  if (resident.age < 16) {
    return 'child'
  }
  if (resident.age >= 60) {
    return 'elder'
  }
  if (jobType === TileType.Farm) {
    return 'farmer'
  }
  if (jobType === TileType.Workshop) {
    return 'artisan'
  }
  if (jobType === TileType.Shop) {
    return 'merchant'
  }
  if (jobType === TileType.Market) {
    return 'market'
  }
  if (jobType === TileType.Warehouse) {
    return 'warehouse'
  }
  if (
    jobType === TileType.Clinic ||
    jobType === TileType.School ||
    jobType === TileType.Factory ||
    jobType === TileType.Station ||
    jobType === TileType.Airport ||
    jobType === TileType.Port
  ) {
    return 'townsfolk'
  }

  return 'unemployed'
}

export function residentDisplaySize(frameWidth: number, frameHeight: number): { width: number; height: number } {
  const aspect = frameWidth / Math.max(1, frameHeight)
  let height = RESIDENT_DISPLAY_HEIGHT
  let width = Math.max(12, Math.round(height * aspect))
  if (width < 8) {
    width = 8
    height = Math.round(width / aspect)
  }
  return { width, height }
}

export function validateResidentArt(): void {
  const genders: Array<Resident['gender']> = ['male', 'female']
  for (const key of RESIDENT_ATLAS_ORDER) {
    for (const gender of genders) {
      for (const facing of RESIDENT_FACINGS) {
        for (const pose of RESIDENT_WALK_POSES) {
          assertSprite(
            residentSprite(key, pose, facing, gender),
            RESIDENT_ART_WIDTH,
            RESIDENT_ART_HEIGHT,
            `${key}-${gender}-${facing}-${pose}`,
          )
        }
      }
    }
  }
}
