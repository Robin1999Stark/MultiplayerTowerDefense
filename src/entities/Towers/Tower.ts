import Phaser from 'phaser'
import { OrcGrunt } from '../Units/OrcGrunt'
import { TowerType } from '../../services/TowerStore'

export class Tower {
	public sprite: Phaser.GameObjects.Sprite
	protected readonly range: number
	protected readonly fireRateMs: number
    protected readonly damage: number
	protected timeSinceShot = 0
	private scene: Phaser.Scene
    public readonly type: TowerType

    constructor(scene: Phaser.Scene, x: number, y: number, type: TowerType) {
		this.scene = scene
		this.type = type
		this.range = type.range
		this.fireRateMs = type.fireRateMs
		this.damage = type.damage
		this.sprite = scene.add.sprite(x, y, 'tower_basic')
		this.sprite.setDepth(2)
		this.sprite.setScale(0.08)
	}

	update(deltaMs: number, enemies: OrcGrunt[]): void {
		this.timeSinceShot += deltaMs
		if (this.timeSinceShot < this.fireRateMs) return
		const target = this.findTarget(enemies)
		if (!target) return
		this.timeSinceShot = 0
		this.shoot(target)
	}

	private findTarget(enemies: OrcGrunt[]): OrcGrunt | undefined {
		let nearest: OrcGrunt | undefined
		let nearestDist = Number.POSITIVE_INFINITY
		for (const e of enemies) {
			const d = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, e.sprite.x, e.sprite.y)
			if (d <= this.range && d < nearestDist) {
				nearestDist = d
				nearest = e
			}
		}
		return nearest
	}

	private shoot(target: OrcGrunt): void {
		// Audio blip for the shot
		this.playShootTone()

		// Visual bullet: tweened sprite that damages on arrival
		const bullet = this.scene.add.sprite(this.sprite.x, this.sprite.y, 'arrow')
		bullet.setScale(0.03)
		bullet.setOrigin(0.5, 0.5)
		bullet.setDepth(3)
		const duration = Math.max(120, Math.min(400, Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, target.sprite.x, target.sprite.y) * 4))
		const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, target.sprite.x, target.sprite.y)
		bullet.setRotation(angle - Math.PI / 2)
		this.scene.tweens.add({
			targets: bullet,
			x: target.sprite.x,
			y: target.sprite.y,
			duration,
			onComplete: () => {
				bullet.destroy()
				target.takeDamage(this.damage)
			}
		})
	}

	private playShootTone(): void {
		const audioCtx = this.getAudioContext()
		if (!audioCtx) return

		const durationSec = 0.1
		const oscillator = audioCtx.createOscillator()
		const gainNode = audioCtx.createGain()
		oscillator.type = 'square'
		oscillator.frequency.setValueAtTime(220, audioCtx.currentTime)
		gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime)
		gainNode.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.005)
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
		const phaserSound = this.scene.sound as { context?: AudioContext }
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
} 