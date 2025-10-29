import Phaser from 'phaser'
import { Enemy } from '../Factories/EnemyFactory'
import {TowerLevelUpgrade, TowerType} from '../../services/TowerStore'
import { AudioManager } from '../../services/AudioManager'
import { GameConfigService } from '../../services/GameConfigService'
import { BrauseColorService } from '../../services/BrauseColorService'

export class Tower {

    private hpText?: Phaser.GameObjects.Text;

    public sprite: Phaser.GameObjects.Sprite
    protected scene: Phaser.Scene
    public readonly type: TowerType
    protected audioManager: AudioManager
    protected gameConfigService: GameConfigService
    protected brauseColorService: BrauseColorService

    protected range: number = 0
    protected fireRateMs: number = 0
    protected damage: number = 0
    protected timeSinceShot = 0
    protected hp: number = 100

    protected level = 1
    protected baseScale = 0.08

    constructor(scene: Phaser.Scene, x: number, y: number, type: TowerType) {
        this.scene = scene;
        this.type = type;

        // Initialize services
        this.audioManager = AudioManager.getInstance();
        this.gameConfigService = GameConfigService.getInstance();
        this.brauseColorService = BrauseColorService.getInstance();

        // Create sprite with appropriate texture based on brause mode
        const textureKey = 'tower_basic';
        this.sprite = scene.add.sprite(x, y, this.getBrauseTexture(textureKey));
        this.sprite.setDepth(2);
        this.applyBrauseColor(this.sprite, textureKey);

        const levelUpdate = this.getCurrentStats();

        if (levelUpdate === null) {
            return;
        }

        this.upgradeStats(levelUpdate);
        this.createHPDisplay();
    }

    private createHPDisplay(): void {
        this.hpText = this.scene.add.text(
            this.sprite.x,
            this.sprite.y + 20,
            this.buildHpText(),
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3,
                resolution: 2
            }
        );
        this.hpText.setOrigin(0.5);
        this.hpText.setDepth(3);
    }


    update(deltaMs: number, enemies: Enemy[]): void {
        this.timeSinceShot += deltaMs
        if (this.timeSinceShot < this.fireRateMs) return
        const target = this.findTarget(enemies)
        if (!target) return
        this.timeSinceShot = 0
        this.shoot(target)

        // Update HP text position
        if (this.hpText) {
            this.hpText.setPosition(this.sprite.x, this.sprite.y + 20);
            this.updateHPDisplay();
        }
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

    protected shoot(target: Enemy): void {
        // Audio blip for the shot
        this.playShootTone()

        // Visual bullet: tweened sprite that damages on arrival
        const bulletTextureKey = 'arrow';
        const bullet = this.scene.add.sprite(this.sprite.x, this.sprite.y, this.getBrauseTexture(bulletTextureKey))
        bullet.setScale(0.03)
        bullet.setOrigin(0.5, 0.5)
        bullet.setDepth(3)
        this.applyBrauseColor(bullet, bulletTextureKey)
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

    public getCurrentStats(): TowerLevelUpgrade | null {
        const currentLevel = this.type.levels.get(this.level);

        if (currentLevel === undefined || currentLevel === null) {
            return null;
        }

        return {...currentLevel, baseScale: currentLevel?.baseScale ?? this.baseScale};
    }

    public getNextUpgrade(): TowerLevelUpgrade | null {
        const nextLevel = this.type.levels.get(this.level + 1);

        if (nextLevel === undefined || nextLevel === null) {
            return null;
        }

        return {...nextLevel, baseScale: (nextLevel?.baseScale ?? this.baseScale) * 1.10};
    }

    public getLevel(): number {
        return this.level;
    }

    protected playShootTone(): void {
        // Don't play sound if muted
        if (this.audioManager.isMuted()) return

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

    public canUpgrade(): boolean {
        return this.level < this.getMaxLevel()
    }

    public upgrade(): boolean {

        if (!this.canUpgrade()) {
            return false;
        }

        const levelUpdate = this.getNextUpgrade();

        if (levelUpdate === null) {
            return false;
        }

        this.level++;
        this.upgradeStats(levelUpdate);
        this.playUpgradeEffect();
        this.updateHPDisplay();

        return true
    }

    protected upgradeStats(upgrade: TowerLevelUpgrade): void {

        this.range = upgrade.range;
        this.fireRateMs = upgrade.fireRateMs;
        this.damage = upgrade.damage;
        this.hp = upgrade.hp;
        this.sprite.setScale(upgrade.baseScale);
    }

    public getMaxLevel()
    {
        return this.type.levels.size;
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
			// Reapply Brause color after the upgrade effect
			const textureKey = `tower_${this.type.id}`;
			this.applyBrauseColor(this.sprite, textureKey);
		})
	}

	public takeDamage(amount: number): boolean {
		this.hp -= amount;

        this.updateHPDisplay();

	// Visual feedback for damage
		this.sprite.setTintFill(0xff0000); // Red tint
		this.scene.time.delayedCall(100, () => {
			this.sprite.clearTint();
			// Reapply Brause color after the damage effect
			const textureKey = `tower_${this.type.id}`;
			this.applyBrauseColor(this.sprite, textureKey);
		});

		// Check if tower is destroyed
		if (this.hp <= 0) {
			this.playDestroyEffect();
			if (this.hpText) {
				this.hpText.destroy();
			}
			return true;
		}

		return false;
	}

	public getHP(): number {
		return this.hp;
	}

	private playDestroyEffect(): void {
		// Create explosion effect
		const bulletTextureKey = 'bullet';
		const brauseTextureKey = this.getBrauseTexture(bulletTextureKey);

		// Check if we need to apply a brause color
		let tint;
		if (this.gameConfigService.isBrauseMode() && brauseTextureKey === bulletTextureKey) {
			// Get a random color from the BrauseColorService
			tint = this.brauseColorService.getRandomColor();
		}

		const particleConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
			speed: { min: 100, max: 200 },
			angle: { min: 0, max: 360 },
			scale: { start: 1, end: 0 },
			lifespan: 800,
			blendMode: 'ADD',
			quantity: 20
		};

		// Add tint if needed
		if (tint) {
			particleConfig.tint = tint;
		}

		const particles = this.scene.add.particles(this.sprite.x, this.sprite.y, brauseTextureKey, particleConfig);

		// Fade out the tower
		this.scene.tweens.add({
			targets: this.sprite,
			alpha: 0,
			scale: this.sprite.scale * 0.5,
			duration: 300,
			ease: 'Power2',
			onComplete: () => {
				particles.destroy();
			}
		});
	}

    private updateHPDisplay(): void {
        if (this.hpText) {
            this.hpText.setText(this.buildHpText());

            const hpPercent = this.hp / 100;
            if (hpPercent <= 0.25) {
                this.hpText.setColor('#ff3333'); // Bright red for critical
            } else if (hpPercent <= 0.5) {
                this.hpText.setColor('#ffaa00'); // Orange for warning
            } else if (hpPercent <= 0.75) {
                this.hpText.setColor('#ffff00'); // Yellow for medium
            } else {
                this.hpText.setColor('#00ff00'); // Green for healthy
            }
        }
    }

    private buildHpText(): string {
        return `HP: ${this.hp}`;
    }

    /**
     * Get the appropriate texture key based on brause mode
     * If brause mode is enabled and a "_brause" version of the texture exists, use it
     * Otherwise, use the original texture
     * @param key The original texture key
     * @returns The texture key to use
     */
    protected getBrauseTexture(key: string): string {
        // If brause mode is not enabled, use the original texture
        if (!this.gameConfigService.isBrauseMode()) {
            return key;
        }

        // Check if a "_brause" version of the texture exists
        const brauseKey = key + '_brause';
        if (this.scene.textures.exists(brauseKey)) {
            return brauseKey;
        }

        // If no "_brause" version exists, use the original texture
        return key;
    }

    /**
     * Apply a random brause color to a game object if it doesn't have a "_brause" texture
     * @param gameObject The game object to apply the color to
     * @param textureKey The texture key used for the game object
     */
    protected applyBrauseColor(gameObject: Phaser.GameObjects.GameObject, textureKey: string): void {
        // Only apply color in brause mode
        if (!this.gameConfigService.isBrauseMode()) {
            return;
        }

        // Only apply color if there's no "_brause" version of the texture
        const brauseKey = textureKey + '_brause';
        if (this.scene.textures.exists(brauseKey)) {
            return;
        }

        // Get a random color from the BrauseColorService
        const randomColor = this.brauseColorService.getRandomColor();

        // Apply the color to the game object
        if (gameObject instanceof Phaser.GameObjects.Image || 
            gameObject instanceof Phaser.GameObjects.Sprite) {
            gameObject.setTint(randomColor);
        }
    }
}
