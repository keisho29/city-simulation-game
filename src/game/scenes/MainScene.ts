import Phaser from 'phaser'
import { createWorldArt, preloadWorldArt, RESIDENT_TEXTURE_KEY, TILE_TEXTURE_KEY } from '../art/createWorldArt.ts'
import {
  RESIDENT_DISPLAY_HEIGHT,
  RESIDENT_DISPLAY_WIDTH,
  residentArtKey,
} from '../art/residentArt.ts'
import { buildingTileKey, vacantTileKey } from '../art/tileArt.ts'
import {
  BUILDINGS,
  BuildTool,
  isBuildingTool,
  isEditTool,
  PaintMode,
} from '../buildings/catalog.ts'
import {
  INITIAL_FUNDS,
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_ZOOM,
} from '../constants.ts'
import { Treasury } from '../economy/treasury.ts'
import { TileType } from '../map/tile.ts'
import { WorldMap } from '../map/WorldMap.ts'
import { ResidentSim } from '../residents/ResidentSim.ts'
import {
  SAVE_VERSION,
  loadSnapshot,
  writeSnapshot,
} from '../save/save.ts'
import { GameTime } from '../time/gameTime.ts'
import { bindBuildMenu } from '../ui/buildMenu.ts'
import { bindSpeedMenu } from '../ui/speedMenu.ts'

const MAP_EDGE = 0x3d6e1c
const HOVER_VALID = 0xf2e6c4
const HOVER_INVALID = 0xc4453c
const SAVE_INTERVAL_MS = 5000

export class MainScene extends Phaser.Scene {
  private worldMap = new WorldMap()
  private camControl: Phaser.Cameras.Controls.FixedKeyControl | undefined
  private tileSprites: Phaser.GameObjects.Image[] = []
  private hoverGraphics: Phaser.GameObjects.Graphics | undefined
  private hoverPreview: Phaser.GameObjects.Image | undefined
  private selectedTool: BuildTool = BuildTool.None
  private paintMode: PaintMode = PaintMode.Click
  private hoverTile: { x: number; y: number } | undefined
  private gameTime = new GameTime()
  private dateLabel: HTMLElement | null = null
  private clockLabel: HTMLElement | null = null
  private populationLabel: HTMLElement | null = null
  private housedLabel: HTMLElement | null = null
  private employmentLabel: HTMLElement | null = null
  private happinessLabel: HTMLElement | null = null
  private fundsLabel: HTMLElement | null = null
  private residentSim: ResidentSim | undefined
  private treasury = new Treasury(INITIAL_FUNDS)
  private residentMarkers: Phaser.GameObjects.Image[] = []
  private saveAccumMs = 0

  constructor() {
    super('MainScene')
  }

  preload(): void {
    preloadWorldArt(this)
  }

  create(): void {
    createWorldArt(this)
    this.hoverGraphics = this.add.graphics().setDepth(2)
    this.hoverPreview = this.add
      .image(0, 0, TILE_TEXTURE_KEY, 'house')
      .setOrigin(0)
      .setAlpha(0.55)
      .setDepth(2)
      .setVisible(false)
      .setDisplaySize(this.worldMap.tileSize, this.worldMap.tileSize)
    this.setupCamera()
    this.setupCameraControls()
    this.setupBuildingInput()
    bindBuildMenu({
      onToolChange: (tool) => this.setTool(tool),
      onPaintModeChange: (mode) => this.setPaintMode(mode),
    })
    this.dateLabel = document.querySelector('#hud-date')
    this.clockLabel = document.querySelector('#hud-clock')
    this.populationLabel = document.querySelector('#hud-population')
    this.housedLabel = document.querySelector('#hud-housed')
    this.employmentLabel = document.querySelector('#hud-employment')
    this.happinessLabel = document.querySelector('#hud-happiness')
    this.fundsLabel = document.querySelector('#hud-funds')
    this.renderDate()
    this.renderClock()
    this.loadOrStartGame()
    bindSpeedMenu((speed) => {
      this.gameTime.setSpeed(speed)
      this.persistGame()
    }, this.gameTime.speed)
    this.createTileSprites()
    this.createResidentMarkers()
    this.renderCityHud()
    this.setupAutosave()
  }

  update(_time: number, delta: number): void {
    this.camControl?.update(delta)
    if (this.gameTime.update(delta)) {
      this.renderDate()
    }
    this.renderClock()

    this.residentSim?.update(delta, this.gameTime.speed, this.gameTime.hour)
    this.syncResidentMarkers()
    this.renderCityHud()

    this.saveAccumMs += delta
    if (this.saveAccumMs >= SAVE_INTERVAL_MS) {
      this.saveAccumMs = 0
      this.persistGame()
    }
  }

  private loadOrStartGame(): void {
    const snapshot = loadSnapshot(window.localStorage)
    if (
      snapshot &&
      snapshot.mapWidth === this.worldMap.width &&
      snapshot.mapHeight === this.worldMap.height &&
      this.worldMap.restoreTiles(snapshot.tiles)
    ) {
      this.gameTime.restore({
        year: snapshot.year,
        month: snapshot.month,
        day: snapshot.day,
        elapsedMs: snapshot.elapsedMs,
        speed: snapshot.speed,
      })
      this.treasury.funds = snapshot.funds
      this.residentSim = new ResidentSim(this.worldMap, snapshot.residents)
      this.renderDate()
      this.renderClock()
      return
    }

    this.residentSim = new ResidentSim(this.worldMap)
  }

  private persistGame(): void {
    if (!this.residentSim) {
      return
    }

    writeSnapshot(window.localStorage, {
      version: SAVE_VERSION,
      year: this.gameTime.year,
      month: this.gameTime.month,
      day: this.gameTime.day,
      elapsedMs: this.gameTime.elapsedMs,
      speed: this.gameTime.speed,
      funds: this.treasury.funds,
      mapWidth: this.worldMap.width,
      mapHeight: this.worldMap.height,
      tiles: this.worldMap.snapshotTiles(),
      residents: this.residentSim.residents,
    })
  }

  private setupAutosave(): void {
    const persist = () => this.persistGame()
    window.addEventListener('pagehide', persist)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        persist()
      }
    })
  }

  private renderDate(): void {
    if (this.dateLabel) {
      this.dateLabel.textContent = this.gameTime.formatDate()
    }
  }

  private renderClock(): void {
    if (this.clockLabel) {
      const hour = String(this.gameTime.hour).padStart(2, '0')
      const minute = String(this.gameTime.minute).padStart(2, '0')
      this.clockLabel.textContent = `${hour}:${minute}`
    }
  }

  private createResidentMarkers(): void {
    if (!this.residentSim) {
      return
    }

    for (const marker of this.residentMarkers) {
      marker.destroy()
    }

    this.residentMarkers = this.residentSim.residents.map((resident) => {
      const jobType = this.jobTypeOf(resident.workplace)
      return this.add
        .image(
          resident.worldX,
          resident.worldY,
          RESIDENT_TEXTURE_KEY,
          residentArtKey(resident, jobType),
        )
        .setOrigin(0.5, 0.85)
        .setDepth(3)
        .setDisplaySize(RESIDENT_DISPLAY_WIDTH, RESIDENT_DISPLAY_HEIGHT)
    })
  }

  private syncResidentMarkers(): void {
    if (!this.residentSim) {
      return
    }

    this.residentSim.residents.forEach((resident, index) => {
      const sprite = this.residentMarkers[index]
      if (!sprite) {
        return
      }

      const dx = resident.worldX - sprite.x
      if (Math.abs(dx) > 0.4) {
        sprite.setFlipX(dx < 0)
      }

      const jobType = this.jobTypeOf(resident.workplace)
      const frame = residentArtKey(resident, jobType)
      if (sprite.frame.name !== frame) {
        sprite.setFrame(frame)
        sprite.setDisplaySize(RESIDENT_DISPLAY_WIDTH, RESIDENT_DISPLAY_HEIGHT)
      }

      sprite.setPosition(resident.worldX, resident.worldY)
    })
  }

  private renderCityHud(): void {
    if (!this.residentSim) {
      return
    }

    const population = this.residentSim.residents.length
    const housed = this.residentSim.housedCount()
    const employed = this.residentSim.employedCount()
    const happiness = this.residentSim.averageHappiness()

    if (this.populationLabel) {
      this.populationLabel.textContent = population.toLocaleString('ja-JP')
    }
    if (this.housedLabel) {
      this.housedLabel.textContent = `${housed}/${population}`
    }
    if (this.employmentLabel) {
      this.employmentLabel.textContent = `${employed}/${population}`
    }
    if (this.happinessLabel) {
      this.happinessLabel.textContent = `${happiness}%`
    }
    if (this.fundsLabel) {
      this.fundsLabel.textContent = this.treasury.funds.toLocaleString('ja-JP')
    }
  }

  private setTool(tool: BuildTool): void {
    this.selectedTool = tool
    this.input.setDefaultCursor(isEditTool(tool) ? 'crosshair' : 'default')
    if (tool === BuildTool.None) {
      this.hoverTile = undefined
      this.hoverGraphics?.clear()
      this.hoverPreview?.setVisible(false)
      return
    }

    this.redrawHover()
  }

  private setPaintMode(mode: PaintMode): void {
    this.paintMode = mode
  }

  private createTileSprites(): void {
    for (const sprite of this.tileSprites) {
      sprite.destroy()
    }
    this.tileSprites = []

    const { tileSize, pixelWidth, pixelHeight } = this.worldMap

    this.worldMap.forEachTile((x, y, tile) => {
      const image = this.add
        .image(x * tileSize, y * tileSize, TILE_TEXTURE_KEY, this.tileFrame(x, y, tile.type))
        .setOrigin(0)
        .setDepth(0)
        .setDisplaySize(tileSize, tileSize)
      this.tileSprites.push(image)
    })

    const edge = this.add.graphics().setDepth(1)
    edge.lineStyle(2, MAP_EDGE, 1)
    edge.strokeRect(0, 0, pixelWidth, pixelHeight)
  }

  private setupCamera(): void {
    const camera = this.cameras.main
    camera.setBackgroundColor(0x4a8a28)
    camera.setRoundPixels(false)
    this.fitMapInView()

    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.cameras.resize(this.scale.gameSize.width, this.scale.gameSize.height)
      this.refreshCameraBounds()
    })
  }

  private fitMapInView(): void {
    const camera = this.cameras.main
    const zoom = Phaser.Math.Clamp(
      Math.min(
        camera.width / this.worldMap.pixelWidth,
        camera.height / this.worldMap.pixelHeight,
      ) * 0.94,
      MIN_CAMERA_ZOOM,
      MAX_CAMERA_ZOOM,
    )

    camera.setZoom(zoom)
    this.refreshCameraBounds()
    camera.centerOn(this.worldMap.pixelWidth / 2, this.worldMap.pixelHeight / 2)
  }

  private refreshCameraBounds(): void {
    const camera = this.cameras.main
    const extraX = Math.max(0, camera.width / camera.zoom - this.worldMap.pixelWidth)
    const extraY = Math.max(0, camera.height / camera.zoom - this.worldMap.pixelHeight)

    camera.setBounds(
      -extraX / 2,
      -extraY / 2,
      this.worldMap.pixelWidth + extraX,
      this.worldMap.pixelHeight + extraY,
    )
  }

  private setupCameraControls(): void {
    this.input.mouse?.disableContextMenu()

    const cursors = this.input.keyboard?.createCursorKeys()
    if (cursors) {
      this.camControl = new Phaser.Cameras.Controls.FixedKeyControl({
        camera: this.cameras.main,
        left: cursors.left,
        right: cursors.right,
        up: cursors.up,
        down: cursors.down,
        speed: 0.7,
      })
    }

    this.input.on(
      Phaser.Input.Events.POINTER_MOVE,
      (pointer: Phaser.Input.Pointer) => {
        if (pointer.rightButtonDown()) {
          const camera = this.cameras.main
          camera.scrollX -= (pointer.x - pointer.prevPosition.x) / camera.zoom
          camera.scrollY -= (pointer.y - pointer.prevPosition.y) / camera.zoom
          return
        }

        this.updateHover(pointer)

        if (
          this.paintMode === PaintMode.Drag &&
          pointer.leftButtonDown() &&
          isEditTool(this.selectedTool) &&
          this.hoverTile
        ) {
          this.applyTool(this.hoverTile.x, this.hoverTile.y)
        }
      },
    )

    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (
        pointer: Phaser.Input.Pointer,
        _currentlyOver: unknown,
        _deltaX: number,
        deltaY: number,
      ) => {
        const camera = this.cameras.main
        const before = camera.getWorldPoint(pointer.x, pointer.y)
        const nextZoom = Phaser.Math.Clamp(
          camera.zoom * (deltaY > 0 ? 0.9 : 1.1),
          MIN_CAMERA_ZOOM,
          MAX_CAMERA_ZOOM,
        )

        camera.setZoom(nextZoom)
        this.refreshCameraBounds()

        const after = camera.getWorldPoint(pointer.x, pointer.y)
        camera.scrollX += before.x - after.x
        camera.scrollY += before.y - after.y
        this.updateHover(pointer)
      },
    )
  }

  private setupBuildingInput(): void {
    this.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (pointer: Phaser.Input.Pointer) => {
        if (!isEditTool(this.selectedTool) || !pointer.leftButtonDown()) {
          return
        }

        const tile = this.tileFromPointer(pointer)
        if (!tile) {
          return
        }

        this.applyTool(tile.x, tile.y)
      },
    )
  }

  private updateHover(pointer: Phaser.Input.Pointer): void {
    if (!isEditTool(this.selectedTool) || !this.hoverGraphics) {
      return
    }

    const tile = this.tileFromPointer(pointer)
    if (this.hoverTile?.x === tile?.x && this.hoverTile?.y === tile?.y) {
      return
    }

    this.hoverTile = tile
    this.redrawHover()
  }

  private redrawHover(): void {
    const graphics = this.hoverGraphics
    if (!graphics || !isEditTool(this.selectedTool)) {
      return
    }

    graphics.clear()
    this.hoverPreview?.setVisible(false)
    if (!this.hoverTile) {
      return
    }

    const { x, y } = this.hoverTile
    const size = this.worldMap.tileSize

    if (this.selectedTool === BuildTool.Erase) {
      const canClear = this.worldMap.canClear(x, y)
      graphics.lineStyle(2, canClear ? HOVER_INVALID : HOVER_VALID, 0.95)
      if (canClear) {
        graphics.fillStyle(HOVER_INVALID, 0.28)
        graphics.fillRect(x * size + 1, y * size + 1, size - 2, size - 2)
      }
      graphics.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2)
      return
    }

    const canAfford =
      !isBuildingTool(this.selectedTool) ||
      this.treasury.canAfford(BUILDINGS[this.selectedTool].cost)
    const canPlace = this.worldMap.canPlace(x, y) && canAfford
    const previewFrame =
      canPlace && isBuildingTool(this.selectedTool)
        ? buildingTileKey(
            BUILDINGS[this.selectedTool].tileType,
            this.worldMap.roadConnections(x, y),
          )
        : undefined

    if (previewFrame && this.hoverPreview) {
      this.hoverPreview.setFrame(previewFrame)
      this.hoverPreview.setDisplaySize(size, size)
      this.hoverPreview.setPosition(x * size, y * size)
      this.hoverPreview.setVisible(true)
      graphics.lineStyle(2, HOVER_VALID, 0.9)
    } else {
      graphics.lineStyle(2, HOVER_INVALID, 0.95)
    }

    graphics.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2)
  }

  private applyTool(x: number, y: number): void {
    if (this.selectedTool === BuildTool.Erase) {
      this.eraseTile(x, y)
      return
    }

    this.placeSelected(x, y)
  }

  private placeSelected(x: number, y: number): void {
    if (!isBuildingTool(this.selectedTool)) {
      return
    }

    const building = BUILDINGS[this.selectedTool]
    if (!this.treasury.canAfford(building.cost)) {
      return
    }
    if (!this.worldMap.place(x, y, building.tileType)) {
      return
    }

    this.treasury.spend(building.cost)
    this.paintAround(x, y)
    this.residentSim?.refreshHousing()
    this.residentSim?.refreshJobs()
    this.renderCityHud()
    this.redrawHover()
    this.persistGame()
  }

  private eraseTile(x: number, y: number): void {
    if (!this.worldMap.clear(x, y)) {
      return
    }

    this.paintAround(x, y)
    this.residentSim?.refreshHousing()
    this.residentSim?.refreshJobs()
    this.redrawHover()
    this.persistGame()
  }

  private paintAround(x: number, y: number): void {
    this.paintTile(x, y)
    this.paintTile(x, y - 1)
    this.paintTile(x + 1, y)
    this.paintTile(x, y + 1)
    this.paintTile(x - 1, y)
  }

  private tileFrame(x: number, y: number, type = this.worldMap.getTile(x, y)?.type): string {
    if (!type || type === TileType.Vacant) {
      return vacantTileKey(x, y)
    }

    return (
      buildingTileKey(type, this.worldMap.roadConnections(x, y)) ?? vacantTileKey(x, y)
    )
  }

  private paintTile(x: number, y: number): void {
    const sprite = this.tileSprites[y * this.worldMap.width + x]
    const tile = this.worldMap.getTile(x, y)
    if (!sprite || !tile) {
      return
    }

    sprite.setFrame(this.tileFrame(x, y, tile.type))
    sprite.setDisplaySize(this.worldMap.tileSize, this.worldMap.tileSize)
  }

  private jobTypeOf(
    workplace: { x: number; y: number } | undefined,
  ): TileType | undefined {
    if (!workplace) {
      return undefined
    }

    return this.worldMap.getTile(workplace.x, workplace.y)?.type
  }

  private tileFromPointer(pointer: Phaser.Input.Pointer): { x: number; y: number } | undefined {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    return this.worldMap.worldToTile(worldPoint.x, worldPoint.y)
  }
}
