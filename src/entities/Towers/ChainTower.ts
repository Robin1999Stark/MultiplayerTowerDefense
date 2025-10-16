import Phaser from 'phaser'
import { Enemy } from '../Enemy'
import { Tower } from './Tower'
import { TowerType } from "../../services/TowerStore";

export class ChainTower extends Tower {

    protected override timeSinceShot = 0
    private chainReactions = 3
    private bulletEffect?: Phaser.GameObjects.Graphics

    constructor(scene: Phaser.Scene, x: number, y: number, type: TowerType) {
        super(scene, x, y, type)
        
        this.sprite.destroy()

        this.sprite = scene.add.sprite(x, y, 'tower_rapid_fire')
        this.sprite.setDepth(2)
        this.sprite.setScale(0.1)
        
        this.bulletEffect = scene.add.graphics()
        this.bulletEffect.setDepth(3)
    }

    override update(deltaMs: number, enemies: Enemy[]): void {
        // Don't call super.update() as we want our own chain behavior
        
        this.timeSinceShot += deltaMs
        if (this.timeSinceShot < this.fireRateMs) return
        
        const target = this.findClosestTarget(enemies)
        if (!target) return
        
        this.timeSinceShot = 0
        this.fireChainProjectile(target, enemies, this.chainReactions)
    }

    private findClosestTarget(enemies: Enemy[]): Enemy | undefined {
        let closest: Enemy | undefined
        let closestDist = Number.POSITIVE_INFINITY
        
        for (const enemy of enemies) {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x, 
                this.sprite.y, 
                enemy.sprite.x, 
                enemy.sprite.y
            )
            
            if (distance <= this.range && distance < closestDist) {
                closestDist = distance
                closest = enemy
            }
        }
        
        return closest
    }

    private fireChainProjectile(target: Enemy, enemies: Enemy[], reactionsLeft: number): void {
        if (reactionsLeft <= 0) return
        
        const scene = this.sprite.scene
        
        const bullet = scene.add.sprite(this.sprite.x, this.sprite.y, 'bullet')
        bullet.setTint(0x9966ff)
        bullet.setDepth(3)
        
        const distance = Phaser.Math.Distance.Between(
            this.sprite.x, this.sprite.y, target.sprite.x, target.sprite.y
        )
        const duration = Math.max(120, Math.min(400, distance * 4))
        
        this.playChainSound()
        
        scene.tweens.add({
            targets: bullet,
            x: target.sprite.x,
            y: target.sprite.y,
            duration,
            onComplete: () => {
                target.takeDamage(this.damage)
                
                this.showChainEffect(bullet.x, bullet.y)
                
                bullet.destroy()
                
                if (reactionsLeft > 1) {
                    const remainingEnemies = enemies.filter(e => e !== target)
                    const nextTarget = this.findNextChainTarget(target, remainingEnemies)
                    
                    if (nextTarget) {
                        scene.time.delayedCall(100, () => {
                            this.chainToNextTarget(target, nextTarget, enemies, reactionsLeft - 1)
                        })
                    }
                }
            }
        })
    }
    
    private findNextChainTarget(currentTarget: Enemy, enemies: Enemy[]): Enemy | undefined {
        let closest: Enemy | undefined
        let closestDist = Number.POSITIVE_INFINITY
        
        for (const enemy of enemies) {
            const distance = Phaser.Math.Distance.Between(
                currentTarget.sprite.x, 
                currentTarget.sprite.y, 
                enemy.sprite.x, 
                enemy.sprite.y
            )
            
            if (distance <= this.range && distance < closestDist) {
                closestDist = distance
                closest = enemy
            }
        }
        
        return closest
    }
    
    private chainToNextTarget(sourceTarget: Enemy, nextTarget: Enemy, enemies: Enemy[], reactionsLeft: number): void {
        const scene = this.sprite.scene
        
        // Create a chain lightning effect between targets
        const lightning = scene.add.graphics()
        lightning.setDepth(3)
        
        // Draw lightning effect
        lightning.lineStyle(2, 0x9966ff, 0.8)
        lightning.beginPath()
        lightning.moveTo(sourceTarget.sprite.x, sourceTarget.sprite.y)
        
        // Create a jagged lightning path
        const midX = (sourceTarget.sprite.x + nextTarget.sprite.x) / 2
        const midY = (sourceTarget.sprite.y + nextTarget.sprite.y) / 2
        const offsetX = (Math.random() - 0.5) * 40
        const offsetY = (Math.random() - 0.5) * 40
        
        lightning.lineTo(midX + offsetX, midY + offsetY)
        lightning.lineTo(nextTarget.sprite.x, nextTarget.sprite.y)
        lightning.strokePath()
        
        this.playChainSound(0.7)
        
        nextTarget.takeDamage(this.damage)
        
        this.showChainEffect(nextTarget.sprite.x, nextTarget.sprite.y)
        
        scene.tweens.add({
            targets: lightning,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                lightning.destroy()
                
                if (reactionsLeft > 1) {
                    const remainingEnemies = enemies.filter(e => e !== nextTarget && e !== sourceTarget)
                    const nextChainTarget = this.findNextChainTarget(nextTarget, remainingEnemies)
                    
                    if (nextChainTarget) {
                        scene.time.delayedCall(100, () => {
                            this.chainToNextTarget(nextTarget, nextChainTarget, enemies, reactionsLeft - 1)
                        })
                    }
                }
            }
        })
    }
    
    private showChainEffect(x: number, y: number): void {
        const scene = this.sprite.scene
        
        const explosion = scene.add.graphics()
        explosion.setDepth(3)
        
        explosion.fillStyle(0x9966ff, 0.7)
        explosion.fillCircle(x, y, 20)
        
        scene.tweens.add({
            targets: explosion,
            alpha: 0,
            scale: 1.5,
            duration: 300,
            onComplete: () => {
                explosion.destroy()
            }
        })
    }

    private playChainSound(volume: number = 1.0): void {
        const scene = this.sprite.scene
        const sm = scene.sound as Phaser.Sound.WebAudioSoundManager
        const ctx: AudioContext | undefined = sm?.context || (window as Window & { audioCtx?: AudioContext }).audioCtx
        let audioCtx = ctx
        if (!audioCtx) {
            try {
                const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
                if (!AudioContextClass) return
                audioCtx = new AudioContextClass()
                ;(window as Window & { audioCtx?: AudioContext }).audioCtx = audioCtx
            } catch {
                return
            }
        }
        
        const durationSec = 0.2
        
        // Create oscillator for a electric zap sound
        const oscillator = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()
        
        oscillator.type = 'sawtooth'
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + durationSec)
        
        gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.1 * volume, audioCtx.currentTime + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durationSec)
        
        oscillator.connect(gainNode)
        gainNode.connect(audioCtx.destination)
        
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + durationSec)
        
        oscillator.onended = () => {
            try { 
                oscillator.disconnect(); 
                gainNode.disconnect() 
            } catch (error) {
                console.error('Error disconnecting audio nodes:', error)
            }
        }
    }
}