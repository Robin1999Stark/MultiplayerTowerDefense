import { Scene } from 'phaser';
import { GAME_EVENTS } from './GameScene';
export class StatisticsScene extends Scene {
    constructor() {
        super({ key: 'StatisticsScene' });
        Object.defineProperty(this, "statistics", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        Object.defineProperty(this, "uiScene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // Statistics tracking
        Object.defineProperty(this, "totalGold", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "towersBuilt", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "enemiesKilled", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "wavesCompleted", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        console.log('StatisticsScene constructor called');
    }
    init() {
        console.log('StatisticsScene init called');
    }
    preload() {
        console.log('StatisticsScene preload called');
    }
    create() {
        console.log('StatisticsScene created');
        this.uiScene = this.scene.get('UIScene');
        // Panel für Statistiken erstellen
        const padding = 10;
        const panelBg = this.add.rectangle(this.cameras.main.width - 200 - padding, padding, 200, 120, 0x000000, 0.3)
            .setOrigin(0, 0)
            .setStrokeStyle(1, 0xffffff, 0.2);
        const textStyle = {
            color: '#ffffff',
            fontSize: '14px',
            align: 'left'
        };
        // Statistik-Texte erstellen
        const startX = panelBg.x + 10;
        let currentY = panelBg.y + 10;
        const lineHeight = 25;
        this.statistics['totalGold'] = this.add.text(startX, currentY, 'Total Gold: 0', textStyle);
        currentY += lineHeight;
        this.statistics['towersBuilt'] = this.add.text(startX, currentY, 'Towers Built: 0', textStyle);
        currentY += lineHeight;
        this.statistics['enemiesKilled'] = this.add.text(startX, currentY, 'Enemies Killed: 0', textStyle);
        currentY += lineHeight;
        this.statistics['wavesCompleted'] = this.add.text(startX, currentY, 'Waves Completed: 0', textStyle);
        // Set up event listeners for game events
        this.game.events.on(GAME_EVENTS.goldChanged, this.onGoldChanged, this);
        this.game.events.on(GAME_EVENTS.waveChanged, this.onWaveChanged, this);
        this.game.events.on(GAME_EVENTS.enemyKilled, this.onEnemyKilled, this);
        this.game.events.on(GAME_EVENTS.towerBuilt, this.onTowerBuilt, this);
        console.log('StatisticsScene created');
    }
    updateStatistic(key, value) {
        const statisticLabels = {
            totalGold: 'Total Gold',
            towersBuilt: 'Towers Built',
            enemiesKilled: 'Enemies Killed',
            wavesCompleted: 'Waves Completed'
        };
        if (this.statistics[key]) {
            this.statistics[key].setText(`${statisticLabels[key]}: ${value}`);
        }
    }
    onGoldChanged(gold) {
        this.totalGold = gold;
        this.updateStatistic('totalGold', this.totalGold);
    }
    onTowerBuilt() {
        this.towersBuilt++;
        this.updateStatistic('towersBuilt', this.towersBuilt);
    }
    onEnemyKilled() {
        this.enemiesKilled++;
        this.updateStatistic('enemiesKilled', this.enemiesKilled);
    }
    onWaveChanged(wave) {
        this.wavesCompleted = wave - 1;
        this.updateStatistic('wavesCompleted', this.wavesCompleted);
    }
}
//# sourceMappingURL=StatisticsScene.js.map