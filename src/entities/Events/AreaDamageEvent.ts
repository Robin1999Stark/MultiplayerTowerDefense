import { BaseEvent } from './Event';
import { GameScene } from '../../scenes/GameScene';

export class AreaDamageEvent extends BaseEvent {
    private readonly damageAmount: number;
    private readonly areaRadius: number;
    
    constructor() {
        super(
            'area_damage',
            'Area Damage',
            'Instantly deals damage to all enemies around the cursor',
            100,
            1000,
            'effect_area_damage',
            'A'
        );
        this.damageAmount = 5000;
        this.areaRadius = 100;
    }
    
    override activate(scene: GameScene): void {
        super.activate(scene);

        const pointer = scene.input.activePointer;
        this.applyDamageInArea(scene, pointer.x, pointer.y);
        this.showDamageEffect(scene, pointer.x, pointer.y);
        this.deactivate(scene);
    }
    
    override deactivate(scene: GameScene): void {
        super.deactivate(scene);
    }
    
    private applyDamageInArea(scene: GameScene, x: number, y: number): void {
        const enemies = scene.getEnemies();
        let hitCount = 0;
        
        if (enemies && enemies.length > 0) {
            enemies.forEach(enemy => {
                const distance = Phaser.Math.Distance.Between(
                    x, y, 
                    enemy.sprite.x, enemy.sprite.y
                );
                
                if (distance <= this.areaRadius) {

                    enemy.takeDamage(this.damageAmount);
                    hitCount++;
                }
            });
        }
        
        console.log(`Area Damage hit ${hitCount} enemies for ${this.damageAmount} damage each`);
    }
    
    private showDamageEffect(scene: GameScene, x: number, y: number): void {

        const graphics = scene.add.graphics();
        graphics.setDepth(1000);

        graphics.fillStyle(0xff0000, 0.5);
        graphics.fillCircle(x, y, this.areaRadius);

        const particles = scene.add.particles(x, y, 'bullet', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 500,
            blendMode: 'ADD',
            quantity: 30
        });

        scene.tweens.add({
            targets: graphics,
            alpha: { from: 0.5, to: 0 },
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                graphics.destroy();
                particles.destroy();
            }
        });
    }
}