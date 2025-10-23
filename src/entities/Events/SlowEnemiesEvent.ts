import { BaseEvent } from './Event';
import { GameScene } from '../../scenes/GameScene';
import { OrcGrunt } from '../Units/OrcGrunt';

export class SlowEnemiesEvent extends BaseEvent {
    private readonly slowFactor: number;
    
    constructor() {
        super(
            'slow_enemies',
            'Slow Enemies',
            'Slows down all enemies for 10 seconds',
            100,
            10000,
            'effect_freezing',
            'S',
        );
        this.slowFactor = 0.5;
    }
    
    override activate(scene: GameScene): void {
        super.activate(scene);

        const enemies = scene.getEnemies();
        if (enemies && enemies.length > 0) {
            enemies.forEach(enemy => {
                if (enemy instanceof OrcGrunt) {
                    enemy.applySlow(this.duration, this.slowFactor);
                }
            });
        }

        this.showSlowEffect(scene);
    }
    
    override deactivate(scene: GameScene): void {
        super.deactivate(scene);
    }
    
    private showSlowEffect(scene: GameScene): void {

        const graphics = scene.add.graphics();
        graphics.setDepth(100);

        graphics.fillStyle(0x00aaff, 0.2);
        graphics.fillCircle(scene.scale.width / 2, scene.scale.height / 2, scene.scale.width);

        scene.tweens.add({
            targets: graphics,
            alpha: { from: 0.2, to: 0 },
            duration: 2000,
            ease: 'Sine.easeInOut',
            repeat: 4,
            yoyo: true,
            onComplete: () => {
                graphics.destroy();
            }
        });
    }
}