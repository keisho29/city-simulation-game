import Phaser from 'phaser'
import { registerRunnerArt } from './art.ts'
import {
  BAR_BOTTOM,
  GRAVITY,
  GROUND_Y_RATIO,
  JUMP_VELOCITY,
  PLAYER_X_RATIO,
  SLIDE_MAX_MS,
  SLIDE_MIN_MS,
} from './constants.ts'
import { bindHud, readBest, setOver, setScore, setShell, writeBest } from './hud.ts'
import {
  canJump,
  distanceScore,
  firstObstacleReady,
  hitsObstacle,
  nextSlideMs,
  pickObstacle,
  runSpeed,
  spawnWait,
  type ObstacleKind,
  type Pose,
} from './logic.ts'

type Obstacle = {
  kind: ObstacleKind
  sprite: Phaser.GameObjects.Image
}

export class RunnerScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image
  private sky!: Phaser.GameObjects.Rectangle
  private hills!: Phaser.GameObjects.TileSprite
  private ground!: Phaser.GameObjects.TileSprite
  private obstacles: Obstacle[] = []
  private pose: Pose = 'run'
  private feetY = 0
  private groundY = 0
  private playerX = 0
  private velocityY = 0
  private slideMs = 0
  private slideHeld = false
  private distance = 0
  private spawnIn = 0
  private spawnedFirst = false
  private lastKind: ObstacleKind | undefined
  private playing = false
  private runTick = 0
  private best = 0

  constructor() {
    super('runner')
  }

  create() {
    registerRunnerArt(this.textures)
    this.best = readBest()
    this.cameras.main.setBackgroundColor('#87b7e6')

    const { width, height } = this.scale
    this.sky = this.add.rectangle(width / 2, height * 0.28, width, height * 0.56, 0x87b7e6).setScrollFactor(0)
    this.hills = this.add
      .tileSprite(0, height * 0.52, width, 120, 'ground')
      .setOrigin(0, 1)
      .setTint(0x4a7a3a)
      .setAlpha(0.55)
    this.ground = this.add.tileSprite(0, height, width, 96, 'ground').setOrigin(0, 1)

    this.player = this.add.image(0, 0, 'runner-run-a').setOrigin(0.5, 1).setScale(4)
    this.layout()

    this.scale.on('resize', this.layout, this)
    this.bindInput()
    bindHud({
      start: () => this.startRun(),
      retry: () => this.startRun(),
      title: () => this.goTitle(),
      jump: () => this.tryJump(),
      slideDown: () => this.holdSlide(true),
      slideUp: () => this.holdSlide(false),
    })
    setShell('title')
    setScore(0, this.best)
  }

  private layout() {
    const width = this.scale.width
    const height = this.scale.height
    this.groundY = height * GROUND_Y_RATIO
    this.playerX = width * PLAYER_X_RATIO
    this.sky.setPosition(width / 2, this.groundY / 2)
    this.sky.setSize(width, this.groundY)
    this.hills.setPosition(0, this.groundY - 8)
    this.hills.setSize(width, 140)
    this.ground.setPosition(0, height)
    this.ground.setSize(width, height - this.groundY + 8)
    if (!this.playing && this.pose !== 'dead') this.feetY = this.groundY
    this.player.setPosition(this.playerX, this.feetY)
  }

  private bindInput() {
    const keys = this.input.keyboard
    keys?.on('keydown-SPACE', () => this.tryJump())
    keys?.on('keydown-UP', () => this.tryJump())
    keys?.on('keydown-W', () => this.tryJump())
    keys?.on('keydown-Z', () => this.tryJump())
    keys?.on('keydown-DOWN', () => this.holdSlide(true))
    keys?.on('keydown-S', () => this.holdSlide(true))
    keys?.on('keydown-C', () => this.holdSlide(true))
    keys?.on('keyup-DOWN', () => this.holdSlide(false))
    keys?.on('keyup-S', () => this.holdSlide(false))
    keys?.on('keyup-C', () => this.holdSlide(false))
  }

  private goTitle() {
    this.playing = false
    this.clearObstacles()
    this.pose = 'run'
    this.distance = 0
    this.velocityY = 0
    this.feetY = this.groundY
    this.slideMs = 0
    this.slideHeld = false
    this.spawnedFirst = false
    this.refreshPlayer()
    setScore(0, this.best)
    setShell('title')
  }

  private startRun() {
    this.clearObstacles()
    this.playing = true
    this.pose = 'run'
    this.distance = 0
    this.velocityY = 0
    this.feetY = this.groundY
    this.slideMs = 0
    this.slideHeld = false
    this.spawnIn = 0
    this.spawnedFirst = false
    this.lastKind = undefined
    this.runTick = 0
    this.refreshPlayer()
    setScore(0, this.best)
    setShell('play')
  }

  private tryJump() {
    if (!this.playing) return
    const grounded = this.feetY >= this.groundY - 0.5
    if (!canJump(this.pose, grounded)) return
    this.pose = 'jump'
    this.velocityY = JUMP_VELOCITY
    this.slideMs = 0
    this.refreshPlayer()
  }

  private holdSlide(held: boolean) {
    this.slideHeld = held
    if (!this.playing || !held) return
    const grounded = this.feetY >= this.groundY - 0.5
    if (!grounded || this.pose === 'dead') return
    this.pose = 'slide'
    this.slideMs = nextSlideMs(true, this.slideMs, SLIDE_MIN_MS, SLIDE_MAX_MS)
    this.refreshPlayer()
  }

  update(_time: number, delta: number) {
    if (!this.playing) return
    const dt = Math.min(delta, 40) / 1000
    const speed = runSpeed(this.distance)
    this.distance += speed * dt
    const meters = distanceScore(this.distance)
    setScore(meters, this.best)

    this.ground.tilePositionX += (speed * dt) / 3
    this.hills.tilePositionX += (speed * dt) / 8

    this.stepPlayer(dt)
    this.stepObstacles(dt, speed)
    if (!this.spawnedFirst) {
      if (firstObstacleReady(this.distance)) {
        this.spawnObstacle()
        this.spawnedFirst = true
      }
    } else {
      this.spawnIn -= dt
      if (this.spawnIn <= 0) this.spawnObstacle()
    }
    this.checkHits()
  }

  private stepPlayer(dt: number) {
    const grounded = this.feetY >= this.groundY - 0.5 && this.velocityY >= 0
    if (this.pose === 'slide') {
      this.slideMs = nextSlideMs(this.slideHeld, this.slideMs, SLIDE_MIN_MS, SLIDE_MAX_MS)
      this.slideMs -= dt * 1000
      if (this.slideMs <= 0 && !this.slideHeld) this.pose = grounded ? 'run' : 'jump'
    }

    this.velocityY += GRAVITY * dt
    this.feetY += this.velocityY * dt
    if (this.feetY >= this.groundY) {
      this.feetY = this.groundY
      this.velocityY = 0
      if (this.pose === 'jump') this.pose = this.slideHeld ? 'slide' : 'run'
    }

    this.runTick += dt
    this.player.setPosition(this.playerX, this.feetY)
    this.refreshPlayer()
  }

  private spawnObstacle() {
    const previous = this.lastKind
    const kind = previous === undefined ? 'hurdle' : pickObstacle(Math.random(), previous)
    const y = kind === 'bar' ? this.groundY - BAR_BOTTOM : this.groundY
    const sprite = this.add.image(this.scale.width + 120, y, kind).setOrigin(0.5, 1).setScale(4)
    this.obstacles.push({ kind, sprite })
    this.spawnIn = spawnWait(this.distance, previous, kind)
    this.lastKind = kind
  }

  private stepObstacles(dt: number, speed: number) {
    for (const obstacle of this.obstacles) {
      obstacle.sprite.x -= speed * dt
    }
    this.obstacles = this.obstacles.filter((obstacle) => {
      if (obstacle.sprite.x > -80) return true
      obstacle.sprite.destroy()
      return false
    })
  }

  private checkHits() {
    for (const obstacle of this.obstacles) {
      if (hitsObstacle(this.playerX, this.feetY, this.pose, obstacle.sprite.x, this.groundY, obstacle.kind)) {
        this.fail()
        return
      }
    }
  }

  private fail() {
    this.playing = false
    this.pose = 'dead'
    this.slideHeld = false
    this.refreshPlayer()
    const meters = distanceScore(this.distance)
    this.best = writeBest(meters)
    setOver(meters, this.best)
    setShell('over')
  }

  private refreshPlayer() {
    if (this.pose === 'slide') this.player.setTexture('runner-slide')
    else if (this.pose === 'jump') this.player.setTexture('runner-jump')
    else if (this.pose === 'dead') this.player.setTexture('runner-dead')
    else this.player.setTexture(Math.floor(this.runTick * 8) % 2 === 0 ? 'runner-run-a' : 'runner-run-b')
  }

  private clearObstacles() {
    for (const obstacle of this.obstacles) obstacle.sprite.destroy()
    this.obstacles = []
  }
}
