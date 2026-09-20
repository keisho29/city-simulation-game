import Phaser from 'phaser'
import { BUILDINGS, BuildTool } from '../buildings/catalog.ts'
import { drawWoodenHouse } from '../buildings/drawWoodenHouse.ts'
import {
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_ZOOM,
} from '../constants.ts'
import { WorldMap } from '../map/WorldMap.ts'
import { bindBuildMenu } from '../ui/buildMenu.ts'

const VACANT_LIGHT = 0x7ea34f
const VACANT_DARK = 0x6d9144
const GRID_COLOR = 0x3f5a2c
const MAP_EDGE = 0x2c3f1e
const HOVER_VALID = 0xf2e6c4
const HOVER_INVALID = 0xc4453c

export class MainScene extends Phaser.Scene {
  private worldMap = new WorldMap()
  private camControl: Phaser.Cameras.Controls.FixedKeyControl | undefined
  private buildingGraphics: Phaser.GameObjects.Graphics | undefined
  private hoverGraphics: Phaser.GameObjects.Graphics | undefined
  private selectedTool: BuildTool = BuildTool.None
  private hoverTile: { x: number; y: number } | undefined

  constructor() {
    super('MainScene')
  }

  create(): void {
    this.drawLand()
    this.buildingGraphics = this.add.graphics().setDepth(1)
    this.hoverGraphics = this.add.graphics().setDepth(2)
    this.setupCamera()
    this.setupCameraControls()
    this.setupBuildingInput()
    bindBuildMenu((tool) => this.setTool(tool))
  }

  update(_time: number, delta: number): void {
    this.camControl?.update(delta)
  }

  private setTool(tool: BuildTool): void {
    this.selectedTool = tool
    this.input.setDefaultCursor(tool === BuildTool.House ? 'crosshair' : 'default')
    if (tool === BuildTool.None) {
      this.hoverTile = undefined
      this.hoverGraphics?.clear()
    }
  }

  private drawLand(): void {
    const { width, height, tileSize, pixelWidth, pixelHeight } = this.worldMap
    const graphics = this.add.graphics().setDepth(0)

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        graphics.fillStyle(this.tileColor(x, y))
        graphics.fillRect(x * tileSize, y * tileSize, tileSize, tileSize)
      }
    }

    for (let x = 0; x <= width; x += 1) {
      this.drawGridLine(graphics, x, width, x * tileSize, 0, x * tileSize, pixelHeight)
    }
    for (let y = 0; y <= height; y += 1) {
      this.drawGridLine(graphics, y, height, 0, y * tileSize, pixelWidth, y * tileSize)
    }

    graphics.lineStyle(2, MAP_EDGE, 1)
    graphics.strokeRect(0, 0, pixelWidth, pixelHeight)
  }

  private tileColor(x: number, y: number): number {
    return (x + y) % 2 === 0 ? VACANT_LIGHT : VACANT_DARK
  }

  private setupCamera(): void {
    const camera = this.cameras.main
    camera.setBackgroundColor(0x1a2214)
    camera.setRoundPixels(true)
    this.fitMapInView()

    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.cameras.resize(this.scale.gameSize.width, this.scale.gameSize.height)
      this.refreshCameraBounds()
    })
  }

  private drawGridLine(
    graphics: Phaser.GameObjects.Graphics,
    index: number,
    max: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): void {
    const major = index === 0 || index === max || index % 10 === 0
    graphics.lineStyle(major ? 2 : 1, GRID_COLOR, major ? 0.9 : 0.4)
    graphics.lineBetween(x1, y1, x2, y2)
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
        if (this.selectedTool !== BuildTool.House || !pointer.leftButtonDown()) {
          return
        }

        const tile = this.tileFromPointer(pointer)
        if (!tile) {
          return
        }

        this.placeHouse(tile.x, tile.y)
      },
    )
  }

  private updateHover(pointer: Phaser.Input.Pointer): void {
    if (this.selectedTool !== BuildTool.House || !this.hoverGraphics) {
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
    if (!graphics) {
      return
    }

    graphics.clear()
    if (!this.hoverTile) {
      return
    }

    const { x, y } = this.hoverTile
    const size = this.worldMap.tileSize
    const canPlace = this.worldMap.canPlace(x, y)

    if (canPlace) {
      drawWoodenHouse(graphics, x, y, size, 0.55)
      graphics.lineStyle(2, HOVER_VALID, 0.9)
    } else {
      graphics.lineStyle(2, HOVER_INVALID, 0.95)
    }

    graphics.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2)
  }

  private placeHouse(x: number, y: number): void {
    if (!this.worldMap.place(x, y, BUILDINGS.house.tileType) || !this.buildingGraphics) {
      return
    }

    drawWoodenHouse(this.buildingGraphics, x, y, this.worldMap.tileSize)
    this.redrawHover()
  }

  private tileFromPointer(pointer: Phaser.Input.Pointer): { x: number; y: number } | undefined {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    return this.worldMap.worldToTile(worldPoint.x, worldPoint.y)
  }
}
