import type { PixelSprite } from './pixelTexture.ts'

export class PixelCanvas {
  readonly width: number
  readonly height: number
  readonly cells: string[][]

  constructor(width: number, height: number, fill = '.') {
    this.width = width
    this.height = height
    this.cells = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => fill),
    )
  }

  static fromSprite(sprite: PixelSprite): PixelCanvas {
    const height = sprite.rows.length
    const width = sprite.rows[0]?.length ?? 0
    const canvas = new PixelCanvas(width, height)
    for (let y = 0; y < height; y += 1) {
      const row = sprite.rows[y]
      for (let x = 0; x < width; x += 1) {
        canvas.cells[y][x] = row[x] ?? '.'
      }
    }
    return canvas
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height
  }

  set(x: number, y: number, ch: string): void {
    const ix = Math.round(x)
    const iy = Math.round(y)
    if (this.inBounds(ix, iy)) {
      this.cells[iy][ix] = ch
    }
  }

  fillRect(x: number, y: number, width: number, height: number, ch: string): void {
    for (let yy = y; yy < y + height; yy += 1) {
      for (let xx = x; xx < x + width; xx += 1) {
        this.set(xx, yy, ch)
      }
    }
  }

  fillCircle(cx: number, cy: number, radius: number, ch: string): void {
    const r2 = radius * radius
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) {
          this.set(x, y, ch)
        }
      }
    }
  }

  toSprite(palette: PixelSprite['palette']): PixelSprite {
    return {
      palette,
      rows: this.cells.map((row) => row.join('')),
    }
  }
}
