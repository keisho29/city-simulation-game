import Phaser from 'phaser'

export const TERRAIN_TEXTURE_KEY = 'iso-terrain'

const FRAME_W = 128
const FRAME_H = 64
const ROAD_COUNT = 16

const GRASS = '#b6e66a'
const FOREST = '#7cc44e'
const STONE = '#c8c4b8'
const HILL = '#a8c86a'
const FERTILE = '#d4e05a'
const WATER = '#5ec8f0'
const RIVER = '#4eb8e8'
const ROAD = '#2e2e36'
const ROAD_EDGE = '#1a1a20'
const ROAD_LINE = '#f4f4f4'
const WOOD = '#c4a06a'
const WOOD_EDGE = '#8a6238'
const RAIL = '#9aa0a8'
const RAIL_TIE = '#6a5a48'
const RAIL_STEEL = '#e8eaee'

function disableSmooth(ctx: CanvasRenderingContext2D): void {
  ctx.imageSmoothingEnabled = false
}

function fillIsoDiamond(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  fill: string,
): void {
  ctx.beginPath()
  ctx.moveTo(originX + FRAME_W / 2, originY + 0.6)
  ctx.lineTo(originX + FRAME_W - 0.6, originY + FRAME_H / 2)
  ctx.lineTo(originX + FRAME_W / 2, originY + FRAME_H - 0.6)
  ctx.lineTo(originX + 0.6, originY + FRAME_H / 2)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

function isoArm(dir: number, width: number, height: number): { x: number; y: number } {
  const cx = width / 2
  const cy = height / 2
  const hw = width / 2
  const hh = height / 2
  if (dir === 1) {
    return { x: cx + hw, y: cy - hh }
  }
  if (dir === 2) {
    return { x: cx + hw, y: cy + hh }
  }
  if (dir === 4) {
    return { x: cx - hw, y: cy + hh }
  }
  return { x: cx - hw, y: cy - hh }
}

function connectedDirs(mask: number): number[] {
  const bits = [1, 2, 4, 8]
  const on = bits.filter((bit) => (mask & bit) !== 0)
  return on.length > 0 ? on : bits
}

function paintIsoNetwork(
  ctx: CanvasRenderingContext2D,
  mask: number,
  kind: 'road' | 'rail' | 'bridge',
): void {
  const cx = FRAME_W / 2
  const cy = FRAME_H / 2
  const stub = mask === 0
  const dirs = connectedDirs(mask)

  if (kind === 'bridge') {
    fillIsoDiamond(ctx, 0, 0, RIVER)
  } else {
    fillIsoDiamond(ctx, 0, 0, GRASS)
  }

  const drawArms = (color: string, width: number, dash: number[] = []) => {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.setLineDash(dash)
    if (stub) {
      ctx.beginPath()
      ctx.moveTo(cx - 10, cy)
      ctx.lineTo(cx + 10, cy)
      ctx.stroke()
      ctx.setLineDash([])
      return
    }
    for (const dir of dirs) {
      const edge = isoArm(dir, FRAME_W, FRAME_H)
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(edge.x, edge.y)
      ctx.stroke()
    }
    ctx.setLineDash([])
  }

  if (kind === 'road') {
    drawArms(ROAD_EDGE, 18)
    drawArms(ROAD, 14)
    drawArms(ROAD_LINE, 2, [8, 7])
    return
  }

  if (kind === 'bridge') {
    drawArms(WOOD_EDGE, 16)
    drawArms(WOOD, 12)
    drawArms('#6a4424', 1.6, [5, 4])
    return
  }

  drawArms(RAIL_TIE, 13)
  drawArms(RAIL, 7)
  drawArms(RAIL_STEEL, 2.2)
}

function addAtlas(
  textures: Phaser.Textures.TextureManager,
  key: string,
  canvas: HTMLCanvasElement,
  frames: Array<{ name: string; x: number; y: number; w: number; h: number }>,
): void {
  if (textures.exists(key)) {
    textures.remove(key)
  }
  const texture = textures.addCanvas(key, canvas)
  if (!texture) {
    throw new Error(`${key} のテクスチャを作れませんでした`)
  }
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST)
  for (const frame of frames) {
    texture.add(frame.name, 0, frame.x, frame.y, frame.w, frame.h)
  }
  texture.refresh()
}

export function createIsoTerrainAtlas(textures: Phaser.Textures.TextureManager): void {
  const names = ['grass-0', 'grass-1', 'grass-2', 'forest', 'stone', 'fertile', 'hill'] as const
  const fills: Record<(typeof names)[number], string> = {
    'grass-0': GRASS,
    'grass-1': GRASS,
    'grass-2': GRASS,
    forest: FOREST,
    stone: STONE,
    fertile: FERTILE,
    hill: HILL,
  }
  const canvas = document.createElement('canvas')
  canvas.width = FRAME_W * names.length
  canvas.height = FRAME_H
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) {
    throw new Error('地形のテクスチャを作れませんでした')
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  disableSmooth(ctx)
  names.forEach((name, index) => {
    fillIsoDiamond(ctx, index * FRAME_W, 0, fills[name])
  })
  addAtlas(
    textures,
    TERRAIN_TEXTURE_KEY,
    canvas,
    names.map((name, index) => ({
      name,
      x: index * FRAME_W,
      y: 0,
      w: FRAME_W,
      h: FRAME_H,
    })),
  )
}

function createNetworkAtlas(
  textures: Phaser.Textures.TextureManager,
  key: string,
  kind: 'road' | 'rail' | 'bridge',
  label: string,
): void {
  const canvas = document.createElement('canvas')
  canvas.width = FRAME_W * ROAD_COUNT
  canvas.height = FRAME_H
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) {
    throw new Error(`${label}のテクスチャを作れませんでした`)
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  disableSmooth(ctx)

  for (let mask = 0; mask < ROAD_COUNT; mask += 1) {
    const stamp = document.createElement('canvas')
    stamp.width = FRAME_W
    stamp.height = FRAME_H
    const stampCtx = stamp.getContext('2d', { alpha: true })
    if (!stampCtx) {
      continue
    }
    disableSmooth(stampCtx)
    paintIsoNetwork(stampCtx, mask, kind)
    ctx.drawImage(stamp, mask * FRAME_W, 0)
  }

  addAtlas(
    textures,
    key,
    canvas,
    Array.from({ length: ROAD_COUNT }, (_, mask) => ({
      name: `${kind}-${mask}`,
      x: mask * FRAME_W,
      y: 0,
      w: FRAME_W,
      h: FRAME_H,
    })),
  )
}

export function createIsoRoadAtlas(textures: Phaser.Textures.TextureManager): void {
  createNetworkAtlas(textures, 'roads', 'road', '道')
}

export function createIsoRailAtlas(textures: Phaser.Textures.TextureManager): void {
  createNetworkAtlas(textures, 'rails', 'rail', '線路')
}

export function createIsoWaterAtlas(textures: Phaser.Textures.TextureManager): void {
  const names = ['water', 'river'] as const
  const canvas = document.createElement('canvas')
  canvas.width = FRAME_W * names.length
  canvas.height = FRAME_H
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) {
    throw new Error('水面のテクスチャを作れませんでした')
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  disableSmooth(ctx)
  fillIsoDiamond(ctx, 0, 0, WATER)
  fillIsoDiamond(ctx, FRAME_W, 0, RIVER)
  addAtlas(
    textures,
    'waters',
    canvas,
    names.map((name, index) => ({
      name,
      x: index * FRAME_W,
      y: 0,
      w: FRAME_W,
      h: FRAME_H,
    })),
  )
}

export function createIsoBridgeAtlas(textures: Phaser.Textures.TextureManager): void {
  createNetworkAtlas(textures, 'bridges', 'bridge', '橋')
}
