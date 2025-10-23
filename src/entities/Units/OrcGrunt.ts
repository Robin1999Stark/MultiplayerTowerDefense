import Phaser from 'phaser'
import { GameScene } from "@scenes/GameScene";
import { Enemy } from "../Factories/EnemyFactory";

export class OrcGrunt implements Enemy {
	public sprite: Phaser.Physics.Arcade.Sprite
	public hp: number
	public speed: number
	public reachedEnd = false
	private pathIndex = 0
	private walkTime = 0
	private slowTimer = 0
	private slowDuration = 0
	private baseSpeed: number
	private isSlowed = false
	private healthBar: Phaser.GameObjects.Graphics
	private maxHp: number

	constructor(scene: Phaser.Scene, x: number, y: number, hp: number, speed: number, textureKey: string = 'orc_grunt', radius: number = 16) {
		this.sprite = scene.physics.add.sprite(x, y, textureKey)
		this.sprite.setScale(0.05)
		this.sprite.setCircle(radius, 16 - radius, 16 - radius)
		this.sprite.setDepth(1)
		this.hp = hp
		this.maxHp = hp
		this.speed = speed
		this.baseSpeed = speed

		// Create health bar
		this.healthBar = scene.add.graphics()
		this.healthBar.setDepth(1) // Same depth as sprite
		this.updateHealthBar()
	}

	update(deltaMs: number, path: Phaser.Math.Vector2[]): void {
		if (this.reachedEnd) return
		const dt = deltaMs / 1000
		this.walkTime += dt * 10

		// Handle slowing effect
		if (this.isSlowed) {
			this.slowTimer += deltaMs
			if (this.slowTimer >= this.slowDuration) {
				this.removeSlow()
			}
		}

		const pos = new Phaser.Math.Vector2(this.sprite.x, this.sprite.y)
		const target = path[this.pathIndex + 1]
		if (!target) {
			this.reachedEnd = true
			return
		}
		const dir = target.clone().subtract(pos)
		const distance = dir.length()
		if (distance < this.speed * dt) {
			this.sprite.setPosition(target.x, target.y)
			this.pathIndex++
			// Update health bar position after moving
			this.updateHealthBar()
			return
		}
		dir.normalize()
		this.sprite.setVelocity(dir.x * this.speed, dir.y * this.speed)

		// Add a slight back-and-forth rotation to simulate walking
		const rotationAmplitude = 0.12 // radians (~7 degrees)
		this.sprite.setRotation(Math.sin(this.walkTime) * rotationAmplitude)

		// Update health bar position
		this.updateHealthBar()
	}

	takeDamage(amount: number): void {
		this.hp -= amount
		this.updateHealthBar()
	}

	private updateHealthBar(): void {
		this.healthBar.clear()

		// Don't show health bar if enemy is dead
		if (this.hp <= 0) return

		const width = 30 // Width of health bar
		const height = 4 // Height of health bar
		const x = this.sprite.x - width / 2
		const y = this.sprite.y - 20 // Position above the sprite

		// Background (red)
		this.healthBar.fillStyle(0xff0000)
		this.healthBar.fillRect(x, y, width, height)

		// Health (green)
		const healthPercent = Math.max(0, this.hp / this.maxHp)
		this.healthBar.fillStyle(0x00ff00)
		this.healthBar.fillRect(x, y, width * healthPercent, height)
	}

	applySlow(durationMs: number, slowFactor: number = 0.5): void {
		this.slowTimer = 0
		this.slowDuration = durationMs
		this.isSlowed = true
		this.speed = this.baseSpeed * slowFactor
		this.sprite.setTint(0x00aaff) // Blue tint for slowed enemies
	}

	removeSlow(): void {
		this.isSlowed = false
		this.speed = this.baseSpeed
		this.slowTimer = 0
		this.slowDuration = 0
		this.sprite.clearTint() // Remove blue tint
	}

	isDead(): boolean {
		return this.hp <= 0
	}

	destroy(): void {
		this.sprite.destroy()
		this.healthBar.destroy()
	}

    static spawn(scene: Phaser.Scene, wave: number): Enemy {
        const hp = 30 + wave * 10
        const speed = 70 + wave * 3

        const gameScene = scene as GameScene
        const start = gameScene.pathPoints[0]
        if (!start) throw new Error("No path points found")

        return new this(scene, start.x, start.y, hp, speed)
    }
} 
