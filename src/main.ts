import Phaser from 'phaser'
import { StartScene } from './scenes/StartScene'
import { GameScene } from './scenes/GameScene'
import { UIScene } from './scenes/UIScene'
import { StatisticsScene } from './scenes/StatisticsScene'
import { ControlsScene } from './scenes/ControlsScene'

const config: Phaser.Types.Core.GameConfig = {
	type: Phaser.WEBGL,
	parent: 'app',
	backgroundColor: '#0b1020',
	scale: {
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH,
		width: 1280,
		height: 720,
		zoom: 1
	},
	render: {
		antialias: true,
		antialiasGL: true,
		pixelArt: false,
		roundPixels: false
	},
	physics: {
		default: 'arcade',
		arcade: {
			gravity: { x: 0, y: 0 },
			debug: false
		},
	},
	scene: [StartScene, ControlsScene, GameScene, StatisticsScene, UIScene]
}

new Phaser.Game(config) 
