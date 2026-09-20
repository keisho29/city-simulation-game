import Phaser from 'phaser'
import './style.css'
import { MainScene } from './game/scenes/MainScene.ts'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#a8dc3c',
  scene: MainScene,
  render: {
    antialias: false,
    roundPixels: true,
    pixelArt: true,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
}

new Phaser.Game(config)
