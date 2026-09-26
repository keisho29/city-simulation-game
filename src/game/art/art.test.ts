import { describe, expect, it } from 'vitest'
import { TileType } from '../map/tile.ts'
import { WorldMap } from '../map/WorldMap.ts'
import {
  TILE_ART_SIZE,
  TILE_ATLAS_ORDER,
  TILE_SPRITES,
  buildingTileKey,
  decoKind,
  vacantTileKey,
  validateTileArt,
} from './tileArt.ts'
import {
  RESIDENT_ART_HEIGHT,
  RESIDENT_ART_WIDTH,
  RESIDENT_ATLAS_ORDER,
  RESIDENT_SPRITES,
  residentArtKey,
  residentFacingFromDelta,
  residentSprite,
  residentWalkPose,
  validateResidentArt,
} from './residentArt.ts'

describe('tile art', () => {
  it('keeps every tile sprite at 32×32', () => {
    expect(() => validateTileArt()).not.toThrow()
    expect(TILE_ATLAS_ORDER.length).toBeGreaterThan(20)

    for (const key of TILE_ATLAS_ORDER) {
      expect(TILE_SPRITES[key].rows).toHaveLength(TILE_ART_SIZE)
      expect(TILE_SPRITES[key].rows.every((row) => row.length === TILE_ART_SIZE)).toBe(true)
    }
  })

  it('picks a stable vacant tile for the same coordinates', () => {
    expect(vacantTileKey(3, 8)).toBe(vacantTileKey(3, 8))
    expect(buildingTileKey(TileType.House)).toBe('house')
    expect(buildingTileKey(TileType.Market)).toBe('market')
    expect(buildingTileKey(TileType.Well)).toBe('well')
    expect(buildingTileKey(TileType.Warehouse)).toBe('warehouse')
    expect(buildingTileKey(TileType.Clinic)).toBe('clinic')
    expect(buildingTileKey(TileType.School)).toBe('school')
    expect(buildingTileKey(TileType.Factory)).toBe('factory')
    expect(buildingTileKey(TileType.Station)).toBe('station')
    expect(buildingTileKey(TileType.Port)).toBe('port')
    expect(buildingTileKey(TileType.Rail, 3)).toBe('rail-3')
    expect(buildingTileKey(TileType.Road, 3)).toBe('road-3')
    expect(buildingTileKey(TileType.Vacant)).toBeUndefined()
  })

  it('keeps vacant ground as grass, with optional flowers on top', () => {
    expect(vacantTileKey(3, 8)).toBe('grass-base')
    expect(vacantTileKey(9, 2)).toBe('grass-base')
    const kinds = Array.from({ length: 80 }, (_, i) => decoKind(i % 10, Math.floor(i / 10)))
    expect(kinds.some((kind) => kind === 'flower')).toBe(true)
    expect(kinds.every((kind) => kind === undefined || kind === 'flower')).toBe(true)
  })
})

describe('resident art', () => {
  it('keeps every resident sprite at 20×28', () => {
    expect(() => validateResidentArt()).not.toThrow()

    for (const key of RESIDENT_ATLAS_ORDER) {
      expect(RESIDENT_SPRITES[key].rows).toHaveLength(RESIDENT_ART_HEIGHT)
      expect(RESIDENT_SPRITES[key].rows.every((row) => row.length === RESIDENT_ART_WIDTH)).toBe(
        true,
      )
      expect(residentSprite(key, 'a').rows).toHaveLength(RESIDENT_ART_HEIGHT)
      expect(residentSprite(key, 'b').rows).toHaveLength(RESIDENT_ART_HEIGHT)
      expect(residentSprite(key, 'a').rows).not.toEqual(RESIDENT_SPRITES[key].rows)
      expect(residentSprite(key, 'idle', 'back').rows).not.toEqual(RESIDENT_SPRITES[key].rows)
    }
  })

  it('swings walk frames while moving and stands still when stopped', () => {
    expect(residentWalkPose(false, 40)).toBe('idle')
    expect(residentWalkPose(true, 0)).toBe('a')
    expect(residentWalkPose(true, 8)).toBe('b')
    expect(residentWalkPose(true, 16)).toBe('a')
    expect(residentFacingFromDelta(0, 0)).toBeUndefined()
    expect(residentFacingFromDelta(4, 3)).toEqual({ facing: 'front', flipX: false })
    expect(residentFacingFromDelta(-4, 3)).toEqual({ facing: 'front', flipX: true })
    expect(residentFacingFromDelta(4, -3)).toEqual({ facing: 'back', flipX: false })
  })

  it('maps age and job to a sprite', () => {
    expect(residentArtKey({ age: 9 }, TileType.Farm)).toBe('child')
    expect(residentArtKey({ age: 68 }, TileType.Shop)).toBe('elder')
    expect(residentArtKey({ age: 30 }, TileType.Farm)).toBe('farmer')
    expect(residentArtKey({ age: 30 }, TileType.Workshop)).toBe('artisan')
    expect(residentArtKey({ age: 30 }, TileType.Shop)).toBe('merchant')
    expect(residentArtKey({ age: 30 }, TileType.Market)).toBe('market')
    expect(residentArtKey({ age: 30 }, TileType.Warehouse)).toBe('warehouse')
    expect(residentArtKey({ age: 30 }, undefined)).toBe('unemployed')
  })
})

describe('road connections', () => {
  it('links road tiles to neighbors', () => {
    const map = new WorldMap(3, 3, 32)
    expect(map.place(1, 1, TileType.Road)).toBe(true)
    expect(map.place(2, 1, TileType.Road)).toBe(true)
    expect(map.roadConnections(1, 1)).toBe(2)
    expect(map.roadConnections(2, 1)).toBe(8)
  })
})
