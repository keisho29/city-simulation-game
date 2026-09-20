import { hash32 } from '../art/pixelTexture.ts'
import { Terrain, isWaterTerrain } from './tile.ts'

export function terrainDisplayName(terrain: Terrain): string {
  switch (terrain) {
    case Terrain.Water:
      return '湖'
    case Terrain.River:
      return '川'
    case Terrain.Forest:
      return '森'
    case Terrain.Rock:
      return '岩場'
    default:
      return '空き地'
  }
}

export function generateLandscapeLayout(width: number, height: number, seed: number): Terrain[] {
  const cells: Terrain[] = Array.from({ length: width * height }, () => Terrain.Grass)
  const rng = mulberry32(seed)
  const cx = Math.floor(width / 2)
  const cy = Math.floor(height / 2)
  const protectedRadius = Math.max(2, Math.min(4, Math.floor(Math.min(width, height) / 10)))
  const minGap = Math.max(4, Math.floor(Math.min(width, height) / 5))
  const used: Array<{ x: number; y: number }> = [{ x: cx, y: cy }]
  const blocked = (x: number, y: number) => {
    const dx = x - cx
    const dy = y - cy
    return dx * dx + dy * dy <= protectedRadius * protectedRadius
  }

  const lake = pickScattered(width, height, rng, used, minGap, blocked)
  if (lake) {
    used.push(lake)
    stampBlob(cells, width, height, lake, 1 + (rng() % 2), Terrain.Water, rng, blocked)
  }

  const riverStart = pickScattered(width, height, rng, used, minGap, blocked)
  if (riverStart) {
    used.push(riverStart)
    carveShortRiver(cells, width, height, riverStart, rng, blocked)
  }

  const forestCount = countForSize(width, height, 3, 1)
  for (let i = 0; i < forestCount; i += 1) {
    const center = pickScattered(width, height, rng, used, minGap, blocked)
    if (!center) {
      break
    }
    used.push(center)
    plantGrove(cells, width, height, center, rng, blocked)
  }

  const rockCount = countForSize(width, height, 3, 1)
  for (let i = 0; i < rockCount; i += 1) {
    const center = pickScattered(width, height, rng, used, minGap, blocked)
    if (!center) {
      break
    }
    used.push(center)
    stampBlob(
      cells,
      width,
      height,
      center,
      1,
      Terrain.Rock,
      rng,
      blocked,
      (terrain) => !isWaterTerrain(terrain),
    )
  }

  return cells
}

function countForSize(width: number, height: number, full: number, tiny: number): number {
  return Math.min(width, height) < 12 ? tiny : full
}

function pickScattered(
  width: number,
  height: number,
  rng: () => number,
  used: Array<{ x: number; y: number }>,
  minGap: number,
  blocked: (x: number, y: number) => boolean,
): { x: number; y: number } | undefined {
  const margin = 1
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const x = margin + (rng() % Math.max(1, width - margin * 2))
    const y = margin + (rng() % Math.max(1, height - margin * 2))
    if (blocked(x, y)) {
      continue
    }
    if (used.some((point) => Math.hypot(point.x - x, point.y - y) < minGap)) {
      continue
    }
    return { x, y }
  }
  return undefined
}

function plantGrove(
  cells: Terrain[],
  width: number,
  height: number,
  center: { x: number; y: number },
  rng: () => number,
  blocked: (x: number, y: number) => boolean,
): void {
  tryPlantTree(cells, width, height, center.x, center.y, blocked)

  const extras = 1 + (rng() % 2)
  const offsets = [
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
    [2, 2],
    [-2, 2],
    [2, -2],
    [-2, -2],
  ]
  for (let i = 0; i < extras; i += 1) {
    const offset = offsets[(rng() + i) % offsets.length]
    tryPlantTree(cells, width, height, center.x + offset[0], center.y + offset[1], blocked)
  }
}

function tryPlantTree(
  cells: Terrain[],
  width: number,
  height: number,
  x: number,
  y: number,
  blocked: (x: number, y: number) => boolean,
): void {
  if (x < 0 || y < 0 || x >= width || y >= height || blocked(x, y)) {
    return
  }
  const index = y * width + x
  if (isWaterTerrain(cells[index]) || cells[index] !== Terrain.Grass) {
    return
  }
  if (hasNearbyTree(cells, width, height, x, y)) {
    return
  }
  cells[index] = Terrain.Forest
}

function hasNearbyTree(
  cells: Terrain[],
  width: number,
  height: number,
  x: number,
  y: number,
): boolean {
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue
      }
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue
      }
      if (cells[ny * width + nx] === Terrain.Forest) {
        return true
      }
    }
  }
  return false
}

function stampBlob(
  cells: Terrain[],
  width: number,
  height: number,
  center: { x: number; y: number },
  radius: number,
  value: Terrain,
  rng: () => number,
  blocked: (x: number, y: number) => boolean,
  canPaint: (terrain: Terrain) => boolean = () => true,
): void {
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const x = center.x + dx
      const y = center.y + dy
      if (x < 0 || y < 0 || x >= width || y >= height || blocked(x, y)) {
        continue
      }
      if (dx * dx + dy * dy > radius * radius) {
        continue
      }
      if (radius > 0 && rng() % 4 === 0 && (dx !== 0 || dy !== 0)) {
        continue
      }
      const index = y * width + x
      if (!canPaint(cells[index])) {
        continue
      }
      cells[index] = value
    }
  }
}

function carveShortRiver(
  cells: Terrain[],
  width: number,
  height: number,
  start: { x: number; y: number },
  rng: () => number,
  blocked: (x: number, y: number) => boolean,
): void {
  let x = start.x
  let y = start.y
  const heading = rng() % 4
  const steps = 6 + (rng() % 7)

  for (let step = 0; step < steps; step += 1) {
    if (!blocked(x, y) && !isWaterTerrain(cells[y * width + x])) {
      cells[y * width + x] = Terrain.River
    }

    const turn = rng() % 5
    if (heading === 0 || heading === 1) {
      y += heading === 0 ? 1 : -1
      if (turn === 0 && x > 0) {
        x -= 1
      } else if (turn === 1 && x < width - 1) {
        x += 1
      }
    } else {
      x += heading === 2 ? 1 : -1
      if (turn === 0 && y > 0) {
        y -= 1
      } else if (turn === 1 && y < height - 1) {
        y += 1
      }
    }

    if (x < 0 || y < 0 || x >= width || y >= height) {
      break
    }
  }
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let n = Math.imul(t ^ (t >>> 15), 1 | t)
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n)
    return (n ^ (n >>> 14)) >>> 0
  }
}

export function landscapeSeed(): number {
  return (hash32(Date.now() ^ Math.floor(Math.random() * 0xffffffff)) || 1) >>> 0
}
