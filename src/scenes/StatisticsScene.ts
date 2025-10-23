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
    private lives: number = 20;

    constructor() {
        super({ key: 'StatisticsScene' });
        console.log('StatisticsScene constructor called');
    }

    init() {
        console.log('StatisticsScene init called');
    }

    preload() {
        console.log('StatisticsScene preload called');
        this.load.image('gold', 'assets/gold.png');
        this.load.image('skull', 'assets/skull.png');
        this.load.image('tower', 'assets/towers/tower_basic.png');
        this.load.image('heart', 'assets/heart.png');
    }

    create() {
        console.log('StatisticsScene created');
        this.uiScene = this.scene.get('UIScene') as UIScene;

        // Position in upper left corner
        const padding = 15;
        const startX = padding;
        const startY = padding;
        const spacing = 80; // Horizontal spacing between statistics

        // Create semi-transparent black background panel
        const panelWidth = spacing * 5 + 50; // Width to cover all statistics including lives
        const panelHeight = 35; // Height to cover icons and text
        const backgroundPanel = this.add.rectangle(
            startX - 5,
            startY - 5,
            panelWidth,
            panelHeight,
            0x000000,
            0.6
        );
        backgroundPanel.setOrigin(0, 0);
        backgroundPanel.setStrokeStyle(1, 0x333333, 0.8);

        const textStyle = { 
            color: '#ffffff',
            fontSize: '20px',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            resolution: 2
        };

        // Gold statistic (with icon)
        const goldIcon = this.add.image(startX, startY, 'gold');
        goldIcon.setScale(0.15);
        goldIcon.setOrigin(0, 0);

        this.statistics['totalGold'] = this.add.text(
            startX + 25,
            startY + 2,
            '100',
            textStyle
        );

        // Enemies killed statistic (with skull icon)
        const skullIcon = this.add.image(startX + spacing, startY, 'skull');
        skullIcon.setScale(0.03);
        skullIcon.setOrigin(0, 0);

        this.statistics['enemiesKilled'] = this.add.text(
            startX + spacing + 25,
            startY + 2,
            '0',
            textStyle
        );

        // Towers built statistic
        const towerIcon = this.add.image(startX + spacing * 2, startY - 3, 'tower');
        towerIcon.setScale(0.04);
        towerIcon.setOrigin(0, 0);

        this.statistics['towersBuilt'] = this.add.text(
            startX + spacing * 2 + 25,
            startY + 2,
            '0',
            textStyle
        );

        // Lives statistic
        const heartIcon = this.add.image(startX + spacing * 3, startY + 3, 'heart');
        heartIcon.setScale(0.08);
        heartIcon.setOrigin(0, 0);

        this.statistics['lives'] = this.add.text(
            startX + spacing * 3 + 25,
            startY + 2,
            '20',
            textStyle
        );
        

        // Waves completed statistic
        this.statistics['wavesCompleted'] = this.add.text(
            startX + spacing * 4,
            startY + 2,
            'Wave: 0',
            textStyle
        );

        // Set up event listeners for game events
        this.game.events.on(GAME_EVENTS.goldChanged, this.onGoldChanged, this);
        this.game.events.on(GAME_EVENTS.livesChanged, this.onLivesChanged, this);
        this.game.events.on(GAME_EVENTS.waveChanged, this.onWaveChanged, this);
        this.game.events.on(GAME_EVENTS.enemyKilled, this.onEnemyKilled, this);
        this.game.events.on(GAME_EVENTS.towerBuilt, this.onTowerBuilt, this);

        console.log('StatisticsScene created');
    }

    updateStatistic(key: string, value: number) {
        if (this.statistics[key]) {
            switch (key) {
                case 'totalGold':
                    this.statistics[key].setText(String(value));
                    break;
                case 'enemiesKilled':
                    this.statistics[key].setText(String(value));
                    break;
                case 'towersBuilt':
                    this.statistics[key].setText(String(value));
                    break;
                case 'lives':
                    this.statistics[key].setText(String(value));
                    break;
                case 'wavesCompleted':
                    this.statistics[key].setText(`Wave: ${value}`);
                    break;
            }
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

    private onLivesChanged(lives: number): void {
        this.lives = lives;
        this.updateStatistic('lives', this.lives);
    }
}
