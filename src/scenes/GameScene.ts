import Phaser from 'phaser'
import { Enemy } from '../entities/Enemy'
import { Tower } from '../entities/Tower'
import { Boss } from '../entities/Boss'
import { PathGenerator } from './PathGenerator'

export const GAME_EVENTS = {
    placeTowerToggle: 'ui.placeTowerToggle',
    goldChanged: 'game.goldChanged',
    livesChanged: 'game.livesChanged',
    waveChanged: 'game.waveChanged',
    enemyKilled: 'game.enemyKilled',
    towerBuilt: 'game.towerBuilt'
} as const

export class GameScene extends Phaser.Scene {
	static KEY = 'GameScene'

	enemies: Enemy[] = []
	pathPoints: Phaser.Math.Vector2[] = []
    private towers: Tower[] = []
	private spawnTimer?: Phaser.Time.TimerEvent
	private isPlacingTower = false
	private gold = 100
	private lives = 20
	private wave = 1

	constructor() {
		super(GameScene.KEY)
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
		this.load.image('background', 'assets/background.jpeg')
		this.load.image('floor_tile', 'assets/floor_tile.jpeg')

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
		// Tower texture
		g.clear()
		g.fillStyle(0x2ed573, 1)
		g.fillRoundedRect(0, 0, 32, 32, 6)
		g.generateTexture('tower', 32, 32)
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
		}

		// Subscribe to UI toggle for placing towers
		this.game.events.on(GAME_EVENTS.placeTowerToggle, this.onPlaceTowerToggle, this)

		// Input to place a tower when in placement mode
		this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
			if (this.isPlacingTower) return
			const position = this.snapToGrid(pointer.worldX, pointer.worldY)
			// Prevent placing on path by checking distance to segments
			if (this.isOnPath(position)) return
			const towerCost = 50
			if (this.gold < towerCost) return
			this.gold -= towerCost
			this.emitGold()
			const tower = new Tower(this, position.x, position.y)
			this.towers.push(tower)
            this.game.events.emit(GAME_EVENTS.towerBuilt)
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

		if (enemy.isDead()) {
			this.flingEnemyOffscreen(enemy)
			return
		}

		enemy.destroy()
	}

	private flingEnemyOffscreen(enemy: Enemy): void {
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