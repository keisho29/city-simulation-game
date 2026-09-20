import type Phaser from 'phaser'

export function drawWoodenHouse(
  graphics: Phaser.GameObjects.Graphics,
  tileX: number,
  tileY: number,
  tileSize: number,
  alpha = 1,
): void {
  const x = tileX * tileSize
  const y = tileY * tileSize
  const inset = Math.max(1, Math.round(tileSize * 0.06))

  graphics.fillStyle(0x8a5a32, alpha)
  graphics.fillRect(
    x + inset,
    y + inset,
    tileSize - inset * 2,
    tileSize - inset * 2,
  )

  graphics.fillStyle(0xb08958, alpha)
  graphics.fillRect(
    x + inset * 2,
    y + tileSize * 0.42,
    tileSize - inset * 4,
    tileSize * 0.42,
  )

  graphics.fillStyle(0x6e3b28, alpha)
  graphics.fillTriangle(
    x + inset,
    y + tileSize * 0.46,
    x + tileSize / 2,
    y + inset,
    x + tileSize - inset,
    y + tileSize * 0.46,
  )

  graphics.fillStyle(0x4a2a1a, alpha)
  const doorWidth = Math.max(3, tileSize * 0.18)
  const doorHeight = Math.max(4, tileSize * 0.26)
  graphics.fillRect(
    x + tileSize / 2 - doorWidth / 2,
    y + tileSize - inset * 2 - doorHeight,
    doorWidth,
    doorHeight,
  )
}
