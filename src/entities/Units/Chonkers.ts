import Phaser from 'phaser'
import { OrcGrunt } from './OrcGrunt'
import { GameScene } from '@scenes/GameScene'
import { Enemy } from '../Factories/EnemyFactory'

export class Chonkers extends OrcGrunt {
	constructor(scene: Phaser.Scene, x: number, y: number, hp: number, speed: number) {
		super(scene, x, y, hp, speed, 'chonkers', 25)
		this.sprite.setScale(0.08)
	}

	static override spawn(scene: Phaser.Scene, wave: number): Enemy {
		const hp = 150 + wave * 25
		const speed = 40 + wave * 1

		const gameScene = scene as GameScene
		const start = gameScene.pathPoints[0]
		if (!start) throw new Error("No path points found")

		return new this(scene, start.x, start.y, hp, speed)
	}
}
