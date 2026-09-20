import Phaser from 'phaser'
import './style.css'

class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene')
  }

  create() {
    this.add
      .text(400, 300, 'City Simulation Game', {
        fontSize: '32px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#2d5a3d',
  parent: 'app',
  scene: MainScene,
}

new Phaser.Game(config)
