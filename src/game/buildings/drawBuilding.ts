import type Phaser from 'phaser'
import { TileType } from '../map/tile.ts'

type Graphics = Phaser.GameObjects.Graphics

export function drawBuilding(
  graphics: Graphics,
  tileX: number,
  tileY: number,
  tileSize: number,
  type: TileType,
  alpha = 1,
): void {
  switch (type) {
    case TileType.House:
      drawWoodenHouse(graphics, tileX, tileY, tileSize, alpha)
      return
    case TileType.Road:
      drawRoad(graphics, tileX, tileY, tileSize, alpha)
      return
    case TileType.Farm:
      drawFarm(graphics, tileX, tileY, tileSize, alpha)
      return
    case TileType.Shop:
      drawShop(graphics, tileX, tileY, tileSize, alpha)
      return
    case TileType.Workshop:
      drawWorkshop(graphics, tileX, tileY, tileSize, alpha)
      return
    default:
      return
  }
}

function drawWoodenHouse(
  graphics: Graphics,
  tileX: number,
  tileY: number,
  tileSize: number,
  alpha: number,
): void {
  const { x, y, inset } = tileBox(tileX, tileY, tileSize)

  graphics.fillStyle(0x8a5a32, alpha)
  graphics.fillRect(x + inset, y + inset, tileSize - inset * 2, tileSize - inset * 2)

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

function drawRoad(
  graphics: Graphics,
  tileX: number,
  tileY: number,
  tileSize: number,
  alpha: number,
): void {
  const { x, y, inset } = tileBox(tileX, tileY, tileSize)

  graphics.fillStyle(0x8d7a5c, alpha)
  graphics.fillRect(x + inset, y + inset, tileSize - inset * 2, tileSize - inset * 2)

  const strip = Math.max(4, tileSize * 0.34)
  graphics.fillStyle(0xc4b089, alpha)
  graphics.fillRect(x + (tileSize - strip) / 2, y + inset, strip, tileSize - inset * 2)
  graphics.fillRect(x + inset, y + (tileSize - strip) / 2, tileSize - inset * 2, strip)
}

function drawFarm(
  graphics: Graphics,
  tileX: number,
  tileY: number,
  tileSize: number,
  alpha: number,
): void {
  const { x, y, inset } = tileBox(tileX, tileY, tileSize)

  graphics.fillStyle(0x5c4328, alpha)
  graphics.fillRect(x + inset, y + inset, tileSize - inset * 2, tileSize - inset * 2)

  graphics.fillStyle(0xe0c04a, alpha)
  const rows = 4
  const rowHeight = Math.max(2, (tileSize - inset * 2) / (rows * 2))
  for (let i = 0; i < rows; i += 1) {
    graphics.fillRect(
      x + inset * 2,
      y + inset * 2 + i * rowHeight * 2,
      tileSize - inset * 4,
      rowHeight,
    )
  }
}

function drawShop(
  graphics: Graphics,
  tileX: number,
  tileY: number,
  tileSize: number,
  alpha: number,
): void {
  const { x, y, inset } = tileBox(tileX, tileY, tileSize)

  graphics.fillStyle(0xa56b3c, alpha)
  graphics.fillRect(
    x + inset,
    y + tileSize * 0.38,
    tileSize - inset * 2,
    tileSize * 0.5,
  )

  graphics.fillStyle(0xb23b2a, alpha)
  graphics.fillTriangle(
    x + inset * 0.5,
    y + tileSize * 0.42,
    x + tileSize / 2,
    y + inset,
    x + tileSize - inset * 0.5,
    y + tileSize * 0.42,
  )

  graphics.fillStyle(0xf0d9a0, alpha)
  graphics.fillRect(
    x + tileSize * 0.28,
    y + tileSize * 0.52,
    tileSize * 0.44,
    tileSize * 0.22,
  )
}

function drawWorkshop(
  graphics: Graphics,
  tileX: number,
  tileY: number,
  tileSize: number,
  alpha: number,
): void {
  const { x, y, inset } = tileBox(tileX, tileY, tileSize)

  graphics.fillStyle(0x5b4a3a, alpha)
  graphics.fillRect(x + inset, y + inset * 2, tileSize - inset * 2, tileSize - inset * 3)

  graphics.fillStyle(0x3f3328, alpha)
  graphics.fillRect(x + inset, y + inset * 2, tileSize - inset * 2, tileSize * 0.16)

  graphics.fillStyle(0x6a5140, alpha)
  const chimney = Math.max(3, tileSize * 0.16)
  graphics.fillRect(x + tileSize * 0.68, y + inset * 0.4, chimney, tileSize * 0.28)

  graphics.fillStyle(0x2b2118, alpha)
  graphics.fillRect(
    x + tileSize * 0.38,
    y + tileSize * 0.55,
    tileSize * 0.24,
    tileSize * 0.28,
  )
}

function tileBox(tileX: number, tileY: number, tileSize: number) {
  return {
    x: tileX * tileSize,
    y: tileY * tileSize,
    inset: Math.max(1, Math.round(tileSize * 0.06)),
  }
}
