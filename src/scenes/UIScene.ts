import Phaser from 'phaser'
import { GAME_EVENTS } from './GameScene'

export class UIScene extends Phaser.Scene {
	static KEY = 'UIScene'
	private placeButton: HTMLButtonElement | null = null
	private goldLabel: HTMLElement | null = null
	private livesLabel: HTMLElement | null = null
	private waveLabel: HTMLElement | null = null
	private placing = false

	constructor() {
		super(UIScene.KEY)
	}

	create(): void {
		this.tryBindDom()
	}

	private tryBindDom(attempt = 0): void {
		this.placeButton = document.getElementById('place-tower') as HTMLButtonElement | null
		this.goldLabel = document.getElementById('gold')
		this.livesLabel = document.getElementById('lives')
		this.waveLabel = document.getElementById('wave')

		if (!this.placeButton || !this.goldLabel || !this.livesLabel || !this.waveLabel) {
			if (attempt < 10) {
				this.time.delayedCall(50, () => this.tryBindDom(attempt + 1))
			}
			return
		}

		// Initialize labels from registry immediately
		const gold = this.registry.get('gold') as number | undefined
		const lives = this.registry.get('lives') as number | undefined
		const wave = this.registry.get('wave') as number | undefined
		if (typeof gold === 'number') this.goldLabel.textContent = String(gold)
		if (typeof lives === 'number') this.livesLabel.textContent = String(lives)
		if (typeof wave === 'number') this.waveLabel.textContent = String(wave)

		this.placeButton.addEventListener('click', () => {
			this.placing = !this.placing
			this.placeButton!.textContent = this.placing ? 'Cancel' : 'Place Tower'
			this.game.events.emit(GAME_EVENTS.placeTowerToggle, this.placing)
		})

		this.game.events.on(GAME_EVENTS.goldChanged, (value: number) => {
			this.goldLabel!.textContent = String(value)
		})
		this.game.events.on(GAME_EVENTS.livesChanged, (value: number) => {
			this.livesLabel!.textContent = String(value)
			if (value <= 0) this.placing = false
		})
		this.game.events.on(GAME_EVENTS.waveChanged, (value: number) => {
			this.waveLabel!.textContent = String(value)
		})

		this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
			if (this.placing) this.game.events.emit(GAME_EVENTS.placeTowerToggle, false)
		})
	}
} 