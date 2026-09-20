import {
  DAYS_PER_MONTH,
  GameSpeed,
  MS_PER_MONTH_AT_SPEED_1,
  START_DAY,
  START_MONTH,
  START_YEAR,
} from '../constants.ts'

export class GameTime {
  year: number
  month: number
  day: number
  speed: GameSpeed
  private readonly msPerMonth: number
  private elapsed = 0

  constructor(
    year = START_YEAR,
    month = START_MONTH,
    day = START_DAY,
    msPerMonth = MS_PER_MONTH_AT_SPEED_1,
  ) {
    this.year = year
    this.month = month
    this.day = day
    this.speed = GameSpeed.X1
    this.msPerMonth = msPerMonth
  }

  get msPerDay(): number {
    return this.msPerMonth / DAYS_PER_MONTH
  }

  get hour(): number {
    return Math.floor(this.minutesOfDay / 60)
  }

  get minute(): number {
    return this.minutesOfDay % 60
  }

  get elapsedMs(): number {
    return this.elapsed
  }

  setSpeed(speed: GameSpeed): void {
    this.speed = speed
  }

  restore(snapshot: {
    year: number
    month: number
    day: number
    elapsedMs: number
    speed: GameSpeed
  }): void {
    this.year = snapshot.year
    this.month = snapshot.month
    this.day = snapshot.day
    this.elapsed = snapshot.elapsedMs
    this.speed = snapshot.speed
  }

  update(deltaMs: number): boolean {
    if (this.speed === GameSpeed.Pause || deltaMs <= 0) {
      return false
    }

    this.elapsed += deltaMs * this.speed
    let changed = false
    const dayLength = this.msPerDay

    while (this.elapsed >= dayLength) {
      this.elapsed -= dayLength
      this.advanceDay()
      changed = true
    }

    return changed
  }

  formatDate(): string {
    return `${this.year}年 ${this.month}月 ${this.day}日`
  }

  formatClock(): string {
    return `${this.hour}時${String(this.minute).padStart(2, '0')}分`
  }

  private get minutesOfDay(): number {
    const totalMinutes = 24 * 60
    return Math.min(
      totalMinutes - 1,
      Math.floor((this.elapsed / this.msPerDay) * totalMinutes),
    )
  }

  private advanceDay(): void {
    this.day += 1
    if (this.day <= DAYS_PER_MONTH) {
      return
    }

    this.day = 1
    this.month += 1
    if (this.month <= 12) {
      return
    }

    this.month = 1
    this.year += 1
  }
}
