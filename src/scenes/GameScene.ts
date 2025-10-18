import Phaser from 'phaser'
import {OrcGrunt} from '../entities/Units/OrcGrunt'
import {OrcWarrior} from '../entities/Units/OrcWarrior'
import {Berserker} from '../entities/Units/Berserker'
import {Chonkers} from '../entities/Units/Chonkers'
import {Cultist} from '../entities/Units/Cultist'
import {Demon} from '../entities/Units/Demon'
import {Imp} from '../entities/Units/Imp'
import {Skeleton} from '../entities/Units/Skeleton'
import {Unicorn} from '../entities/Units/Unicorn'
import {Zombie} from '../entities/Units/Zombie'
import {PathGenerator} from './PathGenerator'
import {TowerStore, TowerType, TowerTypeID} from '../services/TowerStore'
import {Tower} from "../entities/Towers/Tower";
import {TowerFactory} from "../entities/Towers/TowerFactory";

export const GAME_EVENTS = {
    placeTowerToggle: 'ui.placeTowerToggle',
    goldChanged: 'game.goldChanged',
    livesChanged: 'game.livesChanged',
    waveChanged: 'game.waveChanged',
    enemyKilled: 'game.enemyKilled',
	towerBuilt: 'game.towerBuilt',
	towerTypeSelected: 'game.towerTypeSelected'
} as const

export class GameScene extends Phaser.Scene {
	static KEY = 'GameScene'

	enemies: (OrcGrunt | OrcWarrior | Berserker | Chonkers | Cultist | Demon | Imp | Skeleton | Unicorn | Zombie)[] = []
	pathPoints: Phaser.Math.Vector2[] = []
    private towers: Tower[] = []
	private spawnTimer?: Phaser.Time.TimerEvent | undefined
    private isPlacingTower = false
    private gold = 100
    private lives = 20
    private wave = 1
    private towerStore: TowerStore
    private selectedTowerType: TowerType | null = null
    private ghostTower?: Phaser.GameObjects.Sprite | undefined

	constructor() {
		super(GameScene.KEY)
		this.towerStore = TowerStore.getInstance()
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
		this.load.image('castle', 'assets/castle.png')
		this.load.image('tower_basic', 'assets/towers/tower_basic.png')
		this.load.image('tower_laser', 'assets/towers/tower_laser.png')
		this.load.image('tower_rapid_fire', 'assets/towers/tower_rapid_fire.png')
		this.load.image('tower_rapid', 'assets/towers/tower_rapid.png')
		this.load.image('tower_explosive', 'assets/towers/tower_explosive.png')
		this.load.image('arrow', 'assets/projectiles/arrow.png')
		this.load.image('background', 'assets/background.jpeg')
		this.load.image('floor_tile', 'assets/floor_tile.jpeg')

		// Generate simple textures for sprites (no external assets)
		const g = this.add.graphics()
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

		// Add background image scaled to game size
		const bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'background')
		bg.setDepth(-10)
		const bgScaleX = this.scale.width / bg.width
		const bgScaleY = this.scale.height / bg.height
		const scale = Math.max(bgScaleX, bgScaleY)
		bg.setScale(scale)

		// Initialize registry so UI can read initial values immediately
		this.registry.set('gold', this.gold)
		this.registry.set('lives', this.lives)
		this.registry.set('wave', this.wave)

		// Generate a randomized path across the map
		this.pathPoints = PathGenerator.generateRandomPath(this.scale.width, this.scale.height)

		// Draw the path using tiled floor sprites
		const tex = this.textures.get('floor_tile')
		const src = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement | null
		const tileW = 32
		const tileH = 32
		const tileScaleX = src ? tileW / (src as HTMLImageElement | HTMLCanvasElement).width : 1
		const tileScaleY = src ? tileH / (src as HTMLImageElement | HTMLCanvasElement).height : 1
		for (let i = 0; i < this.pathPoints.length - 1; i++) {
			const a = this.pathPoints[i]!
			const b = this.pathPoints[i + 1]!
			const midX = (a.x + b.x) / 2
			const midY = (a.y + b.y) / 2
			const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y)
			const angle = Phaser.Math.Angle.Between(a.x, a.y, b.x, b.y)
			const stripe = this.add.tileSprite(midX, midY, dist, tileH, 'floor_tile')
			stripe.setDepth(0)
			stripe.setRotation(angle)
			stripe.setOrigin(0.5, 0.5)
			stripe.tileScaleX = tileScaleX
			stripe.tileScaleY = tileScaleY
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
			const castle = this.add.image(endPoint.x - 40, endPoint.y - 43, 'castle')
			castle.setScale(0.15) // Scale down the castle to fit the game
			castle.setOrigin(0.5, 0.5)
			castle.setDepth(10) // Place castle above path but below towers
		}

		// Subscribe to UI toggle for placing towers (deprecated, keeping for backwards compatibility)
		this.game.events.on(GAME_EVENTS.placeTowerToggle, this.onPlaceTowerToggle, this)

		// Keyboard input for tower selection
		this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
			const towerType = this.towerStore.getTowerTypeByKey(event.key)
			if (towerType) {
				this.selectTowerType(towerType)
			} else if (event.key === 'Escape') {
				this.deselectTowerType()
			}
		})

		// Mouse movement for ghost tower preview
		this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
			if (this.ghostTower && this.selectedTowerType) {
				const position = this.snapToGrid(pointer.worldX, pointer.worldY)
				this.ghostTower.setPosition(position.x, position.y)

				// Color ghost based on whether placement is valid
				const canPlace = !this.isOnPath(position) && this.gold >= this.selectedTowerType.cost
				this.ghostTower.setAlpha(canPlace ? 0.6 : 0.3)
				this.ghostTower.setTint(canPlace ? 0xffffff : 0xff0000)
			}
		})

		// Input to place a tower when in placement mode
		this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
			if (!this.selectedTowerType) return

			const position = this.snapToGrid(pointer.worldX, pointer.worldY)

			// Prevent placing on path by checking distance to segments
			if (this.isOnPath(position)) return

			// Check if player has enough gold
			if (this.gold < this.selectedTowerType.cost) return

			// Deduct gold and place tower
			this.gold -= this.selectedTowerType.cost
			this.emitGold()
			const tower = TowerFactory.createTower(this, position.x, position.y, this.selectedTowerType)
			this.towers.push(tower)
            this.game.events.emit(GAME_EVENTS.towerBuilt)

			// Keep the same tower type selected for multiple placements
        })

		// Start wave spawning
		this.startWave(this.wave)

		// Emit initial UI values
		this.emitGold()
		this.emitLives()
		this.emitWave()
	}

	override update(time: number, delta: number): void {
		// Update enemies
		for (const enemy of [...this.enemies]) {
			enemy.update(delta, this.pathPoints)
			if (enemy.isDead()) {
				const isBoss = enemy.sprite.texture.key === 'orc_warrior'
				this.gold += isBoss ? 100 : 10
				this.emitGold()
				this.playPlop()
				this.removeEnemy(enemy)
				continue
			}
			
			// Check if enemy is close to castle (within 50 pixels of castle position)
			if (this.pathPoints.length > 0) {
				const endPoint = this.pathPoints[this.pathPoints.length - 1]!
				const castleX = endPoint.x - 40
				const castleY = endPoint.y - 43
				const distanceToCastle = Phaser.Math.Distance.Between(
					enemy.sprite.x, enemy.sprite.y, 
					castleX, castleY
				)
				
				if (distanceToCastle < 50) {
					this.lives -= 1
					this.emitLives()
					this.removeEnemy(enemy)
					continue
				}
			}
			
			if (enemy.reachedEnd) {
				this.lives -= 1
				this.emitLives()
				this.removeEnemy(enemy)
			}
		}

		// Update towers shooting
		for (const tower of this.towers) {
			tower.update(delta, this.enemies)
		}

		// Sort towers by Y position for proper depth ordering
		this.sortTowersByDepth()

		// End wave if no enemies remaining and no more to spawn
		if (this.enemies.length === 0 && this.spawnTimer && this.spawnTimer.getRepeatCount() === 0 && this.spawnTimer.getProgress() === 1) {
			// Delay then start next wave
            this.time.delayedCall(200, () => {
				this.wave += 1
				this.emitWave()
				this.startWave(this.wave)
			})
		}
	}

	private onPlaceTowerToggle = (enabled: boolean) => {
		this.isPlacingTower = enabled
		this.input.setDefaultCursor(enabled ? 'crosshair' : 'default')
	}

	private selectTowerType(towerType: TowerType): void {
		// Check if player can afford this tower
		if (this.gold < towerType.cost) {
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
		let textureKey = 'tower_basic'
		let scale = 0.08 // Default scale for basic tower
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
			default:
				textureKey = 'tower_basic'
				scale = 0.08
		}
		this.ghostTower = this.add.sprite(0, 0, textureKey)
		this.ghostTower.setDepth(1)
		this.ghostTower.setAlpha(0.6)
		this.ghostTower.setScale(scale)

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
		// OrcWarrior every 5th wave
		if (wave % 5 === 0) {
            OrcWarrior.spawn(this, wave);
			return
		}

		const count = 6 + Math.floor(wave * 1.5)

		this.spawnTimer?.remove()
		this.spawnTimer = this.time.addEvent({
			delay: 400,
			repeat: count - 1,
			callback: () => {
				this.spawnRandomEnemy(wave);
            },
		})
	}

	private spawnRandomEnemy(wave: number): void {
		const enemyTypes = [
			OrcGrunt,
			Berserker,
			Chonkers,
			Cultist,
			Demon,
			Imp,
			Skeleton,
			Unicorn,
			Zombie
		]
		
		const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)]
		if (randomType) {
			randomType.spawn(this, wave)
		}
	}

	private removeEnemy(enemy: OrcGrunt | OrcWarrior | Berserker | Chonkers | Cultist | Demon | Imp | Skeleton | Unicorn | Zombie): void {

		const idx = this.enemies.indexOf(enemy)
		if (idx >= 0) {
            this.enemies.splice(idx, 1)

            if (enemy.isDead()) {
                this.game.events.emit(GAME_EVENTS.enemyKilled)
			}
        }

		if (enemy.isDead()) {
			this.flingEnemyOffscreen(enemy)
			return
		}

		enemy.destroy()
	}

	private flingEnemyOffscreen(enemy: OrcGrunt | OrcWarrior | Berserker | Chonkers | Cultist | Demon | Imp | Skeleton | Unicorn | Zombie): void {
		// Disable physics and fling the sprite offscreen with a spin, then destroy
		enemy.sprite.setVelocity(0, 0)
		const body = enemy.sprite.body as Phaser.Physics.Arcade.Body | null | undefined
		if (body) body.setEnable(false)

		const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
		const distance = Math.max(this.scale.width, this.scale.height) + 200
		const targetX = enemy.sprite.x + Math.cos(angle) * distance
		const targetY = enemy.sprite.y + Math.sin(angle) * distance
		const spin = Phaser.Math.FloatBetween(20, 60) * (Math.random() < 0.5 ? -1 : 1)

		this.tweens.add({
			targets: enemy.sprite,
			x: targetX,
			y: targetY,
			rotation: enemy.sprite.rotation + spin,
			duration: 4500,
			ease: 'Quad.easeOut',
			onComplete: () => enemy.destroy()
		})
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
			this.add.text(this.scale.width / 2, this.scale.height / 2, 'Game Over', { fontSize: '32px', color: '#fff' }).setOrigin(0.5)
		}
	}
	private emitWave(): void {
		this.registry.set('wave', this.wave)
		this.game.events.emit(GAME_EVENTS.waveChanged, this.wave)
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

	private playPlop(): void {
		const audioCtx = this.getAudioContext()
		if (!audioCtx) return

		const durationSec = 0.06
		const osc = audioCtx.createOscillator()
		const gain = audioCtx.createGain()
		osc.type = 'sine'
		osc.frequency.setValueAtTime(160, audioCtx.currentTime)
		osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + durationSec)
		gain.gain.setValueAtTime(0.001, audioCtx.currentTime)
		gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.01)
		gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationSec)
		osc.connect(gain)
		gain.connect(audioCtx.destination)
		osc.start()
		osc.stop(audioCtx.currentTime + durationSec)
		osc.onended = () => {
			osc.disconnect()
			gain.disconnect()
		}
	}

	private getAudioContext(): AudioContext | null {
		const phaserSound = this.sound as { context?: AudioContext }
		const existingCtx = phaserSound?.context || window.audioCtx

		if (existingCtx) return existingCtx

		try {
			const AudioContextClass = window.AudioContext || window.webkitAudioContext
			if (!AudioContextClass) return null

			const newCtx = new AudioContextClass()
			window.audioCtx = newCtx
			return newCtx
		} catch (error) {
			return null
		}
	}
} 