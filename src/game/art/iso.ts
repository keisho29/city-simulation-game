export const ISO_TILE_WIDTH = 64
export const ISO_TILE_HEIGHT = 32
export const ISO_HALF_W = ISO_TILE_WIDTH / 2
export const ISO_HALF_H = ISO_TILE_HEIGHT / 2

export function isoOriginX(mapHeight: number): number {
  return mapHeight * ISO_HALF_W
}

export function isoOriginY(): number {
  return ISO_HALF_H
}

export function isoTileCenter(
  x: number,
  y: number,
  _mapWidth: number,
  mapHeight: number,
): { x: number; y: number } {
  return {
    x: isoOriginX(mapHeight) + (x - y) * ISO_HALF_W,
    y: isoOriginY() + (x + y) * ISO_HALF_H,
  }
}

export function isoMapWidth(mapWidth: number, mapHeight: number): number {
  return (mapWidth + mapHeight) * ISO_HALF_W
}

export function isoMapHeight(mapWidth: number, mapHeight: number): number {
  return isoOriginY() + (mapWidth + mapHeight) * ISO_HALF_H
}

export function isoWorldToTile(
  worldX: number,
  worldY: number,
  _mapWidth: number,
  mapHeight: number,
): { x: number; y: number } {
  const rx = worldX - isoOriginX(mapHeight)
  const ry = worldY - isoOriginY()
  const a = rx / ISO_HALF_W
  const b = ry / ISO_HALF_H
  return {
    x: Math.round((b + a) / 2),
    y: Math.round((b - a) / 2),
  }
}

export function isoDiamondPoints(
  x: number,
  y: number,
  mapWidth: number,
  mapHeight: number,
): Array<{ x: number; y: number }> {
  const center = isoTileCenter(x, y, mapWidth, mapHeight)
  return [
    { x: center.x, y: center.y - ISO_HALF_H },
    { x: center.x + ISO_HALF_W, y: center.y },
    { x: center.x, y: center.y + ISO_HALF_H },
    { x: center.x - ISO_HALF_W, y: center.y },
  ]
}

export function isoMapCorners(mapWidth: number, mapHeight: number): Array<{ x: number; y: number }> {
  const top = isoTileCenter(0, 0, mapWidth, mapHeight)
  const right = isoTileCenter(mapWidth - 1, 0, mapWidth, mapHeight)
  const bottom = isoTileCenter(mapWidth - 1, mapHeight - 1, mapWidth, mapHeight)
  const left = isoTileCenter(0, mapHeight - 1, mapWidth, mapHeight)
  return [
    { x: top.x, y: top.y - ISO_HALF_H },
    { x: right.x + ISO_HALF_W, y: right.y },
    { x: bottom.x, y: bottom.y + ISO_HALF_H },
    { x: left.x - ISO_HALF_W, y: left.y },
  ]
}

export function isoDepth(x: number, y: number, layer = 0): number {
  return (x + y) * 2 + layer
}
