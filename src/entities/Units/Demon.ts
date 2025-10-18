import Phaser from 'phaser'
import { OrcGrunt } from './OrcGrunt'
import { GameScene } from '@scenes/GameScene'

export class Demon extends OrcGrunt {
	constructor(scene: Phaser.Scene, x: number, y: number, hp: number, speed: number) {
		super(scene, x, y, hp, speed, 'demon', 22)
		this.sprite.setScale(0.07)
	}

	static override spawn(scene: GameScene, wave: number): void {
		const hp = 120 + wave * 20
		const speed = 50 + wave * 2

		const start = scene.pathPoints[0]
		if (!start) return

		const enemy = new this(scene, start.x, start.y, hp, speed)
		scene.enemies.push(enemy)
	}
}
