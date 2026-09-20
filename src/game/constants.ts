export const MAP_WIDTH = 50
export const MAP_HEIGHT = 50
export const TILE_SIZE = 32

export const MIN_CAMERA_ZOOM = 0.25
export const MAX_CAMERA_ZOOM = 2.5

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
export const RESIDENT_MOVE_SPEED = 48

export const HAPPINESS_BASE = 50
export const HAPPINESS_HAS_JOB = 20
export const HAPPINESS_NO_JOB = -10
export const HAPPINESS_NO_HOME = -15
export const HAPPINESS_SHORT_COMMUTE = 10
export const HAPPINESS_LONG_COMMUTE = -10
export const SHORT_COMMUTE_DISTANCE = 5
export const LONG_COMMUTE_DISTANCE = 15

/** この時刻（含む）から出勤する。 */
export const WORK_START_HOUR = 8
/** この時刻（含む）から帰宅する。 */
export const WORK_END_HOUR = 17

