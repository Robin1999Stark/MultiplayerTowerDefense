import { Enemy } from './Enemy';
export class Boss extends Enemy {
    constructor(scene, x, y, hp, speed) {
        super(scene, x, y, hp, speed, 'boss', 5);
    }
    static spawn(scene, wave) {
        const start = scene.pathPoints[0];
        if (!start)
            return;
        const bossHp = 6000 + wave * 60;
        const bossSpeed = 10 + Math.floor(wave * 1.5);
        const boss = new Boss(scene, start.x, start.y, bossHp, bossSpeed);
        scene.enemies.push(boss);
    }
}
//# sourceMappingURL=Boss.js.map