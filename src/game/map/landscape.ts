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
    case Terrain.Hill:
      return '丘陵'
    case Terrain.Fertile:
      return '肥沃な土地'
    default:
      return '空き地'
  }
}

export type LandscapeProfile = {
  lakes?: number
  rivers?: number
  forests?: number
  rocks?: number
  preset?: 'tokyo'
}

export function generateLandscapeLayout(
  width: number,
  height: number,
  seed: number,
  profile: LandscapeProfile = {},
): Terrain[] {
  if (profile.preset === 'tokyo') {
    return generateTokyoLayout(width, height, seed)
  }

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

  const lakes = profile.lakes ?? 1
  for (let i = 0; i < lakes; i += 1) {
    const lake = pickScattered(width, height, rng, used, minGap, blocked)
    if (!lake) {
      break
    }
    used.push(lake)
    stampBlob(cells, width, height, lake, 1 + (rng() % 2), Terrain.Water, rng, blocked)
  }

  const rivers = profile.rivers ?? 1
  for (let i = 0; i < rivers; i += 1) {
    const riverStart = pickScattered(width, height, rng, used, minGap, blocked)
    if (!riverStart) {
      break
    }
    used.push(riverStart)
    carveShortRiver(cells, width, height, riverStart, rng, blocked)
  }

  const forestCount = profile.forests ?? countForSize(width, height, 3, 1)
  for (let i = 0; i < forestCount; i += 1) {
    const center = pickScattered(width, height, rng, used, minGap, blocked)
    if (!center) {
      break
    }
    used.push(center)
    plantGrove(cells, width, height, center, rng, blocked)
  }

  const rockCount = profile.rocks ?? countForSize(width, height, 3, 1)
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

export function generateStarterRoads(
  width: number,
  height: number,
  _seed: number,
  profile: LandscapeProfile = {},
): Array<{ x: number; y: number }> {
  if (profile.preset !== 'tokyo') {
    return []
  }
  return tokyoRoads(width, height)
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

function mapPoint(width: number, height: number, x50: number, y50: number): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(width - 1, Math.round((x50 / 49) * (width - 1)))),
    y: Math.max(0, Math.min(height - 1, Math.round((y50 / 49) * (height - 1)))),
  }
}

function at(cells: Terrain[], width: number, x: number, y: number): Terrain | undefined {
  if (x < 0 || y < 0 || x >= width || y >= cells.length / width) {
    return undefined
  }
  return cells[y * width + x]
}

function setCell(cells: Terrain[], width: number, x: number, y: number, value: Terrain): void {
  const height = cells.length / width
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return
  }
  cells[y * width + x] = value
}

function inStart(width: number, height: number, x: number, y: number): boolean {
  const cx = (width - 1) / 2
  const cy = (height - 1) / 2
  const radius = Math.max(3, Math.min(width, height) * 0.1)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= radius * radius
}

function zoneNoise(seed: number, x: number, y: number): number {
  return ((hash32(seed + x * 19 + y * 43) >>> 0) % 100) / 100
}

function generateTokyoLayout(width: number, height: number, seed: number): Terrain[] {
  const cells: Terrain[] = Array.from({ length: width * height }, () => Terrain.Grass)
  const maxX = Math.max(1, width - 1)
  const maxY = Math.max(1, height - 1)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (inStart(width, height, x, y)) {
        continue
      }
      const nx = x / maxX
      const ny = y / maxY
      const wobble = (zoneNoise(seed, x, y) - 0.5) * 0.06
      const scatter = zoneNoise(seed + 91, x, y)
      if (nx < 0.34 + wobble && ny > 0.62 - wobble) {
        if (scatter > 0.22) {
          setCell(cells, width, x, y, Terrain.Rock)
        }
        continue
      }
      if (nx > 0.58 + wobble && ny < 0.34 + wobble) {
        if (scatter > 0.35) {
          setCell(cells, width, x, y, Terrain.Hill)
        }
        continue
      }
      if (ny > 0.64 - wobble && nx > 0.28 + wobble) {
        setCell(cells, width, x, y, Terrain.Fertile)
      }
    }
  }

  paintTokyoRiver(cells, width, height, seed)
  paintTokyoLake(cells, width, height)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (inStart(width, height, x, y)) {
        const current = at(cells, width, x, y)
        if (current && !isWaterTerrain(current)) {
          setCell(cells, width, x, y, Terrain.Grass)
        }
        continue
      }
      const nx = x / maxX
      const ny = y / maxY
      const wobble = (zoneNoise(seed, x, y) - 0.5) * 0.05
      const forest = nx + ny < 0.62 + wobble && nx < 0.54 && ny < 0.5
      if (!forest) {
        continue
      }
      if (at(cells, width, x, y) !== Terrain.Grass) {
        continue
      }
      if (zoneNoise(seed + 3, x, y) < 0.2) {
        continue
      }
      setCell(cells, width, x, y, Terrain.Forest)
    }
  }

  return cells
}

function paintTokyoRiver(cells: Terrain[], width: number, height: number, seed: number): void {
  const main: Array<[number, number]> = [
    [3, 8],
    [8, 13],
    [13, 18],
    [16, 22],
    [18, 26],
    [22, 31],
    [27, 36],
    [33, 41],
    [40, 45],
    [47, 48],
  ]
  const branch: Array<[number, number]> = [
    [13, 18],
    [9, 26],
    [7, 34],
    [10, 42],
  ]
  paintPolyline(cells, width, height, main, seed)
  paintPolyline(cells, width, height, branch, seed + 11)
}

function paintTokyoLake(cells: Terrain[], width: number, height: number): void {
  const center = mapPoint(width, height, 38, 44)
  const radius = Math.max(2, Math.round(Math.min(width, height) / 18))
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx * dx + dy * dy > radius * radius) {
        continue
      }
      const x = center.x + dx
      const y = center.y + dy
      if (inStart(width, height, x, y)) {
        continue
      }
      setCell(cells, width, x, y, Terrain.Water)
    }
  }
}

function paintPolyline(
  cells: Terrain[],
  width: number,
  height: number,
  points: Array<[number, number]>,
  seed: number,
): void {
  for (let i = 0; i < points.length - 1; i += 1) {
    const from = mapPoint(width, height, points[i]![0], points[i]![1])
    const to = mapPoint(width, height, points[i + 1]![0], points[i + 1]![1])
    walkLine(from.x, from.y, to.x, to.y, (x, y) => {
      if (inStart(width, height, x, y)) {
        return
      }
      setCell(cells, width, x, y, Terrain.River)
      const extra = zoneNoise(seed, x, y) > 0.72
      if (extra) {
        setCell(cells, width, x + 1, y, Terrain.River)
      }
    })
  }
}

function walkLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  visit: (x: number, y: number) => void,
): void {
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  let x = x0
  let y = y0
  while (true) {
    visit(x, y)
    if (x === x1 && y === y1) {
      break
    }
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }
}

function tokyoRoads(width: number, height: number): Array<{ x: number; y: number }> {
  const unique = new Map<string, { x: number; y: number }>()
  const add = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return
    }
    const cx = (width - 1) / 2
    const cy = (height - 1) / 2
    if (Math.hypot(x - cx, y - cy) < 2.4) {
      return
    }
    unique.set(`${x},${y}`, { x, y })
  }
  const start = mapPoint(width, height, 27, 24)
  const plains = mapPoint(width, height, 35, 19)
  walkLine(start.x, start.y, plains.x, plains.y, add)
  const ford = mapPoint(width, height, 18, 26)
  const plaza = mapPoint(width, height, 22, 26)
  walkLine(ford.x, ford.y, plaza.x, plaza.y, add)
  return [...unique.values()]
}
