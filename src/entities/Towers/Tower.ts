import Phaser from 'phaser'
import { OrcGrunt } from '../Units/OrcGrunt'
import { TowerType } from '../../services/TowerStore'

export class Tower {

	public sprite: Phaser.GameObjects.Sprite
	protected range: number
	protected fireRateMs: number
	protected damage: number
	protected timeSinceShot = 0
	protected scene: Phaser.Scene
	public readonly type: TowerType

	protected level = 1
	protected maxLevel: number
	protected baseScale = 0.08

	constructor(scene: Phaser.Scene, x: number, y: number, type: TowerType) {
		this.scene = scene
		this.type = type

		this.range = type.range
		this.fireRateMs = type.fireRateMs
		this.damage = type.damage

		this.maxLevel = (type as any).levels?.length ?? (type as any).maxLevel ?? 5

		this.sprite = scene.add.sprite(x, y, 'tower_basic')
		this.sprite.setDepth(2)
		this.sprite.setScale(this.baseScale)

		this.applyLevelStats(this.level)
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

	protected shoot(target: OrcGrunt): void {
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

	protected playShootTone(): void {
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

	protected getAudioContext(): AudioContext | null {
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

	public getLevel(): number {
		return this.level
	}

	public canUpgrade(): boolean {
		return this.level < this.maxLevel
	}

	public upgrade(): boolean {
		if (!this.canUpgrade()) return false
		this.level++
		this.applyLevelStats(this.level)
		this.playUpgradeEffect()
		return true
	}

	protected applyLevelStats(level: number): void {
		const typeAny = this.type as any
		const levelDefs = typeAny.levels
		if (Array.isArray(levelDefs) && levelDefs[level - 1]) {
			const def = levelDefs[level - 1]
			this.range = def.range ?? this.range
			this.fireRateMs = def.fireRateMs ?? this.fireRateMs
			this.damage = def.damage ?? this.damage
		} else {
			// fallback: exponential multipliers per level above 1
			const lvl = level - 1
			this.range = (this.type.range) * Math.pow(1.08, lvl)
			this.damage = (this.type.damage) * Math.pow(1.18, lvl)

			this.fireRateMs = Math.max(50, (this.type.fireRateMs) * Math.pow(0.92, lvl))
		}
	}

	protected playUpgradeEffect(): void {
		this.scene.tweens.add({
			targets: this.sprite,
			scale: this.baseScale * 1.25,
			duration: 140,
			yoyo: true,
			ease: 'Sine.easeInOut'
		})

		this.sprite.setTintFill(0xffff99)
		this.scene.time.delayedCall(220, () => {
			this.sprite.clearTint()
		})
	}
} 