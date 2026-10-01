import { Scene } from 'phaser';
import { UIScene } from './UIScene';
import { GAME_EVENTS } from './GameScene';
import { GameConfigService } from '../services/GameConfigService';
import { CampaignProgressionService } from '../services/CampaignProgressionService';
import type { GameMode } from '../types';

export class StatisticsScene extends Scene {
    private statistics: { [key: string]: Phaser.GameObjects.Text } = {};
    private uiScene!: UIScene;
    private gameConfigService: GameConfigService;
    private campaignProgressionService: CampaignProgressionService;
    
    // Statistics tracking
    private totalGold: number = 0;
    private towersBuilt: number = 0;
    private enemiesKilled: number = 0;
    private wavesCompleted: number = 0;
    private lives: number = 20;
    private campaignPoints: number = 0;

    constructor() {
        super({ key: 'StatisticsScene' });
        console.log('StatisticsScene constructor called');
        this.gameConfigService = GameConfigService.getInstance();
        this.campaignProgressionService = CampaignProgressionService.getInstance();
    }
    
    /**
     * Get the current game mode (reads fresh from service each time)
     */
    private getGameMode(): GameMode {
        return this.gameConfigService.getGameMode();
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
        
        // Check if campaign mode to adjust panel width
        const isCampaign = this.getGameMode() === 'campaign';

        // Create semi-transparent black background panel
        const panelWidth = isCampaign ? spacing * 6 + 50 : spacing * 5 + 50; // Width to cover all statistics including lives (and campaign points in campaign mode)
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

        // Campaign points (only in campaign mode)
        let statOffset = 0; // Offset to shift other stats if campaign points are shown
        if (isCampaign) {
            // Star icon for campaign points
            const starIcon = this.add.text(startX + spacing * 2, startY + 2, '⭐', {
                fontSize: '20px',
                resolution: 2
            });
            starIcon.setOrigin(0, 0);

            this.statistics['campaignPoints'] = this.add.text(
                startX + spacing * 2 + 25,
                startY + 2,
                '0',
                textStyle
            );
            statOffset = 1; // Shift other stats by one position
        }

        // Towers built statistic
        const towerIcon = this.add.image(startX + spacing * (2 + statOffset), startY - 3, 'tower');
        towerIcon.setScale(0.04);
        towerIcon.setOrigin(0, 0);

        this.statistics['towersBuilt'] = this.add.text(
            startX + spacing * (2 + statOffset) + 25,
            startY + 2,
            '0',
            textStyle
        );

        // Lives statistic
        const heartIcon = this.add.image(startX + spacing * (3 + statOffset), startY + 3, 'heart');
        heartIcon.setScale(0.08);
        heartIcon.setOrigin(0, 0);

        this.statistics['lives'] = this.add.text(
            startX + spacing * (3 + statOffset) + 25,
            startY + 2,
            '20',
            textStyle
        );
        

        // Waves completed statistic
        this.statistics['wavesCompleted'] = this.add.text(
            startX + spacing * (4 + statOffset),
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
        
        // Campaign-specific event listener
        if (isCampaign) {
            this.game.events.on(GAME_EVENTS.campaignPointsChanged, this.onCampaignPointsChanged, this);
        }

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
                case 'campaignPoints':
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

    private onCampaignPointsChanged(points: number): void {
        this.campaignPoints = points;
        this.updateStatistic('campaignPoints', this.campaignPoints);
    }
}
