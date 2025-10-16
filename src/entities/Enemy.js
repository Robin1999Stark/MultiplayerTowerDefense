import Phaser from 'phaser';
export class Enemy {
    constructor(scene, x, y, hp, speed, textureKey = 'enemy', radius = 16) {
        Object.defineProperty(this, "sprite", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "hp", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "speed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "reachedEnd", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "pathIndex", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        this.sprite = scene.physics.add.sprite(x, y, textureKey);
        this.sprite.setCircle(radius, 16 - radius, 16 - radius);
        this.sprite.setDepth(1);
        this.hp = hp;
        this.speed = speed;
    }
    update(deltaMs, path) {
        if (this.reachedEnd)
            return;
        const dt = deltaMs / 1000;
        const pos = new Phaser.Math.Vector2(this.sprite.x, this.sprite.y);
        const target = path[this.pathIndex + 1];
        if (!target) {
            this.reachedEnd = true;
            return;
        }
        const dir = target.clone().subtract(pos);
        const distance = dir.length();
        if (distance < this.speed * dt) {
            this.sprite.setPosition(target.x, target.y);
            this.pathIndex++;
            return;
        }
        dir.normalize();
        this.sprite.setVelocity(dir.x * this.speed, dir.y * this.speed);
    }
    takeDamage(amount) {
        this.hp -= amount;
    }
    isDead() {
        return this.hp <= 0;
    }
    destroy() {
        this.sprite.destroy();
    }
    static spawn(scene, wave) {
        const hp = 30 + wave * 10;
        const speed = 70 + wave * 3;
        const start = scene.pathPoints[0];
        if (!start)
            return;
        const enemy = new this(scene, start.x, start.y, hp, speed);
        scene.enemies.push(enemy);
    }
}
//# sourceMappingURL=Enemy.js.map