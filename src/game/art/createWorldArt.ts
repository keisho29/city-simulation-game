import type Phaser from 'phaser'
import {
  TILE_ART_PX,
  TILE_ART_SIZE,
  TILE_ATLAS_ORDER,
  TILE_SPRITES,
  TILES_NEEDING_GRASS,
  type TileAtlasKey,
  validateTileArt,
} from './tileArt.ts'
import {
  RESIDENT_ATLAS_ORDER,
  RESIDENT_FRAME_HEIGHT,
  RESIDENT_FRAME_WIDTH,
  RESIDENT_SPRITES,
  type ResidentAtlasKey,
  validateResidentArt,
} from './residentArt.ts'
import { paintPixels } from './pixelTexture.ts'

export const TILE_TEXTURE_KEY = 'tiles'
export const RESIDENT_TEXTURE_KEY = 'residents'
export const SRC_HOUSE = 'src-house'
export const SRC_FARM = 'src-farm'
export const SRC_SHOP = 'src-shop'
export const SRC_WORKSHOP = 'src-workshop'
export const SRC_TREE = 'src-tree'
export const SRC_PEOPLE = 'src-people'

type GridStamp = {
  sourceKey: string
  cols: number
  rows: number
  col: number
  row: number
  pad: number
  align: 'center' | 'bottom'
  fill: number
}

const FULL: Omit<GridStamp, 'sourceKey'> = {
  cols: 1,
  rows: 1,
  col: 0,
  row: 0,
  pad: 0,
  align: 'bottom',
  fill: 0.96,
}

const OVERLAYS: Partial<Record<TileAtlasKey, GridStamp>> = {
  house: { sourceKey: SRC_HOUSE, ...FULL },
  farm: { sourceKey: SRC_FARM, ...FULL, align: 'center', fill: 1 },
  shop: { sourceKey: SRC_SHOP, ...FULL },
  workshop: { sourceKey: SRC_WORKSHOP, ...FULL },
  tree: { sourceKey: SRC_TREE, ...FULL, fill: 0.94 },
  bush: { sourceKey: SRC_TREE, ...FULL, fill: 0.58 },
}

export function preloadWorldArt(scene: Phaser.Scene): void {
  scene.load.image(SRC_HOUSE, '/art/tile-house.png')
  scene.load.image(SRC_FARM, '/art/tile-farm.png')
  scene.load.image(SRC_SHOP, '/art/tile-shop.png')
  scene.load.image(SRC_WORKSHOP, '/art/tile-workshop.png')
  scene.load.image(SRC_TREE, '/art/tile-tree.png')
  scene.load.image(SRC_PEOPLE, '/art/tile-people.png')
}

export function createWorldArt(scene: Phaser.Scene): void {
  validateTileArt()
  validateResidentArt()
  createTileAtlas(scene.textures)
  createResidentAtlas(scene.textures)
}

function enableSmooth(ctx: CanvasRenderingContext2D): void {
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
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
  const magenta = r > 180 && b > 180 && g < 120
  const teal = b >= g && b >= r && b - r > 12 && r < 95 && g < 115
  const luma = 0.3 * r + 0.59 * g + 0.11 * b
  const bluishDark = luma < 58 && b >= r - 4 && b >= g - 8
  return magenta || teal || bluishDark
}

function punchBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const pixels = ctx.getImageData(0, 0, width, height)
  const data = pixels.data
  for (let i = 0; i < data.length; i += 4) {
    if (isBackdrop(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)) {
      data[i + 3] = 0
    }
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

  enableSmooth(ctx)
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
  return canvas
}

function overlaySprite(
  dest: CanvasRenderingContext2D,
  image: CanvasImageSource,
  stamp: GridStamp,
  destX: number,
  destY: number,
  destWidth: number,
  destHeight = destWidth,
): void {
  const cell = extractCell(image, stamp)
  if (!cell) {
    return
  }

  const ctx = cell.getContext('2d')
  if (!ctx) {
    return
  }

  const box = contentBox(ctx, cell.width, cell.height)
  if (!box) {
    return
  }

  const scale = Math.min((destWidth * stamp.fill) / box.w, (destHeight * stamp.fill) / box.h)
  const dw = Math.max(1, Math.round(box.w * scale))
  const dh = Math.max(1, Math.round(box.h * scale))
  const dx = destX + Math.round((destWidth - dw) / 2)
  const dy =
    stamp.align === 'bottom'
      ? destY + destHeight - dh
      : destY + Math.round((destHeight - dh) / 2)

  enableSmooth(dest)
  dest.drawImage(cell, box.x, box.y, box.w, box.h, dx, dy, dw, dh)
}

function paintSpriteScaled(
  ctx: CanvasRenderingContext2D,
  key: TileAtlasKey,
  originX: number,
): void {
  const scratch = document.createElement('canvas')
  scratch.width = TILE_ART_SIZE
  scratch.height = TILE_ART_SIZE
  const scratchCtx = scratch.getContext('2d')
  if (!scratchCtx) {
    return
  }

  paintPixels(scratchCtx, TILE_SPRITES[key], 1, 0, 0)
  enableSmooth(ctx)
  ctx.drawImage(scratch, originX, 0, TILE_ART_PX, TILE_ART_PX)
}

function fillTile(ctx: CanvasRenderingContext2D, key: TileAtlasKey, originX: number): void {
  if (key.startsWith('road-')) {
    paintSpriteScaled(ctx, key, originX)
    return
  }

  if (TILES_NEEDING_GRASS.has(key)) {
    paintSpriteScaled(ctx, 'grass-base', originX)
    return
  }

  paintSpriteScaled(ctx, key, originX)
}

function createTileAtlas(textures: Phaser.Textures.TextureManager): void {
  if (textures.exists(TILE_TEXTURE_KEY)) {
    textures.remove(TILE_TEXTURE_KEY)
  }

  const texture = textures.createCanvas(
    TILE_TEXTURE_KEY,
    TILE_ART_PX * TILE_ATLAS_ORDER.length,
    TILE_ART_PX,
  )
  if (!texture) {
    throw new Error('タイル絵のテクスチャを作れませんでした')
  }

  const ctx = texture.context
  enableSmooth(ctx)

  for (const [index, key] of TILE_ATLAS_ORDER.entries()) {
    const originX = index * TILE_ART_PX
    fillTile(ctx, key, originX)

    const stamp = OVERLAYS[key]
    const image = stamp ? sourceImage(textures, stamp.sourceKey) : undefined
    if (stamp && image) {
      overlaySprite(ctx, image, stamp, originX, 0, TILE_ART_PX, TILE_ART_PX)
    }

    texture.add(key, 0, originX, 0, TILE_ART_PX, TILE_ART_PX)
  }

  texture.refresh()
}

function createResidentAtlas(textures: Phaser.Textures.TextureManager): void {
  if (textures.exists(RESIDENT_TEXTURE_KEY)) {
    textures.remove(RESIDENT_TEXTURE_KEY)
  }

  const texture = textures.createCanvas(
    RESIDENT_TEXTURE_KEY,
    RESIDENT_FRAME_WIDTH * RESIDENT_ATLAS_ORDER.length,
    RESIDENT_FRAME_HEIGHT,
  )
  if (!texture) {
    throw new Error('住民の絵のテクスチャを作れませんでした')
  }

  const ctx = texture.context
  enableSmooth(ctx)
  const sheet = sourceImage(textures, SRC_PEOPLE)

  for (const [index, key] of RESIDENT_ATLAS_ORDER.entries()) {
    const originX = index * RESIDENT_FRAME_WIDTH
    if (sheet) {
      overlaySprite(
        ctx,
        sheet,
        {
          sourceKey: SRC_PEOPLE,
          cols: 6,
          rows: 1,
          col: index,
          row: 0,
          pad: 0.06,
          align: 'bottom',
          fill: 1,
        },
        originX,
        0,
        RESIDENT_FRAME_WIDTH,
        RESIDENT_FRAME_HEIGHT,
      )
    } else {
      const scratch = document.createElement('canvas')
      scratch.width = RESIDENT_SPRITES[key as ResidentAtlasKey].rows[0]?.length ?? 12
      scratch.height = RESIDENT_SPRITES[key as ResidentAtlasKey].rows.length
      const scratchCtx = scratch.getContext('2d')
      if (scratchCtx) {
        paintPixels(scratchCtx, RESIDENT_SPRITES[key as ResidentAtlasKey], 1, 0, 0)
        enableSmooth(ctx)
        ctx.drawImage(
          scratch,
          originX,
          RESIDENT_FRAME_HEIGHT - Math.round(scratch.height * 4),
          scratch.width * 4,
          scratch.height * 4,
        )
      }
    }
    texture.add(key, 0, originX, 0, RESIDENT_FRAME_WIDTH, RESIDENT_FRAME_HEIGHT)
  }

  texture.refresh()
}
