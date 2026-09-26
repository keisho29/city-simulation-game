import Phaser from 'phaser'
import './style.css'
import { RunnerScene } from './game/RunnerScene.ts'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#87b7e6',
  scene: RunnerScene,
  input: {
    keyboard: true,
  },
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
