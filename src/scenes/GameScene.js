import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { Tower } from '../entities/Tower';
import { Boss } from '../entities/Boss';
import { PathGenerator } from './PathGenerator';
export const GAME_EVENTS = {
    placeTowerToggle: 'ui.placeTowerToggle',
    goldChanged: 'game.goldChanged',
    livesChanged: 'game.livesChanged',
    waveChanged: 'game.waveChanged',
    enemyKilled: 'game.enemyKilled',
    towerBuilt: 'game.towerBuilt'
};
export class GameScene extends Phaser.Scene {
    constructor() {
        super(GameScene.KEY);
        Object.defineProperty(this, "enemies", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "pathPoints", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "towers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "spawnTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "isPlacingTower", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "gold", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 100
        });
        Object.defineProperty(this, "lives", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 20
        });
        Object.defineProperty(this, "wave", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 1
        });
        Object.defineProperty(this, "onPlaceTowerToggle", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (enabled) => {
                this.isPlacingTower = enabled;
                this.input.setDefaultCursor(enabled ? 'crosshair' : 'default');
            }
        });
    }
    preload() {
        // Start additional scenes
        this.scene.launch('UIScene');
        this.scene.launch('StatisticsScene');
        // Generate simple textures for sprites (no external assets)
        const g = this.add.graphics();
        // Enemy texture
        g.clear();
        g.fillStyle(0xff4757, 1);
        g.fillCircle(16, 16, 16);
        g.generateTexture('enemy', 32, 32);
        // Boss texture (larger, yellow circle)
        g.clear();
        g.fillStyle(0xffff00, 1);
        g.fillCircle(32, 32, 32);
        g.generateTexture('boss', 64, 64);
        // Tower texture
        g.clear();
        g.fillStyle(0x2ed573, 1);
        g.fillRoundedRect(0, 0, 32, 32, 6);
        g.generateTexture('tower', 32, 32);
        // Bullet texture
        g.clear();
        g.fillStyle(0xffffff, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('bullet', 8, 8);
        g.destroy();
    }
    create() {
        this.cameras.main.setBackgroundColor('#0b1020');
        // Initialize registry so UI can read initial values immediately
        this.registry.set('gold', this.gold);
        this.registry.set('lives', this.lives);
        this.registry.set('wave', this.wave);
        // Generate a randomized path across the map
        this.pathPoints = PathGenerator.generateRandomPath(this.scale.width, this.scale.height);
        // Draw the path for visual feedback
        const pathGraphics = this.add.graphics();
        pathGraphics.lineStyle(16, 0x334155, 1);
        for (let i = 0; i < this.pathPoints.length - 1; i++) {
            const a = this.pathPoints[i];
            const b = this.pathPoints[i + 1];
            pathGraphics.strokeLineShape(new Phaser.Geom.Line(a.x, a.y, b.x, b.y));
        }
        // Subscribe to UI toggle for placing towers
        this.game.events.on(GAME_EVENTS.placeTowerToggle, this.onPlaceTowerToggle, this);
        // Input to place a tower when in placement mode
        this.input.on('pointerdown', (pointer) => {
            if (this.isPlacingTower)
                return;
            const position = this.snapToGrid(pointer.worldX, pointer.worldY);
            // Prevent placing on path by checking distance to segments
            if (this.isOnPath(position))
                return;
            const towerCost = 50;
            if (this.gold < towerCost)
                return;
            this.gold -= towerCost;
            this.emitGold();
            const tower = new Tower(this, position.x, position.y);
            this.towers.push(tower);
            this.game.events.emit(GAME_EVENTS.towerBuilt);
        });
        // Start wave spawning
        this.startWave(this.wave);
        // Emit initial UI values
        this.emitGold();
        this.emitLives();
        this.emitWave();
    }
    update(time, delta) {
        // Update enemies
        for (const enemy of [...this.enemies]) {
            enemy.update(delta, this.pathPoints);
            if (enemy.isDead()) {
                const isBoss = enemy instanceof Boss;
                this.gold += isBoss ? 100 : 10;
                this.emitGold();
                this.playPlop();
                this.removeEnemy(enemy);
                continue;
            }
            if (enemy.reachedEnd) {
                this.lives -= 1;
                this.emitLives();
                this.removeEnemy(enemy);
            }
        }
        // Update towers shooting
        for (const tower of this.towers) {
            tower.update(delta, this.enemies);
        }
        // End wave if no enemies remaining and no more to spawn
        if (this.enemies.length === 0 && this.spawnTimer && this.spawnTimer.getRepeatCount() === 0 && this.spawnTimer.getProgress() === 1) {
            // Delay then start next wave
            this.time.delayedCall(200, () => {
                this.wave += 1;
                this.emitWave();
                this.startWave(this.wave);
            });
        }
    }
    startWave(wave) {
        // Boss every 5th wave
        if (wave % 5 === 0) {
            Boss.spawn(this, wave);
            return;
        }
        const count = 6 + Math.floor(wave * 1.5);
        this.spawnTimer?.remove();
        this.spawnTimer = this.time.addEvent({
            delay: 400,
            repeat: count - 1,
            callback: () => {
                Enemy.spawn(this, wave);
            },
        });
    }
    removeEnemy(enemy) {
        const idx = this.enemies.indexOf(enemy);
        if (idx >= 0) {
            this.enemies.splice(idx, 1);
            if (enemy.isDead()) {
                this.game.events.emit(GAME_EVENTS.enemyKilled);
            }
        }
        enemy.destroy();
    }
    emitGold() {
        this.registry.set('gold', this.gold);
        this.game.events.emit(GAME_EVENTS.goldChanged, this.gold);
    }
    emitLives() {
        this.registry.set('lives', this.lives);
        this.game.events.emit(GAME_EVENTS.livesChanged, this.lives);
        if (this.lives <= 0) {
            this.scene.pause();
            this.add.text(this.scale.width / 2, this.scale.height / 2, 'Game Over', { fontSize: '32px', color: '#fff' }).setOrigin(0.5);
        }
    }
    emitWave() {
        this.registry.set('wave', this.wave);
        this.game.events.emit(GAME_EVENTS.waveChanged, this.wave);
    }
    snapToGrid(x, y) {
        const size = 32;
        const sx = Math.floor(x / size) * size + size / 2;
        const sy = Math.floor(y / size) * size + size / 2;
        return new Phaser.Math.Vector2(Phaser.Math.Clamp(sx, 16, this.scale.width - 16), Phaser.Math.Clamp(sy, 16, this.scale.height - 16));
    }
    isOnPath(point) {
        // Consider within 24px of any segment centerline as on the path
        for (let i = 0; i < this.pathPoints.length - 1; i++) {
            const a = this.pathPoints[i];
            const b = this.pathPoints[i + 1];
            const dist = this.distancePointToSegment(point, a, b);
            if (dist < 24)
                return true;
        }
        return false;
    }
    distancePointToSegment(p, a, b) {
        // Compute distance from point p to line segment ab
        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const apx = p.x - a.x;
        const apy = p.y - a.y;
        const abLenSq = abx * abx + aby * aby;
        if (abLenSq === 0)
            return Math.hypot(apx, apy);
        let t = (apx * abx + apy * aby) / abLenSq;
        t = Phaser.Math.Clamp(t, 0, 1);
        const cx = a.x + abx * t;
        const cy = a.y + aby * t;
        return Math.hypot(p.x - cx, p.y - cy);
    }
    playPlop() {
        const audioCtx = this.getAudioContext();
        if (!audioCtx)
            return;
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
    getAudioContext() {
        const phaserSound = this.sound;
        const existingCtx = phaserSound?.context || window.audioCtx;
        if (existingCtx)
            return existingCtx;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass)
                return null;
            const newCtx = new AudioContextClass();
            window.audioCtx = newCtx;
            return newCtx;
        }
        catch (error) {
            return null;
        }
    }
}
Object.defineProperty(GameScene, "KEY", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: 'GameScene'
});
//# sourceMappingURL=GameScene.js.map