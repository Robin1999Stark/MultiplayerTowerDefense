import Phaser from 'phaser'
import { PathGenerator } from './PathGenerator'
import { TowerStore, TowerType, TowerTypeID } from '../services/TowerStore'
import { Tower } from "../entities/Towers/Tower";
import { TowerFactory } from "../entities/Towers/TowerFactory";
import { WaveFactory } from "../entities/Factories/WaveFactory";
import { Event } from "../entities/Events/Event";
import { EventStore } from "../services/EventStore";
import { AudioManager } from "../services/AudioManager";
import { GameConfigService } from "../services/GameConfigService";

export const GAME_EVENTS = {
	placeTowerToggle: 'ui.placeTowerToggle',
	goldChanged: 'game.goldChanged',
	livesChanged: 'game.livesChanged',
	waveChanged: 'game.waveChanged',
	enemyKilled: 'game.enemyKilled',
	towerBuilt: 'game.towerBuilt',
	towerTypeSelected: 'game.towerTypeSelected',
	towerUpgraded: 'game.towerUpgraded',
	eventTypeSelected: 'game.eventTypeSelected',
	eventActivated: 'game.eventActivated',
} as const

export class GameScene extends Phaser.Scene {
	static KEY = 'GameScene'

	pathPoints: Phaser.Math.Vector2[] = []
	private towers: Tower[] = []
	private isPlacingTower = false
	private gold = 100
	private lives = 20
	private towerStore: TowerStore
	private eventStore: EventStore
	private selectedTowerType: TowerType | null = null
	private selectedEvent: Event | null = null
	private activeEvents: Event[] = []
	private ghostTower?: Phaser.GameObjects.Sprite | undefined
	private waveFactory!: WaveFactory
	private audioManager: AudioManager
	private currentBackgroundType!: string

	private upgradeIndicators: Map<Tower, Phaser.GameObjects.Container> = new Map()

	// Camera properties
	private currentZoom = 1
	private minZoom = 0.5
	private maxZoom = 2
	private zoomStep = 0.1
	private cameraSpeed = 200
	private arrowKeys: { up: boolean; down: boolean; left: boolean; right: boolean } = {
		up: false,
		down: false,
		left: false,
		right: false
	}
	private gameConfigService: GameConfigService

	constructor() {
		super(GameScene.KEY)
		this.towerStore = TowerStore.getInstance()
		this.eventStore = EventStore.getInstance()
		this.audioManager = AudioManager.getInstance()
		this.gameConfigService = GameConfigService.getInstance()

		// Select random background type for this game
		const backgroundTypes = ['original', 'beach', 'ice']
		this.currentBackgroundType = backgroundTypes[Math.floor(Math.random() * backgroundTypes.length)]!
	}

	preload(): void {

		// Load external assets
		this.load.image('orc_grunt', 'assets/units/orc_grunt.png')
		this.load.image('orc_warrior', 'assets/units/orc_warrior.png')
		this.load.image('berserker', 'assets/units/berserker.png')
		this.load.image('chonkers', 'assets/units/chonkers.png')
		this.load.image('cultist', 'assets/units/cultist.png')
		this.load.image('demon', 'assets/units/demon.png')
		this.load.image('imp', 'assets/units/imp.png')
		this.load.image('skeleton', 'assets/units/skeleton.png')
		this.load.image('unicorn', 'assets/units/unicorn.png')
		this.load.image('zombie', 'assets/units/zombie.png')
		this.load.image('tower_attacker', 'assets/units/tower_attacker.png')
		this.load.image('castle', 'assets/castle.png')
		this.load.image('tower_basic', 'assets/towers/tower_basic.png')
		this.load.image('tower_laser', 'assets/towers/tower_laser.png')
		this.load.image('tower_rapid_fire', 'assets/towers/tower_rapid_fire.png')
		this.load.image('tower_rapid', 'assets/towers/tower_rapid.png')
		this.load.image('tower_explosive', 'assets/towers/tower_explosive.png')
		this.load.image('tower_frost', 'assets/towers/tower_frost.png')
		this.load.image('arrow', 'assets/projectiles/arrow.png')
		this.load.image('background', 'assets/background.jpeg')
		this.load.image('background_brause', 'assets/backgrounds/meadow_brause.jpeg')
		this.load.image('background_beach', 'assets/backgrounds/beach.jpeg')
		this.load.image('background_beach_brause', 'assets/backgrounds/beach_brause.jpeg')
		this.load.image('background_ice', 'assets/backgrounds/ice.jpeg')
		this.load.image('background_ice_brause', 'assets/backgrounds/ice_brause.jpeg')
		this.load.image('floor_tile', 'assets/floor_tile.jpeg')
		this.load.image('upgrade_arrow', 'assets/indicators/upgrade_arrow.png')

		// Generate simple textures for sprites (no external assets)
		const g = this.add.graphics()

		// TowerAttacker texture (green circle with radiation symbol)
		g.clear()
		g.fillStyle(0x00ff00, 1) // Green fill
		g.fillCircle(16, 16, 16)
		// Add radiation symbol
		g.lineStyle(2, 0x000000, 1)
		g.beginPath()
		g.arc(16, 16, 8, 0, Math.PI * 2)
		g.closePath()
		g.strokePath()
		// Add three radiation "blades"
		for (let i = 0; i < 3; i++) {
			const angle = (i * Math.PI * 2) / 3
			g.save()
			g.translateCanvas(16, 16)
			g.rotateCanvas(angle)
			g.fillStyle(0x000000, 1)
			g.fillTriangle(0, 0, -4, -12, 4, -12)
			g.restore()
		}
		g.generateTexture('tower_attacker', 32, 32)

		// OrcGrunt texture
		g.clear()
		g.fillStyle(0xff4757, 1)
		g.fillCircle(16, 16, 16)
		g.generateTexture('enemy', 32, 32)
		// OrcWarrior texture (larger, yellow circle)
		g.clear()
		g.fillStyle(0xffff00, 1)
		g.fillCircle(32, 32, 32)
		g.generateTexture('boss', 64, 64)
		// Bullet texture
		g.clear()
		g.fillStyle(0xffffff, 1)
		g.fillCircle(4, 4, 4)
		g.generateTexture('bullet', 8, 8)
		g.destroy()

	}

	create(): void {
		this.cameras.main.setBackgroundColor('#0b1020')

		// Add keyboard event listeners if keyboard input is available
		if (this.input.keyboard) {
			// Add 'm' key listener to toggle mute
			this.input.keyboard.on('keydown-M', () => {
				this.audioManager.toggleMute()
			})

			// Add '+' key listener to zoom in
			this.input.keyboard.on('keydown-PLUS', () => {
				this.zoomIn()
			})

			// Add '-' key listener to zoom out
			this.input.keyboard.on('keydown-MINUS', () => {
				this.zoomOut()
			})

		// Add ',' key listener to play previous music track
		this.input.keyboard.on('keydown-COMMA', () => {
			this.audioManager.playPreviousTrack()
		})

		// Add '.' key listener to play next music track
		this.input.keyboard.on('keydown-PERIOD', () => {
			this.audioManager.playNextTrack()
		})

		// Start playing background music
		this.audioManager.startMusic()

		// Add arrow key listeners for camera movement
		this.input.keyboard.on('keydown-UP', () => {
			this.arrowKeys.up = true
		})
		this.input.keyboard.on('keydown-DOWN', () => {
			this.arrowKeys.down = true
		})
		this.input.keyboard.on('keydown-LEFT', () => {
			this.arrowKeys.left = true
		})
		this.input.keyboard.on('keydown-RIGHT', () => {
			this.arrowKeys.right = true
		})

			// Add key up listeners to stop camera movement
			this.input.keyboard.on('keyup-UP', () => {
				this.arrowKeys.up = false
			})
			this.input.keyboard.on('keyup-DOWN', () => {
				this.arrowKeys.down = false
			})
			this.input.keyboard.on('keyup-LEFT', () => {
				this.arrowKeys.left = false
			})
			this.input.keyboard.on('keyup-RIGHT', () => {
				this.arrowKeys.right = false
			})
		}

		// Add random background image scaled to game size
		let bg: Phaser.GameObjects.Image
		let textureKey: string

		if (this.currentBackgroundType === 'original') {
			textureKey = 'background'
			bg = this.add.image(this.scale.width / 2, this.scale.height / 2, this.getBrauseTexture(textureKey))
			this.applyBrauseColor(bg, textureKey)
		} else if (this.currentBackgroundType === 'beach') {
			textureKey = 'background_beach'
			bg = this.add.image(this.scale.width / 2, this.scale.height / 2, this.getBrauseTexture(textureKey))
			this.applyBrauseColor(bg, textureKey)
		} else if (this.currentBackgroundType === 'ice') {
			textureKey = 'background_ice'
			bg = this.add.image(this.scale.width / 2, this.scale.height / 2, this.getBrauseTexture(textureKey))
			this.applyBrauseColor(bg, textureKey)
		} else {
			// Fallback to original
			textureKey = 'background'
			bg = this.add.image(this.scale.width / 2, this.scale.height / 2, this.getBrauseTexture(textureKey))
			this.applyBrauseColor(bg, textureKey)
		}

		bg.setDepth(-10)
		const bgScaleX = this.scale.width / bg.width
		const bgScaleY = this.scale.height / bg.height
		const scale = Math.max(bgScaleX, bgScaleY)
		bg.setScale(scale)

		// Initialize registry so UI can read initial values immediately
		this.registry.set('gold', this.gold)
		this.registry.set('lives', this.lives)
		this.registry.set('wave', 1)

		// Generate a randomized path across the map
		this.pathPoints = PathGenerator.generateRandomPath(this.scale.width, this.scale.height)

		// Initialize wave factory
		this.waveFactory = new WaveFactory(this, this.pathPoints)

		// Set up wave completion callback
		this.waveFactory.onWaveComplete(() => {
			// Delay then start next wave
			this.time.delayedCall(200, () => {
				const nextWave = this.waveFactory.incrementWave();
				this.emitWave();
				this.startWave(nextWave);
			});
		});

		// Draw the path using tiled floor sprites
		const floorTextureKey = 'floor_tile'
		const floorTileKey = this.getBrauseTexture(floorTextureKey)
		const tex = this.textures.get(floorTileKey)
		const src = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement | null
		const tileW = 32
		const tileH = 32
		const tileScaleX = src ? tileW / (src as HTMLImageElement | HTMLCanvasElement).width : 1
		const tileScaleY = src ? tileH / (src as HTMLImageElement | HTMLCanvasElement).height : 1

		// First, draw corner tiles at waypoints to fill gaps
		for (let i = 1; i < this.pathPoints.length - 1; i++) {
			const waypoint = this.pathPoints[i]!
			const cornerTile = this.add.tileSprite(waypoint.x, waypoint.y, tileW, tileH, floorTileKey)
			cornerTile.setDepth(0)
			cornerTile.setOrigin(0.5, 0.5)
			cornerTile.tileScaleX = tileScaleX
			cornerTile.tileScaleY = tileScaleY
			this.applyBrauseColor(cornerTile, floorTextureKey)

			// Create a soft edge mask for corner tiles
			const cornerMaskGfx = this.add.graphics()
			cornerMaskGfx.setDepth(-1)
			cornerMaskGfx.setPosition(waypoint.x, waypoint.y)
			const halfW = tileW / 2
			const halfH = tileH / 2
			for (let y = -halfH; y <= halfH; y++) {
				for (let x = -halfW; x <= halfW; x++) {
					const distFromCenter = Math.sqrt(x * x + y * y)
					const maxDist = Math.min(halfW, halfH)
					const t = distFromCenter / maxDist
					const alpha = Phaser.Math.Clamp(1 - t, 0, 1)
					cornerMaskGfx.fillStyle(0xffffff, alpha)
					cornerMaskGfx.fillRect(x, y, 1, 1)
				}
			}
			const cornerMask = new Phaser.Display.Masks.BitmapMask(this, cornerMaskGfx)
			cornerTile.setMask(cornerMask)
			cornerMaskGfx.setVisible(false)
		}

		// Then draw the line segments between waypoints
		for (let i = 0; i < this.pathPoints.length - 1; i++) {
			const a = this.pathPoints[i]!
			const b = this.pathPoints[i + 1]!
			const midX = (a.x + b.x) / 2
			const midY = (a.y + b.y) / 2
			const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y)
			const angle = Phaser.Math.Angle.Between(a.x, a.y, b.x, b.y)
			const stripe = this.add.tileSprite(midX, midY, dist, tileH, floorTileKey)
			stripe.setDepth(0)
			stripe.setRotation(angle)
			stripe.setOrigin(0.5, 0.5)
			stripe.tileScaleX = tileScaleX
			stripe.tileScaleY = tileScaleY
			this.applyBrauseColor(stripe, floorTextureKey)
			// Create a soft edge mask so the path blends into the background
			const maskGfx = this.add.graphics()
			maskGfx.setDepth(-1)
			maskGfx.setPosition(midX, midY)
			maskGfx.setRotation(angle)
			const halfH = tileH / 2
			for (let y = -halfH; y <= halfH; y++) {
				const t = Math.abs(y) / halfH // 0 center -> 1 edge
				const alpha = Phaser.Math.Clamp(1 - t, 0, 1)
				maskGfx.fillStyle(0xffffff, alpha)
				maskGfx.fillRect(-dist / 2, y, dist, 1)
			}
			const mask = new Phaser.Display.Masks.BitmapMask(this, maskGfx)
			stripe.setMask(mask)
			maskGfx.setVisible(false)
		}

		// Add castle at the end of the path
		if (this.pathPoints.length > 0) {
			const endPoint = this.pathPoints[this.pathPoints.length - 1]!
			const castleTextureKey = 'castle'
			const castle = this.add.image(endPoint.x - 40, endPoint.y - 43, this.getBrauseTexture(castleTextureKey))
			castle.setScale(0.16) // Scale down the castle to fit the game
			castle.setOrigin(0.5, 0.5)
			castle.setDepth(1) // Place castle above path but below towers
			this.applyBrauseColor(castle, castleTextureKey)
		}

		// Subscribe to UI toggle for placing towers (deprecated, keeping for backwards compatibility)
		this.game.events.on(GAME_EVENTS.placeTowerToggle, this.onPlaceTowerToggle, this)

		// Subscribe to event selection from UI
		this.game.events.on(GAME_EVENTS.eventTypeSelected, (event: Event | null) => {
			this.selectEvent(event)
		})

		// Subscribe to event activation from UI
		this.game.events.on(GAME_EVENTS.eventActivated, () => {
			if (this.selectedEvent) {
				this.activateSelectedEvent()
			}
		})

		// Keyboard input for tower and event selection
		this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
			const towerType = this.towerStore.getTowerTypeByKey(event.key)
			const eventType = this.eventStore.getEventByKey(event.key)

			if (towerType) {
				this.selectTowerType(towerType)
			} else if (eventType) {
				// Immediately select and activate the event when its key is pressed
				this.selectEvent(eventType)
				this.activateSelectedEvent()
			} else if (event.key === 'Escape') {
				this.deselectTowerType()
				this.selectEvent(null)
			} else if (event.key === 'Enter' || event.key === ' ') {
				// Activate selected event on Enter or Space (kept for backward compatibility)
				if (this.selectedEvent) {
					this.activateSelectedEvent()
				}
			}
		})

		// Mouse movement for ghost tower preview
		this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {

			if (this.ghostTower && this.selectedTowerType) {
				const position = this.snapToGrid(pointer.worldX, pointer.worldY)
				this.ghostTower.setPosition(position.x, position.y)

				// Color ghost based on whether placement is valid
				const level1 = this.selectedTowerType.levels.get(1)
				const canPlace = !this.isOnPath(position) && this.gold >= (level1?.cost || 0)
				this.ghostTower.setAlpha(canPlace ? 0.6 : 0.3)
				this.ghostTower.setTint(canPlace ? 0xffffff : 0xff0000)
				return
			}
		})

		// Input to place a tower or activate an event
		this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {

			const clickedTower = this.findTowerAt(pointer.worldX, pointer.worldY)
			if (clickedTower) {
				return
			}

			// If an event is selected, activate it
			if (this.selectedEvent) {
				this.activateSelectedEvent()
				return
			}

			// Nothing under cursor -> if a tower type is selected, try to place
			if (!this.selectedTowerType) return

			const position = this.snapToGrid(pointer.worldX, pointer.worldY)

			// Prevent placing on path by checking distance to segments
			if (this.isOnPath(position)) return

			// Check if player has enough gold
			const level1 = this.selectedTowerType.levels.get(1)
			if (this.gold < (level1?.cost || 0)) return

			// Deduct gold and place tower
			this.gold -= (level1?.cost || 0)
			this.emitGold()
			const tower = TowerFactory.createTower(this, position.x, position.y, this.selectedTowerType)
			this.towers.push(tower)
			this.game.events.emit(GAME_EVENTS.towerBuilt)

			this.createUpgradeIndicator(tower)
		})


		// Start wave spawning
		this.startWave(1)

		// Emit initial UI values
		this.emitGold()
		this.emitLives()
		this.emitWave()
	}

	override update(time: number, delta: number): void {
		// Update enemies and get results
		const { goldEarned, livesLost } = this.waveFactory.update(delta);

		// Update gold if enemies were killed
		if (goldEarned > 0) {
			this.gold += goldEarned;
			this.emitGold();
		}

		// Update lives if enemies reached the end
		if (livesLost > 0) {
			this.lives -= livesLost;
			this.emitLives();
		}

		// Handle camera movement with arrow keys
		this.updateCameraMovement(delta);

        for (const tower of this.towers) {

            tower.update(delta, this.waveFactory.getEnemies());

            if (tower.getHP() <= 0) {
                this.removeTower(tower);
            }
        }

        for (const event of this.activeEvents) {
            event.update(delta, this);

            if (!event.isActive()) {
                this.activeEvents = this.activeEvents.filter((e) => e !== event);
                this.game.events.emit(GAME_EVENTS.eventActivated, null);
            }
        }

		// Sort towers by Y position for proper depth ordering
		this.sortTowersByDepth();
		this.updateUpgradeIndicators();
	}

	// Method to check if a specific event type is active
	public isEventActive(eventId: string): boolean {
		return this.activeEvents.some(event => event.id === eventId);
	}

	// Method to get enemies for events
	public getEnemies() {
		return this.waveFactory.getEnemies();
	}

	// Method to get enemy factory for events
	public getEnemyFactory() {
		return this.waveFactory.getEnemyFactory();
	}

	// Method to select an event
	public selectEvent(event: Event | null): void {
		this.selectedEvent = event;
		this.selectedTowerType = null; // Deselect tower if an event is selected

		// Emit event selection event
		this.game.events.emit(GAME_EVENTS.eventTypeSelected, event);
	}

	// Method to activate the selected event
	public activateSelectedEvent(): void {
		if (!this.selectedEvent) return;

		// Check if player has enough gold
		if (this.gold < this.selectedEvent.cost) return;

		// Deduct gold and activate event
		this.gold -= this.selectedEvent.cost;
		this.emitGold();

		// Activate the event
		this.selectedEvent.activate(this);
		this.activeEvents.push(this.selectedEvent);

		// Show activation message
		this.showEventActivationMessage(this.selectedEvent);

		// Emit event activated event
		this.game.events.emit(GAME_EVENTS.eventActivated, this.selectedEvent);

		// Deselect the event
		this.selectEvent(null);
	}

	// Display a temporary message when an event is activated
	private showEventActivationMessage(event: Event): void {
		// Create a text message that appears briefly when an event is activated
		const text = this.add.text(
			this.scale.width / 2,
			this.scale.height / 4,
			`${event.name} Activated!`,
			{
				fontFamily: 'Arial, sans-serif',
				fontSize: '32px',
				color: '#00ff00',
				stroke: '#000000',
				strokeThickness: 5,
				shadow: { color: '#000000', blur: 10, stroke: true, fill: true },
				resolution: 2
			}
		)
		text.setOrigin(0.5)
		text.setDepth(1000)

		// Fade in and out animation
		this.tweens.add({
			targets: text,
			alpha: { from: 0, to: 1 },
			duration: 500,
			yoyo: true,
			hold: 1000,
			onComplete: () => {
				text.destroy()
			}
		})
	}

	private onPlaceTowerToggle = (enabled: boolean) => {
		this.isPlacingTower = enabled
		this.input.setDefaultCursor(enabled ? 'crosshair' : 'default')
	}

    private buildLevelText(tower: Tower): string {

        if (tower.getLevel() === tower.getMaxLevel()) {
            return 'lvl (max)';
        }

        return 'lvl (' + tower.getLevel() + ' -> ' + (tower.getLevel() + 1) + ')';
    }

	private createUpgradeIndicator(tower: Tower): void {
		if (!tower.canUpgrade()) return
		if (this.upgradeIndicators.has(tower)) return

		const cost = tower.getNextUpgrade()?.cost ?? 0;

		const upgradeArrowTextureKey = 'upgrade_arrow';
		const img = this.add.image(0, 0, this.getBrauseTexture(upgradeArrowTextureKey))
			.setInteractive({ useHandCursor: true })
			.setDepth(10)
			.setScale(0.1)
			.setOrigin(0.5, 1);
		this.applyBrauseColor(img, upgradeArrowTextureKey);


		const priceText = this.add.text(0, 0, `${this.buildLevelText(tower)}: ${cost}`, {
			fontFamily: 'Arial, sans-serif',
			fontSize: '12px',
			color: '#ffff00',
			stroke: '#000000',
			strokeThickness: 3,
			resolution: 2
		}).setOrigin(0, 0.5);

		const margin = 2;

		const container = this.add.container(
			tower.sprite.x,
			tower.sprite.y - ((tower.sprite.displayHeight) / 2 - 16),
			[img, priceText]
		).setDepth(10)

		const arrowH = img.displayHeight
		const arrowW = img.displayWidth
		priceText.x = arrowW / 2 + margin
		priceText.y = -arrowH / 2

		img.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: any) => {
			if (event && typeof event.stopPropagation === 'function') event.stopPropagation()
			this.upgradeTower(tower)
		})

		this.upgradeIndicators.set(tower, container)
	}

	private removeUpgradeIndicator(tower: Tower): void {
		const container = this.upgradeIndicators.get(tower)
		if (!container) return

		const arrow = container.list.find(c => (c as Phaser.GameObjects.Image).texture) as Phaser.GameObjects.Image | undefined
		if (arrow) arrow.off('pointerdown')
		container.destroy()
		this.upgradeIndicators.delete(tower)
	}

	/**
	 * Removes a tower from the game
	 * @param tower The tower to remove
	 */
	private removeTower(tower: Tower): void {
		// Remove upgrade indicator if it exists
		this.removeUpgradeIndicator(tower);

		// Remove from towers array
		const index = this.towers.indexOf(tower);
		if (index !== -1) {
			this.towers.splice(index, 1);
		}

		// Show destruction message
		const text = this.add.text(
			tower.sprite.x,
			tower.sprite.y - 30,
			"Tower Destroyed!",
			{
				fontFamily: 'Arial, sans-serif',
				fontSize: '18px',
				color: '#ff3333',
				stroke: '#000000',
				strokeThickness: 3,
				resolution: 2
			}
		);
		text.setOrigin(0.5);
		text.setDepth(100);

		// Fade out and remove the message
		this.tweens.add({
			targets: text,
			alpha: 0,
			y: text.y - 20,
			duration: 1500,
			ease: 'Power2',
			onComplete: () => {
				text.destroy();
			}
		});
	}

	private updateUpgradeIndicators(): void {
		// ensure indicators exist only for upgradable towers
		for (const tower of this.towers) {
			const has = this.upgradeIndicators.has(tower)
			const can = tower.canUpgrade()
			if (can && !has) {
				this.createUpgradeIndicator(tower)
			} else if (!can && has) {
				this.removeUpgradeIndicator(tower)
			}
		}

		// follow tower positions and update price / tint
		for (const [tower, container] of this.upgradeIndicators.entries()) {
			if (!tower || !container) continue

			container.x = tower.sprite.x
			container.y = tower.sprite.y - ((tower.sprite.displayHeight) / 2 - 16)

			const cost = tower.getNextUpgrade()?.cost ?? 0;

			// update price text
			const priceText = container.list.find(c => c instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text | undefined
			if (priceText) priceText.setText(`${this.buildLevelText(tower)}: ${cost}`)

			// tint arrow and price based on affordability
			const arrow = container.list.find(c => c instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image | undefined
			if (arrow) {
				if (this.gold >= cost) {
					arrow.clearTint()
					if (priceText) priceText.setStyle({ color: '#00ff00' })
				} else {
					arrow.setTint(0xff4444)
					if (priceText) priceText.setStyle({ color: '#ff6666' })
				}
			}
		}
	}

	private upgradeTower(clickedTower: Tower): void {

		if (!clickedTower.canUpgrade()) {
			clickedTower.sprite.setTint(0xff8888)
			this.time.delayedCall(180, () => {
				clickedTower.sprite.clearTint()
				// Reapply Brause color after the effect
				const textureKey = `tower_${clickedTower.type.id}`;
				this.applyBrauseColor(clickedTower.sprite, textureKey);
			})
			return
		}

		const upgradeCost = clickedTower.getNextUpgrade()?.cost ?? 0;
		if (this.gold < upgradeCost) {
			// optional: feedback (flash red)
			clickedTower.sprite.setTint(0xff0000)
			this.time.delayedCall(220, () => {
				clickedTower.sprite.clearTint()
				// Reapply Brause color after the effect
				const textureKey = `tower_${clickedTower.type.id}`;
				this.applyBrauseColor(clickedTower.sprite, textureKey);
			})
			return
		}

		// Pay and perform upgrade
		this.gold -= upgradeCost
		this.emitGold()
		const ok = clickedTower.upgrade()
		if (ok) {
			this.game.events.emit(GAME_EVENTS.towerUpgraded, clickedTower)
			this.waveFactory.playEnemyDeathSound()
		}

		// nach Upgrade gegebenenfalls Indikator entfernen/aktualisieren
		if (!clickedTower.canUpgrade()) {
			this.removeUpgradeIndicator(clickedTower)
		}
	}

	private selectTowerType(towerType: TowerType): void {
		// Check if player can afford this tower
		const level1 = towerType.levels.get(1)
		if (this.gold < (level1?.cost || 0)) {
			// Could add a visual feedback here that player can't afford it
			return
		}

		this.selectedTowerType = towerType
		this.input.setDefaultCursor('crosshair')

		// Create or update ghost tower
		if (this.ghostTower) {
			this.ghostTower.destroy()
		}
		// Use the same texture as the actual tower
		let textureKey;
		let scale;

			switch (towerType.id) {
			case TowerTypeID.SNIPER:
				textureKey = 'tower_laser'
				scale = 0.1
				break
			case TowerTypeID.RAPID:
				textureKey = 'tower_rapid'
				scale = 0.1
				break
			case TowerTypeID.CHAIN:
				textureKey = 'tower_rapid_fire'
				scale = 0.1
				break
			case TowerTypeID.AOE:
				textureKey = 'tower_explosive'
				scale = 0.1
				break
			case TowerTypeID.FROST:
				textureKey = 'tower_frost'
				scale = 0.1
				break
			default:
				textureKey = 'tower_basic'
				scale = 0.08
		}
		this.ghostTower = this.add.sprite(0, 0, this.getBrauseTexture(textureKey))
		this.ghostTower.setDepth(1)
		this.ghostTower.setAlpha(0.6)
		this.ghostTower.setScale(scale)
		this.applyBrauseColor(this.ghostTower, textureKey)

		// Emit event for UI update
		this.game.events.emit(GAME_EVENTS.towerTypeSelected, towerType)
	}

	private deselectTowerType(): void {
		this.selectedTowerType = null
		this.input.setDefaultCursor('default')

		if (this.ghostTower) {
			this.ghostTower.destroy()
			this.ghostTower = undefined
		}

		// Emit event for UI update
		this.game.events.emit(GAME_EVENTS.towerTypeSelected, null)
	}

	private sortTowersByDepth(): void {
		// Sort towers by Y position (higher Y = further back)
		this.towers.sort((a, b) => a.sprite.y - b.sprite.y)

		// Update depth based on sorted order
		this.towers.forEach((tower, index) => {
			tower.sprite.setDepth(2 + index * 0.001) // Start at depth 2, increment by small amounts
		})
	}

	private startWave(wave: number): void {
		this.waveFactory.startWave(wave);
	}


	private findTowerAt(worldX: number, worldY: number): Tower | undefined {
		for (let i = this.towers.length - 1; i >= 0; i--) {
			const t = this.towers[i]!
			const bounds = t.sprite.getBounds()
			if (bounds.contains(worldX, worldY)) return t
		}
		return undefined
	}

	private emitGold(): void {
		this.registry.set('gold', this.gold)
		this.game.events.emit(GAME_EVENTS.goldChanged, this.gold)
	}

	private emitLives(): void {
		this.registry.set('lives', this.lives)
		this.game.events.emit(GAME_EVENTS.livesChanged, this.lives)
		if (this.lives <= 0) {
			this.scene.pause()
			this.add.text(this.scale.width / 2, this.scale.height / 2, 'Game Over', { 
				fontSize: '48px', 
				color: '#ff0000',
				fontFamily: 'Arial, sans-serif',
				fontStyle: 'bold',
				stroke: '#000000',
				strokeThickness: 6,
				resolution: 2
			}).setOrigin(0.5)
		}
	}

	private emitWave(): void {
		const currentWave = this.waveFactory.getCurrentWave();
		this.registry.set('wave', currentWave)
		this.game.events.emit(GAME_EVENTS.waveChanged, currentWave)
	}

	private snapToGrid(x: number, y: number): Phaser.Math.Vector2 {
		const size = 32
		const sx = Math.floor(x / size) * size + size / 2
		const sy = Math.floor(y / size) * size + size / 2
		return new Phaser.Math.Vector2(Phaser.Math.Clamp(sx, 16, this.scale.width - 16), Phaser.Math.Clamp(sy, 16, this.scale.height - 16))
	}

	private isOnPath(point: Phaser.Math.Vector2): boolean {
		// Consider within 24px of any segment centerline as on the path
		for (let i = 0; i < this.pathPoints.length - 1; i++) {
			const a = this.pathPoints[i]!
			const b = this.pathPoints[i + 1]!
			const dist = this.distancePointToSegment(point, a, b)
			if (dist < 24) return true
		}
		return false
	}

	private distancePointToSegment(p: Phaser.Math.Vector2, a: Phaser.Math.Vector2, b: Phaser.Math.Vector2): number {
		// Compute distance from point p to line segment ab
		const abx = b.x - a.x
		const aby = b.y - a.y
		const apx = p.x - a.x
		const apy = p.y - a.y
		const abLenSq = abx * abx + aby * aby
		if (abLenSq === 0) return Math.hypot(apx, apy)
		let t = (apx * abx + apy * aby) / abLenSq
		t = Phaser.Math.Clamp(t, 0, 1)
		const cx = a.x + abx * t
		const cy = a.y + aby * t
		return Math.hypot(p.x - cx, p.y - cy)
	}

	/**
	 * Zoom in the camera by one step
	 */
	private zoomIn(): void {
		// Increase zoom level by one step
		this.currentZoom = Math.min(this.currentZoom + this.zoomStep, this.maxZoom)

		// Apply zoom to the camera
		this.cameras.main.setZoom(this.currentZoom)
	}

	/**
	 * Zoom out the camera by one step
	 */
	private zoomOut(): void {
		// Decrease zoom level by one step
		this.currentZoom = Math.max(this.currentZoom - this.zoomStep, this.minZoom)

		// Apply zoom to the camera
		this.cameras.main.setZoom(this.currentZoom)
	}

	/**
	 * Update camera position based on arrow key input
	 * @param delta Time since last update in milliseconds
	 */
	private updateCameraMovement(delta: number): void {
		// Calculate the movement speed adjusted for delta time and zoom level
		const adjustedSpeed = (this.cameraSpeed * delta) / 1000 / this.currentZoom;

		// Track if any movement occurred
		let moved = false;

		// Calculate movement vector
		let dx = 0;
		let dy = 0;

		if (this.arrowKeys.up) {
			dy -= adjustedSpeed;
			moved = true;
		}
		if (this.arrowKeys.down) {
			dy += adjustedSpeed;
			moved = true;
		}
		if (this.arrowKeys.left) {
			dx -= adjustedSpeed;
			moved = true;
		}
		if (this.arrowKeys.right) {
			dx += adjustedSpeed;
			moved = true;
		}

		// Apply movement if any keys are pressed
		if (moved) {
			this.cameras.main.scrollX += dx;
			this.cameras.main.scrollY += dy;
		}
	}

	/**
	 * Get the appropriate texture key based on brause mode
	 * If brause mode is enabled and a "_brause" version of the texture exists, use it
	 * Otherwise, use the original texture
	 * @param key The original texture key
	 * @returns The texture key to use
	 */
	private getBrauseTexture(key: string): string {
		// If brause mode is not enabled, use the original texture
		if (!this.gameConfigService.isBrauseMode()) {
			return key;
		}

		// Check if a "_brause" version of the texture exists
		const brauseKey = key + '_brause';
		if (this.textures.exists(brauseKey)) {
			return brauseKey;
		}

		// If no "_brause" version exists, use the original texture
		return key;
	}

	/**
	 * Apply a random brause color to a game object if it doesn't have a "_brause" texture
	 * @param gameObject The game object to apply the color to
	 * @param textureKey The texture key used for the game object
	 */
	private applyBrauseColor(gameObject: Phaser.GameObjects.GameObject, textureKey: string): void {
		// Only apply color in brause mode
		if (!this.gameConfigService.isBrauseMode()) {
			return;
		}

		// Only apply color if there's no "_brause" version of the texture
		const brauseKey = textureKey + '_brause';
		if (this.textures.exists(brauseKey)) {
			return;
		}

		// Define the brause colors
		const brauseColors = [
			0xfcef4f, // Yellow (RGB 252, 239, 79)
			0x6aa83d, // Green (RGB 106, 168, 61)
			0xdf7332, // Orange (RGB 223, 115, 50)
			0xd52e73  // Pink (RGB 213, 46, 115)
		];

		// Select a random color
		const randomColor = brauseColors[Math.floor(Math.random() * brauseColors.length)];

		// Apply the color to the game object
		if (gameObject instanceof Phaser.GameObjects.Image || 
			gameObject instanceof Phaser.GameObjects.Sprite) {
			gameObject.setTint(randomColor);
		}
	}

}
