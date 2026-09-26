import { TileType } from './tile.ts'

export function footprintSpan(type: TileType): number {
  if (
    type === TileType.Vacant ||
    type === TileType.Extension ||
    type === TileType.Road ||
    type === TileType.Rail ||
    type === TileType.Farm
  ) {
    return 1
  }
  return 2
}

export function footprintCells(
  x: number,
  y: number,
  span: number,
): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = []
  for (let dy = 0; dy < span; dy += 1) {
    for (let dx = 0; dx < span; dx += 1) {
      cells.push({ x: x + dx, y: y + dy })
    }
  }
  return cells
}

export function isWideBuildingType(type: TileType): boolean {
  return footprintSpan(type) > 1
}
