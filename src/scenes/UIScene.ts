import Phaser from 'phaser'
import { GAME_EVENTS } from './GameScene'
import { TowerStore, TowerType, TowerTypeID } from '../services/TowerStore'

export class UIScene extends Phaser.Scene {
	static KEY = 'UIScene'
	private placeButton: HTMLButtonElement | null = null
	private goldLabel: HTMLElement | null = null
	private livesLabel: HTMLElement | null = null
	private waveLabel: HTMLElement | null = null
	private placing = false
	private towerStore: TowerStore
	private towerStoreContainer?: Phaser.GameObjects.Container
	private selectedTowerType: TowerType | null = null

	constructor() {
		super(UIScene.KEY)
		this.towerStore = TowerStore.getInstance()
	}

	preload(): void {
		// Load tower images for UI display
		this.load.image('tower_basic', 'assets/towers/tower_basic.png')
		this.load.image('tower_laser', 'assets/towers/tower_laser.png')
		this.load.image('tower_rapid', 'assets/towers/tower_rapid.png')
		this.load.image('tower_rapid_fire', 'assets/towers/tower_rapid_fire.png')
		this.load.image('tower_explosive', 'assets/towers/tower_explosive.png')
		this.load.image('tower_frost', 'assets/towers/tower_frost.png')
	}

	create(): void {
		this.tryBindDom()
		this.createTowerStoreUI()

		// Listen for tower type selection events
		this.game.events.on(GAME_EVENTS.towerTypeSelected, (towerType: TowerType | null) => {
			this.selectedTowerType = towerType
			this.updateTowerStoreUI()
		})

		// Listen for gold changes to update affordability
		this.game.events.on(GAME_EVENTS.goldChanged, () => {
			this.updateTowerStoreUI()
		})
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

	private createTowerStoreUI(): void {
		const padding = 10
		const cardWidth = 100
		const cardHeight = 80
		const cardSpacing = 6

		// Create container for all tower cards
		this.towerStoreContainer = this.add.container(0, 0)
		this.towerStoreContainer.setDepth(1000)

		const towerTypes = this.towerStore.getAllTowerTypes()

		// Position cards horizontally from right to left at the bottom
		const startY = this.scale.height - padding - cardHeight
		const startX = this.scale.width - padding

		towerTypes.forEach((towerType, index) => {
			const x = startX - index * (cardWidth + cardSpacing)
			this.createTowerCard(towerType, x, startY, cardWidth, cardHeight)
		})

		// Add ESC hint above the cards
		const escX = startX
		const escY = startY - 8
		const escText = this.add.text(escX, escY, 'ESC to cancel', {
			fontSize: '9px',
			color: '#888888',
			fontFamily: 'monospace'
		})
		escText.setOrigin(1, 1)
		escText.setDepth(1001)
		this.towerStoreContainer.add(escText)
	}

	private createTowerCard(towerType: TowerType, x: number, y: number, width: number, height: number): void {
		const cardContainer = this.add.container(x, y)

		// Background
		const bg = this.add.rectangle(0, 0, width, height, 0x1a1a2e, 0.95)
		bg.setOrigin(1, 0)
		bg.setStrokeStyle(1.5, 0x333333)
		bg.setName('bg')
		cardContainer.add(bg)

		// Hotkey indicator at the top center
		const keyText = this.add.text(-width / 2, 5, `[${towerType.key}]`, {
			fontSize: '13px',
			color: '#00d4ff',
			fontFamily: 'monospace',
			fontStyle: 'bold'
		})
		keyText.setOrigin(0.5, 0)
		cardContainer.add(keyText)

		// Tower preview sprite
		let textureKey = 'tower_basic'
		let scale = 0.15 // Much smaller scale for UI cards
		switch (towerType.id) {
			case TowerTypeID.SNIPER:
				textureKey = 'tower_laser'
				scale = 0.15
				break
			case TowerTypeID.RAPID:
				textureKey = 'tower_rapid'
				scale = 0.15
				break
			case TowerTypeID.CHAIN:
				textureKey = 'tower_rapid_fire'
				scale = 0.15
				break
			case TowerTypeID.AOE:
				textureKey = 'tower_explosive'
				scale = 0.15
				break
			case TowerTypeID.FROST:
				textureKey = 'tower_frost'
				scale = 0.15
				break
			default:
				textureKey = 'tower_basic'
				scale = 0.15
		}
		const towerSprite = this.add.sprite(-width / 2, 30, textureKey)
		towerSprite.setScale(scale)
		cardContainer.add(towerSprite)

		// Tower name (shorter version)
		const shortName = towerType.name.replace(' Tower', '')
		const nameText = this.add.text(-width / 2, 46, shortName, {
			fontSize: '10px',
			color: '#ffffff',
			fontFamily: 'monospace',
			fontStyle: 'bold'
		})
		nameText.setOrigin(0.5, 0)
		cardContainer.add(nameText)

		// Cost
		const costText = this.add.text(-width / 2, 59, `${towerType.cost}g`, {
			fontSize: '9px',
			color: '#ffd700',
			fontFamily: 'monospace'
		})
		costText.setOrigin(0.5, 0)
		costText.setName('cost')
		cardContainer.add(costText)

		// Stats (range, damage, fire rate)
		const statsText = this.add.text(-width / 2, 69, `R:${Math.round(towerType.range / 100)} D:${towerType.damage} F:${Math.round(1000 / towerType.fireRateMs)}/s`, {
			fontSize: '7px',
			color: '#aaaaaa',
			fontFamily: 'monospace'
		})
		statsText.setOrigin(0.5, 0)
		cardContainer.add(statsText)

		cardContainer.setData('towerType', towerType)
		cardContainer.setName(`card_${towerType.id}`)
		this.towerStoreContainer?.add(cardContainer)
	}

	private updateTowerStoreUI(): void {
		if (!this.towerStoreContainer) return

		const gold = this.registry.get('gold') as number || 0

		this.towerStoreContainer.iterate((child: Phaser.GameObjects.GameObject) => {
			if (child instanceof Phaser.GameObjects.Container) {
				const towerType = child.getData('towerType') as TowerType
				if (!towerType) return

				const canAfford = gold >= towerType.cost
				const isSelected = this.selectedTowerType?.id === towerType.id

				// Update background
				const bg = child.getByName('bg') as Phaser.GameObjects.Rectangle
				if (bg) {
					if (isSelected) {
						bg.setStrokeStyle(2, 0x00ff00)
						bg.setFillStyle(0x2a4a2e, 0.95)
					} else if (canAfford) {
						bg.setStrokeStyle(1.5, 0x00d4ff)
						bg.setFillStyle(0x1a1a2e, 0.95)
					} else {
						bg.setStrokeStyle(1.5, 0x333333)
						bg.setFillStyle(0x1a1a2e, 0.6)
					}
				}

				// Update cost text color
				const costText = child.getByName('cost') as Phaser.GameObjects.Text
				if (costText) {
					costText.setColor(canAfford ? '#ffd700' : '#666666')
				}

				// Update all text opacity
				child.iterate((textChild: Phaser.GameObjects.GameObject) => {
					if (textChild instanceof Phaser.GameObjects.Text) {
						textChild.setAlpha(canAfford ? 1 : 0.5)
					}
					if (textChild instanceof Phaser.GameObjects.Sprite) {
						textChild.setAlpha(canAfford ? 1 : 0.4)
					}
				})
			}
		})
	}
} 