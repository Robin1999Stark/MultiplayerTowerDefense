import { BaseEvent } from './Event';
import { GameScene } from '../../scenes/GameScene';
import { OrcGrunt } from '../Units/OrcGrunt';

export class SlowEnemiesEvent extends BaseEvent {
    private slowFactor: number;
    
    constructor() {
        super(
            'slow_enemies',
            'Slow Enemies',
            'Slows down all enemies for 10 seconds',
            50, // cost
            10000, // duration in milliseconds (10 seconds)
            'event_slow', // icon
            'S' // key
        );
        this.slowFactor = 0.5; // 50% slow
    }
    
    override activate(scene: GameScene): void {
        super.activate(scene);
        
        // Apply slow effect to all enemies
        const enemies = scene.getEnemies();
        if (enemies && enemies.length > 0) {
            enemies.forEach(enemy => {
                if (enemy instanceof OrcGrunt) {
                    enemy.applySlow(this.duration);
                }
            });
        }
        
        // Visual feedback
        this.showSlowEffect(scene);
    }
    
    override deactivate(scene: GameScene): void {
        super.deactivate(scene);
        
        // Remove slow effect from all enemies
        // Note: We don't need to manually remove the slow effect as the OrcGrunt class
        // already handles this with its internal timer
    }
    
    private showSlowEffect(scene: GameScene): void {
        // Create a visual effect to indicate the slow event is active
        const graphics = scene.add.graphics();
        graphics.setDepth(100);
        
        // Draw a blue pulsing circle that covers the entire game area
        graphics.fillStyle(0x00aaff, 0.2);
        graphics.fillCircle(scene.scale.width / 2, scene.scale.height / 2, scene.scale.width);
        
        // Animate the effect
        scene.tweens.add({
            targets: graphics,
            alpha: { from: 0.2, to: 0 },
            duration: 2000,
            ease: 'Sine.easeInOut',
            repeat: 4, // Repeat for the duration of the effect
            yoyo: true,
            onComplete: () => {
                graphics.destroy();
            }
        });
    }
}