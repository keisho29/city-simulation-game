import {
  BUILDING_XP_LEVEL_2,
  BUILDING_XP_LEVEL_3,
  MAX_BUILDING_LEVEL,
} from '../constants.ts'
import { hash32 } from '../art/pixelTexture.ts'
import { isGrowableType, isWorkplaceType, TileType, type Tile } from './tile.ts'

export function houseSlots(tile: Tile): number {
  return tile.type === TileType.House ? tile.level : 0
}

export function jobSlots(tile: Tile): number {
  return isWorkplaceType(tile.type) ? tile.level : 0
}

export function buildingVariantAt(x: number, y: number): number {
  return hash32(x * 10007 + y * 9176 + 13) % 3
}

export function xpToReach(level: number): number | undefined {
  if (level <= 1) {
    return BUILDING_XP_LEVEL_2
  }
  if (level === 2) {
    return BUILDING_XP_LEVEL_3
  }
  return undefined
}

export function addBuildingXp(tile: Tile, amount: number): boolean {
  if (!isGrowableType(tile.type) || amount <= 0 || tile.level >= MAX_BUILDING_LEVEL) {
    return false
  }

  tile.xp += amount
  let leveled = false
  while (tile.level < MAX_BUILDING_LEVEL) {
    const need = xpToReach(tile.level)
    if (need === undefined || tile.xp < need) {
      break
    }
    tile.level += 1
    leveled = true
  }
  return leveled
}

export function buildingDisplayName(type: TileType, level: number, variant: number): string {
  if (type === TileType.House) {
    if (level >= 3) {
      return variant === 1 ? '白い屋敷' : variant === 2 ? '大きな商家' : '瓦屋根の豪邸'
    }
    if (level === 2) {
      return variant === 1 ? '塗り壁の家' : variant === 2 ? '商家風の家' : '瓦屋根の家'
    }
    return '木造住宅'
  }
  if (type === TileType.Shop) {
    return level >= 3 ? '問屋' : level === 2 ? '大きな商店' : '商店'
  }
  if (type === TileType.Workshop) {
    return level >= 3 ? '大きな工房' : level === 2 ? '鍛冶工房' : '工房'
  }
  if (type === TileType.Farm) {
    return level >= 3 ? '豊かな田畑' : level === 2 ? '整った畑' : '農地'
  }
  if (type === TileType.Market) {
    return level >= 3 ? '大きな市場' : level === 2 ? '賑わう市場' : '市場'
  }
  if (type === TileType.Well) {
    return '井戸'
  }
  if (type === TileType.Warehouse) {
    return level >= 3 ? '大きな土蔵' : level === 2 ? '土蔵' : '倉庫'
  }
  if (type === TileType.Clinic) {
    return level >= 3 ? '大きな診療所' : level === 2 ? '町の診療所' : '診療所'
  }
  if (type === TileType.Road) {
    return '道路'
  }
  return '空き地'
}

export function buildingTint(type: TileType | undefined, level: number, variant: number): number {
  if (!type || !isGrowableType(type) || level <= 1) {
    return 0xffffff
  }

  if (type === TileType.House) {
    if (variant === 1) {
      return level >= 3 ? 0xb8dcff : 0xd0e8ff
    }
    if (variant === 2) {
      return level >= 3 ? 0xffb8b0 : 0xffd0d0
    }
    return level >= 3 ? 0xffe8a8 : 0xffefd0
  }
  if (type === TileType.Shop || type === TileType.Market) {
    return level >= 3 ? 0xffcc70 : 0xffe0a0
  }
  if (type === TileType.Workshop) {
    return level >= 3 ? 0xc0c0e8 : 0xd8d8f0
  }
  if (type === TileType.Warehouse) {
    return level >= 3 ? 0xfff4d0 : 0xfff8e8
  }
  if (type === TileType.Clinic) {
    return level >= 3 ? 0xc8f0d8 : 0xe0f8e8
  }
  return level >= 3 ? 0xd0ff90 : 0xe8ffb0
}
