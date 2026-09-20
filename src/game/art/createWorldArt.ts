import Phaser from 'phaser'
import { hash32, paintPixels } from './pixelTexture.ts'
import { TILE_ART_PX, TILE_ART_SIZE, TILE_SPRITES, type TileAtlasKey, validateTileArt } from './tileArt.ts'
import {
  RESIDENT_ATLAS_ORDER,
  RESIDENT_SPRITES,
  type ResidentAtlasKey,
  validateResidentArt,
} from './residentArt.ts'

export const TILE_TEXTURE_KEY = 'tiles'
export const ROAD_TEXTURE_KEY = 'roads'
export const RAIL_TEXTURE_KEY = 'rails'
export const WATER_TEXTURE_KEY = 'waters'
export const GRASS_TEXTURE_KEY = 'grass-field'
export const TRAIN_TEXTURE_KEY = 'vehicle-train'
export const BOAT_TEXTURE_KEY = 'vehicle-boat'

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
  bush: 'prop-bush',
  flower: 'prop-flower',
  rock: 'prop-rock',
}

export const GRASS_CELL_PX = 32

const SRC_HOUSE = 'src-house'
const SRC_FARM = 'src-farm'
const SRC_SHOP = 'src-shop'
const SRC_WORKSHOP = 'src-workshop'
const SRC_TREE = 'src-tree'
const SRC_PEOPLE = 'src-people'
const SRC_GRASS = 'src-grass'
const SRC_DIRT = 'src-dirt'

const ROAD_FRAME = 32
const ROAD_COUNT = 16

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
  scene.load.image(SRC_HOUSE, '/art/tile-house.png')
  scene.load.image(SRC_FARM, '/art/tile-farm.png')
  scene.load.image(SRC_SHOP, '/art/tile-shop.png')
  scene.load.image(SRC_WORKSHOP, '/art/tile-workshop.png')
  scene.load.image(SRC_TREE, '/art/tile-tree.png')
  scene.load.image(SRC_PEOPLE, '/art/tile-people.png')
  scene.load.image(SRC_GRASS, '/art/tile-grass.png')
  scene.load.image(SRC_DIRT, '/art/tile-dirt.png')
}

export function createWorldArt(scene: Phaser.Scene): void {
  validateTileArt()
  validateResidentArt()
  createGrassField(scene.textures)
  createPropTexture(scene.textures, PROP_TEXTURE.house, SRC_HOUSE)
  createPropTexture(scene.textures, PROP_TEXTURE.farm, SRC_FARM)
  createPropTexture(scene.textures, PROP_TEXTURE.shop, SRC_SHOP)
  createPropTexture(scene.textures, PROP_TEXTURE.workshop, SRC_WORKSHOP)
  createPropTexture(scene.textures, PROP_TEXTURE.market, '')
  createPropTexture(scene.textures, PROP_TEXTURE.well, '')
  createPropTexture(scene.textures, PROP_TEXTURE.warehouse, '')
  createPropTexture(scene.textures, PROP_TEXTURE.clinic, '')
  createPropTexture(scene.textures, PROP_TEXTURE.school, '')
  createPropTexture(scene.textures, PROP_TEXTURE.factory, '')
  createPropTexture(scene.textures, PROP_TEXTURE.station, '')
  createPropTexture(scene.textures, PROP_TEXTURE.port, '')
  createPropTexture(scene.textures, PROP_TEXTURE.airport, '')
  createTreeTextures(scene.textures)
  createFlowerTexture(scene.textures)
  createPropTexture(scene.textures, PROP_TEXTURE.rock, '')
  createRoadAtlas(scene.textures)
  createRailAtlas(scene.textures)
  createWaterAtlas(scene.textures)
  createVehicleTextures(scene.textures)
  createResidentAtlas(scene.textures)
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

function isBackdrop(r: number, g: number, b: number): boolean {
  const magenta = r > 120 && b > 90 && g < 170 && r - g > 18 && b - g > 8
  const magentaFringe = r > 200 && b > 190 && g < 110
  const hotPink = r > 190 && b > 70 && g < 150 && r > g + 30
  const teal = b >= g && b >= r && b - r > 12 && r < 95 && g < 115
  const luma = 0.3 * r + 0.59 * g + 0.11 * b
  const bluishDark = luma < 58 && b >= r - 4 && b >= g - 8
  const chroma = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b))
  const paper = luma > 236 && chroma < 16
  return magenta || magentaFringe || hotPink || teal || bluishDark || paper
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

function punchBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const pixels = ctx.getImageData(0, 0, width, height)
  const data = pixels.data
  const at = (x: number, y: number) => (y * width + x) * 4

  for (let i = 0; i < data.length; i += 4) {
    if (isBackdrop(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)) {
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
    if (sa >= 16 && !isBackdrop(sr, sg, sb)) {
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
      if (!isBackdrop(r, g, b) && colorDistance(r, g, b, sr, sg, sb) > 64) {
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
  punchBackdrop(ctx, width, height)
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

function pixelate(canvas: HTMLCanvasElement, maxEdge: number): HTMLCanvasElement {
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

function posterize(canvas: HTMLCanvasElement, steps = 9): HTMLCanvasElement {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx || steps < 2) {
    return canvas
  }

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = pixels.data
  const quant = 255 / (steps - 1)
  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 0) < 20) {
      data[i + 3] = 0
      continue
    }
    data[i] = Math.round((data[i] ?? 0) / quant) * quant
    data[i + 1] = Math.round((data[i + 1] ?? 0) / quant) * quant
    data[i + 2] = Math.round((data[i + 2] ?? 0) / quant) * quant
    data[i + 3] = 255
  }
  ctx.putImageData(pixels, 0, 0)
  return canvas
}

function outlinePixels(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const srcCtx = canvas.getContext('2d', { willReadFrequently: true })
  if (!srcCtx) {
    return canvas
  }

  const src = srcCtx.getImageData(0, 0, canvas.width, canvas.height).data
  const width = canvas.width + 2
  const height = canvas.height + 2
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const ctx = out.getContext('2d', { alpha: true })
  if (!ctx) {
    return canvas
  }

  const dest = ctx.createImageData(width, height)
  const data = dest.data
  const at = (x: number, y: number) => (y * width + x) * 4
  const srcAt = (x: number, y: number) => (y * canvas.width + x) * 4
  const opaque = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
      return false
    }
    return (src[srcAt(x, y) + 3] ?? 0) >= 20
  }

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (!opaque(x, y)) {
        continue
      }
      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ]
      for (const [nx, ny] of neighbors) {
        if (opaque(nx, ny)) {
          continue
        }
        const i = at(x + 1 + ((nx ?? x) - x), y + 1 + ((ny ?? y) - y))
        data[i] = 42
        data[i + 1] = 28
        data[i + 2] = 16
        data[i + 3] = 255
      }
    }
  }

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const i = srcAt(x, y)
      if ((src[i + 3] ?? 0) < 20) {
        continue
      }
      const o = at(x + 1, y + 1)
      data[o] = src[i] ?? 0
      data[o + 1] = src[i + 1] ?? 0
      data[o + 2] = src[i + 2] ?? 0
      data[o + 3] = 255
    }
  }

  ctx.putImageData(dest, 0, 0)
  return out
}

function crunchPixels(canvas: HTMLCanvasElement, maxEdge: number): HTMLCanvasElement {
  return outlinePixels(posterize(pixelate(canvas, maxEdge)))
}

function paintPixelGrass(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  size: number,
  seed: number,
): void {
  const colors = ['#c4ee52', '#a8dc3c', '#96d034', '#b4e646', '#88c82c', '#d0f060']
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const n = hash32(seed * 997 + x * 31 + y * 17) >>> 0
      ctx.fillStyle = colors[n % colors.length] ?? '#a8dc3c'
      ctx.fillRect(originX + x, originY + y, 1, 1)
    }
  }

  ctx.fillStyle = '#6aa820'
  ctx.fillRect(originX, originY, size, 1)
  ctx.fillRect(originX, originY, 1, size)
}

function paintCobble(ctx: CanvasRenderingContext2D, size: number, seed: number): void {
  const colors = ['#eeeae0', '#e4e0d4', '#dcd6c8', '#f2eee4', '#d0ccc0']
  const stone = 4
  for (let y = 0; y < size; y += stone) {
    for (let x = 0; x < size; x += stone) {
      const n = hash32(seed + x * 13 + y * 29) >>> 0
      ctx.fillStyle = colors[n % colors.length] ?? '#e4e0d4'
      ctx.fillRect(x, y, stone, stone)
    }
  }

  ctx.fillStyle = '#c4c0b4'
  for (let i = 0; i <= size; i += stone) {
    ctx.fillRect(0, i, size, 1)
    ctx.fillRect(i, 0, 1, size)
  }
}

function createGrassField(textures: Phaser.Textures.TextureManager): void {
  const canvas = document.createElement('canvas')
  canvas.width = GRASS_CELL_PX * 2
  canvas.height = GRASS_CELL_PX * 2
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('芝生のテクスチャを作れませんでした')
  }

  disableSmooth(ctx)
  paintPixelGrass(ctx, 0, 0, GRASS_CELL_PX, 11)
  paintPixelGrass(ctx, GRASS_CELL_PX, 0, GRASS_CELL_PX, 23)
  paintPixelGrass(ctx, 0, GRASS_CELL_PX, GRASS_CELL_PX, 37)
  paintPixelGrass(ctx, GRASS_CELL_PX, GRASS_CELL_PX, GRASS_CELL_PX, 53)
  addCanvasTexture(textures, GRASS_TEXTURE_KEY, canvas)
}

function createPropTexture(
  textures: Phaser.Textures.TextureManager,
  key: string,
  sourceKey: string,
): void {
  const image = sourceImage(textures, sourceKey)
  const punched = image ? punchImage(image, false) : undefined
  if (punched) {
    addCanvasTexture(textures, key, crunchPixels(punched, 52))
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
  if (image) {
    const green = extractCell(image, {
      sourceKey: SRC_TREE,
      cols: 2,
      rows: 1,
      col: 0,
      row: 0,
      pad: 0.04,
      align: 'bottom',
      fill: 1,
      edgePunch: false,
    })
    const sakura = extractCell(image, {
      sourceKey: SRC_TREE,
      cols: 2,
      rows: 1,
      col: 1,
      row: 0,
      pad: 0.04,
      align: 'bottom',
      fill: 1,
      edgePunch: false,
    })
    if (green) {
      addCanvasTexture(textures, PROP_TEXTURE.bush, crunchPixels(cropToContent(green), 48))
    }
    if (sakura) {
      addCanvasTexture(textures, PROP_TEXTURE.tree, crunchPixels(cropToContent(sakura), 48))
    }
    if (green && sakura) {
      return
    }
  }

  createPropTexture(textures, PROP_TEXTURE.tree, SRC_TREE)
  if (!textures.exists(PROP_TEXTURE.bush)) {
    createPropTexture(textures, PROP_TEXTURE.bush, SRC_TREE)
  }
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

function createRoadAtlas(textures: Phaser.Textures.TextureManager): void {
  const canvas = document.createElement('canvas')
  canvas.width = ROAD_FRAME * ROAD_COUNT
  canvas.height = ROAD_FRAME
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) {
    throw new Error('道のテクスチャを作れませんでした')
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  disableSmooth(ctx)

  for (let mask = 0; mask < ROAD_COUNT; mask += 1) {
    const stamp = document.createElement('canvas')
    stamp.width = ROAD_FRAME
    stamp.height = ROAD_FRAME
    const stampCtx = stamp.getContext('2d', { alpha: true })
    if (!stampCtx) {
      continue
    }
    disableSmooth(stampCtx)
    paintCobble(stampCtx, ROAD_FRAME, mask * 17)
    ctx.drawImage(stamp, mask * ROAD_FRAME, 0)
  }

  if (textures.exists(ROAD_TEXTURE_KEY)) {
    textures.remove(ROAD_TEXTURE_KEY)
  }
  const texture = textures.addCanvas(ROAD_TEXTURE_KEY, canvas)
  if (!texture) {
    throw new Error('道のテクスチャを作れませんでした')
  }
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST)
  for (let mask = 0; mask < ROAD_COUNT; mask += 1) {
    texture.add(`road-${mask}`, 0, mask * ROAD_FRAME, 0, ROAD_FRAME, ROAD_FRAME)
  }
  texture.refresh()
}

function createRailAtlas(textures: Phaser.Textures.TextureManager): void {
  const canvas = document.createElement('canvas')
  canvas.width = ROAD_FRAME * ROAD_COUNT
  canvas.height = ROAD_FRAME
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) {
    throw new Error('線路のテクスチャを作れませんでした')
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  disableSmooth(ctx)

  for (let mask = 0; mask < ROAD_COUNT; mask += 1) {
    const sprite = TILE_SPRITES[`rail-${mask}` as TileAtlasKey]
    const stamp = document.createElement('canvas')
    stamp.width = TILE_ART_SIZE
    stamp.height = TILE_ART_SIZE
    const stampCtx = stamp.getContext('2d', { alpha: true })
    if (!stampCtx) {
      continue
    }
    paintPixels(stampCtx, sprite, 1, 0, 0)
    ctx.drawImage(stamp, 0, 0, TILE_ART_SIZE, TILE_ART_SIZE, mask * ROAD_FRAME, 0, ROAD_FRAME, ROAD_FRAME)
  }

  if (textures.exists(RAIL_TEXTURE_KEY)) {
    textures.remove(RAIL_TEXTURE_KEY)
  }
  const texture = textures.addCanvas(RAIL_TEXTURE_KEY, canvas)
  if (!texture) {
    throw new Error('線路のテクスチャを作れませんでした')
  }
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST)
  for (let mask = 0; mask < ROAD_COUNT; mask += 1) {
    texture.add(`rail-${mask}`, 0, mask * ROAD_FRAME, 0, ROAD_FRAME, ROAD_FRAME)
  }
  texture.refresh()
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

function createWaterAtlas(textures: Phaser.Textures.TextureManager): void {
  const frames = ['water', 'river'] as const
  const canvas = document.createElement('canvas')
  canvas.width = ROAD_FRAME * frames.length
  canvas.height = ROAD_FRAME
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) {
    throw new Error('水面のテクスチャを作れませんでした')
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  disableSmooth(ctx)

  for (const [index, key] of frames.entries()) {
    const sprite = TILE_SPRITES[key]
    const stamp = document.createElement('canvas')
    stamp.width = TILE_ART_SIZE
    stamp.height = TILE_ART_SIZE
    const stampCtx = stamp.getContext('2d', { alpha: true })
    if (!stampCtx) {
      continue
    }
    paintPixels(stampCtx, sprite, 1, 0, 0)
    ctx.drawImage(stamp, 0, 0, TILE_ART_SIZE, TILE_ART_SIZE, index * ROAD_FRAME, 0, ROAD_FRAME, ROAD_FRAME)
  }

  if (textures.exists(WATER_TEXTURE_KEY)) {
    textures.remove(WATER_TEXTURE_KEY)
  }
  const texture = textures.addCanvas(WATER_TEXTURE_KEY, canvas)
  if (!texture) {
    throw new Error('水面のテクスチャを作れませんでした')
  }
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST)
  for (const [index, key] of frames.entries()) {
    texture.add(key, 0, index * ROAD_FRAME, 0, ROAD_FRAME, ROAD_FRAME)
  }
  texture.refresh()
}

function createResidentAtlas(textures: Phaser.Textures.TextureManager): void {
  const sheet = sourceImage(textures, SRC_PEOPLE)
  const peopleCount = RESIDENT_ATLAS_ORDER.length

  for (const [index, key] of RESIDENT_ATLAS_ORDER.entries()) {
    const textureKey = residentTextureKey(key)
    if (sheet) {
      const cell = extractCell(sheet, {
        sourceKey: SRC_PEOPLE,
        cols: peopleCount,
        rows: 1,
        col: index,
        row: 0,
        pad: 0,
        align: 'bottom',
        fill: 1,
        edgePunch: false,
      })
      if (cell) {
        addCanvasTexture(textures, textureKey, crunchPixels(cropToContent(cell), 22))
        continue
      }
    }

    const sprite = RESIDENT_SPRITES[key as ResidentAtlasKey]
    const source = document.createElement('canvas')
    source.width = sprite.rows[0]?.length ?? 12
    source.height = sprite.rows.length
    const sourceCtx = source.getContext('2d')
    if (!sourceCtx) {
      continue
    }
    paintPixels(sourceCtx, sprite, 1, 0, 0)
    addCanvasTexture(textures, textureKey, source)
  }
}
