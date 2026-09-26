import Phaser from 'phaser'
import {
  createWorldArt,
  preloadWorldArt,
  PROP_TEXTURE,
  residentTextureKey,
  RAIL_TEXTURE_KEY,
  ROAD_TEXTURE_KEY,
  TRAIN_TEXTURE_KEY,
  BOAT_TEXTURE_KEY,
  OCCUPANCY_BUBBLE_COUNT_KEY,
  OCCUPANCY_BUBBLE_KEY,
  WATER_TEXTURE_KEY,
  BRIDGE_TEXTURE_KEY,
  TERRAIN_TEXTURE_KEY,
  textureForProp,
} from '../art/createWorldArt.ts'
import { ISO_TILE_WIDTH, isoDepth, isoDiamondPoints, isoMapCorners } from '../art/iso.ts'
import {
  RESIDENT_DISPLAY_HEIGHT,
  residentArtKey,
  residentDisplaySize,
  residentFacingFromDelta,
  residentWalkPose,
  residentWalkTextureKey,
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
import { footprintCells, footprintSpan } from '../map/footprint.ts'
import { tileDetailView } from '../map/inspectTile.ts'
import { averageLandValue } from '../map/landValue.ts'
import { isGrowableType, isWaterTerrain, Terrain, TileType } from '../map/tile.ts'
import { cityDevelopment } from '../progress/development.ts'
import { ERAS, eraMapEdge, eraName, eraRailTint, eraRoadTint, eraTransitLabel, nextEra } from '../progress/era.ts'
import {
  advanceEra,
  discoveredTechLabel,
  eraAdvanceView,
  eraHudName,
  isBuildingUnlocked,
} from '../progress/progress.ts'
import { techName } from '../progress/tech.ts'
import { inspectResident, residentDetailView } from '../residents/inspect.ts'
import { indoorOccupancy, isResidentIndoor } from '../residents/occupancy.ts'
import { ResidentSim } from '../residents/ResidentSim.ts'
import {
  SAVE_VERSION,
  clearSnapshot,
  loadSnapshot,
  peekSaveLabel,
  writeSnapshot,
} from '../save/save.ts'
import { GameTime } from '../time/gameTime.ts'
import { bindBuildMenu, type BuildMenu } from '../ui/buildMenu.ts'
import { bindClearGame } from '../ui/clearGame.ts'
import { bindResidentPanel } from '../ui/residentPanel.ts'
import { bindSpeedMenu, type SpeedMenu } from '../ui/speedMenu.ts'
import { bindTitleScreen, hasSeenGuide, type TitleScreen } from '../ui/titleScreen.ts'
import { bindWorldMap, type WorldMapUi } from '../ui/worldMap.ts'
import { showToast } from '../ui/toast.ts'
import { REGIONS, areaName, countryName, linkLabel, regionGrassTint, regionName, type RegionId } from '../world/regions.ts'
import { WorldSession } from '../world/WorldSession.ts'
import { worldEventName } from '../world/events.ts'
import { fortuneLabel } from '../world/fortune.ts'

const MAP_EDGE = 0x5aaa32
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
  private countryLabel: HTMLElement | null = null
  private areaLabel: HTMLElement | null = null
  private industryLabel: HTMLElement | null = null
  private climateLabel: HTMLElement | null = null
  private linksLabel: HTMLElement | null = null
  private worldLabel: HTMLElement | null = null
  private eraLabel: HTMLElement | null = null
  private fortuneLabel: HTMLElement | null = null
  private worldEventLabel: HTMLElement | null = null
  private developmentLabel: HTMLElement | null = null
  private techLabel: HTMLElement | null = null
  private advanceEraButton: HTMLButtonElement | null = null
  private eraReadyTold = false
  private residentSim: ResidentSim | undefined
  private treasury = new Treasury(INITIAL_FUNDS)
  private residentMarkers: Phaser.GameObjects.Image[] = []
  private residentWalkDistance: number[] = []
  private occupancyMarkers: Array<{
    root: Phaser.GameObjects.Container
    bubble: Phaser.GameObjects.Image
    label: Phaser.GameObjects.Text
  }> = []
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
  private titleScreen: TitleScreen | undefined
  private sessionActive = false
  private pendingSpeed: GameSpeed = GameSpeed.X1

  constructor() {
    super('MainScene')
  }

  preload(): void {
    preloadWorldArt(this)
  }

  create(): void {
    createWorldArt(this)
    this.hoverGraphics = this.add.graphics().setDepth(300)
    this.inspectGraphics = this.add.graphics().setDepth(320)
    this.hoverPreview = this.add
      .image(0, 0, PROP_TEXTURE.house)
      .setOrigin(0.5, 0.92)
      .setAlpha(0.55)
      .setDepth(310)
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
    this.countryLabel = document.querySelector('#hud-country')
    this.areaLabel = document.querySelector('#hud-area')
    this.industryLabel = document.querySelector('#hud-industry')
    this.climateLabel = document.querySelector('#hud-climate')
    this.linksLabel = document.querySelector('#hud-links')
    this.worldLabel = document.querySelector('#hud-world')
    this.eraLabel = document.querySelector('#hud-era')
    this.fortuneLabel = document.querySelector('#hud-fortune')
    this.worldEventLabel = document.querySelector('#hud-world-event')
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
    bindClearGame(() => this.requestReset())
    this.worldMapUi = bindWorldMap((id) => this.switchRegion(id))
    this.titleScreen = bindTitleScreen({
      onStart: () => this.requestNewGame(),
      onContinue: () => this.continueGame(),
      onHowtoClose: () => this.enterPlay(),
    })
    document.querySelector('#save-game')?.addEventListener('click', () => this.saveNow())
    document.querySelector('#open-howto')?.addEventListener('click', () => {
      this.pauseForShell()
      this.titleScreen?.showHowto('play')
    })
    document.querySelector('#title-back')?.addEventListener('click', () => this.returnToTitle())
    this.createTileSprites()
    this.createResidentMarkers()
    this.applyEraLook()
    this.renderCityHud()
    this.setupAutosave()
    this.titleScreen?.showTitle()
    this.pauseForShell()
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
      { year: this.gameTime.year, month: this.gameTime.month },
    )
    this.residentSim = this.world.active.sim
    this.worldMap = this.world.active.map
    if (this.residentSim && this.residentMarkers.length !== this.residentSim.residents.length) {
      this.createResidentMarkers()
    }
    this.syncBuildingVisuals()
    this.syncResidentMarkers()
    this.syncOccupancyMarkers()
    this.syncVehicleSprites()
    this.renderInspectedResident()
    this.flushDiscoveries()
    this.renderCityHud()

    this.saveAccumMs += delta
    if (this.sessionActive && this.saveAccumMs >= SAVE_INTERVAL_MS) {
      this.saveAccumMs = 0
      this.persistGame()
    }
  }

  private loadOrStartGame(): void {
    const snapshot = loadSnapshot(window.localStorage)
    if (snapshot && snapshot.mapWidth === 50 && snapshot.mapHeight === 50) {
      this.world = new WorldSession(snapshot.progress, snapshot.world)
      this.pendingSpeed = snapshot.speed === GameSpeed.Pause ? GameSpeed.X1 : snapshot.speed
      this.gameTime.restore({
        year: snapshot.year,
        month: snapshot.month,
        day: snapshot.day,
        elapsedMs: snapshot.elapsedMs,
        speed: GameSpeed.Pause,
      })
      this.treasury.applyLoadedFunds(snapshot.funds)
      this.bindActiveRegion()
      this.renderDate()
      this.renderClock()
      return
    }

    this.world = new WorldSession()
    this.pendingSpeed = GameSpeed.X1
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
    this.pendingSpeed = GameSpeed.X1
    this.clearResidentInspect()
    this.buildMenu?.setPaintMode(PaintMode.Click)
    this.buildMenu?.setTool(BuildTool.None)
    this.createTileSprites()
    this.createResidentMarkers()
    this.fitMapInView()
    this.applyEraLook()
    this.renderDate()
    this.renderClock()
    this.renderCityHud()
    this.sessionActive = true
    this.persistGame()
  }

  private requestNewGame(): void {
    if (peekSaveLabel(window.localStorage) && !window.confirm('いまの街を消して、最初から始めますか？')) {
      return
    }
    this.startNewGame()
    if (!hasSeenGuide()) {
      this.pauseForShell()
      this.titleScreen?.showHowto('first')
      return
    }
    this.enterPlay()
  }

  private requestReset(): void {
    this.startNewGame()
    this.enterPlay()
    showToast('最初からやり直した')
  }

  private continueGame(): void {
    if (!peekSaveLabel(window.localStorage)) {
      return
    }
    this.sessionActive = true
    this.enterPlay()
  }

  private enterPlay(): void {
    this.sessionActive = true
    this.titleScreen?.hide()
    this.speedMenu?.apply(this.pendingSpeed === GameSpeed.Pause ? GameSpeed.X1 : this.pendingSpeed)
    this.renderCityHud()
  }

  private returnToTitle(): void {
    this.persistGame()
    this.pendingSpeed = this.gameTime.speed === GameSpeed.Pause ? GameSpeed.X1 : this.gameTime.speed
    this.sessionActive = false
    this.worldMapUi?.setOpen(false)
    this.pauseForShell()
    this.titleScreen?.refresh()
    this.titleScreen?.showTitle()
  }

  private saveNow(): void {
    this.persistGame()
    showToast('街を保存した')
  }

  private pauseForShell(): void {
    if (this.gameTime.speed !== GameSpeed.Pause) {
      this.pendingSpeed = this.gameTime.speed
    }
    this.speedMenu?.apply(GameSpeed.Pause)
  }

  private persistGame(): void {
    if (!this.sessionActive || !this.residentSim) {
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
    for (const marker of this.occupancyMarkers) {
      marker.root.destroy()
    }
    this.occupancyMarkers = []

    this.residentMarkers = this.residentSim.residents.map((resident) => {
      const jobType = this.jobTypeOf(resident.workplace)
      const sprite = this.add
        .image(
          resident.worldX,
          resident.worldY,
          residentTextureKey(
            residentWalkTextureKey(residentArtKey(resident, jobType), 'idle', 'front', resident.gender),
          ),
        )
        .setOrigin(0.5, 1)
        .setDepth(40)
      sprite.setData('facing', 'front')
      sprite.setData('flipX', false)
      sizeResidentSprite(sprite)
      return sprite
    })
    this.residentWalkDistance = this.residentSim.residents.map(() => 0)
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
      const dy = resident.worldY - sprite.y
      const step = Math.hypot(dx, dy)
      const heading = residentFacingFromDelta(dx, dy)
      if (heading) {
        sprite.setData('facing', heading.facing)
        sprite.setData('flipX', heading.flipX)
      }
      sprite.setFlipX(Boolean(sprite.getData('flipX')))
      const moving = step > 0.35
      this.residentWalkDistance[index] = moving
        ? (this.residentWalkDistance[index] ?? 0) + step
        : this.residentWalkDistance[index] ?? 0

      const jobType = this.jobTypeOf(resident.workplace)
      const pose = residentWalkPose(moving, this.residentWalkDistance[index] ?? 0)
      const facing = sprite.getData('facing') === 'back' ? 'back' : 'front'
      const textureKey = residentTextureKey(
        residentWalkTextureKey(residentArtKey(resident, jobType), pose, facing, resident.gender),
      )
      if (sprite.texture.key !== textureKey) {
        sprite.setTexture(textureKey)
        sizeResidentSprite(sprite)
      }

      sprite.setPosition(resident.worldX, resident.worldY)
      sprite.setVisible(!isResidentIndoor(resident))
      const tile = this.worldMap.worldToTile(resident.worldX, resident.worldY)
      sprite.setDepth(tile ? isoDepth(tile.x, tile.y, 18) : 40 + resident.worldY)
    })
  }

  private syncOccupancyMarkers(): void {
    if (!this.residentSim) {
      return
    }

    const groups = indoorOccupancy(this.residentSim.residents)
    while (this.occupancyMarkers.length > groups.length) {
      this.occupancyMarkers.pop()?.root.destroy()
    }
    while (this.occupancyMarkers.length < groups.length) {
      const bubble = this.add.image(0, 0, OCCUPANCY_BUBBLE_KEY).setOrigin(0.5, 1)
      const label = this.add
        .text(0, -16, '', {
          fontFamily: 'DotGothic16, "Yu Gothic", sans-serif',
          fontSize: '12px',
          color: '#3a2418',
          stroke: '#fff6e4',
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0.5)
      const root = this.add.container(0, 0, [bubble, label])
      this.occupancyMarkers.push({ root, bubble, label })
    }

    groups.forEach((group, index) => {
      const marker = this.occupancyMarkers[index]
      if (!marker) {
        return
      }
      const tile = this.worldMap.getTile(group.x, group.y)
      const frame = tile ? buildingTileKey(tile.type) : undefined
      const layout = PROP_LAYOUT[frame ?? 'house'] ?? PROP_LAYOUT.house
      const span = this.worldMap.placedSpan(group.x, group.y)
      const center = this.worldMap.visualCenter(group.x, group.y, span)
      const growable = Boolean(tile && isGrowableType(tile.type))
      const level = growable && tile ? tile.level : 1
      const boost = growable ? 1 + (level - 1) * BUILDING_SCALE_PER_LEVEL : 1
      const roofTop = center.y - layout.originY * this.worldMap.tileSize * layout.height * boost
      marker.root.setPosition(center.x, roofTop - 2)
      marker.root.setDepth(isoDepth(group.x + span - 1, group.y + span - 1, 30))
      marker.root.setVisible(true)
      const crowded = group.count >= 2
      const bubbleKey = crowded ? OCCUPANCY_BUBBLE_COUNT_KEY : OCCUPANCY_BUBBLE_KEY
      if (marker.bubble.texture.key !== bubbleKey) {
        marker.bubble.setTexture(bubbleKey)
      }
      marker.label.setText(crowded ? String(group.count) : '')
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
      const tile = this.worldMap.worldToTile(vehicle.worldX, vehicle.worldY)
      sprite.setDepth(tile ? isoDepth(tile.x, tile.y, 9) : 36 + vehicle.worldY)
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
      const demands = cityDemands(this.worldMap, this.residentSim.residents, {
        ...extra,
        era: this.world.progress.era,
        fortune: this.residentSim.fortune,
        progress: this.world.progress,
      })
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
          : eraTransitLabel(this.world.progress.era)
    }
    if (this.eraLabel) {
      this.eraLabel.textContent = eraHudName(this.world.progress)
    }
    if (this.fortuneLabel) {
      this.fortuneLabel.textContent = fortuneLabel(this.residentSim.fortune)
    }
    if (this.worldEventLabel) {
      this.worldEventLabel.textContent = worldEventName(this.world.worldEvent)
    }
    if (this.regionLabel) {
      this.regionLabel.textContent = regionName(this.world.activeId)
    }
    if (this.countryLabel) {
      this.countryLabel.textContent = countryName(REGIONS[this.world.activeId].country)
    }
    if (this.areaLabel) {
      this.areaLabel.textContent = areaName(REGIONS[this.world.activeId].area)
    }
    if (this.industryLabel) {
      this.industryLabel.textContent = REGIONS[this.world.activeId].industry
    }
    if (this.climateLabel) {
      this.climateLabel.textContent = REGIONS[this.world.activeId].climate
    }
    if (this.linksLabel) {
      this.linksLabel.textContent = linkLabel(
        this.world.activeId,
        new Map(
          this.world.regions
            .filter((region) => region.unlocked && region.map)
            .map((region) => [region.id, region.map!]),
        ),
        new Set(this.world.regions.filter((region) => region.unlocked).map((region) => region.id)),
      )
    }
    if (this.worldLabel) {
      const census = this.world.census()
      this.worldLabel.textContent = `${census.unlocked}/${census.total}都市 ${census.population}人`
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
      if (id === 'aviation') {
        showToast('空港が建てられるようになった')
      }
      if (id === 'automobiles') {
        showToast('道路の往来が速くなった')
      }
      if (id === 'electricity') {
        showToast('工房と工場の生産が上がった')
      }
      if (id === 'services') {
        showToast('商業と暮らしが広がった')
      }
      if (id === 'computing') {
        showToast('情報の技術が広がり始めた')
      }
      if (id === 'aerial') {
        showToast('未来の交通が動き始めた')
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
    for (const note of this.world.lastNews) {
      showToast(note)
    }
    this.world.lastNews = []
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
    const upcoming = nextEra(this.world.progress.era)
    if (this.advanceEraButton) {
      this.advanceEraButton.hidden = !view.ready || !upcoming
      this.advanceEraButton.textContent = upcoming ? `${eraName(upcoming)}へ進む` : '時代の終わり'
    }
    if (view.ready && upcoming && !this.eraReadyTold) {
      this.eraReadyTold = true
      showToast(`${eraName(upcoming)}へ進めるようになった`)
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
    this.world.recordHistory(this.gameTime.year, this.gameTime.month, `時代が${eraName(next)}になった`)
    showToast(`時代が${eraName(next)}になった`)
    this.applyEraLook()
    this.renderDate()
    this.renderCityHud()
    this.persistGame()
  }

  private applyEraLook(): void {
    const era = this.world.progress.era
    document.body.dataset.era = era
    this.strokeMapEdge(eraMapEdge(era))
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

    this.worldMap.forEachTile((x, y) => {
      const center = this.worldMap.tileCenter(x, y)
      const ground = this.add
        .image(center.x, center.y, TERRAIN_TEXTURE_KEY, 'grass-0')
        .setOrigin(0.5)
        .setDepth(isoDepth(x, y, 0))
      const prop = this.add
        .image(center.x, center.y, PROP_TEXTURE.house)
        .setOrigin(0.5, 0.92)
        .setDepth(isoDepth(x, y, 8))
        .setVisible(false)
      this.tileSprites.push(ground)
      this.propSprites.push(prop)
      this.paintTile(x, y)
    })

    this.mapEdge = this.add.graphics().setDepth(400)
    this.strokeMapEdge(MAP_EDGE)
  }

  private setupCamera(): void {
    const camera = this.cameras.main
    camera.setBackgroundColor(0xb6e66a)
    camera.setRoundPixels(true)
    this.fitMapInView()

    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.cameras.resize(this.scale.gameSize.width, this.scale.gameSize.height)
      this.refreshCameraBounds()
    })
  }

  private fitMapInView(): void {
    const camera = this.cameras.main
    const viewWidth = START_VIEW_TILES * ISO_TILE_WIDTH
    const zoom = snapZoom(
      Math.min(camera.width / viewWidth, camera.height / viewWidth),
    )

    camera.setZoom(zoom)
    this.refreshCameraBounds()
    const mid = this.worldMap.tileCenter(
      Math.floor(this.worldMap.width / 2),
      Math.floor(this.worldMap.height / 2),
    )
    camera.centerOn(mid.x, mid.y)
  }

  private refreshCameraBounds(): void {
    const camera = this.cameras.main
    const extraX = Math.max(0, camera.width / camera.zoom - this.worldMap.pixelWidth)
    const extraY = Math.max(0, camera.height / camera.zoom - this.worldMap.pixelHeight)
    const pad = this.worldMap.tileSize * 2

    camera.setBounds(
      -extraX / 2 - pad,
      -extraY / 2 - pad,
      this.worldMap.pixelWidth + extraX + pad * 2,
      this.worldMap.pixelHeight + extraY + pad * 2,
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

    if (this.selectedTool === BuildTool.Erase) {
      const canClear = this.worldMap.canClear(x, y)
      graphics.lineStyle(2, canClear ? HOVER_INVALID : HOVER_VALID, 0.95)
      const cells = canClear ? this.worldMap.footprintCellsOf(x, y) : [{ x, y }]
      for (const cell of cells) {
        this.drawIsoTile(graphics, cell.x, cell.y, canClear ? HOVER_INVALID : undefined, canClear ? 0.28 : 0)
      }
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
      this.layoutHoverPreview(previewFrame, x, y, tileType)
      this.hoverPreview.setVisible(true)
      graphics.lineStyle(2, HOVER_VALID, 0.9)
    } else {
      graphics.lineStyle(2, HOVER_INVALID, 0.95)
    }

    const span = tileType ? footprintSpan(tileType) : 1
    for (const cell of footprintCells(x, y, span)) {
      if (this.worldMap.inBounds(cell.x, cell.y)) {
        this.drawIsoTile(graphics, cell.x, cell.y)
      }
    }
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
    for (const cell of this.worldMap.footprintCellsOf(x, y)) {
      this.paintAround(cell.x, cell.y)
    }
    this.residentSim?.refreshHousing()
    this.residentSim?.refreshJobs()
    this.world.lastUnlocks = this.world.tryUnlock()
    this.flushWorldNews()
    this.renderCityHud()
    this.redrawHover()
    this.persistGame()
  }

  private eraseTile(x: number, y: number): void {
    const cells = this.worldMap.footprintCellsOf(x, y)
    if (!this.worldMap.clear(x, y)) {
      return
    }

    for (const cell of cells) {
      this.paintAround(cell.x, cell.y)
    }
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

  private layoutHoverPreview(frame: string, x: number, y: number, tileType?: TileType): void {
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
    this.placeVisual(this.hoverPreview, frame, x, y, tileType ? footprintSpan(tileType) : 1)
  }

  private placeVisual(
    sprite: Phaser.GameObjects.Image,
    frame: string,
    x: number,
    y: number,
    spanOverride?: number,
  ): void {
    const size = this.worldMap.tileSize
    const layoutKey = frame.startsWith('road-')
      ? 'road'
      : frame.startsWith('rail-')
        ? 'rail'
        : frame.startsWith('bridge-')
          ? 'road'
          : frame.startsWith('grass-')
            ? 'grass'
            : frame === 'fertile'
              ? 'fertile'
              : frame === 'hill'
                ? 'hill'
                : frame
    const layout = PROP_LAYOUT[layoutKey] ?? PROP_LAYOUT.house
    const tile = this.worldMap.getTile(x, y)
    const forestTree =
      tile?.terrain === Terrain.Forest && (frame === 'tree' || frame === 'bush' || frame === 'pine')
    const jitter =
      forestTree
        ? { x: 0, y: 0 }
        : frame === 'tree' || frame === 'bush' || frame === 'flower'
          ? decoOffset(x, y)
          : { x: 0, y: 0 }
    const isGroundFrame =
      frame.startsWith('road-') ||
      frame.startsWith('rail-') ||
      frame.startsWith('bridge-') ||
      frame.startsWith('grass-') ||
      frame === 'forest' ||
      frame === 'stone' ||
      frame === 'fertile' ||
      frame === 'hill' ||
      frame === 'flower' ||
      frame === 'water' ||
      frame === 'river'
    const span = spanOverride ?? (isGroundFrame ? 1 : this.worldMap.placedSpan(x, y))
    const width = size * layout.width
    const height = size * layout.height
    const growable = Boolean(
      tile && isGrowableType(tile.type) && !frame.startsWith('road-') && !frame.startsWith('rail-'),
    )
    const level = growable && tile ? tile.level : 1
    const variant = tile?.variant ?? 0
    const boost = growable ? 1 + (level - 1) * BUILDING_SCALE_PER_LEVEL : 1
    const center = this.worldMap.visualCenter(x, y, span)

    sprite.setOrigin(layout.originX, layout.originY)
    sprite.setPosition(center.x + jitter.x, center.y + jitter.y)
    sprite.setDisplaySize(width * boost, height * boost)
    const era = this.world.progress.era
    if (frame.startsWith('road-')) {
      sprite.setTint(eraRoadTint(era))
    } else if (frame.startsWith('rail-')) {
      sprite.setTint(eraRailTint(era))
    } else if (growable && tile) {
      sprite.setTint(buildingTint(tile.type, level, variant, era))
    } else if (
      frame.startsWith('grass-') ||
      frame === 'forest' ||
      frame === 'fertile' ||
      frame === 'hill'
    ) {
      sprite.setTint(regionGrassTint(this.world.activeId, era))
    } else {
      sprite.clearTint()
    }
    const groundish = isGroundFrame
    sprite.setDepth(isoDepth(x + span - 1, y + span - 1, groundish ? 0 : 8))
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
      if (isWaterTerrain(tile.terrain)) {
        const maskFrame = buildingTileKey(tile.type, this.worldMap.roadConnections(x, y)) ?? 'road-0'
        const bridgeFrame = maskFrame.replace('road-', 'bridge-')
        ground.setVisible(true)
        ground.setTexture(BRIDGE_TEXTURE_KEY, bridgeFrame)
        this.placeVisual(ground, bridgeFrame, x, y)
        prop.setVisible(false)
        return
      }
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

    if (isWaterTerrain(tile.terrain)) {
      const frame = tile.terrain === Terrain.River ? 'river' : 'water'
      ground.setVisible(true)
      ground.setTexture(WATER_TEXTURE_KEY, frame)
      this.placeVisual(ground, frame, x, y)
      prop.setVisible(false)
      return
    }

    const groundFrame =
      tile.terrain === Terrain.Forest
        ? 'forest'
        : tile.terrain === Terrain.Rock
          ? 'stone'
          : tile.terrain === Terrain.Hill
            ? 'hill'
            : tile.terrain === Terrain.Fertile
              ? 'fertile'
              : grassFrame(x, y)
    ground.setVisible(true)
    ground.setTexture(TERRAIN_TEXTURE_KEY, groundFrame)
    this.placeVisual(ground, groundFrame, x, y)

    const buildingFrame = buildingTileKey(tile.type)
    if (buildingFrame) {
      prop.setVisible(true)
      prop.setTexture(textureForProp(buildingFrame))
      this.placeVisual(prop, buildingFrame, x, y)
      return
    }

    if (tile.type === TileType.Extension) {
      prop.setVisible(false)
      return
    }

    if (tile.terrain === Terrain.Forest) {
      const frame = hashForest(x, y)
      prop.setVisible(true)
      prop.setTexture(textureForProp(frame))
      this.placeVisual(prop, frame, x, y)
      return
    }

    if (tile.terrain === Terrain.Hill) {
      const hillFrame = hashHill(x, y)
      if (!hillFrame) {
        prop.setVisible(false)
        return
      }
      prop.setVisible(true)
      prop.setTexture(textureForProp(hillFrame))
      this.placeVisual(prop, hillFrame, x, y)
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
      if (!isResidentIndoor(resident)) {
        this.inspectGraphics?.lineStyle(2, SELECT_RING, 0.95)
        this.inspectGraphics?.strokeCircle(
          resident.worldX,
          resident.worldY - RESIDENT_DISPLAY_HEIGHT * 0.5,
          11,
        )
      }
      return
    }

    this.selectedResidentId = undefined
    if (this.selectedTile && this.inspectGraphics) {
      this.residentPanel.render(undefined, tileDetailView(this.worldMap, this.selectedTile.x, this.selectedTile.y, this.world.progress.era))
      this.inspectGraphics.clear()
      this.inspectGraphics.lineStyle(2, SELECT_RING, 0.95)
      for (const cell of this.worldMap.footprintCellsOf(this.selectedTile.x, this.selectedTile.y)) {
        this.drawIsoTile(this.inspectGraphics, cell.x, cell.y)
      }
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

  private strokeMapEdge(color: number): void {
    if (!this.mapEdge) {
      return
    }
    this.mapEdge.clear()
    this.mapEdge.lineStyle(2, color, 1)
    const corners = isoMapCorners(this.worldMap.width, this.worldMap.height)
    this.mapEdge.beginPath()
    this.mapEdge.moveTo(corners[0]!.x, corners[0]!.y)
    for (let index = 1; index < corners.length; index += 1) {
      this.mapEdge.lineTo(corners[index]!.x, corners[index]!.y)
    }
    this.mapEdge.closePath()
    this.mapEdge.strokePath()
  }

  private drawIsoTile(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    fill?: number,
    fillAlpha = 0.28,
  ): void {
    const points = isoDiamondPoints(x, y, this.worldMap.width, this.worldMap.height)
    graphics.beginPath()
    graphics.moveTo(points[0]!.x, points[0]!.y)
    for (let index = 1; index < points.length; index += 1) {
      graphics.lineTo(points[index]!.x, points[index]!.y)
    }
    graphics.closePath()
    if (fill !== undefined) {
      graphics.fillStyle(fill, fillAlpha)
      graphics.fillPath()
    }
    graphics.strokePath()
  }
}

function hashForest(x: number, y: number): 'pine' | 'tree' | 'bush' {
  const n = (x * 13 + y * 29) % 5
  if (n === 0) {
    return 'bush'
  }
  if (n <= 2) {
    return 'pine'
  }
  return 'tree'
}

function hashHill(x: number, y: number): 'mountain' | 'rock' | undefined {
  const n = (x * 7 + y * 11) % 8
  if (n === 0 || n === 4) {
    return 'mountain'
  }
  if (n === 2) {
    return 'rock'
  }
  return undefined
}

function grassFrame(x: number, y: number): 'grass-0' | 'grass-1' | 'grass-2' {
  const n = (x * 13 + y * 29) % 3
  return n === 0 ? 'grass-0' : n === 1 ? 'grass-1' : 'grass-2'
}

function sizeResidentSprite(sprite: Phaser.GameObjects.Image): void {
  const size = residentDisplaySize(sprite.frame.width, sprite.frame.height)
  sprite.setDisplaySize(size.width, size.height)
}
