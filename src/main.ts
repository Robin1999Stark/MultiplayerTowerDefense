import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'
import { UIScene } from './scenes/UIScene'
import { StatisticsScene } from './scenes/StatisticsScene'

const config: Phaser.Types.Core.GameConfig = {
	type: Phaser.AUTO,
	parent: 'app',
	backgroundColor: '#0b1020',
	scale: {
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH,
		width: 960,
		height: 540
	},
	physics: {
		default: 'arcade',
		arcade: {
		    gravity: { x: 0, y: 0 },
			debug: false
		},
	},
    scene: [ GameScene, StatisticsScene, UIScene ]
}

new Phaser.Game(config) 