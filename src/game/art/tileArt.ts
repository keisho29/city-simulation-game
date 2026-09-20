import { TileType } from '../map/tile.ts'
import { PixelCanvas } from './pixelCanvas.ts'
import { assertSprite, hash32, type PixelSprite } from './pixelTexture.ts'

export const TILE_ART_SIZE = 32
export const TILE_ART_SCALE = 4
export const TILE_ART_PX = TILE_ART_SIZE * TILE_ART_SCALE

const ROAD_COUNT = 16

export const TILE_ATLAS_ORDER = [
  'grass-base',
  'grass-bright',
  'grass-dark',
  'dirt',
  'wasteland',
  'flower',
  'bush',
  'tree',
  'rock',
  'tuft',
  'stump',
  ...Array.from({ length: ROAD_COUNT }, (_, index) => `road-${index}`),
  'house',
  'farm',
  'shop',
  'workshop',
] as const

export type TileAtlasKey = (typeof TILE_ATLAS_ORDER)[number]

const LAND: PixelSprite['palette'] = {
  '.': null,
  '1': 0x5ea83a,
  '2': 0x478c28,
  '3': 0x6eb844,
  '4': 0x3d7a20,
  '5': 0x86cc52,
  '6': 0xc4a574,
  '7': 0xa08050,
  '8': 0x8a6a3c,
  '9': 0xd8c49a,
  a: 0xb8a078,
  b: 0x9a8460,
  P: 0xf48fb1,
  W: 0xfff3e0,
  Y: 0xffe082,
  Z: 0x1b5e20,
  X: 0x2e7d32,
  x: 0x66bb6a,
  z: 0x145a17,
  t: 0x6d4c41,
  T: 0x4e342e,
  R: 0x9e9e9e,
  r: 0x757575,
  S: 0xbdbdbd,
  '#': 0x1a120c,
  K: 0x5d3a22,
  M: 0x7a4a2a,
  N: 0xe6d3b0,
  n: 0xd2b48c,
  I: 0x6a98a8,
  D: 0x3e2418,
  A: 0xb43c2c,
  B: 0xf2e6d0,
  C: 0x6b5344,
  c: 0x8a6f58,
  h: 0x5a5a5a,
  H: 0x3a3a3a,
  v: 0x6b4a28,
  g: 0x7cb342,
  o: 0xd4c44a,
  Q: 0x9aa2ab,
  q: 0x868e98,
  J: 0xb0b6be,
  j: 0x747c86,
  L: 0xe6e2cc,
}

function rnd(seed: number, salt: number): number {
  return hash32(seed * 997 + salt) >>> 0
}

function makeGrass(kind: 'base' | 'bright' | 'dark'): PixelSprite {
  const canvas = new PixelCanvas(TILE_ART_SIZE, TILE_ART_SIZE, kind === 'dark' ? '2' : '1')
  const seed = kind === 'bright' ? 11 : kind === 'dark' ? 23 : 7

  for (let i = 0; i < 5; i += 1) {
    const x = rnd(seed, i * 3) % TILE_ART_SIZE
    const y = rnd(seed, i * 5 + 1) % TILE_ART_SIZE
    const radius = 4 + (rnd(seed, i * 7) % 5)
    canvas.fillCircle(x, y, radius, i % 2 === 0 ? '3' : '2')
  }

  for (let i = 0; i < 28; i += 1) {
    const x = rnd(seed, 100 + i) % TILE_ART_SIZE
    const y = rnd(seed, 200 + i) % TILE_ART_SIZE
    canvas.set(x, y, i % 3 === 0 ? '5' : '2')
  }

  canvas.fillRect(0, 0, TILE_ART_SIZE, 1, '4')
  canvas.fillRect(0, 0, 1, TILE_ART_SIZE, '4')
  return canvas.toSprite(LAND)
}

function makeDirt(): PixelSprite {
  const canvas = new PixelCanvas(TILE_ART_SIZE, TILE_ART_SIZE, '6')
  for (let i = 0; i < 12; i += 1) {
    canvas.fillCircle(
      3 + (rnd(3, i) % 26),
      3 + (rnd(5, i) % 26),
      2 + (rnd(9, i) % 4),
      i % 3 === 0 ? '9' : i % 3 === 1 ? '7' : '8',
    )
  }
  for (let i = 0; i < 50; i += 1) {
    canvas.set(rnd(8, i) % 32, rnd(12, i) % 32, i % 2 === 0 ? '9' : '8')
  }
  for (let i = 0; i < 12; i += 1) {
    canvas.set(rnd(15, i) % 32, rnd(17, i) % 32, '2')
  }
  return canvas.toSprite(LAND)
}

function makeWasteland(): PixelSprite {
  const canvas = new PixelCanvas(TILE_ART_SIZE, TILE_ART_SIZE, 'a')
  for (let i = 0; i < 10; i += 1) {
    canvas.fillCircle(4 + (rnd(21, i) % 24), 4 + (rnd(22, i) % 24), 2 + (rnd(24, i) % 3), 'b')
  }
  for (let i = 0; i < 20; i += 1) {
    canvas.set(rnd(25, i) % 32, rnd(26, i) % 32, '2')
  }
  for (let i = 0; i < 8; i += 1) {
    canvas.fillCircle(4 + (rnd(27, i) % 24), 4 + (rnd(28, i) % 24), 1.4, i % 2 === 0 ? 'R' : 'r')
  }
  return canvas.toSprite(LAND)
}

function makeRoad(mask: number): PixelSprite {
  const canvas = new PixelCanvas(TILE_ART_SIZE, TILE_ART_SIZE, 'Q')
  for (let y = 0; y < TILE_ART_SIZE; y += 1) {
    for (let x = 0; x < TILE_ART_SIZE; x += 1) {
      const n = rnd(mask + 1, x * 32 + y) % 100
      canvas.set(x, y, n < 22 ? 'q' : n < 55 ? 'Q' : n < 82 ? 'J' : 'j')
    }
  }

  canvas.fillRect(0, 0, TILE_ART_SIZE, 1, 'j')
  canvas.fillRect(0, 0, 1, TILE_ART_SIZE, 'j')
  return canvas.toSprite(LAND)
}

function makeTree(): PixelSprite {
  const canvas = new PixelCanvas(TILE_ART_SIZE, TILE_ART_SIZE)
  canvas.fillRect(14, 20, 4, 11, 't')
  canvas.fillRect(15, 18, 2, 3, 'T')
  canvas.fillCircle(16, 13, 11, 'Z')
  canvas.fillCircle(16, 12, 9, 'X')
  canvas.fillCircle(12, 11, 5, 'x')
  canvas.fillCircle(20, 14, 5, 'z')
  canvas.fillCircle(16, 9, 4, 'x')
  canvas.set(10, 8, 'x')
  canvas.set(22, 10, '5')
  return canvas.toSprite(LAND)
}

function makeBush(): PixelSprite {
  const canvas = new PixelCanvas(TILE_ART_SIZE, TILE_ART_SIZE)
  canvas.fillCircle(16, 22, 7, 'Z')
  canvas.fillCircle(16, 21, 6, 'X')
  canvas.fillCircle(13, 20, 4, 'x')
  canvas.fillCircle(19, 22, 3, 'z')
  canvas.fillRect(15, 26, 3, 3, 't')
  return canvas.toSprite(LAND)
}

function makeFlower(): PixelSprite {
  const canvas = new PixelCanvas(TILE_ART_SIZE, TILE_ART_SIZE)
  const flowers: Array<[number, number, string]> = [
    [8, 10, 'P'],
    [22, 12, 'W'],
    [12, 20, 'P'],
    [20, 22, 'Y'],
    [16, 14, 'W'],
  ]
  for (const [x, y, ch] of flowers) {
    canvas.set(x, y + 2, '4')
    canvas.set(x, y + 3, '4')
    canvas.fillCircle(x, y, 2.2, ch)
    canvas.set(x, y, 'W')
  }
  return canvas.toSprite(LAND)
}

function makeRock(): PixelSprite {
  const canvas = new PixelCanvas(TILE_ART_SIZE, TILE_ART_SIZE)
  canvas.fillCircle(12, 20, 5, 'r')
  canvas.fillCircle(12, 19, 4, 'R')
  canvas.fillCircle(20, 22, 4, 'r')
  canvas.fillCircle(20, 21, 3, 'S')
  canvas.set(10, 17, 'S')
  canvas.set(18, 19, '#')
  return canvas.toSprite(LAND)
}

function makeTuft(): PixelSprite {
  const canvas = new PixelCanvas(TILE_ART_SIZE, TILE_ART_SIZE)
  for (const x of [10, 12, 14, 18, 20, 22]) {
    canvas.set(x, 24, '4')
    canvas.set(x, 23, '2')
    canvas.set(x, 22, '3')
    canvas.set(x - 1, 22, '1')
  }
  canvas.set(16, 21, '5')
  return canvas.toSprite(LAND)
}

function makeStump(): PixelSprite {
  const canvas = new PixelCanvas(TILE_ART_SIZE, TILE_ART_SIZE)
  canvas.fillCircle(16, 22, 5, 'T')
  canvas.fillCircle(16, 22, 3, 't')
  canvas.fillRect(13, 22, 6, 6, 't')
  canvas.fillCircle(16, 21, 3, '6')
  canvas.set(16, 21, '8')
  return canvas.toSprite(LAND)
}

function outlineRect(
  canvas: PixelCanvas,
  x: number,
  y: number,
  width: number,
  height: number,
  ch: string,
): void {
  canvas.fillRect(x, y, width, 1, ch)
  canvas.fillRect(x, y + height - 1, width, 1, ch)
  canvas.fillRect(x, y, 1, height, ch)
  canvas.fillRect(x + width - 1, y, 1, height, ch)
}

function makeHouse(): PixelSprite {
  const canvas = new PixelCanvas(TILE_ART_SIZE, TILE_ART_SIZE)
  canvas.fillRect(8, 26, 16, 4, '7')
  canvas.fillRect(6, 14, 20, 13, 'N')
  canvas.fillRect(7, 15, 18, 11, 'n')
  outlineRect(canvas, 6, 14, 20, 13, '#')
  for (let i = 0; i < 12; i += 1) {
    const width = 22 - i
    canvas.fillRect(5 + Math.floor(i / 2), 5 + i, width, 1, i < 3 ? 'K' : 'M')
  }
  canvas.fillRect(14, 20, 4, 7, 'D')
  canvas.fillRect(9, 17, 4, 3, 'I')
  canvas.fillRect(19, 17, 4, 3, 'I')
  canvas.fillRect(8, 16, 6, 1, '#')
  canvas.fillRect(18, 16, 6, 1, '#')
  return canvas.toSprite(LAND)
}

function makeFarm(): PixelSprite {
  const canvas = new PixelCanvas(TILE_ART_SIZE, TILE_ART_SIZE, 'v')
  canvas.fillRect(0, 0, 32, 32, '7')
  const plots = [
    [2, 2],
    [17, 2],
    [2, 17],
    [17, 17],
  ]
  for (const [x, y] of plots) {
    canvas.fillRect(x, y, 13, 13, 'v')
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const px = x + 2 + col * 3
        const py = y + 2 + row * 3
        canvas.fillRect(px, py, 2, 2, row % 2 === 0 ? 'g' : 'o')
      }
    }
  }
  return canvas.toSprite(LAND)
}

function makeShop(): PixelSprite {
  const canvas = new PixelCanvas(TILE_ART_SIZE, TILE_ART_SIZE)
  canvas.fillRect(7, 26, 18, 4, '7')
  canvas.fillRect(5, 14, 22, 13, 'n')
  outlineRect(canvas, 5, 14, 22, 13, '#')
  canvas.fillRect(4, 8, 24, 7, 'A')
  canvas.fillRect(5, 9, 22, 5, 'A')
  for (let x = 6; x < 26; x += 2) {
    canvas.fillRect(x, 9, 1, 5, 'B')
  }
  canvas.fillRect(14, 20, 4, 7, 'D')
  canvas.fillRect(8, 17, 4, 3, 'I')
  canvas.fillRect(20, 17, 4, 3, 'I')
  return canvas.toSprite(LAND)
}

function makeWorkshop(): PixelSprite {
  const canvas = new PixelCanvas(TILE_ART_SIZE, TILE_ART_SIZE)
  canvas.fillRect(8, 26, 16, 4, '7')
  canvas.fillRect(6, 14, 20, 13, 'C')
  canvas.fillRect(7, 15, 18, 11, 'c')
  outlineRect(canvas, 6, 14, 20, 13, '#')
  canvas.fillRect(6, 8, 20, 7, 'K')
  canvas.fillRect(22, 4, 4, 8, 'h')
  canvas.fillRect(23, 3, 2, 3, 'H')
  canvas.fillRect(14, 20, 4, 7, 'D')
  canvas.fillRect(9, 17, 4, 3, 'I')
  return canvas.toSprite(LAND)
}

function buildSprites(): Record<TileAtlasKey, PixelSprite> {
  const sprites = {
    'grass-base': makeGrass('base'),
    'grass-bright': makeGrass('bright'),
    'grass-dark': makeGrass('dark'),
    dirt: makeDirt(),
    wasteland: makeWasteland(),
    flower: makeFlower(),
    bush: makeBush(),
    tree: makeTree(),
    rock: makeRock(),
    tuft: makeTuft(),
    stump: makeStump(),
    house: makeHouse(),
    farm: makeFarm(),
    shop: makeShop(),
    workshop: makeWorkshop(),
  } as Record<TileAtlasKey, PixelSprite>

  for (let index = 0; index < ROAD_COUNT; index += 1) {
    sprites[`road-${index}` as TileAtlasKey] = makeRoad(index)
  }

  return sprites
}

export const TILE_SPRITES = buildSprites()

export const TILES_NEEDING_GRASS: ReadonlySet<TileAtlasKey> = new Set([
  'flower',
  'bush',
  'tree',
  'rock',
  'stump',
  'house',
  'farm',
  'shop',
  'workshop',
])

export function vacantTileKey(_x: number, _y: number): TileAtlasKey {
  return 'grass-base'
}

export type DecoKind = 'tree' | 'bush' | 'flower'

export type PropLayout = {
  width: number
  height: number
  originX: number
  originY: number
}

export const PROP_LAYOUT: Record<string, PropLayout> = {
  house: { width: 1.75, height: 2.3, originX: 0.5, originY: 0.94 },
  shop: { width: 1.8, height: 2.2, originX: 0.5, originY: 0.94 },
  workshop: { width: 1.75, height: 2.3, originX: 0.5, originY: 0.94 },
  farm: { width: 1.25, height: 1.2, originX: 0.5, originY: 0.84 },
  tree: { width: 1.4, height: 2.05, originX: 0.5, originY: 0.96 },
  bush: { width: 1.25, height: 1.85, originX: 0.5, originY: 0.96 },
  flower: { width: 0.45, height: 0.45, originX: 0.5, originY: 0.78 },
  road: { width: 1, height: 1, originX: 0.5, originY: 0.5 },
}

export function decoKind(x: number, y: number): DecoKind | undefined {
  const deco = hash32(x * 73856093 + y * 19349663 + 17)
  if (deco % 23 === 0) {
    return 'tree'
  }
  if (deco % 31 === 0) {
    return 'bush'
  }
  if (deco % 9 === 0) {
    return 'flower'
  }
  return undefined
}

export function decoOffset(x: number, y: number): { x: number; y: number } {
  const n = hash32(x * 13 + y * 29 + 91)
  return {
    x: (n % 17) - 8,
    y: ((n >>> 4) % 11) - 5,
  }
}

export function buildingTileKey(type: TileType, connections = 0): TileAtlasKey | undefined {
  switch (type) {
    case TileType.Road:
      return `road-${connections & 15}` as TileAtlasKey
    case TileType.House:
      return 'house'
    case TileType.Farm:
      return 'farm'
    case TileType.Shop:
      return 'shop'
    case TileType.Workshop:
      return 'workshop'
    default:
      return undefined
  }
}

export function validateTileArt(): void {
  for (const key of TILE_ATLAS_ORDER) {
    assertSprite(TILE_SPRITES[key], TILE_ART_SIZE, TILE_ART_SIZE, key)
  }
}
