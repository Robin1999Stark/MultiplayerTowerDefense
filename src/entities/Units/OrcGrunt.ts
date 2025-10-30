import Phaser from 'phaser';
import { GameScene } from '@scenes/GameScene';
import { Enemy } from '../Factories/EnemyFactory';
import { GameConfigService } from '../../services/GameConfigService';
import { BrauseColorService } from '../../services/BrauseColorService';

export class OrcGrunt implements Enemy {
    public sprite: Phaser.Physics.Arcade.Sprite;
    public hp: number;
    public speed: number;
    public reachedEnd = false;
    private pathIndex = 0;
    private walkTime = 0;
    private slowTimer = 0;
    private slowDuration = 0;
    private baseSpeed: number;
    private isSlowed = false;
    private healthBar: Phaser.GameObjects.Graphics;
    private maxHp: number;
    private gameConfigService: GameConfigService;
    private brauseColorService: BrauseColorService;
    private dizzyTimer = 0;
    private dizzyDuration = 0;
    private isDizzy = false;
    private wanderAngle = 0;
    private isConfused = false;
    private confusedTimer = 0;
    private confusedDuration = 0;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        hp: number,
        speed: number,
        textureKey: string = 'orc_grunt',
        radius: number = 16
    ) {
        this.sprite = scene.physics.add.sprite(x, y, textureKey);
        this.sprite.setScale(0.05);
        this.sprite.setCircle(radius, 16 - radius, 16 - radius);
        this.sprite.setDepth(1);
        this.hp = hp;
        this.maxHp = hp;
        this.speed = speed;
        this.baseSpeed = speed;
        this.gameConfigService = GameConfigService.getInstance();
        this.brauseColorService = BrauseColorService.getInstance();

        // Create health bar
        this.healthBar = scene.add.graphics();
        this.healthBar.setDepth(1); // Same depth as sprite
        this.updateHealthBar();
    }

    update(deltaMs: number, path: Phaser.Math.Vector2[]): void {
        if (this.reachedEnd) return;
        const dt = deltaMs / 1000;
        this.walkTime += dt * 10;

        // Handle slowing effect
        if (this.isSlowed) {
            this.slowTimer += deltaMs;
            if (this.slowTimer >= this.slowDuration) {
                this.removeSlow();
            }
        }

        // Handle dizzy effect
        if (this.isDizzy) {
            this.dizzyTimer += deltaMs;
            if (this.dizzyTimer >= this.dizzyDuration) {
                this.removeDizzy();
            }
            // Update wander angle for dizzy movement (more erratic)
            this.wanderAngle += (Math.random() - 0.5) * 0.5;
        }

        // Handle confused (walking backwards) effect
        if (this.isConfused) {
            this.confusedTimer += deltaMs;
            if (this.confusedTimer >= this.confusedDuration) {
                this.isConfused = false;
                this.confusedTimer = 0;
                this.confusedDuration = 0;
            }
        }

        const pos = new Phaser.Math.Vector2(this.sprite.x, this.sprite.y);

        // Determine target based on confusion state
        let target: Phaser.Math.Vector2 | undefined;
        if (this.isConfused) {
            // Walk backwards - target previous waypoint
            target = path[Math.max(0, this.pathIndex - 1)];
        } else {
            // Normal - target next waypoint
            target = path[this.pathIndex + 1];
        }

        if (!target) {
            this.reachedEnd = true;
            return;
        }
        let dir = target.clone().subtract(pos);
        const distance = dir.length();
        if (distance < this.speed * dt) {
            if (this.isConfused) {
                // Moving backwards, decrease path index
                if (this.pathIndex > 0) {
                    this.pathIndex--;
                }
            } else {
                // Moving forward normally
                this.sprite.setPosition(target.x, target.y);
                this.pathIndex++;
            }
            // Update health bar position after moving
            this.updateHealthBar();
            return;
        }
        dir.normalize();

        // If dizzy, add MUCH MORE random wandering to the direction
        if (this.isDizzy) {
            const wanderX = Math.cos(this.wanderAngle) * 1.5;
            const wanderY = Math.sin(this.wanderAngle) * 1.5;
            dir.x = dir.x * 0.3 + wanderX * 0.7; // Much stronger wander effect
            dir.y = dir.y * 0.3 + wanderY * 0.7;
            dir.normalize();
        }

        this.sprite.setVelocity(dir.x * this.speed, dir.y * this.speed);

        // Add a slight back-and-forth rotation to simulate walking
        let rotationAmplitude = 0.12; // radians (~7 degrees)
        if (this.isDizzy) {
            rotationAmplitude *= 2; // More erratic rotation when dizzy
        }
        this.sprite.setRotation(Math.sin(this.walkTime) * rotationAmplitude);

        // Update health bar position
        this.updateHealthBar();
    }

    takeDamage(amount: number): void {
        this.hp -= amount;
        this.updateHealthBar();

        // Visual feedback for damage
        this.sprite.setTint(0xff0000); // Red tint
        this.sprite.scene.time.delayedCall(100, () => {
            this.sprite.clearTint();
            // Reapply Brause color after the damage effect
            this.applyBrauseColor();
        });
    }

    private updateHealthBar(): void {
        this.healthBar.clear();

        // Don't show health bar if enemy is dead
        if (this.hp <= 0) return;

        const width = 30; // Width of health bar
        const height = 4; // Height of health bar
        const x = this.sprite.x - width / 2;
        const y = this.sprite.y - 20; // Position above the sprite

        // Background (red)
        this.healthBar.fillStyle(0xff0000);
        this.healthBar.fillRect(x, y, width, height);

        // Health (green)
        const healthPercent = Math.max(0, this.hp / this.maxHp);
        this.healthBar.fillStyle(0x00ff00);
        this.healthBar.fillRect(x, y, width * healthPercent, height);
    }

    applySlow(durationMs: number, slowFactor: number = 0.5): void {
        this.slowTimer = 0;
        this.slowDuration = durationMs;
        this.isSlowed = true;
        this.speed = this.baseSpeed * slowFactor;
        this.sprite.setTint(0x00aaff); // Blue tint for slowed enemies
    }

    removeSlow(): void {
        this.isSlowed = false;
        this.speed = this.baseSpeed;
        this.slowTimer = 0;
        this.slowDuration = 0;

        // Only clear tint if not dizzy
        if (!this.isDizzy) {
            this.sprite.clearTint();
            // Reapply Brause color after clearing the tint
            this.applyBrauseColor();
        }
    }

    applyDizzy(durationMs: number): void {
        this.dizzyTimer = 0;
        this.dizzyDuration = durationMs;
        this.isDizzy = true;
        this.wanderAngle = Math.random() * Math.PI * 2;

        // Apply glowing pink/purple tint for dizzy effect
        this.sprite.setTint(0xff69b4);

        // Set alpha to make them glow (but stay visible)
        this.sprite.setAlpha(1.0);

        // 10% chance to get confused and walk backwards for 2-3 seconds
        if (Math.random() < 0.1) {
            this.isConfused = true;
            this.confusedTimer = 0;
            this.confusedDuration = 2000 + Math.random() * 1000; // 2-3 seconds
        }
    }

    removeDizzy(): void {
        this.isDizzy = false;
        this.dizzyTimer = 0;
        this.dizzyDuration = 0;
        this.wanderAngle = 0;

        // Also clear confusion when dizzy wears off
        this.isConfused = false;
        this.confusedTimer = 0;
        this.confusedDuration = 0;

        // Reset alpha
        this.sprite.setAlpha(1.0);

        // Only clear tint if not slowed
        if (!this.isSlowed) {
            this.sprite.clearTint();
            // Reapply Brause color after clearing the tint
            this.applyBrauseColor();
        } else {
            // Reapply slow tint
            this.sprite.setTint(0x00aaff);
        }
    }

    /**
     * Apply a random brause color to the enemy sprite if in brause mode
     */
    private applyBrauseColor(): void {
        // Only apply color in brause mode
        if (!this.gameConfigService.isBrauseMode()) {
            return;
        }

        // Only apply color if there's no "_brause" version of the texture
        const textureKey = this.sprite.texture.key;
        const brauseKey = textureKey + '_brause';
        if (this.sprite.scene.textures.exists(brauseKey)) {
            return;
        }

        // Get a random color from the BrauseColorService
        const randomColor = this.brauseColorService.getRandomColor();

        // Apply the color to the sprite
        this.sprite.setTint(randomColor);
    }

    isDead(): boolean {
        return this.hp <= 0;
    }

    destroy(): void {
        this.sprite.destroy();
        this.healthBar.destroy();
    }

    static spawn(scene: Phaser.Scene, wave: number): Enemy {
        const hp = 30 + wave * 10;
        const speed = 70 + wave * 3;

        const gameScene = scene as GameScene;
        const start = gameScene.pathPoints[0];
        if (!start) throw new Error('No path points found');

        return new this(scene, start.x, start.y, hp, speed);
    }
}
