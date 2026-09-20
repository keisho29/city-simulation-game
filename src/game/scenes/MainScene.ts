import Phaser from 'phaser'
import { createWorldArt, GRASS_CELL_PX, GRASS_TEXTURE_KEY, preloadWorldArt, PROP_TEXTURE, residentTextureKey, RAIL_TEXTURE_KEY, ROAD_TEXTURE_KEY, TRAIN_TEXTURE_KEY, BOAT_TEXTURE_KEY, WATER_TEXTURE_KEY, textureForProp } from '../art/createWorldArt.ts'
import {
  RESIDENT_DISPLAY_HEIGHT,
  RESIDENT_DISPLAY_WIDTH,
  residentArtKey,
} from '../art/residentArt.ts'
import { buildingTileKey, decoKind, decoOffset, PROP_LAYOUT } from '../art/tileArt.ts'
import {
  BUILDINGS,
  BuildTool,
  isBuildingTool,
  isEditTool,
  PaintMode,
} from '../buildings/catalog.ts'
import {
  BUILDING_SCALE_PER_LEVEL,
  DEV_FREEZE_FUNDS,
  GameSpeed,
  INITIAL_FUNDS,
  START_VIEW_TILES,
  ZOOM_STEP,
  snapZoom,
} from '../constants.ts'
import { Treasury } from '../economy/treasury.ts'
import { cityDemands } from '../city/demands.ts'
import { eventDisplayName } from '../city/events.ts'
import { StockKind } from '../economy/goods.ts'
import { buildingTint } from '../map/growth.ts'
import { tileDetailView } from '../map/inspectTile.ts'
import { averageLandValue } from '../map/landValue.ts'
import { isGrowableType, isWaterTerrain, Terrain, TileType } from '../map/tile.ts'
import { cityDevelopment } from '../progress/development.ts'
import { EraId, ERAS, eraMapEdge, eraName, eraRoadTint } from '../progress/era.ts'
import {
  advanceEra,
  discoveredTechLabel,
  eraAdvanceView,
  eraHudName,
  isBuildingUnlocked,
} from '../progress/progress.ts'
import { techName } from '../progress/tech.ts'
import { inspectResident, residentDetailView } from '../residents/inspect.ts'
import { ResidentSim } from '../residents/ResidentSim.ts'
import {
  SAVE_VERSION,
  clearSnapshot,
  loadSnapshot,
  writeSnapshot,
} from '../save/save.ts'
import { GameTime } from '../time/gameTime.ts'
import { bindBuildMenu, type BuildMenu } from '../ui/buildMenu.ts'
import { bindClearGame } from '../ui/clearGame.ts'
import { bindResidentPanel } from '../ui/residentPanel.ts'
import { bindSpeedMenu, type SpeedMenu } from '../ui/speedMenu.ts'
import { bindWorldMap, type WorldMapUi } from '../ui/worldMap.ts'
import { showToast } from '../ui/toast.ts'
import { REGIONS, linkLabel, regionGrassTint, regionName, type RegionId } from '../world/regions.ts'
import { WorldSession } from '../world/WorldSession.ts'

const MAP_EDGE = 0x3d7a18
const HOVER_VALID = 0xfff1a8
const HOVER_INVALID = 0xc4453c
const SELECT_RING = 0xfff176
const SAVE_INTERVAL_MS = 5000

export class MainScene extends Phaser.Scene {
  private world = new WorldSession()
  private worldMap = this.world.active.map
  private camControl: Phaser.Cameras.Controls.FixedKeyControl | undefined
  private tileSprites: Phaser.GameObjects.Image[] = []
  private propSprites: Phaser.GameObjects.Image[] = []
  private grassField: Phaser.GameObjects.TileSprite | undefined
  private mapEdge: Phaser.GameObjects.Graphics | undefined
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
  private fundsNote: HTMLElement | null = null
  private landValueLabel: HTMLElement | null = null
  private demandsLabel: HTMLElement | null = null
  private foodLabel: HTMLElement | null = null
  private woodLabel: HTMLElement | null = null
  private goodsLabel: HTMLElement | null = null
  private eventLabel: HTMLElement | null = null
  private transitLabel: HTMLElement | null = null
  private regionLabel: HTMLElement | null = null
  private climateLabel: HTMLElement | null = null
  private linksLabel: HTMLElement | null = null
  private eraLabel: HTMLElement | null = null
  private developmentLabel: HTMLElement | null = null
  private techLabel: HTMLElement | null = null
  private advanceEraButton: HTMLButtonElement | null = null
  private eraReadyTold = false
  private residentSim: ResidentSim | undefined
  private treasury = new Treasury(INITIAL_FUNDS)
  private residentMarkers: Phaser.GameObjects.Image[] = []
  private vehicleSprites: Phaser.GameObjects.Image[] = []
  private saveAccumMs = 0
  private selectedResidentId: string | undefined
  private selectedTile: { x: number; y: number } | undefined
  private lastBuildingLevel = new Uint8Array(0)
  private inspectGraphics: Phaser.GameObjects.Graphics | undefined
  private residentPanel = bindResidentPanel()
  private buildMenu: BuildMenu | undefined
  private speedMenu: SpeedMenu | undefined
  private worldMapUi: WorldMapUi | undefined

  constructor() {
    super('MainScene')
  }

  preload(): void {
    preloadWorldArt(this)
  }

  create(): void {
    createWorldArt(this)
    this.hoverGraphics = this.add.graphics().setDepth(60)
    this.inspectGraphics = this.add.graphics().setDepth(80)
    this.hoverPreview = this.add
      .image(0, 0, PROP_TEXTURE.house)
      .setOrigin(0.5, 0.94)
      .setAlpha(0.55)
      .setDepth(70)
      .setVisible(false)
    this.setupCamera()
    this.setupCameraControls()
    this.setupBuildingInput()
    this.buildMenu = bindBuildMenu({
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
    this.fundsNote = document.querySelector('#hud-funds-note')
    this.landValueLabel = document.querySelector('#hud-land-value')
    this.demandsLabel = document.querySelector('#hud-demands')
    this.foodLabel = document.querySelector('#hud-food')
    this.woodLabel = document.querySelector('#hud-wood')
    this.goodsLabel = document.querySelector('#hud-goods')
    this.eventLabel = document.querySelector('#hud-event')
    this.transitLabel = document.querySelector('#hud-transit')
    this.regionLabel = document.querySelector('#hud-region')
    this.climateLabel = document.querySelector('#hud-climate')
    this.linksLabel = document.querySelector('#hud-links')
    this.eraLabel = document.querySelector('#hud-era')
    this.developmentLabel = document.querySelector('#hud-development')
    this.techLabel = document.querySelector('#hud-tech')
    this.advanceEraButton = document.querySelector('#advance-era')
    this.advanceEraButton?.addEventListener('click', () => this.tryAdvanceEra())
    this.residentPanel.onClose(() => this.clearResidentInspect())
    this.renderDate()
    this.renderClock()
    this.loadOrStartGame()
    this.speedMenu = bindSpeedMenu((speed) => {
      this.gameTime.setSpeed(speed)
      this.persistGame()
    }, this.gameTime.speed)
    bindClearGame(() => this.startNewGame())
    this.worldMapUi = bindWorldMap((id) => this.switchRegion(id))
    this.createTileSprites()
    this.createResidentMarkers()
    this.applyEraLook()
    this.renderCityHud()
    this.setupAutosave()
  }

  update(_time: number, delta: number): void {
    this.camControl?.update(delta)
    if (this.gameTime.update(delta)) {
      this.renderDate()
    }
    this.renderClock()

    this.world.tick(
      delta,
      this.gameTime.speed,
      this.gameTime.hour,
      this.gameTime.isHoliday,
      this.treasury,
    )
    this.residentSim = this.world.active.sim
    this.worldMap = this.world.active.map
    if (this.residentSim && this.residentMarkers.length !== this.residentSim.residents.length) {
      this.createResidentMarkers()
    }
    this.syncBuildingVisuals()
    this.syncResidentMarkers()
    this.syncVehicleSprites()
    this.renderInspectedResident()
    this.flushDiscoveries()
    this.renderCityHud()

    this.saveAccumMs += delta
    if (this.saveAccumMs >= SAVE_INTERVAL_MS) {
      this.saveAccumMs = 0
      this.persistGame()
    }
  }

  private loadOrStartGame(): void {
    const snapshot = loadSnapshot(window.localStorage)
    if (snapshot && snapshot.mapWidth === 50 && snapshot.mapHeight === 50) {
      this.world = new WorldSession(snapshot.progress, snapshot.world)
      this.gameTime.restore({
        year: snapshot.year,
        month: snapshot.month,
        day: snapshot.day,
        elapsedMs: snapshot.elapsedMs,
        speed: snapshot.speed,
      })
      this.treasury.applyLoadedFunds(snapshot.funds)
      this.bindActiveRegion()
      this.renderDate()
      this.renderClock()
      return
    }

    this.world = new WorldSession()
    this.bindActiveRegion()
  }

  private bindActiveRegion(): void {
    this.worldMap = this.world.active.map
    this.residentSim = this.world.active.sim
  }

  private startNewGame(): void {
    clearSnapshot(window.localStorage)
    this.world = new WorldSession()
    this.bindActiveRegion()
    this.gameTime.reset()
    this.treasury = new Treasury(INITIAL_FUNDS)
    this.saveAccumMs = 0
    this.eraReadyTold = false
    this.clearResidentInspect()
    this.buildMenu?.setPaintMode(PaintMode.Click)
    this.buildMenu?.setTool(BuildTool.None)
    this.speedMenu?.apply(GameSpeed.X1)
    this.createTileSprites()
    this.createResidentMarkers()
    this.fitMapInView()
    this.applyEraLook()
    this.renderDate()
    this.renderClock()
    this.renderCityHud()
    this.persistGame()
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
      event: this.residentSim.cityEvent,
      progress: this.world.progress,
      transit: this.residentSim.transit.stats,
      world: this.world.snapshot(),
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
          residentTextureKey(residentArtKey(resident, jobType)),
        )
        .setOrigin(0.5, 1)
        .setDepth(40)
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
      const textureKey = residentTextureKey(frame)
      if (sprite.texture.key !== textureKey) {
        sprite.setTexture(textureKey)
        sprite.setDisplaySize(RESIDENT_DISPLAY_WIDTH, RESIDENT_DISPLAY_HEIGHT)
      }

      sprite.setPosition(resident.worldX, resident.worldY)
      sprite.setDepth(40 + resident.worldY / this.worldMap.tileSize)
    })
  }

  private syncVehicleSprites(): void {
    const vehicles = this.residentSim?.transit.vehicles ?? []
    while (this.vehicleSprites.length > vehicles.length) {
      this.vehicleSprites.pop()?.destroy()
    }
    while (this.vehicleSprites.length < vehicles.length) {
      const vehicle = vehicles[this.vehicleSprites.length]
      const key = vehicle?.kind === 'boat' ? BOAT_TEXTURE_KEY : TRAIN_TEXTURE_KEY
      this.vehicleSprites.push(
        this.add.image(0, 0, key).setOrigin(0.5, 0.7).setDepth(35),
      )
    }

    vehicles.forEach((vehicle, index) => {
      const sprite = this.vehicleSprites[index]
      if (!sprite) {
        return
      }
      const key = vehicle.kind === 'boat' ? BOAT_TEXTURE_KEY : TRAIN_TEXTURE_KEY
      if (sprite.texture.key !== key) {
        sprite.setTexture(key)
      }
      const layout = PROP_LAYOUT[vehicle.kind] ?? PROP_LAYOUT.train
      sprite.setPosition(vehicle.worldX, vehicle.worldY)
      sprite.setDisplaySize(
        this.worldMap.tileSize * layout.width,
        this.worldMap.tileSize * layout.height,
      )
      sprite.setDepth(36 + vehicle.worldY / this.worldMap.tileSize)
      sprite.setVisible(true)
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
    if (this.fundsNote) {
      this.fundsNote.hidden = !DEV_FREEZE_FUNDS
    }
    if (this.landValueLabel) {
      this.landValueLabel.textContent = `${Math.round(averageLandValue(this.worldMap) * REGIONS[this.world.activeId].land)}`
    }
    if (this.demandsLabel) {
      const extra = this.world.supplyFor(this.world.activeId)
      const demands = cityDemands(this.worldMap, this.residentSim.residents, extra)
      const trade = this.world.tradeHintFor(this.world.activeId)
      this.demandsLabel.textContent =
        demands.length > 0 ? demands.join('、') : trade ? trade : 'なし'
    }
    if (this.foodLabel) {
      this.foodLabel.textContent = `${Math.floor(this.worldMap.totalStock(StockKind.Food))}`
    }
    if (this.woodLabel) {
      this.woodLabel.textContent = `${Math.floor(this.worldMap.totalStock(StockKind.Wood))}`
    }
    if (this.goodsLabel) {
      this.goodsLabel.textContent = `${Math.floor(this.worldMap.totalStock(StockKind.Goods))}`
    }
    if (this.eventLabel) {
      this.eventLabel.textContent = eventDisplayName(this.residentSim.cityEvent)
    }
    if (this.transitLabel) {
      const transit = this.residentSim.transit.summary(this.worldMap, this.residentSim.residents)
      this.transitLabel.textContent =
        transit.riders + transit.riding + transit.upkeep > 0
          ? `乗降${transit.riders} 乗車${transit.riding} 維持${transit.upkeep}`
          : '徒歩'
    }
    if (this.eraLabel) {
      this.eraLabel.textContent = eraHudName(this.world.progress)
    }
    if (this.regionLabel) {
      this.regionLabel.textContent = regionName(this.world.activeId)
    }
    if (this.climateLabel) {
      this.climateLabel.textContent = REGIONS[this.world.activeId].climate
    }
    if (this.linksLabel) {
      this.linksLabel.textContent = linkLabel(
        this.world.activeId,
        new Map(
          this.world.regions
            .filter((region) => region.unlocked)
            .map((region) => [region.id, region.map]),
        ),
        new Set(this.world.regions.filter((region) => region.unlocked).map((region) => region.id)),
      )
    }
    if (this.developmentLabel) {
      this.developmentLabel.textContent = `${cityDevelopment(this.worldMap, this.residentSim.residents)}`
    }
    if (this.techLabel) {
      this.techLabel.textContent = discoveredTechLabel(this.world.progress)
    }
    this.syncProgressUi()
    this.worldMapUi?.render(this.world)
  }

  private flushDiscoveries(): void {
    const discoveries = this.world.takeDiscoveries()
    for (const id of discoveries) {
      showToast(`技術を発見：${techName(id)}`)
      if (id === 'literacy') {
        showToast('寺子屋が建てられるようになった')
      }
      if (id === 'industry') {
        showToast('工場が建てられるようになった')
      }
      if (id === 'logistics') {
        showToast('港が建てられるようになった')
      }
      if (id === 'railways') {
        showToast('駅と線路が建てられるようになった')
      }
    }
    this.flushWorldNews()
    if (discoveries.length > 0) {
      this.syncProgressUi()
    }
  }

  private flushWorldNews(): void {
    for (const id of this.world.lastUnlocks) {
      showToast(`${regionName(id)}が開かれた`)
    }
    this.world.lastUnlocks = []
    for (const note of this.world.lastMoves) {
      showToast(note)
    }
    this.world.lastMoves = []
  }

  private syncProgressUi(): void {
    if (!this.residentSim) {
      return
    }
    this.buildMenu?.setBuildingLocks((id) => isBuildingUnlocked(id, this.world.progress))
    const view = eraAdvanceView(
      this.world.progress,
      this.worldMap,
      this.residentSim.residents,
    )
    if (this.advanceEraButton) {
      this.advanceEraButton.hidden = !view.ready
      this.advanceEraButton.textContent = `1800年代へ進む`
    }
    if (view.ready && !this.eraReadyTold) {
      this.eraReadyTold = true
      showToast('1800年代へ進めるようになった')
    }
  }

  private tryAdvanceEra(): void {
    if (!this.residentSim) {
      return
    }
    const view = eraAdvanceView(
      this.world.progress,
      this.worldMap,
      this.residentSim.residents,
    )
    if (!view.ready) {
      return
    }
    const next = advanceEra(this.world.progress)
    if (!next) {
      return
    }
    const startYear = ERAS[next].startYear
    if (this.gameTime.year < startYear) {
      this.gameTime.year = startYear
      this.gameTime.month = 1
      this.gameTime.day = 1
    }
    this.eraReadyTold = false
    showToast(`時代が${eraName(next)}になった`)
    this.applyEraLook()
    this.renderDate()
    this.renderCityHud()
    this.persistGame()
  }

  private applyEraLook(): void {
    const era = this.world.progress.era
    document.body.dataset.era = era
    this.grassField?.setTint(regionGrassTint(this.world.activeId, era))
    if (this.mapEdge) {
      this.mapEdge.clear()
      this.mapEdge.lineStyle(2, eraMapEdge(era), 1)
      this.mapEdge.strokeRect(0, 0, this.worldMap.pixelWidth, this.worldMap.pixelHeight)
    }
    this.worldMap.forEachTile((x, y) => this.paintTile(x, y))
  }

  private switchRegion(id: RegionId): void {
    if (!this.world.switchTo(id)) {
      return
    }
    this.bindActiveRegion()
    this.clearResidentInspect()
    this.createTileSprites()
    this.createResidentMarkers()
    this.fitMapInView()
    this.applyEraLook()
    this.renderCityHud()
    this.persistGame()
    showToast(`${regionName(id)}に移った`)
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
    this.grassField?.destroy()
    this.mapEdge?.destroy()
    for (const sprite of this.tileSprites) {
      sprite.destroy()
    }
    for (const sprite of this.propSprites) {
      sprite.destroy()
    }
    this.tileSprites = []
    this.propSprites = []
    this.lastBuildingLevel = new Uint8Array(this.worldMap.tileCount)

    const { tileSize, pixelWidth, pixelHeight } = this.worldMap
    this.grassField = this.add
      .tileSprite(0, 0, pixelWidth, pixelHeight, GRASS_TEXTURE_KEY)
      .setOrigin(0)
      .setDepth(0)
    const grassCell = GRASS_CELL_PX
    this.grassField.setTileScale(tileSize / grassCell, tileSize / grassCell)

    this.worldMap.forEachTile((x, y) => {
      const ground = this.add
        .image(x * tileSize, y * tileSize, ROAD_TEXTURE_KEY, 'road-0')
        .setOrigin(0.5)
        .setDepth(1)
        .setVisible(false)
      const prop = this.add
        .image(x * tileSize, y * tileSize, PROP_TEXTURE.house)
        .setOrigin(0.5, 0.9)
        .setDepth(20 + y)
        .setVisible(false)
      this.tileSprites.push(ground)
      this.propSprites.push(prop)
      this.paintTile(x, y)
    })

    this.mapEdge = this.add.graphics().setDepth(200)
    this.mapEdge.lineStyle(2, MAP_EDGE, 1)
    this.mapEdge.strokeRect(0, 0, pixelWidth, pixelHeight)
  }

  private setupCamera(): void {
    const camera = this.cameras.main
    camera.setBackgroundColor(0xa8dc3c)
    camera.setRoundPixels(true)
    this.fitMapInView()

    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.cameras.resize(this.scale.gameSize.width, this.scale.gameSize.height)
      this.refreshCameraBounds()
    })
  }

  private fitMapInView(): void {
    const camera = this.cameras.main
    const viewWidth = START_VIEW_TILES * this.worldMap.tileSize
    const zoom = snapZoom(
      Math.min(camera.width / viewWidth, camera.height / viewWidth),
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
        const nextZoom = snapZoom(camera.zoom + (deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP))
        if (nextZoom === camera.zoom) {
          return
        }

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
        if (!pointer.leftButtonDown()) {
          return
        }

        if (this.selectedTool === BuildTool.None) {
          this.inspectAt(pointer)
          return
        }

        if (!isEditTool(this.selectedTool)) {
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
    const tileType = isBuildingTool(this.selectedTool)
      ? BUILDINGS[this.selectedTool].tileType
      : undefined
    const canPlace = Boolean(tileType) && this.worldMap.canPlace(x, y, tileType) && canAfford
    const connections =
      tileType === TileType.Rail
        ? this.worldMap.railConnections(x, y)
        : this.worldMap.roadConnections(x, y)
    const previewFrame =
      canPlace && tileType ? buildingTileKey(tileType, connections) : undefined

    if (previewFrame && this.hoverPreview) {
      this.layoutHoverPreview(previewFrame, x, y)
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
    if (this.residentSim && !isBuildingUnlocked(this.selectedTool, this.world.progress)) {
      return
    }
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
    this.world.lastUnlocks = this.world.tryUnlock()
    this.flushWorldNews()
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

  private layoutHoverPreview(frame: string, x: number, y: number): void {
    if (!this.hoverPreview) {
      return
    }

    if (frame.startsWith('rail-')) {
      this.hoverPreview.setTexture(RAIL_TEXTURE_KEY, frame)
    } else if (frame.startsWith('road-')) {
      this.hoverPreview.setTexture(ROAD_TEXTURE_KEY, frame)
    } else {
      this.hoverPreview.setTexture(textureForProp(frame))
    }
    this.placeVisual(this.hoverPreview, frame, x, y)
  }

  private placeVisual(
    sprite: Phaser.GameObjects.Image,
    frame: string,
    x: number,
    y: number,
  ): void {
    const size = this.worldMap.tileSize
    const layoutKey = frame.startsWith('road-') ? 'road' : frame.startsWith('rail-') ? 'rail' : frame
    const layout = PROP_LAYOUT[layoutKey] ?? PROP_LAYOUT.house
    const tile = this.worldMap.getTile(x, y)
    const forestTree = tile?.terrain === Terrain.Forest && (frame === 'tree' || frame === 'bush')
    const jitter =
      forestTree
        ? { x: 0, y: 0 }
        : frame === 'tree' || frame === 'bush' || frame === 'flower'
          ? decoOffset(x, y)
          : { x: 0, y: 0 }
    const width = size * layout.width
    const height = size * layout.height
    const growable = Boolean(
      tile && isGrowableType(tile.type) && !frame.startsWith('road-') && !frame.startsWith('rail-'),
    )
    const level = growable && tile ? tile.level : 1
    const variant = tile?.variant ?? 0
    const boost = growable ? 1 + (level - 1) * BUILDING_SCALE_PER_LEVEL : 1

    sprite.setOrigin(layout.originX, layout.originY)
    sprite.setPosition(
      x * size + size / 2 + jitter.x,
      y * size + size * layout.originY + jitter.y,
    )
    sprite.setDisplaySize(width * boost, height * boost)
    const era = this.world.progress.era
    if (frame.startsWith('road-')) {
      sprite.setTint(eraRoadTint(era))
    } else if (frame.startsWith('rail-')) {
      sprite.setTint(era === EraId.Meiji ? 0xd0ccc4 : 0xb8b0a4)
    } else if (growable && tile) {
      sprite.setTint(buildingTint(tile.type, level, variant, era))
    } else {
      sprite.clearTint()
    }
    sprite.setDepth(
      frame.startsWith('road-') ||
        frame.startsWith('rail-') ||
        frame === 'flower' ||
        frame === 'water' ||
        frame === 'river'
        ? 1 + y * 0.02
        : 18 + y,
    )
  }

  private paintTile(x: number, y: number): void {
    const index = y * this.worldMap.width + x
    const ground = this.tileSprites[index]
    const prop = this.propSprites[index]
    const tile = this.worldMap.getTile(x, y)
    if (!ground || !prop || !tile) {
      return
    }

    this.lastBuildingLevel[index] = isGrowableType(tile.type) ? tile.level : 0

    if (tile.type === TileType.Road) {
      const frame = buildingTileKey(tile.type, this.worldMap.roadConnections(x, y)) ?? 'road-0'
      ground.setVisible(true)
      ground.setTexture(ROAD_TEXTURE_KEY, frame)
      this.placeVisual(ground, frame, x, y)
      prop.setVisible(false)
      return
    }

    if (tile.type === TileType.Rail) {
      const frame = buildingTileKey(tile.type, this.worldMap.railConnections(x, y)) ?? 'rail-0'
      ground.setVisible(true)
      ground.setTexture(RAIL_TEXTURE_KEY, frame)
      this.placeVisual(ground, frame, x, y)
      prop.setVisible(false)
      return
    }

    ground.setVisible(false)

    if (isWaterTerrain(tile.terrain)) {
      const frame = tile.terrain === Terrain.River ? 'river' : 'water'
      ground.setVisible(true)
      ground.setTexture(WATER_TEXTURE_KEY, frame)
      this.placeVisual(ground, frame, x, y)
      prop.setVisible(false)
      return
    }

    const buildingFrame = buildingTileKey(tile.type)
    if (buildingFrame) {
      prop.setVisible(true)
      prop.setTexture(textureForProp(buildingFrame))
      this.placeVisual(prop, buildingFrame, x, y)
      return
    }

    if (tile.terrain === Terrain.Forest) {
      const frame = hashForest(x, y)
      prop.setVisible(true)
      prop.setTexture(textureForProp(frame))
      this.placeVisual(prop, frame, x, y)
      return
    }

    if (tile.terrain === Terrain.Rock) {
      prop.setVisible(true)
      prop.setTexture(textureForProp('rock'))
      this.placeVisual(prop, 'rock', x, y)
      return
    }

    const deco = decoKind(x, y)
    if (!deco) {
      prop.setVisible(false)
      return
    }

    prop.setVisible(true)
    prop.setTexture(textureForProp(deco))
    this.placeVisual(prop, deco, x, y)
  }

  private inspectAt(pointer: Phaser.Input.Pointer): void {
    if (!this.residentSim) {
      return
    }

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const tile = this.worldMap.worldToTile(worldPoint.x, worldPoint.y)
    const radius = Math.max(18, 28 / this.cameras.main.zoom)
    const resident = inspectResident(
      this.residentSim.residents,
      worldPoint.x,
      worldPoint.y,
      tile,
      radius,
    )
    this.selectedResidentId = resident?.id
    this.selectedTile = resident ? undefined : tile
    this.renderInspectedResident()
  }

  private clearResidentInspect(): void {
    this.selectedResidentId = undefined
    this.selectedTile = undefined
    this.renderInspectedResident()
  }

  private syncBuildingVisuals(): void {
    this.worldMap.forEachTile((x, y, tile) => {
      const index = y * this.worldMap.width + x
      const level = isGrowableType(tile.type) ? tile.level : 0
      if (this.lastBuildingLevel[index] === level) {
        return
      }
      this.paintTile(x, y)
    })
  }

  private renderInspectedResident(): void {
    const resident = this.residentSim?.residents.find(
      (entry) => entry.id === this.selectedResidentId,
    )
    if (resident) {
      this.residentPanel.render(residentDetailView(resident, this.jobTypeOf(resident.workplace)))
      this.inspectGraphics?.clear()
      this.inspectGraphics?.lineStyle(2, SELECT_RING, 0.95)
      this.inspectGraphics?.strokeCircle(
        resident.worldX,
        resident.worldY - RESIDENT_DISPLAY_HEIGHT * 0.5,
        11,
      )
      return
    }

    this.selectedResidentId = undefined
    if (this.selectedTile) {
      this.residentPanel.render(undefined, tileDetailView(this.worldMap, this.selectedTile.x, this.selectedTile.y))
      this.inspectGraphics?.clear()
      const size = this.worldMap.tileSize
      this.inspectGraphics?.lineStyle(2, SELECT_RING, 0.95)
      this.inspectGraphics?.strokeRect(
        this.selectedTile.x * size + 1,
        this.selectedTile.y * size + 1,
        size - 2,
        size - 2,
      )
      return
    }

    this.residentPanel.render()
    this.inspectGraphics?.clear()
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

function hashForest(x: number, y: number): 'tree' | 'bush' {
  return (x * 13 + y * 29) % 4 === 0 ? 'bush' : 'tree'
}
