import Phaser from 'phaser'
import './style.css'
import { MainScene } from './game/scenes/MainScene.ts'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#4a8a28',
  scene: MainScene,
  render: {
    antialias: true,
    roundPixels: false,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
}

new Phaser.Game(config)
