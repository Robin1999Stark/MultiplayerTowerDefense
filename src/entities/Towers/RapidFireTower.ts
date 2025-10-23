import Phaser from 'phaser'
import { OrcGrunt } from '../Units/OrcGrunt'
import { Tower } from './Tower'
import { TowerType } from "../../services/TowerStore";

export class RapidFireTower extends Tower {

    protected override timeSinceShot = 0
    private readonly bulletEffect?: Phaser.GameObjects.Graphics

    constructor(scene: Phaser.Scene, x: number, y: number, type: TowerType) {
        super(scene, x, y, type)
        
        this.sprite.destroy()
        this.sprite = scene.add.sprite(x, y, 'tower_rapid')
        this.sprite.setDepth(2)
        this.sprite.setScale(0.1)
        
        this.bulletEffect = scene.add.graphics()
        this.bulletEffect.setDepth(3)
    }

    public override update(deltaMs: number, enemies: OrcGrunt[]): void {
        // Don't call super.update() as we want our own rapid fire behavior

        this.timeSinceShot += deltaMs
        if (this.timeSinceShot < this.fireRateMs) return
        
        const target = this.findClosestTarget(enemies)
        if (!target) return
        
        this.timeSinceShot = 0
        this.rapidFire(target)
    }

    private findClosestTarget(enemies: OrcGrunt[]): OrcGrunt | undefined {
        let closest: OrcGrunt | undefined
        let closestDist = Number.POSITIVE_INFINITY
        
        for (const enemy of enemies) {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x, 
                this.sprite.y, 
                enemy.sprite.x, 
                enemy.sprite.y
            )
            
            // Only consider enemies within the rapid fire range
            if (distance <= this.range && distance < closestDist) {
                closestDist = distance
                closest = enemy
            }
        }
        
        return closest
    }

    private rapidFire(target: OrcGrunt): void {
        target.takeDamage(this.damage)
        
        this.showBulletEffect(target)
        
        this.playRapidFireSound()
    }

    private showBulletEffect(target: OrcGrunt): void {
        if (!this.bulletEffect) return
        
        this.bulletEffect.clear()
        
        this.bulletEffect.lineStyle(1, 0xffff00, 0.7) // Yellow trail
        this.bulletEffect.beginPath()
        this.bulletEffect.moveTo(this.sprite.x, this.sprite.y)
        this.bulletEffect.lineTo(target.sprite.x, target.sprite.y)
        this.bulletEffect.closePath()
        this.bulletEffect.strokePath()
        
        this.bulletEffect.fillStyle(0xffff00, 0.5)
        this.bulletEffect.fillCircle(target.sprite.x, target.sprite.y, 5)
        
        const scene = this.sprite.scene
        scene.tweens.add({
            targets: this.bulletEffect,
            alpha: 0,
            duration: 50,
            onComplete: () => {
                if (this.bulletEffect) {
                    this.bulletEffect.clear()
                    this.bulletEffect.alpha = 1
                }
            }
        })
    }

    private playRapidFireSound(): void {
        // If audio is muted, don't play the sound
        if (this.audioManager.isMuted()) return
        
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
        
        const durationSec = 0.05
        
        const oscillator = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()
        
        oscillator.type = 'triangle'
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + durationSec)
        
        gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.05, audioCtx.currentTime + 0.01) // Lower volume due to frequency
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