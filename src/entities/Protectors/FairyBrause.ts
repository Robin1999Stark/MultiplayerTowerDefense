import Phaser from 'phaser';
import { Enemy } from '../Factories/EnemyFactory';
import { AudioManager } from '../../services/AudioManager';
import { GameConfigService } from '../../services/GameConfigService';
import { BrauseColorService } from '../../services/BrauseColorService';

export class FairyBrause {
    public sprite: Phaser.GameObjects.Sprite;
    private scene: Phaser.Scene;
    private audioManager: AudioManager;
    private gameConfigService: GameConfigService;
    private brauseColorService: BrauseColorService;

    private range: number = 150;
    private fireRateMs: number = 5000; // Sprinkle every 5 seconds
    private timeSinceShot = 0;
    private moveSpeed: number = 80; // Pixels per second
    private targetX: number;
    private targetY: number;
    private castleX: number;
    private castleY: number;
    private minDistanceFromEnemy: number = 60; // Minimum distance to maintain from enemies

    constructor(scene: Phaser.Scene, castleX: number, castleY: number) {
        this.scene = scene;
        this.castleX = castleX;
        this.castleY = castleY;

        // Initialize services
        this.audioManager = AudioManager.getInstance();
        this.gameConfigService = GameConfigService.getInstance();
        this.brauseColorService = BrauseColorService.getInstance();

        // Create sprite at castle position
        const textureKey = 'fairy_brause';
        this.sprite = scene.add.sprite(castleX, castleY, textureKey);
        this.sprite.setScale(0.075); // Half the original size
        this.sprite.setDepth(5); // High depth so fairy is above everything

        // Fairy always uses her original colors, not affected by brause mode
        // No tint applied - let the beautiful fairy sprite show its natural colors!

        // Start at castle position
        this.targetX = castleX;
        this.targetY = castleY;

        // Add floating animation
        scene.tweens.add({
            targets: this.sprite,
            y: this.sprite.y - 10,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Add sparkle effect
        this.createSparkleEffect();
    }

    private createSparkleEffect(): void {
        // Create a subtle sparkle particle effect around the fairy
        const particles = this.scene.add.particles(
            this.sprite.x,
            this.sprite.y,
            'coin_icon',
            {
                speed: { min: 10, max: 30 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.3, end: 0 },
                lifespan: 600,
                blendMode: 'ADD',
                frequency: 200,
                quantity: 1,
                tint: 0xffff00,
            }
        );
        particles.setDepth(4);

        // Make particles follow the fairy
        particles.startFollow(this.sprite);
    }

    update(deltaMs: number, enemies: Enemy[]): void {
        // Move towards enemies
        this.updateMovement(deltaMs, enemies);

        // Sprinkle fairy dust on enemies
        this.timeSinceShot += deltaMs;
        if (this.timeSinceShot >= this.fireRateMs) {
            this.timeSinceShot = 0;
            this.sprinkleFairyDust(enemies);
        }
    }

    private updateMovement(deltaMs: number, enemies: Enemy[]): void {
        const dt = deltaMs / 1000;

        // Always find the nearest enemy to the fairy's CURRENT position
        const nearestEnemy = this.findNearestEnemy(enemies);

        if (nearestEnemy) {
            // Calculate direction towards enemy
            const dx = nearestEnemy.sprite.x - this.sprite.x;
            const dy = nearestEnemy.sprite.y - this.sprite.y;
            const distanceToEnemy = Math.sqrt(dx * dx + dy * dy);

            // Maintain safe distance - move towards enemy but stop at minDistanceFromEnemy
            if (distanceToEnemy > this.minDistanceFromEnemy) {
                // Too far, move closer
                const safeDistance = this.minDistanceFromEnemy;
                const targetDistance = distanceToEnemy - safeDistance;
                const ratio = targetDistance / distanceToEnemy;
                this.targetX = this.sprite.x + dx * ratio;
                this.targetY = this.sprite.y + dy * ratio;
            } else {
                // Too close, move away to maintain safe distance
                const safeDistance = this.minDistanceFromEnemy;
                const targetDistance = safeDistance - distanceToEnemy;
                const ratio = targetDistance / (distanceToEnemy || 1);
                this.targetX = this.sprite.x - dx * ratio;
                this.targetY = this.sprite.y - dy * ratio;
            }
        } else {
            // No enemies, return to castle or pick random patrol point
            const dx = this.castleX - this.sprite.x;
            const dy = this.castleY - this.sprite.y;
            const distanceToCastle = Math.sqrt(dx * dx + dy * dy);

            if (distanceToCastle < 50) {
                // Near castle, patrol around
                this.pickNewTarget();
            } else {
                // Return to castle
                this.targetX = this.castleX;
                this.targetY = this.castleY;
            }
        }

        // Calculate distance to target
        const dx = this.targetX - this.sprite.x;
        const dy = this.targetY - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Move towards target, avoiding direct overlap with enemies
        if (distance > 0) {
            const moveDistance = this.moveSpeed * dt;
            if (distance > moveDistance) {
                const ratio = moveDistance / distance;
                const newX = this.sprite.x + dx * ratio;
                const newY = this.sprite.y + dy * ratio;

                // Check if new position would be too close to any enemy
                let isSafePosition = true;
                for (const enemy of enemies) {
                    const distToEnemy = Phaser.Math.Distance.Between(
                        newX,
                        newY,
                        enemy.sprite.x,
                        enemy.sprite.y
                    );
                    if (distToEnemy < this.minDistanceFromEnemy) {
                        isSafePosition = false;
                        break;
                    }
                }

                // Only move if the new position is safe
                if (isSafePosition) {
                    this.sprite.x = newX;
                    this.sprite.y = newY;
                }
            } else {
                // Check if target position is safe before moving there
                let isSafeTarget = true;
                for (const enemy of enemies) {
                    const distToEnemy = Phaser.Math.Distance.Between(
                        this.targetX,
                        this.targetY,
                        enemy.sprite.x,
                        enemy.sprite.y
                    );
                    if (distToEnemy < this.minDistanceFromEnemy) {
                        isSafeTarget = false;
                        break;
                    }
                }

                if (isSafeTarget) {
                    this.sprite.x = this.targetX;
                    this.sprite.y = this.targetY;
                }
            }
        }
    }

    private findNearestEnemy(enemies: Enemy[]): Enemy | null {
        if (enemies.length === 0) return null;

        let nearest: Enemy | null = null;
        let nearestDist = Number.POSITIVE_INFINITY;

        // Find enemy closest to CASTLE - prioritize threats to the castle!
        for (const enemy of enemies) {
            if (!enemy || !enemy.sprite) continue;

            const distance = Phaser.Math.Distance.Between(
                this.castleX, // Castle X position
                this.castleY, // Castle Y position
                enemy.sprite.x,
                enemy.sprite.y
            );

            if (distance < nearestDist) {
                nearestDist = distance;
                nearest = enemy;
            }
        }

        return nearest;
    }

    private pickNewTarget(): void {
        // Pick a random patrol position near the castle
        const patrolRadius = 150;
        const angle = Math.random() * Math.PI * 2;
        this.targetX = this.castleX + Math.cos(angle) * patrolRadius;
        this.targetY = this.castleY + Math.sin(angle) * patrolRadius;
    }

    private sprinkleFairyDust(enemies: Enemy[]): void {
        // Find enemies in range
        const enemiesInRange = enemies.filter((enemy) => {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x,
                this.sprite.y,
                enemy.sprite.x,
                enemy.sprite.y
            );
            return distance <= this.range;
        });

        if (enemiesInRange.length === 0) return;

        // Sprinkle dust on all enemies in range
        enemiesInRange.forEach((enemy) => {
            this.applyFairyDust(enemy);
        });

        // Play sparkle sound
        this.playSparkleSound();

        // Visual effect: fairy dust particles
        this.createFairyDustEffect();
    }

    private applyFairyDust(enemy: Enemy): void {
        // Apply dizzy effect to enemy
        if (
            'applyDizzy' in enemy &&
            typeof (enemy as { applyDizzy?: (duration: number) => void })
                .applyDizzy === 'function'
        ) {
            (enemy as { applyDizzy: (duration: number) => void }).applyDizzy(
                5000
            ); // Dizzy for 5 seconds
        }
    }

    private createFairyDustEffect(): void {
        // Create a sparkle burst around the fairy
        const particles = this.scene.add.particles(
            this.sprite.x,
            this.sprite.y,
            'coin_icon',
            {
                speed: { min: 50, max: 150 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.5, end: 0 },
                lifespan: 800,
                blendMode: 'ADD',
                quantity: 15,
                tint: [0xff69b4, 0xffff00, 0xff00ff, 0x00ffff],
            }
        );
        particles.setDepth(4);

        // Clean up after animation
        this.scene.time.delayedCall(1000, () => {
            particles.destroy();
        });
    }

    private playSparkleSound(): void {
        // Don't play sound if muted
        if (this.audioManager.isMuted()) {
            return;
        }

        const audioCtx = this.getAudioContext();
        if (!audioCtx) return;

        // Create a magical sparkle sound
        const durationSec = 0.3;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(
            1600,
            audioCtx.currentTime + durationSec
        );

        gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.15,
            audioCtx.currentTime + 0.05
        );
        gain.gain.exponentialRampToValueAtTime(
            0.01,
            audioCtx.currentTime + durationSec
        );

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + durationSec);

        osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
        };
    }

    private getAudioContext(): AudioContext | null {
        const phaserSound = this.scene.sound as { context?: AudioContext };
        const existingCtx = phaserSound?.context || window.audioCtx;

        if (existingCtx) return existingCtx;

        try {
            const AudioContextClass =
                window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return null;

            const newCtx = new AudioContextClass();
            window.audioCtx = newCtx;
            return newCtx;
        } catch (error) {
            return null;
        }
    }

    public destroy(): void {
        this.sprite.destroy();
    }

    public getSprite(): Phaser.GameObjects.Sprite {
        return this.sprite;
    }
}
