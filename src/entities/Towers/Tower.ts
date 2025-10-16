import Phaser from 'phaser'
import { Enemy } from '../Enemy'

export class Tower {
	public sprite: Phaser.GameObjects.Sprite
	private range = 1000
	private fireRateMs = 200
	private damage = 400
	protected timeSinceShot = 0
	private scene: Phaser.Scene

	constructor(scene: Phaser.Scene, x: number, y: number) {
		this.scene = scene
		this.sprite = scene.add.sprite(x, y, 'tower')
		this.sprite.setDepth(2)
	}

	update(deltaMs: number, enemies: Enemy[]): void {
		this.timeSinceShot += deltaMs
		if (this.timeSinceShot < this.fireRateMs) return
		const target = this.findTarget(enemies)
		if (!target) return
		this.timeSinceShot = 0
		this.shoot(target)
	}

	private findTarget(enemies: Enemy[]): Enemy | undefined {
		let nearest: Enemy | undefined
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

	private shoot(target: Enemy): void {
		// Audio blip for the shot
		this.playShootTone()

		// Visual bullet: tweened sprite that damages on arrival
		const bullet = this.scene.add.sprite(this.sprite.x, this.sprite.y, 'bullet')
		bullet.setDepth(3)
		const duration = Math.max(120, Math.min(400, Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, target.sprite.x, target.sprite.y) * 4))
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
		const sm: any = (this.scene as any).sound
		const ctx: AudioContext | undefined = sm && sm.context ? sm.context as AudioContext : (window as any).audioCtx || undefined
		let audioCtx = ctx
		if (!audioCtx) {
			try {
				audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
				;(window as any).audioCtx = audioCtx
			} catch {
				return
			}
		}
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
			try { oscillator.disconnect(); gainNode.disconnect() } catch {}
		}
	}
} 