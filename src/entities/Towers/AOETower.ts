import Phaser from 'phaser'
import { OrcGrunt } from '../Units/OrcGrunt'
import { Tower } from './Tower'
import { TowerType } from "../../services/TowerStore";

export class AOETower extends Tower {

    private timeSinceAOE = 0
    private aoeEffect?: Phaser.GameObjects.Graphics

    constructor(scene: Phaser.Scene, x: number, y: number, type: TowerType) {
        // Call parent constructor but we'll override the sprite
        super(scene, x, y, type)
        // Replace the sprite with the common tower1 texture
        this.sprite.destroy()
        this.sprite = scene.add.sprite(x, y, this.getBrauseTexture('tower_explosive'))
        this.sprite.setDepth(2)
        this.sprite.setScale(0.1)

        // Create a graphics object for the AOE effect (initially invisible)
        this.aoeEffect = scene.add.graphics()
        this.aoeEffect.setDepth(1) // Below enemies but above the path
    }

    public override update(deltaMs: number, enemies: OrcGrunt[]): void {
        // Don't call super.update() as we don't want the default shooting behavior

        this.timeSinceAOE += deltaMs
        if (this.timeSinceAOE < this.fireRateMs) return

        // Only trigger AOE if there are enemies in range
        const enemiesInRange = this.findEnemiesInRange(enemies)
        if (enemiesInRange.length === 0) return

        this.timeSinceAOE = 0
        this.triggerAOE(enemiesInRange)
    }

    private findEnemiesInRange(enemies: OrcGrunt[]): OrcGrunt[] {
        const inRange: OrcGrunt[] = []
        for (const enemy of enemies) {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x, 
                this.sprite.y, 
                enemy.sprite.x, 
                enemy.sprite.y
            )
            if (distance <= this.range) {
                inRange.push(enemy)
            }
        }
        return inRange
    }

    private triggerAOE(enemies: OrcGrunt[]): void {
        // Apply damage to all enemies in range
        for (const enemy of enemies) {
            enemy.takeDamage(this.damage)
        }

        // Visual effect for the AOE attack
        this.showAOEEffect()

        // Play a sound effect
        this.playAOESound()
    }

    private showAOEEffect(): void {
        if (!this.aoeEffect) return

        // Clear previous graphics
        this.aoeEffect.clear()

        // Draw the AOE circle
        this.aoeEffect.fillStyle(0x00ffff, 0.3) // Cyan with transparency
        this.aoeEffect.fillCircle(this.sprite.x, this.sprite.y, this.range)

        // Add a stroke
        this.aoeEffect.lineStyle(2, 0x00ffff, 0.8)
        this.aoeEffect.strokeCircle(this.sprite.x, this.sprite.y, this.range)

        // Animate the effect fading out
        const scene = this.sprite.scene
        scene.tweens.add({
            targets: this.aoeEffect,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                if (this.aoeEffect) {
                    this.aoeEffect.clear()
                    this.aoeEffect.alpha = 1
                }
            }
        })
    }

    private playAOESound(): void {
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

        const durationSec = 0.3

        // Create oscillator for a "whoosh" sound
        const oscillator = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()

        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + durationSec)

        gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.05)
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
