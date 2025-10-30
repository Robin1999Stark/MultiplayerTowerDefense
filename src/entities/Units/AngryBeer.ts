import Phaser from 'phaser';
import { OrcGrunt } from './OrcGrunt';
import { GameScene } from '@scenes/GameScene';
import { Enemy } from '../Factories/EnemyFactory';
import { Tower } from '../Towers/Tower';

export class AngryBeer extends OrcGrunt {
    private beerSplashTimer: number = 0;
    private beerSplashCooldown: number = 15000; // 15 seconds
    private beerSplashRange: number = 150; // Range to splash beer at towers

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        hp: number,
        speed: number
    ) {
        super(scene, x, y, hp, speed, 'angry_beer_brause', 24);
        this.sprite.setScale(0.09);
    }

    /**
     * Override update to add beer splash ability
     */
    override update(deltaMs: number, path: Phaser.Math.Vector2[]): void {
        // Call parent update for movement
        super.update(deltaMs, path);

        // Update beer splash timer
        this.beerSplashTimer += deltaMs;

        // Check if it's time to splash beer
        if (this.beerSplashTimer >= this.beerSplashCooldown) {
            this.attemptBeerSplash();
            this.beerSplashTimer = 0;
        }
    }

    /**
     * Attempt to splash beer at a nearby tower
     */
    private attemptBeerSplash(): void {
        const gameScene = this.sprite.scene as GameScene;
        const tower = this.findNearestTower(gameScene);

        if (tower) {
            this.splashBeerAt(tower);
        }
    }

    /**
     * Find the nearest tower within splash range
     */
    private findNearestTower(gameScene: GameScene): Tower | null {
        // Access the towers array from GameScene
        const towers = (gameScene as any).towers as Tower[];

        if (!towers || towers.length === 0) {
            return null;
        }

        let nearestTower: Tower | null = null;
        let nearestDistance = this.beerSplashRange;

        for (const tower of towers) {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x,
                this.sprite.y,
                tower.sprite.x,
                tower.sprite.y
            );

            if (distance <= nearestDistance) {
                nearestDistance = distance;
                nearestTower = tower;
            }
        }

        return nearestTower;
    }

    /**
     * Splash beer at a tower to incapacitate it
     */
    private splashBeerAt(tower: Tower): void {
        // Create visual beer splash effect
        this.createBeerSplashEffect(tower);

        // Incapacitate the tower for 10 seconds
        tower.incapacitate(10000);
    }

    /**
     * Create a visual beer splash effect
     */
    private createBeerSplashEffect(tower: Tower): void {
        const scene = this.sprite.scene;

        // Create a beer projectile
        const beer = scene.add.ellipse(
            this.sprite.x,
            this.sprite.y,
            20,
            20,
            0xffa500 // Orange/beer color
        );
        beer.setDepth(3);

        // Animate the beer projectile to the tower
        const duration = 400;
        scene.tweens.add({
            targets: beer,
            x: tower.sprite.x,
            y: tower.sprite.y,
            duration,
            ease: 'Quad.easeOut',
            onComplete: () => {
                // Create splash effect
                const splash = scene.add.circle(
                    tower.sprite.x,
                    tower.sprite.y,
                    5,
                    0xffa500,
                    0.8
                );
                splash.setDepth(3);

                // Expand splash
                scene.tweens.add({
                    targets: splash,
                    radius: 50,
                    alpha: 0,
                    duration: 500,
                    ease: 'Quad.easeOut',
                    onComplete: () => splash.destroy(),
                });

                beer.destroy();
            },
        });
    }

    /**
     * Override applySlow to make AngryBeer heal when hit by frost tower
     * Instead of being slowed, the AngryBeer heals from the frost effect
     */
    override applySlow(durationMs: number, slowFactor: number = 0.5): void {
        // AngryBeer heals from frost effects instead of being slowed
        const healAmount = 100; // Heal 100 HP per frost hit (increased from 50)
        this.heal(healAmount);

        // Visual feedback for healing - green tint
        this.sprite.setTint(0x00ff00);
        this.sprite.scene.time.delayedCall(200, () => {
            this.sprite.clearTint();
            // Reapply Brause color after the heal effect (if applicable)
            this.applyBrauseColorPublic();
        });
    }

    /**
     * Heal the AngryBeer by a certain amount (capped at maxHp)
     */
    private heal(amount: number): void {
        const maxHp = (this as any).maxHp as number;
        this.hp = Math.min(this.hp + amount, maxHp);
        this.updateHealthBarPublic();
    }

    /**
     * Public wrapper to access protected updateHealthBar method
     */
    private updateHealthBarPublic(): void {
        // Call the parent's updateHealthBar through reflection
        // Since updateHealthBar is private in parent, we need to access it differently
        (this as any).updateHealthBar();
    }

    /**
     * Public wrapper to access protected applyBrauseColor method
     */
    private applyBrauseColorPublic(): void {
        // Call the parent's applyBrauseColor through reflection
        (this as any).applyBrauseColor();
    }

    static override spawn(scene: Phaser.Scene, wave: number): Enemy {
        // Stats: Stronger than standard enemy but weaker than boss
        // Standard enemy (OrcGrunt): HP = 30 + wave * 10, Speed = 70 + wave * 3
        // Boss (OrcWarrior): HP = 60000 + wave * 60, Speed = 10 + wave * 1.5
        // AngryBeer: Strong mid-tier enemy with high HP and moderate speed
        const hp = 300 + wave * 50; // Increased from 150 + wave * 30
        const speed = 60 + wave * 2.5; // Increased from 50 + wave * 2

        const gameScene = scene as GameScene;
        const start = gameScene.pathPoints[0];
        if (!start) throw new Error('No path points found');

        return new this(scene, start.x, start.y, hp, speed);
    }
}
