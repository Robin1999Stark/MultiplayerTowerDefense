import Phaser from 'phaser'
import { GAME_EVENTS } from './GameScene'
import { TowerStore, TowerType, TowerTypeID } from '../services/TowerStore'
import { Event } from '../entities/Events/Event'
import { EventStore } from '../services/EventStore'

export class UIScene extends Phaser.Scene {
	static KEY = 'UIScene'
	private placeButton: HTMLButtonElement | null = null
	private goldLabel: HTMLElement | null = null
	private livesLabel: HTMLElement | null = null
	private waveLabel: HTMLElement | null = null
	private placing = false
	private towerStore: TowerStore
	private eventStore: EventStore
	private towerStoreContainer?: Phaser.GameObjects.Container
	private eventStoreContainer?: Phaser.GameObjects.Container
	private selectedTowerType: TowerType | null = null
	private selectedEvent: Event | null = null

	constructor() {
		super(UIScene.KEY)
		this.towerStore = TowerStore.getInstance()
		this.eventStore = EventStore.getInstance()
	}

	preload(): void {
		// Load tower images for UI display
		this.load.image('tower_basic', 'assets/towers/tower_basic.png')
		this.load.image('tower_laser', 'assets/towers/tower_laser.png')
		this.load.image('tower_rapid', 'assets/towers/tower_rapid.png')
		this.load.image('tower_rapid_fire', 'assets/towers/tower_rapid_fire.png')
		this.load.image('tower_explosive', 'assets/towers/tower_explosive.png')
		this.load.image('tower_frost', 'assets/towers/tower_frost.png')
		
		// Load effect icons
		this.load.image('effect_freezing', 'assets/effects/freeze_effect_icon.jpeg')
		
		// Create event icon (fallback)
		const g = this.add.graphics()
		g.clear()
		g.fillStyle(0x00aaff, 1)
		g.fillRoundedRect(0, 0, 32, 32, 8)
		g.generateTexture('event_slow', 32, 32)
		
		// Create coin icon for costs
		g.clear()
		g.fillStyle(0xffd700, 1) // Gold color
		g.fillCircle(8, 8, 8)    // Coin circle
		g.lineStyle(1, 0xffff00, 1)
		g.strokeCircle(8, 8, 8)  // Coin outline
		g.generateTexture('coin_icon', 16, 16)
		g.destroy()
	}

	create(): void {
		this.tryBindDom()
		this.createTowerStoreUI()
		this.createEventStoreUI()

		// Listen for tower type selection events
		this.game.events.on(GAME_EVENTS.towerTypeSelected, (towerType: TowerType | null) => {
			this.selectedTowerType = towerType
			this.selectedEvent = null
			this.updateTowerStoreUI()
			this.updateEventStoreUI()
		})
		
		// Listen for event type selection events
		this.game.events.on(GAME_EVENTS.eventTypeSelected, (event: Event | null) => {
			this.selectedEvent = event
			this.selectedTowerType = null
			this.updateTowerStoreUI()
			this.updateEventStoreUI()
		})

		// Listen for gold changes to update affordability
		this.game.events.on(GAME_EVENTS.goldChanged, () => {
			this.updateTowerStoreUI()
			this.updateEventStoreUI()
		})
		
		// Listen for event activation to update UI
		this.game.events.on(GAME_EVENTS.eventActivated, () => {
			this.updateEventStoreUI()
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
		const cardWidth = 80
		const cardHeight = 56
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
	
	private createEventStoreUI(): void {
		const padding = 10
		const cardWidth = 40
		const cardHeight = 40
		const cardSpacing = 6

		this.eventStoreContainer = this.add.container(0, 0)
		this.eventStoreContainer.setDepth(1000)

		const events = this.eventStore.getAllEventTypes()

		// Position cards at the top right corner
		const startY = padding
		const startX = this.scale.width - padding

		events.forEach((event, index) => {
			const x = startX - (index + 1) * (cardWidth + cardSpacing)
			this.createEventCard(event, x, startY, cardWidth, cardHeight)
		})
	}
	
	private createEventCard(event: Event, x: number, y: number, width: number, height: number): void {
		const cardContainer = this.add.container(x, y)

		// Background
		const bg = this.add.rectangle(0, 0, width, height, 0x1a1a2e, 0.95)
		bg.setOrigin(0, 0)
		bg.setStrokeStyle(1.5, 0x333333)
		bg.setName('bg')
		cardContainer.add(bg)

		// Event icon as background
		if (event.icon === 'effect_freezing') {
			const iconBg = this.add.image(0, 0, event.icon)
			iconBg.setDisplaySize(width, height)
			iconBg.setOrigin(0, 0)
			iconBg.setAlpha(0.7)
			cardContainer.add(iconBg)
		} else {
			// For other icons, use the standard approach
			const iconSprite = this.add.sprite(width / 2, height / 2 - 5, event.icon)
			iconSprite.setScale(0.15)
			iconSprite.setName('icon')
			cardContainer.add(iconSprite)
		}
		
		// Active indicator (initially invisible)
		const activeIndicator = this.add.graphics()
		activeIndicator.fillStyle(0x00ff00, 0.3)
		activeIndicator.fillCircle(width / 2, height / 2, width / 4)
		activeIndicator.setVisible(false)
		activeIndicator.setName('active_indicator')
		cardContainer.add(activeIndicator)

		// Cost with coin icon at the top
		const coinIcon = this.add.image(width / 2 - 8, 10, 'coin_icon')
		coinIcon.setScale(0.6)
		coinIcon.setOrigin(0.5)
		coinIcon.setName('coin_icon')
		
		const costText = this.add.text(width / 2 + 2, 10, `${event.cost}`, {
			fontSize: '7px',
			color: '#ffd700',
			fontFamily: 'monospace',
			fontStyle: 'bold',
			stroke: '#000000',
			strokeThickness: 1
		})
		costText.setOrigin(0, 0.5)
		costText.setName('cost')
		
		cardContainer.add(coinIcon)
		cardContainer.add(costText)

		// Key indicator in the middle
		const keyText = this.add.text(width / 2, height / 2, `${event.key}`, {
			fontSize: '10px',
			color: '#00d4ff',
			fontFamily: 'monospace',
			fontStyle: 'bold',
			stroke: '#000000',
			strokeThickness: 1
		})
		keyText.setOrigin(0.5, 0.5)
		keyText.setName('key')
		cardContainer.add(keyText)

		const durationText = this.add.text(width / 2 + 2, height - 10, `${event.duration / 1000}s`, {
			fontSize: '6px',
			color: '#aaaaaa',
			fontFamily: 'monospace',
			stroke: '#000000',
			strokeThickness: 1
		})
		durationText.setOrigin(0, 0.5)
		cardContainer.add(durationText)

		cardContainer.setData('event', event)
		cardContainer.setName(`event_${event.id}`)
		this.eventStoreContainer?.add(cardContainer)
		
		// Make the card interactive
		bg.setInteractive({ useHandCursor: true })
		bg.on('pointerdown', () => {
			const gameScene = this.scene.get('GameScene') as Phaser.Scene
			gameScene.events.emit(GAME_EVENTS.eventTypeSelected, event)
		})
	}

	private createTowerCard(towerType: TowerType, x: number, y: number, width: number, height: number): void {
		const cardContainer = this.add.container(x, y)

		// Background
		const bg = this.add.rectangle(0, 0, width, height, 0x1a1a2e, 0.95)
		bg.setOrigin(1, 0)
		bg.setStrokeStyle(1.5, 0x333333)
		bg.setName('bg')
		cardContainer.add(bg)

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
		const towerSprite = this.add.sprite(-width / 2, 24, textureKey)
		towerSprite.setScale(scale)
		cardContainer.add(towerSprite)

		// Hotkey indicator above the tower sprite
		const keyText = this.add.text(-width / 2, 12, `[${towerType.key}]`, {
			fontSize: '11px',
			color: '#00d4ff',
			fontFamily: 'monospace',
			fontStyle: 'bold'
		})
		keyText.setOrigin(0.5, 0)
		cardContainer.add(keyText)

		// Tower name (shorter version)
		const shortName = towerType.name.replace(' Tower', '')
		const nameText = this.add.text(-width / 2, 37, shortName, {
			fontSize: '8px',
			color: '#ffffff',
			fontFamily: 'monospace',
			fontStyle: 'bold'
		})
		nameText.setOrigin(0.5, 0)
		cardContainer.add(nameText)

		// Cost
		const level1 = towerType.levels.get(1)
		const costText = this.add.text(-width / 2, 42, `${level1?.cost}g`, {
			fontSize: '7px',
			color: '#ffd700',
			fontFamily: 'monospace'
		})
		costText.setOrigin(0.5, 0)
		costText.setName('cost')
		cardContainer.add(costText)

		const statsText = this.add.text(-width / 2, 55, `R:${Math.round((level1?.range || 0) / 100)} D:${level1?.damage} F:${Math.round(1000 / (level1?.fireRateMs || 1))}/s`, {
			fontSize: '6px',
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

				const level1 = towerType.levels.get(1)
				const canAfford = gold >= (level1?.cost || 0)
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
	
	private updateEventStoreUI(): void {
		if (!this.eventStoreContainer) return

		const gold = this.registry.get('gold') as number || 0
		const gameScene = this.scene.get('GameScene') as any

		this.eventStoreContainer.iterate((child: Phaser.GameObjects.GameObject) => {
			if (child instanceof Phaser.GameObjects.Container) {
				const event = child.getData('event') as Event
				if (!event) return

				const canAfford = gold >= event.cost
				const isSelected = this.selectedEvent?.id === event.id
				const isActive = gameScene.isEventActive && gameScene.isEventActive(event.id)

				// Update active indicator
				const activeIndicator = child.getByName('active_indicator') as Phaser.GameObjects.Graphics
				if (activeIndicator) {
					activeIndicator.setVisible(isActive)
				}

				// Update background
				const bg = child.getByName('bg') as Phaser.GameObjects.Rectangle
				if (bg) {
					if (isActive) {
						bg.setStrokeStyle(2, 0x00ff00)
						bg.setFillStyle(0x2a4a2e, 0.95)
					} else if (isSelected) {
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
					if (textChild instanceof Phaser.GameObjects.Sprite && textChild.name !== 'icon') {
						textChild.setAlpha(canAfford ? 1 : 0.4)
					}
				})
			}
		})
	}
} 