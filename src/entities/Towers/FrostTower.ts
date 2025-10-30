import Phaser from 'phaser'
import { Tower } from './Tower'
import {TowerLevelUpgrade, TowerType} from '../../services/TowerStore'
import { Enemy } from '../Factories/EnemyFactory'

export class FrostTower extends Tower {

    protected slowDownMs: number = 0
    protected slowFactor: number = 0

    constructor(scene: Phaser.Scene, x: number, y: number, type: TowerType) {
		super(scene, x, y, type)
		const textureKey = 'tower_frost';
		this.sprite.setTexture(this.getBrauseTexture(textureKey))
		this.sprite.setScale(0.1)
		this.applyBrauseColor(this.sprite, textureKey)
        this.slowDownMs = this.getCurrentStats()?.slowDownMs ?? 5000;
        this.slowFactor = this.getCurrentStats()?.slowFactor ?? 0.5;
	}

	protected override shoot(target: Enemy): void {
		// Audio blip for the shot
		this.playShootTone()

		// Visual snowball: circular sprite that slows on arrival
		const bulletTextureKey = 'bullet'; // Use circular bullet texture for snowball
		const bullet = this.scene.add.sprite(this.sprite.x, this.sprite.y, this.getBrauseTexture(bulletTextureKey))
		bullet.setScale(1.5) // Larger than regular bullets to look like snowballs
		bullet.setOrigin(0.5, 0.5)
		bullet.setDepth(3)

		// Make the snowball white/light blue
		bullet.setTint(0xeeffff) // Very light blue/white for snowball effect

		const duration = Math.max(120, Math.min(400, Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, target.sprite.x, target.sprite.y) * 4))
		
		// No rotation needed for snowballs (they're circular)

		this.scene.tweens.add({
			targets: bullet,
			x: target.sprite.x,
			y: target.sprite.y,
			duration,
			onComplete: () => {
				bullet.destroy();
                target.applySlow && target.applySlow(this.slowDownMs, 0.5);
			}
		})
	}

	protected override playShootTone(): void {
		// Don't play sound if muted
		if (this.audioManager.isMuted()) return

		// Play the arrow shoot sound effect with a lower pitch for frost effect
		this.scene.sound.play('arrow_shoot', { volume: 0.75, rate: 0.8 })
	}

    protected override upgradeStats(upgrade: TowerLevelUpgrade): void {
        this.range = upgrade.range;
        this.fireRateMs = upgrade.fireRateMs;
        this.damage = upgrade.damage;
        this.hp = upgrade.hp;
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
