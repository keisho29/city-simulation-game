export const MAP_WIDTH = 50
export const MAP_HEIGHT = 50
export const TILE_SIZE = 32

export const MIN_CAMERA_ZOOM = 1.25
export const MAX_CAMERA_ZOOM = 6
export const ZOOM_STEP = 0.25
/** 起動時に画面へ収めるマス数。地図全体はズームアウトで見られる。 */
export const START_VIEW_TILES = 10

export function snapZoom(zoom: number): number {
  const clamped = Math.min(MAX_CAMERA_ZOOM, Math.max(MIN_CAMERA_ZOOM, zoom))
  return Math.round(clamped / ZOOM_STEP) * ZOOM_STEP
}

export const START_YEAR = 1700
export const START_MONTH = 1
export const START_DAY = 1
export const DAYS_PER_MONTH = 30

/** ×1 のとき、ゲーム内1日に対応する現実時間。 */
export const MS_PER_DAY_AT_SPEED_1 = 3 * 60 * 1000

export const MS_PER_MONTH_AT_SPEED_1 = MS_PER_DAY_AT_SPEED_1 * DAYS_PER_MONTH

export const GameSpeed = {
  Pause: 0,
  X1: 1,
  X2: 2,
  X5: 5,
} as const

export type GameSpeed = (typeof GameSpeed)[keyof typeof GameSpeed]

export const HOUSE_CAPACITY = 1
export const JOB_CAPACITY = 1
export const INITIAL_RESIDENT_COUNT = 20
export const INITIAL_FUNDS = 1000
/** 開発用。完了したら false にして通常の資金消費に戻す。 */
export const DEV_FREEZE_FUNDS = true
export const DEV_FIXED_FUNDS = 9000
export const RESIDENT_MOVE_SPEED = 48
export const WALK_SPEED_MULT = 1
export const ROAD_SPEED_MULT = 1.55
export const RAIL_SPEED_MULT = 3.2
export const WATER_SPEED_MULT = 2.2
export const TRAIN_MOVE_SPEED = 96
export const BOAT_MOVE_SPEED = 72
export const TRANSIT_WALK_MAX = 8
export const TRANSIT_FARE = 2
export const RAIL_UPKEEP_PER_TILE_HOUR = 0.06
export const STATION_UPKEEP_PER_HOUR = 0.5
export const PORT_UPKEEP_PER_HOUR = 0.45
export const FREIGHT_PER_HOUR = 2
export const FREIGHT_FARE_PER_UNIT = 0.3
export const HUB_CATCH_RADIUS = 2

export const HAPPINESS_BASE = 50
export const HAPPINESS_HAS_JOB = 20
export const HAPPINESS_NO_JOB = -10
export const HAPPINESS_NO_HOME = -15
export const HAPPINESS_SHORT_COMMUTE = 10
export const HAPPINESS_LONG_COMMUTE = -10
export const HAPPINESS_WELL_FED = 8
export const HAPPINESS_HUNGRY = -12
export const HAPPINESS_STARVING = -20
export const HAPPINESS_COMFORTABLE = 5
export const HAPPINESS_BROKE = -10
export const HAPPINESS_HOLIDAY_REST = 5
export const SHORT_COMMUTE_DISTANCE = 5
export const LONG_COMMUTE_DISTANCE = 15

/** この時刻（含む）から出勤する。 */
export const WORK_START_HOUR = 8
/** この時刻（含む）から帰宅する。 */
export const WORK_END_HOUR = 17

export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const
export const HOLIDAY_WEEKDAY = 0

export const INITIAL_HUNGER = 35
export const INITIAL_RESIDENT_MONEY = 24
export const HUNGER_PER_GAME_HOUR = 2.5
export const HUNGER_WORK_MULTIPLIER = 1.4
export const HUNGER_WELL_FED = 25
export const HUNGER_HUNGRY = 60
export const HUNGER_STARVING = 85
export const HUNGER_SHOP_THRESHOLD = 40
export const SHOP_PRICE = 12
export const SHOP_HUNGER_RELIEF = 55
export const MONEY_COMFORTABLE = 40
export const WAGE_FARM_PER_HOUR = 3
export const WAGE_SHOP_PER_HOUR = 4
export const WAGE_WORKSHOP_PER_HOUR = 5
export const WAGE_WAREHOUSE_PER_HOUR = 3
export const WAGE_MARKET_PER_HOUR = 4
export const WAGE_CLINIC_PER_HOUR = 5

export const FOOD_PER_WORKER_HOUR = 2.2
export const WOOD_PER_WORKER_HOUR = 1.4
export const GOODS_PER_WORKER_HOUR = 1
export const FOOD_SHOP_UNITS = 1
export const FARM_STALL_LEAK_PER_HOUR = 1.2
export const HAUL_AMOUNT = 4
export const STOCK_CAP_BASE = 12
export const STOCK_CAP_PER_LEVEL = 6
export const WAREHOUSE_STOCK_BONUS = 28
export const HARVEST_BUMPER = 1.7
export const HARVEST_DROUGHT = 0.4
export const EVENT_DURATION_HOURS = 72
export const EVENT_COOLDOWN_HOURS = 40
export const WELL_RADIUS = 6
export const CLINIC_RADIUS = 8
export const HAPPINESS_WELL = 8
export const HAPPINESS_CLINIC = 6
export const HAPPINESS_FESTIVAL = 12
export const MOVE_COMMUTE_THRESHOLD = 12
export const MOVE_MIN_IMPROVEMENT = 3

export const MAX_BUILDING_LEVEL = 3
export const BUILDING_XP_LEVEL_2 = 60
export const BUILDING_XP_LEVEL_3 = 180
export const BUILDING_XP_HOME_PER_HOUR = 3
export const BUILDING_XP_WORK_PER_HOUR = 5
export const BUILDING_XP_SHOP_VISIT = 14
export const BUILDING_SCALE_PER_LEVEL = 0.14

export const LAND_VALUE_RADIUS = 3
export const LAND_VALUE_MIN = 8
export const LAND_VALUE_MAX = 100

export const MAX_POPULATION = 80
export const INFLOW_MIN_HAPPINESS = 40
export const INFLOW_INTERVAL_HOURS = 6

export const HOUSE_TAX_PER_LEVEL_PER_HOUR = 0.35
export const WORK_TAX_RATIO = 0.35
export const SHOP_CITY_CUT = 4
export const WAGE_LEVEL_BONUS = 0.25
export const WAGE_SCHOOL_PER_HOUR = 4
export const WAGE_FACTORY_PER_HOUR = 6
export const WAGE_STATION_PER_HOUR = 4
export const WAGE_PORT_PER_HOUR = 4

export const ERA_ADVANCE_DEVELOPMENT = 28
export const ERA_ADVANCE_HOUSED = 4
export const TECH_COST_FARMING = 16
export const TECH_COST_TRADE = 8
export const TECH_COST_CRAFT = 14
export const TECH_COST_HYGIENE = 12
export const TECH_COST_LOGISTICS = 12
export const TECH_COST_LITERACY = 18
export const TECH_COST_INDUSTRY = 16
export const TECH_COST_RAILWAYS = 18
export const FARMING_HARVEST_BONUS = 1.15

