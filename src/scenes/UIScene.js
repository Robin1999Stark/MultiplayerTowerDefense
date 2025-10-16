import Phaser from 'phaser';
import { GAME_EVENTS } from './GameScene';
export class UIScene extends Phaser.Scene {
    constructor() {
        super(UIScene.KEY);
        Object.defineProperty(this, "placeButton", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "goldLabel", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "livesLabel", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "waveLabel", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "placing", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
    }
    create() {
        this.tryBindDom();
    }
    tryBindDom(attempt = 0) {
        this.placeButton = document.getElementById('place-tower');
        this.goldLabel = document.getElementById('gold');
        this.livesLabel = document.getElementById('lives');
        this.waveLabel = document.getElementById('wave');
        if (!this.placeButton || !this.goldLabel || !this.livesLabel || !this.waveLabel) {
            if (attempt < 10) {
                this.time.delayedCall(50, () => this.tryBindDom(attempt + 1));
            }
            return;
        }
        console.log('test');
        // Initialize labels from registry immediately
        const gold = this.registry.get('gold');
        const lives = this.registry.get('lives');
        const wave = this.registry.get('wave');
        if (typeof gold === 'number')
            this.goldLabel.textContent = String(gold);
        if (typeof lives === 'number')
            this.livesLabel.textContent = String(lives);
        if (typeof wave === 'number')
            this.waveLabel.textContent = String(wave);
        this.placeButton.addEventListener('click', () => {
            this.placing = !this.placing;
            this.placeButton.textContent = this.placing ? 'Cancel' : 'Place Tower';
            this.game.events.emit(GAME_EVENTS.placeTowerToggle, this.placing);
        });
        this.game.events.on(GAME_EVENTS.goldChanged, (value) => {
            this.goldLabel.textContent = String(value);
        });
        this.game.events.on(GAME_EVENTS.livesChanged, (value) => {
            this.livesLabel.textContent = String(value);
            if (value <= 0)
                this.placing = false;
        });
        this.game.events.on(GAME_EVENTS.waveChanged, (value) => {
            this.waveLabel.textContent = String(value);
        });
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this.placing)
                this.game.events.emit(GAME_EVENTS.placeTowerToggle, false);
        });
    }
}
Object.defineProperty(UIScene, "KEY", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: 'UIScene'
});
//# sourceMappingURL=UIScene.js.map