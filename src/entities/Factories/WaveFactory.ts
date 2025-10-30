import Phaser from 'phaser';
import { EnemyFactory, Enemy } from './EnemyFactory';

export class WaveFactory {
    private readonly scene: Phaser.Scene;
    private enemyFactory: EnemyFactory;
    private currentWave: number = 0;
    private waveInProgress: boolean = false;
    private waveCompleteCallback?: () => void;

    /**
     * Creates a new WaveFactory
     * @param scene The Phaser scene
     * @param pathPoints The path points for enemies to follow (can be single path or array of paths)
     */
    constructor(
        scene: Phaser.Scene,
        pathPoints: Phaser.Math.Vector2[] | Phaser.Math.Vector2[][]
    ) {
        this.scene = scene;
        this.enemyFactory = new EnemyFactory(scene, pathPoints);
        // Initialize with wave 1 when first created
        this.currentWave = 1;
    }

    /**
     * Gets the current wave number
     */
    public getCurrentWave(): number {
        return this.currentWave;
    }

    /**
     * Increments the wave number and returns the new value
     */
    public incrementWave(): number {
        this.currentWave += 1;
        return this.currentWave;
    }

    /**
     * Gets all active enemies
     */
    public getEnemies(): Enemy[] {
        return this.enemyFactory.getEnemies();
    }

    /**
     * Gets the enemy factory
     */
    public getEnemyFactory(): EnemyFactory {
        return this.enemyFactory;
    }

    /**
     * Starts the specified wave
     * @param wave The wave number to start
     */
    public startWave(wave: number): void {
        this.currentWave = wave;
        this.waveInProgress = true;
        this.enemyFactory.startWave(wave);
    }

    /**
     * Updates all enemies and checks wave completion
     * @param delta The time delta
     * @returns Object containing goldEarned and livesLost
     */
    public update(delta: number): { goldEarned: number; livesLost: number } {
        const result = this.enemyFactory.updateEnemies(delta);

        // Check if wave is complete
        if (this.waveInProgress && this.enemyFactory.isWaveComplete()) {
            this.waveInProgress = false;

            // Notify about wave completion
            if (this.waveCompleteCallback) {
                this.waveCompleteCallback();
            }
        }

        return result;
    }

    /**
     * Checks if the current wave is complete
     */
    public isWaveComplete(): boolean {
        return !this.waveInProgress && this.enemyFactory.isWaveComplete();
    }

    /**
     * Sets a callback to be called when a wave is complete
     * @param callback The callback function
     */
    public onWaveComplete(callback: () => void): void {
        this.waveCompleteCallback = callback;
    }

    /**
     * Plays the enemy death sound effect
     */
    public playEnemyDeathSound(): void {
        this.enemyFactory.playPlop();
    }
}
