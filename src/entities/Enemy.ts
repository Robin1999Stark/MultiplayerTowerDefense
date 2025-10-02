import Phaser from 'phaser'

export class Enemy {
	public sprite: Phaser.Physics.Arcade.Sprite
	public hp: number
	public speed: number
	public reachedEnd = false
	private pathIndex = 0

	constructor(scene: Phaser.Scene, x: number, y: number, hp: number, speed: number, textureKey: string = 'enemy', radius: number = 16) {
		this.sprite = scene.physics.add.sprite(x, y, textureKey)
		this.sprite.setCircle(radius, 16 - radius, 16 - radius)
		this.sprite.setDepth(1)
		this.hp = hp
		this.speed = speed
	}

	update(deltaMs: number, path: Phaser.Math.Vector2[]): void {
		if (this.reachedEnd) return
		const dt = deltaMs / 1000
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
			return
		}
		dir.normalize()
		this.sprite.setVelocity(dir.x * this.speed, dir.y * this.speed)
	}

	takeDamage(amount: number): void {
		this.hp -= amount
	}

	isDead(): boolean {
		return this.hp <= 0
	}

	destroy(): void {
		this.sprite.destroy()
	}
} 