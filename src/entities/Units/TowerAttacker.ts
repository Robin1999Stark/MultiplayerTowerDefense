import Phaser from 'phaser'
import { OrcGrunt } from './OrcGrunt'
import { GameScene } from '@scenes/GameScene'
import { Tower } from '../Towers/Tower'
import { GameConfigService } from '../../services/GameConfigService'

export class TowerAttacker extends OrcGrunt {
    private emissionRange: number = 150;
    private emissionDamage: number = 20;
    private emissionCooldown: number = 2000;
    private timeSinceLastEmission: number = 0;
    private emissionParticles?: Phaser.GameObjects.Particles.ParticleEmitter;

    constructor(scene: Phaser.Scene, x: number, y: number, hp: number, speed: number) {
        super(scene, x, y, hp, speed, 'tower_attacker', 16);

        // Only set the green tint if Brause mode is not enabled
        const gameConfigService = GameConfigService.getInstance()
        if (!gameConfigService.isBrauseMode()) {
            this.sprite.setTint(0x00ff00);
        }
    }

    override update(deltaMs: number, path: Phaser.Math.Vector2[]): void {
        super.update(deltaMs, path);

        this.timeSinceLastEmission += deltaMs;

        if (this.timeSinceLastEmission >= this.emissionCooldown) {
            this.tryEmitAttack();
        }
    }

    private tryEmitAttack(): void {
        const gameScene = this.sprite.scene as GameScene;
        if (!gameScene) return;

        const towersInRange = this.findTowersInRange(gameScene);

        if (towersInRange.length > 0) {
            this.emitAttack(towersInRange);
            this.timeSinceLastEmission = 0;
        }
    }

    private findTowersInRange(gameScene: GameScene): Tower[] {
        const towers = gameScene['towers'] as Tower[];
        if (!towers) return [];

        return towers.filter(tower => {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x, this.sprite.y,
                tower.sprite.x, tower.sprite.y
            );
            return distance <= this.emissionRange;
        });
    }

    private emitAttack(towers: Tower[]): void {
        this.showEmissionEffect();

        for (const tower of towers) {
            const destroyed = tower.takeDamage(this.emissionDamage);

            if (destroyed) {
                this.showDestructionEffect(tower);
            }
        }
    }

    private showEmissionEffect(): void {
        const circle = this.sprite.scene.add.circle(
            this.sprite.x, 
            this.sprite.y, 
            10, 
            0x00ff00, 
            0.7
        );
        circle.setDepth(10);

        this.sprite.scene.tweens.add({
            targets: circle,
            radius: this.emissionRange,
            alpha: 0,
            duration: 800,
            ease: 'Sine.easeOut',
            onComplete: () => {
                circle.destroy();
            }
        });

        if (!this.emissionParticles) {
            this.emissionParticles = this.sprite.scene.add.particles(this.sprite.x, this.sprite.y, 'bullet', {
                speed: { min: 50, max: 100 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.5, end: 0 },
                tint: 0x00ff00,
                lifespan: 800,
                quantity: 1,
                frequency: 100,
                emitting: false
            });
        } else {
            this.emissionParticles.setPosition(this.sprite.x, this.sprite.y);
        }

        this.emissionParticles.emitParticleAt(this.sprite.x, this.sprite.y, 15);
    }

    private showDestructionEffect(tower: Tower): void {
        // Add some additional particles at the tower location
        const particles = this.sprite.scene.add.particles(tower.sprite.x, tower.sprite.y, 'bullet', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            tint: 0x00ff00,
            lifespan: 1000,
            quantity: 30,
            emitting: false
        });

        particles.emitParticleAt(tower.sprite.x, tower.sprite.y, 30);

        // Clean up after animation
        this.sprite.scene.time.delayedCall(1000, () => {
            particles.destroy();
        });
    }

    override destroy(): void {
        if (this.emissionParticles) {
            this.emissionParticles.destroy();
        }
        super.destroy();
    }

    static override spawn(scene: Phaser.Scene, wave: number): TowerAttacker {
        // Higher HP and slower speed than regular units
        const hp = 50 + wave * 15;
        const speed = 50 + wave * 2;

        const gameScene = scene as GameScene;
        const start = gameScene.pathPoints[0];
        if (!start) throw new Error("No path points found");

        return new TowerAttacker(scene, start.x, start.y, hp, speed);
    }
}
