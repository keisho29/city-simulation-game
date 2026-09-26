import Phaser from 'phaser'
import { paintPixels } from './pixelTexture.ts'
import {
  createIsoBridgeAtlas,
  createIsoRailAtlas,
  createIsoRoadAtlas,
  createIsoTerrainAtlas,
  createIsoWaterAtlas,
} from './isoArt.ts'
import { TILE_ART_PX, TILE_SPRITES, type TileAtlasKey, validateTileArt } from './tileArt.ts'
import {
  RESIDENT_ATLAS_ORDER,
  RESIDENT_FACINGS,
  RESIDENT_WALK_POSES,
  residentSprite,
  residentWalkTextureKey,
  type ResidentAtlasKey,
  type ResidentFacing,
  type ResidentWalkPose,
  validateResidentArt,
} from './residentArt.ts'
import type { ResidentGender } from '../residents/names.ts'

export const TILE_TEXTURE_KEY = 'tiles'
export const ROAD_TEXTURE_KEY = 'roads'
export const RAIL_TEXTURE_KEY = 'rails'
export const WATER_TEXTURE_KEY = 'waters'
export const BRIDGE_TEXTURE_KEY = 'bridges'
export { TERRAIN_TEXTURE_KEY } from './isoArt.ts'
export const TRAIN_TEXTURE_KEY = 'vehicle-train'
export const BOAT_TEXTURE_KEY = 'vehicle-boat'
export const OCCUPANCY_BUBBLE_KEY = 'occupancy-bubble'
export const OCCUPANCY_BUBBLE_COUNT_KEY = 'occupancy-bubble-count'

export const PROP_TEXTURE: Record<string, string> = {
  house: 'prop-house',
  farm: 'prop-farm',
  shop: 'prop-shop',
  workshop: 'prop-workshop',
  market: 'prop-market',
  well: 'prop-well',
  warehouse: 'prop-warehouse',
  clinic: 'prop-clinic',
  school: 'prop-school',
  factory: 'prop-factory',
  station: 'prop-station',
  port: 'prop-port',
  airport: 'prop-airport',
  tree: 'prop-tree',
  pine: 'prop-pine',
  bush: 'prop-bush',
  mountain: 'prop-mountain',
  bridge: 'prop-bridge',
  flower: 'prop-flower',
  rock: 'prop-rock',
}

const SRC_HOUSE = 'src-house'
const SRC_FARM = 'src-farm'
const SRC_SHOP = 'src-shop'
const SRC_WORKSHOP = 'src-workshop'
const SRC_MARKET = 'src-market'
const SRC_WELL = 'src-well'
const SRC_WAREHOUSE = 'src-warehouse'
const SRC_CLINIC = 'src-clinic'
const SRC_SCHOOL = 'src-school'
const SRC_FACTORY = 'src-factory'
const SRC_STATION = 'src-station'
const SRC_PORT = 'src-port'
const SRC_AIRPORT = 'src-airport'
const SRC_TREE = 'src-tree'
const SRC_PINE = 'src-pine'
const SRC_MOUNTAIN = 'src-mountain'
const SRC_BRIDGE = 'src-bridge'
const SRC_ROCK = 'src-rock'
const SRC_CHIBI_FRONT_MALE = 'src-chibi-front-male'
const SRC_CHIBI_FRONT_FEMALE = 'src-chibi-front-female'
const SRC_CHIBI_BACK_MALE = 'src-chibi-back-male'
const SRC_CHIBI_BACK_FEMALE = 'src-chibi-back-female'

type GridStamp = {
  sourceKey: string
  cols: number
  rows: number
  col: number
  row: number
  pad: number
  align: 'center' | 'bottom'
  fill: number
  edgePunch?: boolean
}

export function preloadWorldArt(scene: Phaser.Scene): void {
  scene.load.image(SRC_HOUSE, '/art/preview-pixel/tile-house.png')
  scene.load.image(SRC_FARM, '/art/preview-pixel/tile-farm.png')
  scene.load.image(SRC_SHOP, '/art/preview-pixel/tile-shop.png')
  scene.load.image(SRC_WORKSHOP, '/art/preview-pixel/tile-workshop.png')
  scene.load.image(SRC_MARKET, '/art/preview-pixel/tile-market.png')
  scene.load.image(SRC_WELL, '/art/preview-pixel/tile-well.png')
  scene.load.image(SRC_WAREHOUSE, '/art/preview-pixel/tile-warehouse.png')
  scene.load.image(SRC_CLINIC, '/art/preview-pixel/tile-clinic.png')
  scene.load.image(SRC_SCHOOL, '/art/preview-pixel/tile-school.png')
  scene.load.image(SRC_FACTORY, '/art/preview-pixel/tile-factory.png')
  scene.load.image(SRC_STATION, '/art/preview-pixel/tile-station.png')
  scene.load.image(SRC_PORT, '/art/preview-pixel/tile-port.png')
  scene.load.image(SRC_AIRPORT, '/art/preview-pixel/tile-airport.png')
  scene.load.image(SRC_TREE, '/art/preview-pixel/tile-tree.png')
  scene.load.image(SRC_PINE, '/art/preview-pixel/tile-pine.png')
  scene.load.image(SRC_MOUNTAIN, '/art/preview-pixel/tile-mountain.png')
  scene.load.image(SRC_BRIDGE, '/art/tile-bridge.png')
  scene.load.image(SRC_ROCK, '/art/preview-pixel/tile-rock.png')
  scene.load.image(SRC_CHIBI_FRONT_MALE, '/art/chibi-front-male.png')
  scene.load.image(SRC_CHIBI_FRONT_FEMALE, '/art/chibi-front-female.png')
  scene.load.image(SRC_CHIBI_BACK_MALE, '/art/chibi-back-male.png')
  scene.load.image(SRC_CHIBI_BACK_FEMALE, '/art/chibi-back-female.png')
}

export function createWorldArt(scene: Phaser.Scene): void {
  validateTileArt()
  validateResidentArt()
  createIsoTerrainAtlas(scene.textures)
  createPropTexture(scene.textures, PROP_TEXTURE.house, SRC_HOUSE)
  createPropTexture(scene.textures, PROP_TEXTURE.farm, SRC_FARM)
  createPropTexture(scene.textures, PROP_TEXTURE.shop, SRC_SHOP)
  createPropTexture(scene.textures, PROP_TEXTURE.workshop, SRC_WORKSHOP)
  createPropTexture(scene.textures, PROP_TEXTURE.market, SRC_MARKET)
  createPropTexture(scene.textures, PROP_TEXTURE.well, SRC_WELL)
  createPropTexture(scene.textures, PROP_TEXTURE.warehouse, SRC_WAREHOUSE)
  createPropTexture(scene.textures, PROP_TEXTURE.clinic, SRC_CLINIC)
  createPropTexture(scene.textures, PROP_TEXTURE.school, SRC_SCHOOL)
  createPropTexture(scene.textures, PROP_TEXTURE.factory, SRC_FACTORY)
  createPropTexture(scene.textures, PROP_TEXTURE.station, SRC_STATION)
  createPropTexture(scene.textures, PROP_TEXTURE.port, SRC_PORT)
  createPropTexture(scene.textures, PROP_TEXTURE.airport, SRC_AIRPORT)
  createTreeTextures(scene.textures)
  createFlowerTexture(scene.textures)
  createPropTexture(scene.textures, PROP_TEXTURE.rock, SRC_ROCK, { maxEdge: 48 })
  createPropTexture(scene.textures, PROP_TEXTURE.mountain, SRC_MOUNTAIN, { maxEdge: 72 })
  createPropTexture(scene.textures, PROP_TEXTURE.bridge, SRC_BRIDGE)
  createIsoRoadAtlas(scene.textures)
  createIsoRailAtlas(scene.textures)
  createIsoWaterAtlas(scene.textures)
  createIsoBridgeAtlas(scene.textures)
  createVehicleTextures(scene.textures)
  createResidentAtlas(scene.textures)
  createOccupancyBubble(scene.textures)
}

export function textureForProp(kind: string): string {
  return PROP_TEXTURE[kind] ?? PROP_TEXTURE.house
}

export function residentTextureKey(key: string): string {
  return `resident-${key}`
}

function disableSmooth(ctx: CanvasRenderingContext2D): void {
  ctx.imageSmoothingEnabled = false
}

function sourceImage(
  textures: Phaser.Textures.TextureManager,
  key: string,
): CanvasImageSource | undefined {
  if (!textures.exists(key)) {
    return undefined
  }

  const image = textures.get(key).getSourceImage() as CanvasImageSource | undefined
  if (!image || (image instanceof HTMLImageElement && image.width === 0)) {
    return undefined
  }

  return image
}

function isMagentaBackdrop(r: number, g: number, b: number): boolean {
  const magenta = r > 120 && b > 90 && g < 170 && r - g > 18 && b - g > 8
  const magentaFringe = r > 200 && b > 190 && g < 110
  const hotPink = r > 190 && b > 70 && g < 150 && r > g + 30
  return magenta || magentaFringe || hotPink
}

function isBackdrop(r: number, g: number, b: number): boolean {
  const teal = b >= g && b >= r && b - r > 12 && r < 95 && g < 115
  const luma = 0.3 * r + 0.59 * g + 0.11 * b
  const bluishDark = luma < 58 && b >= r - 4 && b >= g - 8
  const chroma = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b))
  const paper = luma > 236 && chroma < 16
  return isMagentaBackdrop(r, g, b) || teal || bluishDark || paper
}

function colorDistance(
  r: number,
  g: number,
  b: number,
  otherR: number,
  otherG: number,
  otherB: number,
): number {
  return Math.hypot(r - otherR, g - otherG, b - otherB)
}

function punchBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  match: (r: number, g: number, b: number) => boolean = isBackdrop,
): void {
  const pixels = ctx.getImageData(0, 0, width, height)
  const data = pixels.data
  const at = (x: number, y: number) => (y * width + x) * 4

  for (let i = 0; i < data.length; i += 4) {
    if (match(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)) {
      data[i + 3] = 0
    }
  }

  const seen = new Uint8Array(width * height)
  const stack: number[] = []
  const floodFrom = (startX: number, startY: number) => {
    const start = at(startX, startY)
    const sr = data[start] ?? 0
    const sg = data[start + 1] ?? 0
    const sb = data[start + 2] ?? 0
    const sa = data[start + 3] ?? 0
    if (sa < 16 && seen[startY * width + startX] === 1) {
      return
    }
    if (sa >= 16 && !match(sr, sg, sb)) {
      return
    }

    const push = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= width || y >= height) {
        return
      }
      const id = y * width + x
      if (seen[id] === 1) {
        return
      }
      const i = at(x, y)
      const alpha = data[i + 3] ?? 0
      if (alpha < 16) {
        seen[id] = 1
        return
      }
      const r = data[i] ?? 0
      const g = data[i + 1] ?? 0
      const b = data[i + 2] ?? 0
      if (!match(r, g, b) && colorDistance(r, g, b, sr, sg, sb) > 64) {
        return
      }
      seen[id] = 1
      stack.push(x, y)
    }

    push(startX, startY)
    while (stack.length > 0) {
      const y = stack.pop() ?? 0
      const x = stack.pop() ?? 0
      data[at(x, y) + 3] = 0
      push(x + 1, y)
      push(x - 1, y)
      push(x, y + 1)
      push(x, y - 1)
    }
  }

  floodFrom(0, 0)
  floodFrom(width - 1, 0)
  floodFrom(0, height - 1)
  floodFrom(width - 1, height - 1)
  floodFrom(Math.floor(width / 2), 0)
  floodFrom(0, Math.floor(height / 2))

  ctx.putImageData(pixels, 0, 0)
}

function punchPadsTouchingTransparent(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const pixels = ctx.getImageData(0, 0, width, height)
  const data = pixels.data
  const at = (x: number, y: number) => (y * width + x) * 4
  const seen = new Uint8Array(width * height)
  const stack: number[] = []

  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return
    }
    const id = y * width + x
    if (seen[id] === 1) {
      return
    }
    const i = at(x, y)
    if ((data[i + 3] ?? 0) < 16) {
      seen[id] = 1
      return
    }
    if (!isGrassPad(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)) {
      return
    }
    seen[id] = 1
    stack.push(x, y)
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((data[at(x, y) + 3] ?? 0) >= 16) {
        continue
      }
      push(x + 1, y)
      push(x - 1, y)
      push(x, y + 1)
      push(x, y - 1)
    }
  }

  while (stack.length > 0) {
    const y = stack.pop() ?? 0
    const x = stack.pop() ?? 0
    data[at(x, y) + 3] = 0
    push(x + 1, y)
    push(x - 1, y)
    push(x, y + 1)
    push(x, y - 1)
  }

  ctx.putImageData(pixels, 0, 0)
}

function isGrassPad(r: number, g: number, b: number): boolean {
  return g > r + 12 && g > b + 8 && g > 55 && g < 215 && r < 175
}

function punchEdgePads(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const pixels = ctx.getImageData(0, 0, width, height)
  const data = pixels.data
  const at = (x: number, y: number) => (y * width + x) * 4

  let grass = 0
  const tally = (x: number, y: number) => {
    const i = at(x, y)
    if ((data[i + 3] ?? 0) < 16) {
      return
    }
    if (isGrassPad(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)) {
      grass += 1
    }
  }

  for (let x = 0; x < width; x += 1) {
    tally(x, 0)
    tally(x, height - 1)
  }
  for (let y = 0; y < height; y += 1) {
    tally(0, y)
    tally(width - 1, y)
  }

  if (grass < 12) {
    return
  }

  const seen = new Uint8Array(width * height)
  const stack: number[] = []
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return
    }
    const id = y * width + x
    if (seen[id] === 1) {
      return
    }
    const i = at(x, y)
    if ((data[i + 3] ?? 0) < 16) {
      seen[id] = 1
      return
    }
    if (!isGrassPad(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)) {
      return
    }
    seen[id] = 1
    stack.push(x, y)
  }

  for (let x = 0; x < width; x += 1) {
    push(x, 0)
    push(x, height - 1)
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y)
    push(width - 1, y)
  }

  while (stack.length > 0) {
    const y = stack.pop() ?? 0
    const x = stack.pop() ?? 0
    data[at(x, y) + 3] = 0
    push(x + 1, y)
    push(x - 1, y)
    push(x, y + 1)
    push(x, y - 1)
  }

  ctx.putImageData(pixels, 0, 0)
}

function contentBox(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } | undefined {
  const pixels = ctx.getImageData(0, 0, width, height).data
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3] ?? 0
      if (alpha < 16) {
        continue
      }
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  if (maxX < minX || maxY < minY) {
    return undefined
  }

  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

function cropToContent(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }

  const box = contentBox(ctx, canvas.width, canvas.height)
  if (!box) {
    return canvas
  }

  const pad = 2
  const x = Math.max(0, box.x - pad)
  const y = Math.max(0, box.y - pad)
  const w = Math.min(canvas.width - x, box.w + pad * 2)
  const h = Math.min(canvas.height - y, box.h + pad * 2)
  const cropped = document.createElement('canvas')
  cropped.width = Math.max(1, w)
  cropped.height = Math.max(1, h)
  const croppedCtx = cropped.getContext('2d', { alpha: true })
  if (!croppedCtx) {
    return canvas
  }

  disableSmooth(croppedCtx)
  croppedCtx.clearRect(0, 0, cropped.width, cropped.height)
  croppedCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h)
  return cropped
}

function punchImage(
  image: CanvasImageSource,
  edgePunch: boolean,
  match: (r: number, g: number, b: number) => boolean = isBackdrop,
): HTMLCanvasElement | undefined {
  const width = 'width' in image ? Number(image.width) : 0
  const height = 'height' in image ? Number(image.height) : 0
  if (width <= 0 || height <= 0) {
    return undefined
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) {
    return undefined
  }

  disableSmooth(ctx)
  ctx.drawImage(image, 0, 0)
  punchBackdrop(ctx, width, height, match)
  if (edgePunch) {
    punchEdgePads(ctx, width, height)
    punchPadsTouchingTransparent(ctx, width, height)
  }
  return cropToContent(canvas)
}

function extractCell(
  image: CanvasImageSource,
  stamp: GridStamp,
): HTMLCanvasElement | undefined {
  const width = 'width' in image ? Number(image.width) : 0
  const height = 'height' in image ? Number(image.height) : 0
  if (width <= 0 || height <= 0) {
    return undefined
  }

  const cellW = width / stamp.cols
  const cellH = height / stamp.rows
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(cellW))
  canvas.height = Math.max(1, Math.round(cellH))
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return undefined
  }

  disableSmooth(ctx)
  ctx.drawImage(
    image,
    cellW * stamp.col + cellW * stamp.pad,
    cellH * stamp.row + cellH * stamp.pad,
    cellW * (1 - stamp.pad * 2),
    cellH * (1 - stamp.pad * 2),
    0,
    0,
    canvas.width,
    canvas.height,
  )
  punchBackdrop(ctx, canvas.width, canvas.height)
  if (stamp.edgePunch !== false) {
    punchEdgePads(ctx, canvas.width, canvas.height)
  }
  return canvas
}

function addCanvasTexture(
  textures: Phaser.Textures.TextureManager,
  key: string,
  canvas: HTMLCanvasElement,
): void {
  if (textures.exists(key)) {
    textures.remove(key)
  }
  const texture = textures.addCanvas(key, canvas)
  texture?.setFilter(Phaser.Textures.FilterMode.NEAREST)
  texture?.refresh()
}

function crunchPixels(canvas: HTMLCanvasElement, maxEdge: number): HTMLCanvasElement {
  const longest = Math.max(canvas.width, canvas.height)
  if (longest <= maxEdge) {
    return canvas
  }
  const scale = maxEdge / longest
  const width = Math.max(8, Math.round(canvas.width * scale))
  const height = Math.max(8, Math.round(canvas.height * scale))
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const ctx = out.getContext('2d', { alpha: true })
  if (!ctx) {
    return canvas
  }
  disableSmooth(ctx)
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(canvas, 0, 0, width, height)
  return out
}

type PropTextureOptions = {
  cols?: number
  col?: number
  maxEdge?: number
  punchBase?: boolean
}

function isTerrainBasePixel(r: number, g: number, b: number): boolean {
  const green = g > r + 6 && g > b - 2 && g > 72
  const dirt = r > 88 && g > 68 && b < 112 && r > b + 22 && g > b + 8 && Math.abs(r - g) < 52
  return green || dirt
}

function punchTerrainBase(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    return
  }
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = pixels.data
  const cut = canvas.height * 0.46
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (y < cut) {
        continue
      }
      const i = (y * canvas.width + x) * 4
      if ((data[i + 3] ?? 0) < 16) {
        continue
      }
      if (isTerrainBasePixel(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)) {
        data[i + 3] = 0
      }
    }
  }
  ctx.putImageData(pixels, 0, 0)
}

function createPropTexture(
  textures: Phaser.Textures.TextureManager,
  key: string,
  sourceKey: string,
  options: PropTextureOptions = {},
): void {
  const image = sourceImage(textures, sourceKey)
  let punched: HTMLCanvasElement | undefined
  if (image && (options.cols ?? 1) > 1) {
    const cell = extractCell(image, {
      sourceKey,
      cols: options.cols ?? 2,
      rows: 1,
      col: options.col ?? 0,
      row: 0,
      pad: 0,
      align: 'bottom',
      fill: 0,
      edgePunch: false,
    })
    punched = cell ? cropToContent(cell) : undefined
  } else {
    punched = image ? punchImage(image, false, isMagentaBackdrop) : undefined
  }
  if (punched && options.punchBase) {
    punchTerrainBase(punched)
    punched = cropToContent(punched)
  }
  if (punched) {
    addCanvasTexture(textures, key, crunchPixels(punched, options.maxEdge ?? 72))
    return
  }

  const atlasKey = key.replace('prop-', '') as TileAtlasKey
  const sprite = TILE_SPRITES[atlasKey]
  if (!sprite) {
    return
  }
  const canvas = document.createElement('canvas')
  canvas.width = TILE_ART_PX
  canvas.height = TILE_ART_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }
  const scratch = document.createElement('canvas')
  scratch.width = sprite.rows[0]?.length ?? 32
  scratch.height = sprite.rows.length
  const scratchCtx = scratch.getContext('2d')
  if (scratchCtx) {
    paintPixels(scratchCtx, sprite, 1, 0, 0)
    disableSmooth(ctx)
    ctx.drawImage(scratch, 0, 0, TILE_ART_PX, TILE_ART_PX)
  }
  addCanvasTexture(textures, key, canvas)
}

function createTreeTextures(textures: Phaser.Textures.TextureManager): void {
  const image = sourceImage(textures, SRC_TREE)
  const width = image && 'width' in image ? Number(image.width) : 0
  const height = image && 'height' in image ? Number(image.height) : 0
  const sheet = width > height * 1.3
  const slice = sheet ? { cols: 2, col: 1 } : {}
  createPropTexture(textures, PROP_TEXTURE.tree, SRC_TREE, slice)
  createPropTexture(textures, PROP_TEXTURE.pine, SRC_PINE)
  createPropTexture(textures, PROP_TEXTURE.bush, SRC_TREE, { ...slice, maxEdge: 40 })
}

function createFlowerTexture(textures: Phaser.Textures.TextureManager): void {
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 16
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) {
    return
  }

  ctx.clearRect(0, 0, 16, 16)
  disableSmooth(ctx)
  ctx.fillStyle = '#3d6e22'
  ctx.fillRect(7, 9, 2, 6)
  const blooms: Array<[number, number, string]> = [
    [7, 4, '#f4b3c8'],
    [4, 7, '#fff0d8'],
    [10, 7, '#f28aaa'],
    [7, 7, '#ffe6f0'],
  ]
  for (const [x, y, color] of blooms) {
    ctx.fillStyle = color
    ctx.fillRect(x, y, 3, 3)
  }
  ctx.fillStyle = '#e8d36a'
  ctx.fillRect(8, 6, 1, 1)
  addCanvasTexture(textures, PROP_TEXTURE.flower, canvas)
}

function createVehicleTextures(textures: Phaser.Textures.TextureManager): void {
  const train = document.createElement('canvas')
  train.width = 24
  train.height = 14
  const trainCtx = train.getContext('2d')
  if (trainCtx) {
    disableSmooth(trainCtx)
    trainCtx.fillStyle = '#3a3a42'
    trainCtx.fillRect(1, 4, 22, 8)
    trainCtx.fillStyle = '#6a2a24'
    trainCtx.fillRect(14, 2, 8, 10)
    trainCtx.fillStyle = '#d8c48a'
    trainCtx.fillRect(16, 4, 4, 3)
    trainCtx.fillStyle = '#1a1a1a'
    trainCtx.fillRect(3, 11, 4, 3)
    trainCtx.fillRect(17, 11, 4, 3)
    addCanvasTexture(textures, TRAIN_TEXTURE_KEY, train)
  }

  const boat = document.createElement('canvas')
  boat.width = 24
  boat.height = 14
  const boatCtx = boat.getContext('2d')
  if (boatCtx) {
    disableSmooth(boatCtx)
    boatCtx.fillStyle = '#6b4428'
    boatCtx.fillRect(2, 7, 20, 5)
    boatCtx.fillStyle = '#c4a070'
    boatCtx.fillRect(4, 5, 16, 4)
    boatCtx.fillStyle = '#eee8d8'
    boatCtx.fillRect(11, 1, 2, 6)
    addCanvasTexture(textures, BOAT_TEXTURE_KEY, boat)
  }
}

function paintResidentCanvas(
  key: ResidentAtlasKey,
  pose: ResidentWalkPose,
  facing: ResidentFacing,
  gender: ResidentGender,
): HTMLCanvasElement {
  const sprite = residentSprite(key, pose, facing, gender)
  const source = document.createElement('canvas')
  source.width = (sprite.rows[0]?.length ?? 20) * 2
  source.height = sprite.rows.length * 2
  const ctx = source.getContext('2d')
  if (ctx) {
    disableSmooth(ctx)
    paintPixels(ctx, sprite, 2, 0, 0)
  }
  return source
}

function cropCanvas(
  canvas: HTMLCanvasElement,
  box: { x: number; y: number; w: number; h: number },
): HTMLCanvasElement {
  const cropped = document.createElement('canvas')
  cropped.width = Math.max(1, box.w)
  cropped.height = Math.max(1, box.h)
  const ctx = cropped.getContext('2d', { alpha: true })
  if (!ctx) {
    return canvas
  }
  disableSmooth(ctx)
  ctx.clearRect(0, 0, cropped.width, cropped.height)
  ctx.drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h)
  return cropped
}

function sliceChibiColumn(
  image: CanvasImageSource,
  col: number,
): Array<HTMLCanvasElement | undefined> {
  const cells = RESIDENT_WALK_POSES.map((_, row) =>
    extractCell(image, {
      sourceKey: '',
      cols: RESIDENT_ATLAS_ORDER.length,
      rows: 3,
      col,
      row,
      pad: 0,
      align: 'bottom',
      fill: 0,
      edgePunch: false,
    }),
  )

  const boxes = cells.map((cell) => {
    const ctx = cell?.getContext('2d')
    return ctx && cell ? contentBox(ctx, cell.width, cell.height) : undefined
  })
  const present = boxes.filter((box): box is NonNullable<typeof box> => Boolean(box))
  if (present.length === 0) {
    return cells.map(() => undefined)
  }

  const pad = 2
  const minX = Math.max(0, Math.min(...present.map((box) => box.x)) - pad)
  const minY = Math.max(0, Math.min(...present.map((box) => box.y)) - pad)
  const maxX = Math.max(...present.map((box) => box.x + box.w - 1)) + pad
  const maxY = Math.max(...present.map((box) => box.y + box.h - 1)) + pad
  const width = cells[0]?.width ?? maxX + 1
  const height = cells[0]?.height ?? maxY + 1
  const crop = {
    x: minX,
    y: minY,
    w: Math.min(width - minX, maxX - minX + 1),
    h: Math.min(height - minY, maxY - minY + 1),
  }
  if (crop.w < 10 || crop.h < 14) {
    return cells.map(() => undefined)
  }

  return cells.map((cell, index) => (cell && boxes[index] ? cropCanvas(cell, crop) : undefined))
}

function createResidentAtlas(textures: Phaser.Textures.TextureManager): void {
  const sheets: Record<ResidentFacing, Record<ResidentGender, CanvasImageSource | undefined>> = {
    front: {
      male: sourceImage(textures, SRC_CHIBI_FRONT_MALE),
      female: sourceImage(textures, SRC_CHIBI_FRONT_FEMALE),
    },
    back: {
      male: sourceImage(textures, SRC_CHIBI_BACK_MALE),
      female: sourceImage(textures, SRC_CHIBI_BACK_FEMALE),
    },
  }
  const genders: ResidentGender[] = ['male', 'female']

  for (const [index, key] of RESIDENT_ATLAS_ORDER.entries()) {
    for (const facing of RESIDENT_FACINGS) {
      for (const gender of genders) {
        const sheet = sheets[facing][gender]
        const frames = sheet ? sliceChibiColumn(sheet, index) : []
        const painted = frames.length === RESIDENT_WALK_POSES.length && frames.every(Boolean)
        for (const [poseIndex, pose] of RESIDENT_WALK_POSES.entries()) {
          addCanvasTexture(
            textures,
            residentTextureKey(residentWalkTextureKey(key, pose, facing, gender)),
            painted ? frames[poseIndex]! : paintResidentCanvas(key, pose, facing, gender),
          )
        }
      }
    }
  }
}

function paintOccupancyBubble(ctx: CanvasRenderingContext2D, withPerson: boolean): void {
  disableSmooth(ctx)
  ctx.fillStyle = '#2a1810'
  ctx.fillRect(4, 1, 24, 18)
  ctx.fillRect(3, 2, 26, 16)
  ctx.fillRect(2, 4, 28, 12)
  ctx.fillStyle = '#fff6e4'
  ctx.fillRect(5, 2, 22, 16)
  ctx.fillRect(4, 3, 24, 14)
  ctx.fillRect(3, 5, 26, 10)
  ctx.fillStyle = '#2a1810'
  ctx.fillRect(14, 19, 5, 2)
  ctx.fillRect(15, 21, 4, 2)
  ctx.fillRect(16, 23, 3, 2)
  ctx.fillRect(17, 25, 2, 2)
  ctx.fillStyle = '#fff6e4'
  ctx.fillRect(15, 19, 3, 3)
  ctx.fillRect(16, 22, 2, 3)
  if (!withPerson) {
    return
  }
  ctx.fillStyle = '#2a1810'
  ctx.fillRect(13, 4, 6, 6)
  ctx.fillRect(12, 10, 8, 7)
  ctx.fillStyle = '#e8c090'
  ctx.fillRect(14, 5, 4, 4)
  ctx.fillStyle = '#3d5c8a'
  ctx.fillRect(13, 11, 6, 5)
}

function createOccupancyBubble(textures: Phaser.Textures.TextureManager): void {
  const withPerson = document.createElement('canvas')
  withPerson.width = 32
  withPerson.height = 28
  const personCtx = withPerson.getContext('2d')
  const empty = document.createElement('canvas')
  empty.width = 32
  empty.height = 28
  const emptyCtx = empty.getContext('2d')
  if (!personCtx || !emptyCtx) {
    return
  }

  paintOccupancyBubble(personCtx, true)
  paintOccupancyBubble(emptyCtx, false)
  addCanvasTexture(textures, OCCUPANCY_BUBBLE_KEY, withPerson)
  addCanvasTexture(textures, OCCUPANCY_BUBBLE_COUNT_KEY, empty)
}
