import Phaser from 'phaser'
import { Tower } from './Tower'
import {TowerLevelUpgrade, TowerType} from '../../services/TowerStore'
import { OrcGrunt } from '../Units/OrcGrunt'

export class FrostTower extends Tower {

    protected slowDownMs: number = 0

    constructor(scene: Phaser.Scene, x: number, y: number, type: TowerType) {
		super(scene, x, y, type)
		this.sprite.setTexture('tower_frost')
		this.sprite.setScale(0.1)
        this.slowDownMs = this.getCurrentStats()?.slowDownMs ?? 5000;
	}

	protected override shoot(target: OrcGrunt): void {
		// Audio blip for the shot
		this.playShootTone()

		// Visual bullet: tweened sprite that slows on arrival
		const bullet = this.scene.add.sprite(this.sprite.x, this.sprite.y, 'arrow')
		bullet.setScale(0.03)
		bullet.setOrigin(0.5, 0.5)
		bullet.setDepth(3)

		// Make the bullet blue to indicate frost effect
		bullet.setTint(0x00aaff)

		const duration = Math.max(120, Math.min(400, Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, target.sprite.x, target.sprite.y) * 4))
		const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, target.sprite.x, target.sprite.y)
		bullet.setRotation(angle - Math.PI / 2)

		this.scene.tweens.add({
			targets: bullet,
			x: target.sprite.x,
			y: target.sprite.y,
			duration,
			onComplete: () => {
				bullet.destroy();
				target.applySlow(this.slowDownMs);
			}
		})
	}

	protected override playShootTone(): void {
		const audioCtx = this.getAudioContext()
		if (!audioCtx) return

		const durationSec = 0.15
		const oscillator = audioCtx.createOscillator()
		const gainNode = audioCtx.createGain()
		oscillator.type = 'sine'
		oscillator.frequency.setValueAtTime(150, audioCtx.currentTime)
		oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + durationSec)
		gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime)
		gainNode.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.005)
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

    protected override upgradeStats(upgrade: TowerLevelUpgrade): void {

        this.range = upgrade.range;
        this.fireRateMs = upgrade.fireRateMs;
        this.damage = upgrade.damage;
        this.sprite.setScale(upgrade.baseScale);
        this.slowDownMs = upgrade?.slowDownMs ?? 5000
    }

	protected override getAudioContext(): AudioContext | null {
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
