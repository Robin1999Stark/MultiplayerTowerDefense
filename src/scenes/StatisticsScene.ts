import { Scene } from 'phaser';
import { UIScene } from './UIScene';
import { GAME_EVENTS } from './GameScene';

export class StatisticsScene extends Scene {
    private statistics: { [key: string]: Phaser.GameObjects.Text } = {};
    private uiScene!: UIScene;
    
    // Statistics tracking
    private totalGold: number = 0;
    private towersBuilt: number = 0;
    private enemiesKilled: number = 0;
    private wavesCompleted: number = 0;

    constructor() {
        super({ key: 'StatisticsScene' });
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
        this.uiScene = this.scene.get('UIScene') as UIScene;

        // Panel für Statistiken erstellen
        const padding = 10;
        const panelBg = this.add.rectangle(
            this.cameras.main.width - 200 - padding,
            padding,
            200,
            120,
            0x000000,
            0.3
        )
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

        this.statistics['totalGold'] = this.add.text(
            startX,
            currentY,
            'Total Gold: 0',
            textStyle
        );
        currentY += lineHeight;

        this.statistics['towersBuilt'] = this.add.text(
            startX,
            currentY,
            'Towers Built: 0',
            textStyle
        );
        currentY += lineHeight;

        this.statistics['enemiesKilled'] = this.add.text(
            startX,
            currentY,
            'Enemies Killed: 0',
            textStyle
        );
        currentY += lineHeight;

        this.statistics['wavesCompleted'] = this.add.text(
            startX,
            currentY,
            'Waves Completed: 0',
            textStyle
        );

        // Set up event listeners for game events
        this.game.events.on(GAME_EVENTS.goldChanged, this.onGoldChanged, this);
        this.game.events.on(GAME_EVENTS.waveChanged, this.onWaveChanged, this);
        this.game.events.on(GAME_EVENTS.enemyKilled, this.onEnemyKilled, this);
        this.game.events.on(GAME_EVENTS.towerBuilt, this.onTowerBuilt, this);

        console.log('StatisticsScene created');
    }

    updateStatistic(key: string, value: number) {
        const statisticLabels: { [key: string]: string } = {
            totalGold: 'Total Gold',
            towersBuilt: 'Towers Built',
            enemiesKilled: 'Enemies Killed',
            wavesCompleted: 'Waves Completed'
        };

        if (this.statistics[key]) {
            this.statistics[key].setText(`${statisticLabels[key]}: ${value}`);
        }
    }

    private onGoldChanged(gold: number): void {
        this.totalGold = gold;
        this.updateStatistic('totalGold', this.totalGold);
    }

    private onTowerBuilt(): void {
        this.towersBuilt++;
        this.updateStatistic('towersBuilt', this.towersBuilt);
    }

    private onEnemyKilled(): void {
        this.enemiesKilled++;
        this.updateStatistic('enemiesKilled', this.enemiesKilled);
    }

    private onWaveChanged(wave: number): void {
        this.wavesCompleted = wave - 1;
        this.updateStatistic('wavesCompleted', this.wavesCompleted);
    }
}
