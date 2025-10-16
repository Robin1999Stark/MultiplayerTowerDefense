import Phaser from 'phaser';
export class Tower {
    constructor(scene, x, y) {
        Object.defineProperty(this, "sprite", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "range", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 1000
        });
        Object.defineProperty(this, "fireRateMs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 200
        });
        Object.defineProperty(this, "damage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 400
        });
        Object.defineProperty(this, "timeSinceShot", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.scene = scene;
        this.sprite = scene.add.sprite(x, y, 'tower');
        this.sprite.setDepth(2);
    }
    update(deltaMs, enemies) {
        this.timeSinceShot += deltaMs;
        if (this.timeSinceShot < this.fireRateMs)
            return;
        const target = this.findTarget(enemies);
        if (!target)
            return;
        this.timeSinceShot = 0;
        this.shoot(target);
    }
    findTarget(enemies) {
        let nearest;
        let nearestDist = Number.POSITIVE_INFINITY;
        for (const e of enemies) {
            const d = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, e.sprite.x, e.sprite.y);
            if (d <= this.range && d < nearestDist) {
                nearestDist = d;
                nearest = e;
            }
        }
        return nearest;
    }
    shoot(target) {
        // Audio blip for the shot
        this.playShootTone();
        // Visual bullet: tweened sprite that damages on arrival
        const bullet = this.scene.add.sprite(this.sprite.x, this.sprite.y, 'bullet');
        bullet.setDepth(3);
        const duration = Math.max(120, Math.min(400, Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, target.sprite.x, target.sprite.y) * 4));
        this.scene.tweens.add({
            targets: bullet,
            x: target.sprite.x,
            y: target.sprite.y,
            duration,
            onComplete: () => {
                bullet.destroy();
                target.takeDamage(this.damage);
            }
        });
    }
    playShootTone() {
        const audioCtx = this.getAudioContext();
        if (!audioCtx)
            return;
        const durationSec = 0.1;
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durationSec);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + durationSec);
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
        };
    }
    getAudioContext() {
        const phaserSound = this.scene.sound;
        const existingCtx = phaserSound?.context || window.audioCtx;
        if (existingCtx)
            return existingCtx;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass)
                return null;
            const newCtx = new AudioContextClass();
            window.audioCtx = newCtx;
            return newCtx;
        }
        catch (error) {
            return null;
        }
    }
}
//# sourceMappingURL=Tower.js.map