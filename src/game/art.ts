import Phaser from 'phaser'

function canvas(width: number, height: number): HTMLCanvasElement {
  const el = document.createElement('canvas')
  el.width = width
  el.height = height
  return el
}

function fill(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

function drawRunner(frame: 'runA' | 'runB' | 'jump' | 'slide' | 'dead'): HTMLCanvasElement {
  const wide = frame === 'slide' || frame === 'dead'
  const el = canvas(wide ? 22 : 16, 24)
  const ctx = el.getContext('2d')
  if (!ctx) return el

  const skin = '#f0c090'
  const hair = '#3a2410'
  const shirt = '#e07a28'
  const pants = '#2a3a68'
  const shoe = '#1a1420'
  const outline = '#0a0d18'

  if (frame === 'slide') {
    fill(ctx, outline, 1, 10, 20, 12)
    fill(ctx, shirt, 4, 12, 10, 6)
    fill(ctx, pants, 12, 13, 7, 5)
    fill(ctx, skin, 2, 11, 5, 5)
    fill(ctx, hair, 2, 10, 5, 2)
    fill(ctx, shoe, 17, 15, 4, 3)
    return el
  }

  if (frame === 'dead') {
    fill(ctx, outline, 1, 14, 20, 8)
    fill(ctx, shirt, 5, 16, 8, 4)
    fill(ctx, pants, 12, 16, 6, 4)
    fill(ctx, skin, 2, 15, 4, 4)
    fill(ctx, hair, 2, 14, 4, 2)
    return el
  }

  const legShift = frame === 'runB' ? 1 : 0
  const bodyY = frame === 'jump' ? 1 : 3

  fill(ctx, outline, 3, bodyY, 10, 18)
  fill(ctx, hair, 4, bodyY + 1, 8, 3)
  fill(ctx, skin, 5, bodyY + 3, 6, 4)
  fill(ctx, shirt, 4, bodyY + 7, 8, 6)
  fill(ctx, pants, 5, bodyY + 13, 6, 4)
  fill(ctx, shoe, 4 + legShift, bodyY + 17, 3, 3)
  fill(ctx, shoe, 9 - legShift, bodyY + (frame === 'jump' ? 16 : 17), 3, 3)
  if (frame === 'jump') fill(ctx, skin, 11, bodyY + 8, 3, 3)
  return el
}

function drawHurdle(): HTMLCanvasElement {
  const el = canvas(16, 18)
  const ctx = el.getContext('2d')
  if (!ctx) return el
  fill(ctx, '#0a0d18', 1, 4, 14, 14)
  fill(ctx, '#8a4a22', 2, 5, 12, 12)
  fill(ctx, '#c46a2a', 2, 5, 12, 3)
  fill(ctx, '#5a3014', 3, 9, 10, 2)
  fill(ctx, '#f2d27a', 6, 11, 4, 3)
  return el
}

function drawBar(): HTMLCanvasElement {
  const el = canvas(28, 40)
  const ctx = el.getContext('2d')
  if (!ctx) return el
  fill(ctx, '#0a0d18', 2, 0, 24, 36)
  fill(ctx, '#6a7088', 3, 0, 22, 34)
  fill(ctx, '#d8dce8', 4, 28, 20, 6)
  fill(ctx, '#f2d27a', 5, 30, 18, 2)
  return el
}

function drawGround(): HTMLCanvasElement {
  const el = canvas(32, 16)
  const ctx = el.getContext('2d')
  if (!ctx) return el
  fill(ctx, '#3a2a18', 0, 0, 32, 16)
  fill(ctx, '#5a3a20', 0, 0, 32, 4)
  fill(ctx, '#2a1c10', 4, 7, 6, 3)
  fill(ctx, '#2a1c10', 18, 10, 8, 2)
  fill(ctx, '#6a4a28', 10, 3, 5, 2)
  return el
}

export function registerRunnerArt(textures: Phaser.Textures.TextureManager) {
  const frames = {
    'runner-run-a': drawRunner('runA'),
    'runner-run-b': drawRunner('runB'),
    'runner-jump': drawRunner('jump'),
    'runner-slide': drawRunner('slide'),
    'runner-dead': drawRunner('dead'),
    hurdle: drawHurdle(),
    bar: drawBar(),
    ground: drawGround(),
  } as const

  for (const [key, el] of Object.entries(frames)) {
    if (textures.exists(key)) textures.remove(key)
    textures.addCanvas(key, el)
  }
}
