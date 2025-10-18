import Phaser from 'phaser'
import { OrcGrunt } from './OrcGrunt'
import {GameScene} from "@scenes/GameScene";

export class OrcWarrior extends OrcGrunt {
	constructor(scene: Phaser.Scene, x: number, y: number, hp: number, speed: number) {
		super(scene, x, y, hp, speed, 'orc_warrior', 32)
		this.sprite.setScale(0.08)
	}

    static override spawn(scene: GameScene, wave: number): void {

        const start = scene.pathPoints[0];

        if (!start) return;

        const bossHp = 60000 + wave * 60;
        const bossSpeed = 10 + Math.floor(wave * 1.5);
        const boss = new OrcWarrior(scene, start.x, start.y, bossHp, bossSpeed);

        scene.enemies.push(boss);
    }
} 