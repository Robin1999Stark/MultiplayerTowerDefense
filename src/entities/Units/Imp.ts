import Phaser from 'phaser'
import { OrcGrunt } from './OrcGrunt'
import { GameScene } from '@scenes/GameScene'

export class Imp extends OrcGrunt {
	constructor(scene: Phaser.Scene, x: number, y: number, hp: number, speed: number) {
		super(scene, x, y, hp, speed, 'imp', 14)
		this.sprite.setScale(0.03)
	}

	static override spawn(scene: GameScene, wave: number): void {
		const hp = 15 + wave * 5
		const speed = 100 + wave * 5

		const start = scene.pathPoints[0]
		if (!start) return

		const enemy = new this(scene, start.x, start.y, hp, speed)
		scene.enemies.push(enemy)
	}
}
