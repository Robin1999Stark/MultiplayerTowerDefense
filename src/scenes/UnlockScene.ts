import Phaser from 'phaser';
import { CampaignProgressionService, UnlockableItem } from '../services/CampaignProgressionService';
import { GAME_EVENTS } from './GameScene';

export class UnlockScene extends Phaser.Scene {
    static KEY = 'UnlockScene';
    private campaignProgressionService: CampaignProgressionService;
    private overlay?: Phaser.GameObjects.Rectangle;
    private mainContainer?: Phaser.GameObjects.Container;
    private itemContainers: Map<string, Phaser.GameObjects.Container> = new Map();

    constructor() {
        super(UnlockScene.KEY);
        this.campaignProgressionService = CampaignProgressionService.getInstance();
    }

    create(): void {
        // Semi-transparent overlay
        this.overlay = this.add.rectangle(
            0,
            0,
            this.scale.width,
            this.scale.height,
            0x000000,
            0.85
        );
        this.overlay.setOrigin(0, 0);
        this.overlay.setDepth(100);
        this.overlay.setInteractive(); // Block clicks to game scene below

        // Main container
        this.mainContainer = this.add.container(0, 0);
        this.mainContainer.setDepth(101);

        // Create UI
        this.createHeader();
        this.createUnlockableItems();
        this.createCloseButton();

        // Listen for campaign points changes
        this.game.events.on(GAME_EVENTS.campaignPointsChanged, () => {
            this.updateUnlockableItems();
        });

        // Listen for ESC key to close
        this.input.keyboard?.on('keydown-ESC', () => {
            this.closeUI();
        });
        
        // Listen for U key to close
        this.input.keyboard?.on('keydown-U', () => {
            this.closeUI();
        });

        // Entrance animation
        this.mainContainer.setAlpha(0);
        this.overlay.setAlpha(0);
        this.tweens.add({
            targets: [this.mainContainer, this.overlay],
            alpha: { from: 0, to: 1 },
            duration: 300,
            ease: 'Power2'
        });
    }

    private createHeader(): void {
        const centerX = this.scale.width / 2;
        const headerY = 80;

        // Title
        const title = this.add.text(centerX, headerY, 'Campaign Unlocks', {
            fontSize: '48px',
            color: '#00d4ff',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#001a33',
            strokeThickness: 6,
            resolution: 2
        });
        title.setOrigin(0.5);
        this.mainContainer?.add(title);

        // Campaign points display
        const points = this.campaignProgressionService.getCampaignPoints();
        const pointsText = this.add.text(
            centerX,
            headerY + 50,
            `Available Points: ${points} ⭐`,
            {
                fontSize: '24px',
                color: '#ffd700',
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3,
                resolution: 2
            }
        );
        pointsText.setOrigin(0.5);
        pointsText.setName('points_display');
        this.mainContainer?.add(pointsText);
    }

    private createUnlockableItems(): void {
        const centerX = this.scale.width / 2;
        const startY = 200;
        
        // Get all unlockable items
        const towers = this.campaignProgressionService.getUnlockableItemsByType('tower');
        const skills = this.campaignProgressionService.getUnlockableItemsByType('skill');

        // Create two columns: Towers on the left, Skills on the right
        const columnWidth = 400;
        const leftX = centerX - columnWidth / 2 - 50;
        const rightX = centerX + columnWidth / 2 + 50;

        // Towers column
        const towersTitle = this.add.text(leftX, startY, 'Towers', {
            fontSize: '32px',
            color: '#ff6348',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
            resolution: 2
        });
        towersTitle.setOrigin(0.5);
        this.mainContainer?.add(towersTitle);

        let towerY = startY + 50;
        towers.forEach((item) => {
            this.createUnlockableItemCard(item, leftX, towerY);
            towerY += 120;
        });

        // Skills column
        const skillsTitle = this.add.text(rightX, startY, 'Skills', {
            fontSize: '32px',
            color: '#9b59b6',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
            resolution: 2
        });
        skillsTitle.setOrigin(0.5);
        this.mainContainer?.add(skillsTitle);

        let skillY = startY + 50;
        skills.forEach((item) => {
            this.createUnlockableItemCard(item, rightX, skillY);
            skillY += 120;
        });
    }

    private createUnlockableItemCard(item: UnlockableItem, x: number, y: number): void {
        const cardWidth = 380;
        const cardHeight = 100;

        const cardContainer = this.add.container(x, y);
        cardContainer.setName(`card_${item.id}`);

        // Check unlock status
        const isUnlocked = item.type === 'tower' && item.towerTypeId
            ? this.campaignProgressionService.isTowerUnlocked(item.towerTypeId)
            : this.campaignProgressionService.isSkillUnlocked(item.id);
        
        const canAfford = this.campaignProgressionService.canUnlockItem(item.id);

        // Background
        const bgColor = isUnlocked ? 0x2a4a2e : (canAfford ? 0x1a1a2e : 0x2e1a1a);
        const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, bgColor, 0.95);
        bg.setStrokeStyle(2, isUnlocked ? 0x00ff00 : (canAfford ? 0x00d4ff : 0x666666));
        bg.setName('bg');
        if (!isUnlocked && canAfford) {
            bg.setInteractive({ useHandCursor: true });
        }
        cardContainer.add(bg);

        // Status indicator (lock/check)
        const statusIcon = this.add.text(-cardWidth / 2 + 20, 0, isUnlocked ? '✓' : '🔒', {
            fontSize: '32px',
            resolution: 2
        });
        statusIcon.setOrigin(0.5);
        cardContainer.add(statusIcon);

        // Item name
        const nameText = this.add.text(-cardWidth / 2 + 60, -20, item.name, {
            fontSize: '18px',
            color: isUnlocked ? '#00ff00' : '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            resolution: 2
        });
        nameText.setOrigin(0, 0.5);
        cardContainer.add(nameText);

        // Item description
        const descText = this.add.text(-cardWidth / 2 + 60, 5, item.description, {
            fontSize: '14px',
            color: '#cccccc',
            fontFamily: 'Arial, sans-serif',
            wordWrap: { width: cardWidth - 80 },
            resolution: 2
        });
        descText.setOrigin(0, 0.5);
        cardContainer.add(descText);

        // Cost display
        if (!isUnlocked) {
            const costText = this.add.text(cardWidth / 2 - 20, 30, `${item.cost} ⭐`, {
                fontSize: '20px',
                color: canAfford ? '#ffd700' : '#666666',
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2,
                resolution: 2
            });
            costText.setOrigin(1, 0.5);
            costText.setName('cost');
            cardContainer.add(costText);
        } else {
            const unlockedText = this.add.text(cardWidth / 2 - 20, 30, 'UNLOCKED', {
                fontSize: '16px',
                color: '#00ff00',
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2,
                resolution: 2
            });
            unlockedText.setOrigin(1, 0.5);
            cardContainer.add(unlockedText);
        }

        // Hover effect
        if (!isUnlocked && canAfford) {
            bg.on('pointerover', () => {
                bg.setFillStyle(0x2a3a4e, 0.95);
                this.tweens.add({
                    targets: cardContainer,
                    scale: 1.05,
                    duration: 200,
                    ease: 'Power2'
                });
            });

            bg.on('pointerout', () => {
                bg.setFillStyle(bgColor, 0.95);
                this.tweens.add({
                    targets: cardContainer,
                    scale: 1,
                    duration: 200,
                    ease: 'Power2'
                });
            });

            // Click to unlock
            bg.on('pointerdown', () => {
                this.unlockItem(item);
            });
        }

        this.mainContainer?.add(cardContainer);
        this.itemContainers.set(item.id, cardContainer);
    }

    private unlockItem(item: UnlockableItem): void {
        const success = this.campaignProgressionService.unlockItem(item.id);
        
        if (success) {
            // Show success message
            const centerX = this.scale.width / 2;
            const centerY = this.scale.height / 2;
            
            const successText = this.add.text(
                centerX,
                centerY,
                `${item.name} Unlocked!`,
                {
                    fontSize: '36px',
                    color: '#00ff00',
                    fontFamily: 'Arial, sans-serif',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 4,
                    resolution: 2
                }
            );
            successText.setOrigin(0.5);
            successText.setDepth(200);

            this.tweens.add({
                targets: successText,
                alpha: 0,
                y: centerY - 50,
                duration: 1500,
                ease: 'Power2',
                onComplete: () => {
                    successText.destroy();
                }
            });

            // Emit campaign points changed event to update other UI
            this.game.events.emit(GAME_EVENTS.campaignPointsChanged);

            // Update all unlock cards
            this.updateUnlockableItems();
            
            // If it's a tower, recreate the tower store UI
            if (item.type === 'tower') {
                // Signal UI scene to refresh tower cards
                this.scene.get('UIScene').scene.restart();
            }
        }
    }

    private updateUnlockableItems(): void {
        // Update points display
        if (this.mainContainer) {
            const pointsDisplay = this.mainContainer.getByName('points_display') as Phaser.GameObjects.Text;
            if (pointsDisplay) {
                const points = this.campaignProgressionService.getCampaignPoints();
                pointsDisplay.setText(`Available Points: ${points} ⭐`);
            }
        }

        // Update all item cards
        this.itemContainers.forEach((container, itemId) => {
            const item = this.campaignProgressionService.getUnlockableItem(itemId);
            if (!item) return;

            const isUnlocked = item.type === 'tower' && item.towerTypeId
                ? this.campaignProgressionService.isTowerUnlocked(item.towerTypeId)
                : this.campaignProgressionService.isSkillUnlocked(item.id);
            
            const canAfford = this.campaignProgressionService.canUnlockItem(item.id);

            // Update background
            const bg = container.getByName('bg') as Phaser.GameObjects.Rectangle;
            if (bg) {
                const bgColor = isUnlocked ? 0x2a4a2e : (canAfford ? 0x1a1a2e : 0x2e1a1a);
                bg.setFillStyle(bgColor, 0.95);
                bg.setStrokeStyle(2, isUnlocked ? 0x00ff00 : (canAfford ? 0x00d4ff : 0x666666));
            }

            // Update cost text if present
            const costText = container.getByName('cost') as Phaser.GameObjects.Text;
            if (costText) {
                costText.setColor(canAfford ? '#ffd700' : '#666666');
            }
        });
    }

    private createCloseButton(): void {
        const centerX = this.scale.width / 2;
        const bottomY = this.scale.height - 60;
        const buttonWidth = 200;
        const buttonHeight = 50;

        // Close button background
        const closeBg = this.add.rectangle(
            centerX,
            bottomY,
            buttonWidth,
            buttonHeight,
            0xff4757,
            0.3
        );
        closeBg.setStrokeStyle(2, 0xff4757);
        closeBg.setInteractive({ useHandCursor: true });
        this.mainContainer?.add(closeBg);

        // Close button text
        const closeText = this.add.text(centerX, bottomY, 'Close [ESC]', {
            fontSize: '24px',
            color: '#ff4757',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            resolution: 2
        });
        closeText.setOrigin(0.5);
        this.mainContainer?.add(closeText);

        // Hover effects
        closeBg.on('pointerover', () => {
            closeBg.setFillStyle(0xff4757, 0.6);
            closeText.setColor('#ffffff');
            this.tweens.add({
                targets: [closeBg, closeText],
                scale: 1.05,
                duration: 200,
                ease: 'Power2'
            });
        });

        closeBg.on('pointerout', () => {
            closeBg.setFillStyle(0xff4757, 0.3);
            closeText.setColor('#ff4757');
            this.tweens.add({
                targets: [closeBg, closeText],
                scale: 1,
                duration: 200,
                ease: 'Power2'
            });
        });

        // Click handler
        closeBg.on('pointerdown', () => {
            this.closeUI();
        });
    }

    private closeUI(): void {
        // Fade out animation
        this.tweens.add({
            targets: [this.mainContainer, this.overlay],
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.scene.stop();
            }
        });
    }

    shutdown(): void {
        // Clean up event listeners
        this.game.events.off(GAME_EVENTS.campaignPointsChanged);
        this.input.keyboard?.off('keydown-ESC');
        this.input.keyboard?.off('keydown-U');
    }
}

