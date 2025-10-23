import Phaser from 'phaser';
import { OrcGrunt } from '../Units/OrcGrunt';
import { OrcWarrior } from '../Units/OrcWarrior';
import { Berserker } from '../Units/Berserker';
import { Chonkers } from '../Units/Chonkers';
import { Cultist } from '../Units/Cultist';
import { Demon } from '../Units/Demon';
import { Imp } from '../Units/Imp';
import { Skeleton } from '../Units/Skeleton';
import { SkeletonArcher } from '../Units/SkeletonArcher';
import { Unicorn } from '../Units/Unicorn';
import { Zombie } from '../Units/Zombie';
import { TowerAttacker } from '../Units/TowerAttacker';
import { GAME_EVENTS } from '../../scenes/GameScene';

export interface Enemy {
    sprite: Phaser.Physics.Arcade.Sprite;
    hp: number;
    speed: number;
    reachedEnd: boolean;
    
    update(deltaMs: number, path: Phaser.Math.Vector2[]): void;
    takeDamage(amount: number): void;
    isDead(): boolean;
    destroy(): void;
    applySlow?(durationMs: number, slowFactor: number): void;
}

export class EnemyFactory {
    private readonly scene: Phaser.Scene;
    private enemies: Enemy[] = [];
    private spawnTimer?: Phaser.Time.TimerEvent;
    private readonly pathPoints: Phaser.Math.Vector2[] = [];
    private goldEarningFunction: (isBoss: boolean) => number = (isBoss: boolean) => isBoss ? 100 : 10;

    constructor(scene: Phaser.Scene, pathPoints: Phaser.Math.Vector2[]) {
        this.scene = scene;
        this.pathPoints = pathPoints;
    }

    public getEnemies(): Enemy[] {
        return this.enemies;
    }
    
    public getGoldEarningFunction(): (isBoss: boolean) => number {
        return this.goldEarningFunction;
    }
    
    public setGoldEarningFunction(func: (isBoss: boolean) => number): void {
        this.goldEarningFunction = func;
    }

    public startWave(wave: number): void {
        // OrcWarrior every 5th wave
        if (wave % 5 === 0) {
            this.spawnOrcWarrior(wave);
            return;
        }

        const count = 6 + Math.floor(wave * 1.5);

        this.spawnTimer?.remove();
        this.spawnTimer = this.scene.time.addEvent({
            delay: 400,
            repeat: count - 1,
            callback: () => {
                this.spawnRandomEnemy(wave);
            },
        });
    }

    private spawnRandomEnemy(wave: number): void {
        const enemyTypes = [
            OrcGrunt,
            Berserker,
            Chonkers,
            Cultist,
            Demon,
            Imp,
            Skeleton,
            SkeletonArcher,
            TowerAttacker,
            Unicorn,
            Zombie
        ];

        const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        if (randomType) {
            this.spawnEnemy(randomType, wave);
        }
    }

    private spawnOrcWarrior(wave: number): void {
        this.spawnEnemy(OrcWarrior, wave);
    }

    private spawnEnemy(enemyType: { spawn(scene: Phaser.Scene, wave: number): Enemy }, wave: number): void {
        const enemy = enemyType.spawn(this.scene, wave);
        this.enemies.push(enemy);
    }

    public updateEnemies(delta: number): { goldEarned: number, livesLost: number } {
        let goldEarned = 0;
        let livesLost = 0;

        for (const enemy of [...this.enemies]) {
            enemy.update(delta, this.pathPoints);
            
            if (enemy.isDead()) {
                const isBoss = enemy.sprite.texture.key === 'orc_warrior';
                goldEarned += this.goldEarningFunction(isBoss);
                this.playPlop();
                this.removeEnemy(enemy);
                continue;
            }

            // Check if enemy is close to castle (within 50 pixels of castle position)
            if (this.pathPoints.length > 0) {
                const endPoint = this.pathPoints[this.pathPoints.length - 1]!;
                const castleX = endPoint.x - 40;
                const castleY = endPoint.y - 43;
                const distanceToCastle = Phaser.Math.Distance.Between(
                    enemy.sprite.x, enemy.sprite.y,
                    castleX, castleY
                );

                if (distanceToCastle < 50) {
                    livesLost += 1;
                    this.removeEnemy(enemy);
                    continue;
                }
            }

            if (enemy.reachedEnd) {
                livesLost += 1;
                this.removeEnemy(enemy);
            }
        }

        return { goldEarned, livesLost };
    }

    public removeEnemy(enemy: Enemy): void {
        const idx = this.enemies.indexOf(enemy);
        if (idx >= 0) {
            this.enemies.splice(idx, 1);

            if (enemy.isDead()) {
                this.scene.game.events.emit(GAME_EVENTS.enemyKilled);
            }
        }

        if (enemy.isDead()) {
            this.flingEnemyOffscreen(enemy);
            return;
        }

        enemy.destroy();
    }

    private flingEnemyOffscreen(enemy: Enemy): void {
        // Disable physics and fling the sprite offscreen with a spin, then destroy
        enemy.sprite.setVelocity(0, 0);
        const body = enemy.sprite.body as Phaser.Physics.Arcade.Body | null | undefined;
        if (body) body.setEnable(false);

        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const distance = Math.max(this.scene.scale.width, this.scene.scale.height) + 200;
        const targetX = enemy.sprite.x + Math.cos(angle) * distance;
        const targetY = enemy.sprite.y + Math.sin(angle) * distance;
        const spin = Phaser.Math.FloatBetween(20, 60) * (Math.random() < 0.5 ? -1 : 1);

        this.scene.tweens.add({
            targets: enemy.sprite,
            x: targetX,
            y: targetY,
            rotation: enemy.sprite.rotation + spin,
            duration: 4500,
            ease: 'Quad.easeOut',
            onComplete: () => enemy.destroy()
        });
    }

    public isWaveComplete(): boolean {
        return Boolean(this.enemies.length === 0 &&
               this.spawnTimer && 
               this.spawnTimer.getRepeatCount() === 0 && 
               this.spawnTimer.getProgress() === 1);
    }

    public playPlop(): void {
        const audioCtx = this.getAudioContext();
        if (!audioCtx) return;

        const durationSec = 0.06;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + durationSec);
        gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationSec);
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
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return null;

            const newCtx = new AudioContextClass();
            window.audioCtx = newCtx;
            return newCtx;
        } catch (error) {
            return null;
        }
    }
}