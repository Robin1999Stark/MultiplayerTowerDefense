import Phaser from 'phaser'
import { OrcGrunt } from './OrcGrunt'
import { GameScene } from '@scenes/GameScene'

export class Chonkers extends OrcGrunt {
	constructor(scene: Phaser.Scene, x: number, y: number, hp: number, speed: number) {
		super(scene, x, y, hp, speed, 'chonkers', 25)
		this.sprite.setScale(0.08)
	}

	static override spawn(scene: GameScene, wave: number): void {
		const hp = 150 + wave * 25
		const speed = 40 + wave * 1

		const start = scene.pathPoints[0]
		if (!start) return

		const enemy = new this(scene, start.x, start.y, hp, speed)
		scene.enemies.push(enemy)
	}
}
