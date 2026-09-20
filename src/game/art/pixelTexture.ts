type Palette = Record<string, number | null>

export type PixelSprite = {
  palette: Palette
  rows: string[]
}

export function hexCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

export function assertSprite(sprite: PixelSprite, width: number, height: number, label: string): void {
  if (sprite.rows.length !== height) {
    throw new Error(`${label} の高さが ${sprite.rows.length} で、${height} ではありません`)
  }

  for (let y = 0; y < sprite.rows.length; y += 1) {
    const row = sprite.rows[y]
    if (row.length !== width) {
      throw new Error(`${label} の ${y} 行目が ${row.length} 文字です`)
    }

    for (const ch of row) {
      if (!(ch in sprite.palette)) {
        throw new Error(`${label} に未知の画素 '${ch}' があります`)
      }
    }
  }
}

export function paintPixels(
  ctx: CanvasRenderingContext2D,
  sprite: PixelSprite,
  scale: number,
  originX = 0,
  originY = 0,
): void {
  ctx.imageSmoothingEnabled = false

  for (let y = 0; y < sprite.rows.length; y += 1) {
    const row = sprite.rows[y]
    for (let x = 0; x < row.length; x += 1) {
      const color = sprite.palette[row[x]]
      if (color == null) {
        continue
      }

      ctx.fillStyle = hexCss(color)
      ctx.fillRect(originX + x * scale, originY + y * scale, scale, scale)
    }
  }
}

export function hash32(value: number): number {
  let n = value | 0
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d)
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b)
  return (n ^ (n >>> 16)) >>> 0
}
