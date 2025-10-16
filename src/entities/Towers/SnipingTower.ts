import Phaser from 'phaser'
import { Enemy } from '../Enemy'
import { Tower } from './Tower'

export class SnipingTower extends Tower {
    private snipingRange = 2000
    private snipingDamage = 800
    private snipingRateMs = 800
    private timeSinceSnipe = 0
    private readonly laserEffect?: Phaser.GameObjects.Graphics

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y)
        
        this.sprite.destroy()
        this.sprite = scene.add.sprite(x, y, 'sniping-tower')
        this.sprite.setDepth(2)
        
        this.laserEffect = scene.add.graphics()
        this.laserEffect.setDepth(3)
    }

    override update(deltaMs: number, enemies: Enemy[]): void {
        // Don't call super.update() as we want our own sniping behavior
        
        this.timeSinceSnipe += deltaMs
        if (this.timeSinceSnipe < this.snipingRateMs) return
        
        const target = this.findFarthestTarget(enemies)
        if (!target) return
        
        this.timeSinceSnipe = 0
        this.snipe(target)
    }

    private findFarthestTarget(enemies: Enemy[]): Enemy | undefined {
        let farthest: Enemy | undefined
        let farthestDist = 0
        
        for (const enemy of enemies) {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x, 
                this.sprite.y, 
                enemy.sprite.x, 
                enemy.sprite.y
            )
            
            if (distance <= this.snipingRange && distance > farthestDist) {
                farthestDist = distance
                farthest = enemy
            }
        }
        
        return farthest
    }

    private snipe(target: Enemy): void {
        target.takeDamage(this.snipingDamage)
        
        this.showLaserEffect(target)
        
        this.playSnipeSound()
    }

    private showLaserEffect(target: Enemy): void {
        if (!this.laserEffect) return
        
        this.laserEffect.clear()
        
        this.laserEffect.lineStyle(2, 0xff0000, 0.8)
        this.laserEffect.beginPath()
        this.laserEffect.moveTo(this.sprite.x, this.sprite.y)
        this.laserEffect.lineTo(target.sprite.x, target.sprite.y)
        this.laserEffect.closePath()
        this.laserEffect.strokePath()
        
        this.laserEffect.fillStyle(0xff0000, 0.6)
        this.laserEffect.fillCircle(target.sprite.x, target.sprite.y, 15)
        
        const scene = this.sprite.scene
        scene.tweens.add({
            targets: this.laserEffect,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                if (this.laserEffect) {
                    this.laserEffect.clear()
                    this.laserEffect.alpha = 1
                }
            }
        })
    }

    private playSnipeSound(): void {
        const scene = this.sprite.scene
        const sm: any = (scene as any).sound
        const ctx: AudioContext | undefined = sm && sm.context ? sm.context as AudioContext : (window as any).audioCtx || undefined
        let audioCtx = ctx
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
                ;(window as any).audioCtx = audioCtx
            } catch {
                return
            }
        }
        
        const durationSec = 0.15
        
        const oscillator = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()
        
        oscillator.type = 'sawtooth'
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + durationSec)
        
        gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.1, audioCtx.currentTime + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durationSec)
        
        oscillator.connect(gainNode)
        gainNode.connect(audioCtx.destination)
        
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + durationSec)
        
        oscillator.onended = () => {
            try { oscillator.disconnect(); gainNode.disconnect() } catch {}
        }
    }
}