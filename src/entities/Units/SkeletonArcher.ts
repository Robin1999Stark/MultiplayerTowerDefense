import Phaser from 'phaser'
import { OrcGrunt } from './OrcGrunt'
import { GameScene } from '@scenes/GameScene'
import { Enemy } from '../Factories/EnemyFactory'
import { Tower } from '../Towers/Tower'

export class SkeletonArcher extends OrcGrunt {
	private arrowRange: number = 180
	private arrowDamage: number = 10
	private arrowCooldown: number = 3000
	private timeSinceLastArrow: number = 0

	constructor(scene: Phaser.Scene, x: number, y: number, hp: number, speed: number) {
		super(scene, x, y, hp, speed, 'skeleton', 16)
		this.sprite.setScale(0.07)
	}

	override update(deltaMs: number, path: Phaser.Math.Vector2[]): void {
		super.update(deltaMs, path)

		this.timeSinceLastArrow += deltaMs

		if (this.timeSinceLastArrow >= this.arrowCooldown) {
			this.tryShootArrow()
		}
	}
	
	protected tryShootArrow(): void {
		const gameScene = this.sprite.scene as GameScene
		if (!gameScene) return

		const towersInRange = this.findTowersInRange(gameScene)

		if (towersInRange.length > 0) {
            const nextTower = towersInRange[0];

            if (!nextTower) {
                return;
            }

			this.shootArrow(nextTower)
			this.timeSinceLastArrow = 0
		}
	}
	
	protected findTowersInRange(gameScene: GameScene): Tower[] {
		const towers = gameScene['towers'] as Tower[]
		if (!towers) return []
		
		return towers.filter(tower => {
			const distance = Phaser.Math.Distance.Between(
				this.sprite.x, this.sprite.y,
				tower.sprite.x, tower.sprite.y
			)
			return distance <= this.arrowRange
		})
	}
	
	protected shootArrow(tower: Tower): void {

		this.playShootSound()

		const arrow = this.sprite.scene.add.sprite(this.sprite.x, this.sprite.y, 'arrow')
		arrow.setScale(0.03)
		arrow.setOrigin(0.5, 0.5)
		arrow.setDepth(3)

		const duration = Math.max(120, Math.min(400, 
			Phaser.Math.Distance.Between(
				this.sprite.x, this.sprite.y, 
				tower.sprite.x, tower.sprite.y
			) * 4
		))

		const angle = Phaser.Math.Angle.Between(
			this.sprite.x, this.sprite.y, 
			tower.sprite.x, tower.sprite.y
		)
		arrow.setRotation(angle - Math.PI / 2)

		this.sprite.scene.tweens.add({
			targets: arrow,
			x: tower.sprite.x,
			y: tower.sprite.y,
			duration,
			onComplete: () => {
				arrow.destroy()
				tower.takeDamage(this.arrowDamage)
			}
		})
	}
	
	protected playShootSound(): void {
		const audioCtx = this.getAudioContext()
		if (!audioCtx) return
		
		const durationSec = 0.1
		const oscillator = audioCtx.createOscillator()
		const gainNode = audioCtx.createGain()
		oscillator.type = 'square'
		oscillator.frequency.setValueAtTime(260, audioCtx.currentTime)
		gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime)
		gainNode.gain.exponentialRampToValueAtTime(0.1, audioCtx.currentTime + 0.005)
		gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durationSec)
		oscillator.connect(gainNode)
		gainNode.connect(audioCtx.destination)
		oscillator.start()
		oscillator.stop(audioCtx.currentTime + durationSec)
		oscillator.onended = () => {
			oscillator.disconnect()
			gainNode.disconnect()
		}
	}
	
	private getAudioContext(): AudioContext | null {
		const phaserSound = this.sprite.scene.sound as { context?: AudioContext }
		const existingCtx = phaserSound?.context || window.audioCtx
		
		if (existingCtx) return existingCtx
		
		try {
			const AudioContextClass = window.AudioContext || window.webkitAudioContext
			if (!AudioContextClass) return null
			
			const newCtx = new AudioContextClass()
			window.audioCtx = newCtx
			return newCtx
		} catch (error) {
			return null
		}
	}

	static override spawn(scene: Phaser.Scene, wave: number): Enemy {
		const hp = 38 + wave * 10
		const speed = 50 + wave * 3

		const gameScene = scene as GameScene
		const start = gameScene.pathPoints[0]
		if (!start) throw new Error("No path points found")

		return new this(scene, start.x, start.y, hp, speed)
	}
}
