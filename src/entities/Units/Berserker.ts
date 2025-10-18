import Phaser from 'phaser'
import { OrcGrunt } from './OrcGrunt'
import { GameScene } from '@scenes/GameScene'

export class Berserker extends OrcGrunt {
	constructor(scene: Phaser.Scene, x: number, y: number, hp: number, speed: number) {
		super(scene, x, y, hp, speed, 'berserker', 20)
		this.sprite.setScale(0.06)
	}

	static override spawn(scene: GameScene, wave: number): void {
		const hp = 80 + wave * 15
		const speed = 60 + wave * 2

		const start = scene.pathPoints[0]
		if (!start) return

		const enemy = new this(scene, start.x, start.y, hp, speed)
		scene.enemies.push(enemy)
	}
}
