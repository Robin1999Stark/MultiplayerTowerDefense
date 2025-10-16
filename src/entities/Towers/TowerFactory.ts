import Phaser from 'phaser';
import { Tower } from './Tower';
import { SnipingTower } from './SnipingTower';
import { RapidFireTower } from './RapidFireTower';
import { AOETower } from './AOETower';
import { ChainTower } from './ChainTower';
import { TowerType, TowerTypeID } from '../../services/TowerStore';

/**
 * Factory class for creating different types of towers
 */
export class TowerFactory {
    /**
     * Creates a tower based on the specified tower type
     * @param scene The Phaser scene
     * @param x The x coordinate
     * @param y The y coordinate
     * @param towerType The tower type configuration
     * @returns The created tower instance
     */
    public static createTower(scene: Phaser.Scene, x: number, y: number, towerType: TowerType): Tower {
        switch (towerType.id) {
            case TowerTypeID.BASIC:
                return new Tower(scene, x, y, towerType);
            case TowerTypeID.SNIPER:
                return new SnipingTower(scene, x, y, towerType);
            case TowerTypeID.RAPID:
                return new RapidFireTower(scene, x, y, towerType);
            case TowerTypeID.AOE:
                return new AOETower(scene, x, y, towerType);
            case TowerTypeID.CHAIN:
                return new ChainTower(scene, x, y, towerType);
            default:
                // Default to basic tower if type is not recognized
                return new Tower(scene, x, y, towerType);
        }
    }
}