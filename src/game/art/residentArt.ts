import { TileType } from '../map/tile.ts'
import type { Resident } from '../residents/resident.ts'
import { PixelCanvas } from './pixelCanvas.ts'
import { assertSprite, type PixelSprite } from './pixelTexture.ts'

export const RESIDENT_ART_WIDTH = 12
export const RESIDENT_ART_HEIGHT = 16
export const RESIDENT_FRAME_WIDTH = 160
export const RESIDENT_FRAME_HEIGHT = 256
export const RESIDENT_DISPLAY_WIDTH = 18
export const RESIDENT_DISPLAY_HEIGHT = 28

export const RESIDENT_ATLAS_ORDER = [
  'farmer',
  'artisan',
  'merchant',
  'townsfolk',
  'child',
  'elder',
] as const

export type ResidentAtlasKey = (typeof RESIDENT_ATLAS_ORDER)[number]

const PEOPLE: PixelSprite['palette'] = {
  '.': null,
  '#': 0x1a120c,
  H: 0xe0b84a,
  h: 0xc49a32,
  s: 0xf0c8a0,
  e: 0x2a1810,
  b: 0x3a6a9a,
  B: 0x2a4a72,
  p: 0x3a2a1c,
  r: 0x8a3a2a,
  N: 0x6b4a32,
  n: 0x3a2818,
  m: 0xc45a3a,
  t: 0x6a7a50,
  c: 0x5a8aaa,
  g: 0x9a9a90,
  o: 0x7a7468,
  k: 0x8a6a40,
}

function drawBody(
  hat: string,
  hatDark: string,
  shirt: string,
  shirtDark: string,
  extra?: (canvas: PixelCanvas) => void,
): PixelSprite {
  const canvas = new PixelCanvas(RESIDENT_ART_WIDTH, RESIDENT_ART_HEIGHT)
  canvas.fillRect(3, 0, 6, 3, hat)
  canvas.fillRect(2, 1, 8, 2, hat)
  canvas.fillRect(3, 2, 6, 1, hatDark)
  canvas.fillRect(4, 3, 4, 3, 's')
  canvas.set(5, 4, 'e')
  canvas.set(7, 4, 'e')
  canvas.fillRect(3, 6, 6, 5, shirt)
  canvas.fillRect(4, 7, 4, 3, shirtDark)
  canvas.set(3, 7, shirtDark)
  canvas.set(8, 7, shirtDark)
  canvas.fillRect(4, 11, 4, 2, 'p')
  canvas.set(4, 13, 'p')
  canvas.set(7, 13, 'p')
  canvas.set(4, 14, 'p')
  canvas.set(7, 14, 'p')
  extra?.(canvas)
  return canvas.toSprite(PEOPLE)
}

export const RESIDENT_SPRITES: Record<ResidentAtlasKey, PixelSprite> = {
  farmer: drawBody('H', 'h', 'b', 'B'),
  artisan: drawBody('r', 'n', 'N', 'p'),
  merchant: drawBody('n', '#', 'm', 'r'),
  townsfolk: drawBody('n', '#', 't', 'p'),
  child: (() => {
    const canvas = new PixelCanvas(RESIDENT_ART_WIDTH, RESIDENT_ART_HEIGHT)
    canvas.fillRect(4, 3, 4, 2, 'n')
    canvas.fillRect(4, 5, 4, 3, 's')
    canvas.set(5, 6, 'e')
    canvas.set(7, 6, 'e')
    canvas.fillRect(4, 8, 4, 3, 'c')
    canvas.fillRect(5, 11, 2, 2, 'p')
    canvas.set(5, 13, 'p')
    canvas.set(6, 13, 'p')
    return canvas.toSprite(PEOPLE)
  })(),
  elder: drawBody('g', 'n', 'o', 'p', (canvas) => {
    canvas.set(10, 8, 'k')
    canvas.set(10, 9, 'k')
    canvas.set(10, 10, 'k')
    canvas.set(10, 11, 'k')
    canvas.set(10, 12, 'k')
  }),
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
  if (jobType === TileType.Shop || jobType === TileType.Market) {
    return 'merchant'
  }
  if (jobType === TileType.Warehouse) {
    return 'townsfolk'
  }
  if (jobType === TileType.Clinic) {
    return 'artisan'
  }

  return 'townsfolk'
}

export function validateResidentArt(): void {
  for (const key of RESIDENT_ATLAS_ORDER) {
    assertSprite(RESIDENT_SPRITES[key], RESIDENT_ART_WIDTH, RESIDENT_ART_HEIGHT, key)
  }
}
