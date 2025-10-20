import Phaser from 'phaser'
import { OrcGrunt } from './OrcGrunt'
import { GameScene } from '@scenes/GameScene'
import { Enemy } from '../Factories/EnemyFactory'

export class Skeleton extends OrcGrunt {
	constructor(scene: Phaser.Scene, x: number, y: number, hp: number, speed: number) {
		super(scene, x, y, hp, speed, 'skeleton', 16)
		this.sprite.setScale(0.07)
	}

	static override spawn(scene: Phaser.Scene, wave: number): Enemy {
		const hp = 40 + wave * 12
		const speed = 75 + wave * 3

		const gameScene = scene as GameScene
		const start = gameScene.pathPoints[0]
		if (!start) throw new Error("No path points found")

		return new this(scene, start.x, start.y, hp, speed)
	}
}
