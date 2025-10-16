import Phaser from 'phaser'
import {Enemy} from '../entities/Enemy'
import {Boss} from '../entities/Boss'
import {PathGenerator} from './PathGenerator'
import {TowerStore, TowerType} from '../services/TowerStore'
import {Tower} from "../entities/Towers/Tower";

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

	enemies: Enemy[] = []
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
		// Start additional scenes
		this.scene.launch('UIScene');
		this.scene.launch('StatisticsScene');

		// Load external assets
		this.load.image('orc_grunt', 'assets/units/orc_grunt.png')
		this.load.image('orc_warrior', 'assets/units/orc_warrior.png')
		this.load.image('tower1', 'assets/towers/tower1.png')
		this.load.image('arrow', 'assets/projectiles/arrow.png')

		// Generate simple textures for sprites (no external assets)
		const g = this.add.graphics()
		// Enemy texture
		g.clear()
		g.fillStyle(0xff4757, 1)
		g.fillCircle(16, 16, 16)
		g.generateTexture('enemy', 32, 32)
		// Boss texture (larger, yellow circle)
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

		// Generate tower textures for all tower types
		this.towerStore.generateAllTowerTextures(this)
	}

	create(): void {
		this.cameras.main.setBackgroundColor('#0b1020')

		// Initialize registry so UI can read initial values immediately
		this.registry.set('gold', this.gold)
		this.registry.set('lives', this.lives)
		this.registry.set('wave', this.wave)

		// Generate a randomized path across the map
		this.pathPoints = PathGenerator.generateRandomPath(this.scale.width, this.scale.height)

		// Draw the path for visual feedback
		const pathGraphics = this.add.graphics()
		pathGraphics.lineStyle(16, 0x334155, 1)
		for (let i = 0; i < this.pathPoints.length - 1; i++) {
			const a = this.pathPoints[i]!
			const b = this.pathPoints[i + 1]!
			pathGraphics.strokeLineShape(new Phaser.Geom.Line(a.x, a.y, b.x, b.y))
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
			const tower = new Tower(this, position.x, position.y, this.selectedTowerType)
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
				const isBoss = (enemy as any).sprite.texture.key === 'orc_warrior'
				this.gold += isBoss ? 100 : 10
				this.emitGold()
				this.playPlop()
				this.removeEnemy(enemy)
				continue
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
		this.ghostTower = this.add.sprite(0, 0, `tower_${towerType.id}`)
		this.ghostTower.setDepth(1)
		this.ghostTower.setAlpha(0.6)

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

	private startWave(wave: number): void {
		// Boss every 5th wave
		if (wave % 5 === 0) {
            Boss.spawn(this, wave);
			return
		}

		const count = 6 + Math.floor(wave * 1.5)

		this.spawnTimer?.remove()
		this.spawnTimer = this.time.addEvent({
			delay: 400,
			repeat: count - 1,
			callback: () => {
                Enemy.spawn(this, wave);
            },
		})
	}

	private removeEnemy(enemy: Enemy): void {

		const idx = this.enemies.indexOf(enemy)
		if (idx >= 0) {
            this.enemies.splice(idx, 1)

            if (enemy.isDead()) {
                this.game.events.emit(GAME_EVENTS.enemyKilled)
            }
        }

        enemy.destroy()
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