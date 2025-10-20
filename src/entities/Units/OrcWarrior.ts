import Phaser from 'phaser'
import { OrcGrunt } from './OrcGrunt'
import { GameScene } from "@scenes/GameScene";
import { Enemy } from "../Factories/EnemyFactory";

export class OrcWarrior extends OrcGrunt {
	constructor(scene: Phaser.Scene, x: number, y: number, hp: number, speed: number) {
		super(scene, x, y, hp, speed, 'orc_warrior', 32)
		this.sprite.setScale(0.08)
	}

    static override spawn(scene: Phaser.Scene, wave: number): Enemy {
        const gameScene = scene as GameScene;
        const start = gameScene.pathPoints[0];

        if (!start) throw new Error("No path points found");

        const bossHp = 60000 + wave * 60;
        const bossSpeed = 10 + Math.floor(wave * 1.5);
        
        return new OrcWarrior(scene, start.x, start.y, bossHp, bossSpeed);
    }
} 