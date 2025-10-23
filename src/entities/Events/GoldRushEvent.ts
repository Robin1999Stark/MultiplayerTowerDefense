import { BaseEvent } from './Event';
import { GameScene } from '../../scenes/GameScene';

export class GoldRushEvent extends BaseEvent {
    private readonly goldMultiplier: number;
    private originalGoldEarningFunction: ((isBoss: boolean) => number) | null = null;
    
    constructor() {
        super(
            'gold_rush',
            'Gold Rush',
            'Doubles gold income from units for 20 seconds',
            150,
            30000,
            'effect_gold_rush',
            'G'
        );
        this.goldMultiplier = 2;
    }
    
    override activate(scene: GameScene): void {
        super.activate(scene);
        
        const enemyFactory = scene.getEnemyFactory();
        if (enemyFactory) {
            this.originalGoldEarningFunction = enemyFactory.getGoldEarningFunction();

            enemyFactory.setGoldEarningFunction((isBoss: boolean) => {
                const baseAmount = isBoss ? 100 : 10;
                return baseAmount * this.goldMultiplier;
            });
        }
        this.showGoldRushEffect(scene);
    }
    
    override deactivate(scene: GameScene): void {
        super.deactivate(scene);
        
        const enemyFactory = scene.getEnemyFactory();
        if (enemyFactory && this.originalGoldEarningFunction) {

            enemyFactory.setGoldEarningFunction(this.originalGoldEarningFunction);
            this.originalGoldEarningFunction = null;
        }
    }
    
    private showGoldRushEffect(scene: GameScene): void {

        const graphics = scene.add.graphics();
        graphics.setDepth(100);

        graphics.fillStyle(0xffd700, 0.2);
        graphics.fillRect(0, 0, scene.scale.width, scene.scale.height);

        const particles = scene.add.particles(scene.scale.width / 2, scene.scale.height / 2, 'gold', {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.2, end: 0.1 },
            lifespan: 2000,
            blendMode: 'ADD',
            frequency: 100,
            emitting: true
        });

        scene.tweens.add({
            targets: graphics,
            alpha: { from: 0.2, to: 0 },
            duration: 2000,
            ease: 'Sine.easeInOut',
            repeat: 9,
            yoyo: true,
            onComplete: () => {
                graphics.destroy();
                particles.destroy();
            }
        });
    }
}