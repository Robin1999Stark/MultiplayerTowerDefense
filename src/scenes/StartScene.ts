import Phaser from 'phaser'
import { AudioManager } from '../services/AudioManager'
import { GameConfigService } from '../services/GameConfigService'

export class StartScene extends Phaser.Scene {
	static KEY = 'StartScene'
	private audioContext?: AudioContext
	private musicNodes: AudioNode[] = []
	private musicGain?: GainNode
	private audioManager: AudioManager
	private gameConfigService: GameConfigService
	private keyBuffer: string = ''
	private readonly brauseCode: string = 'brause'

	constructor() {
		super(StartScene.KEY)
		this.audioManager = AudioManager.getInstance()
		this.gameConfigService = GameConfigService.getInstance()
	}

	create(): void {
		const centerX = this.scale.width / 2
		const centerY = this.scale.height / 2

		// Background
		this.cameras.main.setBackgroundColor('#0b1020')

		// Add 'M' key listener to toggle mute
		this.input.keyboard?.on('keydown-M', () => {
			this.audioManager.toggleMute()
		})

		// Add keyboard listener for "brause" code
		this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
			// Only track alphabetic characters
			if (/^[a-z]$/i.test(event.key)) {
				// Add the key to the buffer
				this.keyBuffer += event.key.toLowerCase()

				// Keep only the last 6 characters (length of "brause")
				if (this.keyBuffer.length > this.brauseCode.length) {
					this.keyBuffer = this.keyBuffer.substring(this.keyBuffer.length - this.brauseCode.length)
				}

				// Check if the buffer matches the code
				this.checkBrauseCode()
			}
		})

		// Start epic music after a brief delay to ensure audio context is ready
		this.time.delayedCall(100, () => {
			this.startEpicMusic()
		})

		// Also resume audio on any click (for browsers that block autoplay)
		this.input.once('pointerdown', () => {
			const ctx = this.getAudioContext()
			if (ctx && ctx.state === 'suspended') {
				ctx.resume().then(() => {
					console.log('Audio context resumed')
					// Restart music if it wasn't playing
					if (this.musicNodes.length === 0) {
						this.startEpicMusic()
					}
				})
			}
		})

		// Animated background particles
		this.createBackgroundParticles()

		// Game title
		const title = this.add.text(centerX, centerY - 140, 'TOWER DEFENSE', {
			fontSize: '72px',
			color: '#00d4ff',
			fontFamily: 'Arial, sans-serif',
			fontStyle: 'bold',
			resolution: 2
		})
		title.setOrigin(0.5)
		title.setStroke('#001a33', 6)

		// Subtitle
		const subtitle = this.add.text(centerX, centerY - 90, 'Multiplayer coming soonish :) ', {
			fontSize: '24px',
			color: '#88ccff',
			fontFamily: 'Arial, sans-serif',
			fontStyle: 'italic',
			resolution: 2
		})
		subtitle.setOrigin(0.5)

		// Instructions container
		const instructionsY = centerY - 50
		const instructions = [
			'HOW TO PLAY:',
			'',
			'• Use keyboard shortcuts to select towers',
			'• Click on the map to place towers',
			'• Defend your base from waves of enemies',
			'• Earn gold by defeating enemies',
			'',
			'TIP: Towers cannot be placed on the path!',
		]

		instructions.forEach((line, index) => {
			const isHeader = index === 0
			const text = this.add.text(centerX, instructionsY + index * 24, line, {
				fontSize: isHeader ? '20px' : '16px',
				color: isHeader ? '#ffd700' : '#cccccc',
				fontFamily: 'Arial, sans-serif',
				fontStyle: isHeader ? 'bold' : 'normal',
				resolution: 2
			})
			text.setOrigin(0.5)
			text.setAlpha(0)

			// Fade in animation
			this.tweens.add({
				targets: text,
				alpha: 1,
				duration: 300,
				delay: 500 + index * 50
			})
		})

		// Start button
		const startButtonY = centerY + 180
		const buttonWidth = 200
		const buttonHeight = 50

		// Start button background
		const startButtonBg = this.add.rectangle(centerX, startButtonY, buttonWidth, buttonHeight, 0x00d4ff, 0.2)
		startButtonBg.setStrokeStyle(2, 0x00d4ff)
		startButtonBg.setInteractive({ useHandCursor: true })

		// Start button text
		const startButtonText = this.add.text(centerX, startButtonY, 'START GAME', {
			fontSize: '24px',
			color: '#00d4ff',
			fontFamily: 'Arial, sans-serif',
			fontStyle: 'bold',
			resolution: 2
		})
		startButtonText.setOrigin(0.5)

		// Controls button
		const controlsButtonY = centerY + 250

		// Controls button background
		const controlsButtonBg = this.add.rectangle(centerX, controlsButtonY, buttonWidth, buttonHeight, 0x00d4ff, 0.2)
		controlsButtonBg.setStrokeStyle(2, 0x00d4ff)
		controlsButtonBg.setInteractive({ useHandCursor: true })

		// Controls button text
		const controlsButtonText = this.add.text(centerX, controlsButtonY, 'CONTROLS', {
			fontSize: '24px',
			color: '#00d4ff',
			fontFamily: 'Arial, sans-serif',
			fontStyle: 'bold',
			resolution: 2
		})
		controlsButtonText.setOrigin(0.5)

		// Button hover effects for start button
		startButtonBg.on('pointerover', () => {
			startButtonBg.setFillStyle(0x00d4ff, 0.4)
			startButtonText.setColor('#ffffff')
			this.tweens.add({
				targets: [startButtonBg, startButtonText],
				scale: 1.05,
				duration: 200,
				ease: 'Power2'
			})
		})

		startButtonBg.on('pointerout', () => {
			startButtonBg.setFillStyle(0x00d4ff, 0.2)
			startButtonText.setColor('#00d4ff')
			this.tweens.add({
				targets: [startButtonBg, startButtonText],
				scale: 1,
				duration: 200,
				ease: 'Power2'
			})
		})

		// Button hover effects for controls button
		controlsButtonBg.on('pointerover', () => {
			controlsButtonBg.setFillStyle(0x00d4ff, 0.4)
			controlsButtonText.setColor('#ffffff')
			this.tweens.add({
				targets: [controlsButtonBg, controlsButtonText],
				scale: 1.05,
				duration: 200,
				ease: 'Power2'
			})
		})

		controlsButtonBg.on('pointerout', () => {
			controlsButtonBg.setFillStyle(0x00d4ff, 0.2)
			controlsButtonText.setColor('#00d4ff')
			this.tweens.add({
				targets: [controlsButtonBg, controlsButtonText],
				scale: 1,
				duration: 200,
				ease: 'Power2'
			})
		})

		// Start game on click
		startButtonBg.on('pointerdown', () => {
			this.startGame()
		})

		// Go to controls scene on click
		controlsButtonBg.on('pointerdown', () => {
			this.goToControlsScene()
		})

		// Also allow pressing SPACE or ENTER to start
		this.input.keyboard?.on('keydown-SPACE', () => {
			this.startGame()
		})
		this.input.keyboard?.on('keydown-ENTER', () => {
			this.startGame()
		})

		// Pulsing "Press SPACE" hint
		const spaceHint = this.add.text(centerX, startButtonY + 120, 'Press SPACE or ENTER to start', {
			fontSize: '16px',
			color: '#666666',
			fontFamily: 'Arial, sans-serif',
			resolution: 2
		})
		spaceHint.setOrigin(0.5)
		this.tweens.add({
			targets: spaceHint,
			alpha: 0.3,
			duration: 1000,
			yoyo: true,
			repeat: -1,
			ease: 'Sine.easeInOut'
		})

		// Entrance animation for title
		title.setScale(0)
		this.tweens.add({
			targets: title,
			scale: 1,
			duration: 600,
			ease: 'Back.easeOut'
		})

		// Entrance animation for subtitle
		subtitle.setAlpha(0)
		this.tweens.add({
			targets: subtitle,
			alpha: 1,
			duration: 400,
			delay: 300
		})

		// Entrance animation for start button (from below)
		startButtonBg.setY(startButtonY + 100)
		startButtonBg.setAlpha(0)
		startButtonText.setY(startButtonY + 100)
		startButtonText.setAlpha(0)

		this.tweens.add({
			targets: [startButtonBg, startButtonText],
			y: startButtonY,
			alpha: 1,
			duration: 600,
			delay: 1000,
			ease: 'Back.easeOut'
		})

		// Entrance animation for controls button (from below)
		controlsButtonBg.setY(controlsButtonY + 100)
		controlsButtonBg.setAlpha(0)
		controlsButtonText.setY(controlsButtonY + 100)
		controlsButtonText.setAlpha(0)

		this.tweens.add({
			targets: [controlsButtonBg, controlsButtonText],
			y: controlsButtonY,
			alpha: 1,
			duration: 600,
			delay: 1200, // Slightly longer delay for sequential animation
			ease: 'Back.easeOut'
		})
	}

	private createBackgroundParticles(): void {
		// Create some subtle animated background elements
		const particleCount = 30
		for (let i = 0; i < particleCount; i++) {
			const x = Phaser.Math.Between(0, this.scale.width)
			const y = Phaser.Math.Between(0, this.scale.height)
			const size = Phaser.Math.Between(1, 3)

			const particle = this.add.circle(x, y, size, 0x00d4ff, 0.3)

			// Floating animation
			this.tweens.add({
				targets: particle,
				y: y + Phaser.Math.Between(-30, 30),
				alpha: Phaser.Math.FloatBetween(0.1, 0.5),
				duration: Phaser.Math.Between(2000, 4000),
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
				delay: Phaser.Math.Between(0, 2000)
			})
		}
	}

	private startGame(): void {
		// Play funny start sound!
		this.playStartSound()

		// Fade out music
		if (this.musicGain && this.audioContext) {
			this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, this.audioContext.currentTime)
			this.musicGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5)
		}

		// Fade out effect
		this.cameras.main.fadeOut(500, 0, 0, 0)

		this.cameras.main.once('camerafadeoutcomplete', () => {
			// Stop the StartScene music
			this.stopMusic()

			// Stop this scene and start the game scenes
			this.scene.stop()
			this.scene.launch('GameScene')
			this.scene.launch('UIScene')
			this.scene.launch('StatisticsScene')
		})
	}

	private playStartSound(): void {
		// Don't play sound if muted
		if (this.audioManager.isMuted()) return

		const ctx = this.audioContext || this.getAudioContext()
		if (!ctx) return

		// Funny ascending "let's go!" sound
		const duration = 0.3
		const startTime = ctx.currentTime

		// Main ascending tone (playful whoosh up)
		const osc1 = ctx.createOscillator()
		osc1.type = 'square'
		osc1.frequency.setValueAtTime(400, startTime)
		osc1.frequency.exponentialRampToValueAtTime(1200, startTime + duration)

		const gain1 = ctx.createGain()
		gain1.gain.setValueAtTime(0.15, startTime)
		gain1.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

		osc1.connect(gain1)
		gain1.connect(ctx.destination)
		osc1.start(startTime)
		osc1.stop(startTime + duration)

		// Second voice (harmony)
		const osc2 = ctx.createOscillator()
		osc2.type = 'triangle'
		osc2.frequency.setValueAtTime(500, startTime + 0.05)
		osc2.frequency.exponentialRampToValueAtTime(1400, startTime + duration)

		const gain2 = ctx.createGain()
		gain2.gain.setValueAtTime(0.1, startTime + 0.05)
		gain2.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

		osc2.connect(gain2)
		gain2.connect(ctx.destination)
		osc2.start(startTime + 0.05)
		osc2.stop(startTime + duration + 0.05)

		// Silly "pop" at the end
		const pop = ctx.createOscillator()
		pop.type = 'sine'
		pop.frequency.setValueAtTime(800, startTime + duration)
		pop.frequency.exponentialRampToValueAtTime(200, startTime + duration + 0.1)

		const popGain = ctx.createGain()
		popGain.gain.setValueAtTime(0.12, startTime + duration)
		popGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration + 0.1)

		pop.connect(popGain)
		popGain.connect(ctx.destination)
		pop.start(startTime + duration)
		pop.stop(startTime + duration + 0.15)
	}

	private getAudioContext(): AudioContext | null {
		const phaserSound = this.sound as { context?: AudioContext }
		const existingCtx = phaserSound?.context || (window as any).audioCtx

		if (existingCtx) return existingCtx

		try {
			const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext
			if (!AudioContextClass) return null

			const newCtx = new AudioContextClass()
			;(window as any).audioCtx = newCtx
			return newCtx
		} catch (error) {
			return null
		}
	}

	private startEpicMusic(): void {
		const ctx = this.getAudioContext()
		if (!ctx) {
			console.log('No audio context available')
			return
		}

		// Resume context if suspended
		if (ctx.state === 'suspended') {
			ctx.resume()
		}

		this.audioContext = ctx

		// Don't create duplicate music if already playing
		if (this.musicGain) {
			return
		}

		this.musicGain = ctx.createGain()
		// Set initial gain based on mute state
		const initialGain = this.audioManager.isMuted() ? 0 : 0.3
		this.musicGain.gain.setValueAtTime(initialGain, ctx.currentTime)
		this.musicGain.connect(ctx.destination)

		console.log('Starting music, audio context state:', ctx.state)

		// Silly bouncy chord progression in C major (happy key!)
		const progression = [
			[261.63, 329.63, 392.00], // C major (C, E, G)
			[392.00, 493.88, 587.33], // G major (G, B, D)
			[220.00, 277.18, 329.63], // A minor (A, C, E)
			[349.23, 440.00, 523.25]  // F major (F, A, C)
		]

		const chordDuration = 1.5 // Fast, bouncy tempo!
		const loopDuration = 6 // Total loop length in seconds

		// Play progression in a loop
		const playLoop = () => {
			if (!this.scene.isActive()) return

			const startTime = ctx.currentTime

			progression.forEach((chord, chordIndex) => {
				const chordStartTime = startTime + chordIndex * chordDuration

				// Bouncy bass (short and punchy)
				const bass = ctx.createOscillator()
				bass.type = 'square' // Square wave for retro video game sound
				bass.frequency.setValueAtTime(chord[0]! / 2, chordStartTime)

				const bassGain = ctx.createGain()
				bassGain.gain.setValueAtTime(0.12, chordStartTime)
				bassGain.gain.exponentialRampToValueAtTime(0.001, chordStartTime + 0.15)

				bass.connect(bassGain)
				bassGain.connect(this.musicGain!)
				bass.start(chordStartTime)
				bass.stop(chordStartTime + 0.2)

				this.musicNodes.push(bass, bassGain)

				// Chord stabs (short and punchy like video game bleeps)
				chord.forEach((freq) => {
					const osc = ctx.createOscillator()
					osc.type = 'square'
					osc.frequency.setValueAtTime(freq, chordStartTime)

					const gain = ctx.createGain()
					gain.gain.setValueAtTime(0.03, chordStartTime)
					gain.gain.exponentialRampToValueAtTime(0.001, chordStartTime + 0.1)

					osc.connect(gain)
					gain.connect(this.musicGain!)
					osc.start(chordStartTime)
					osc.stop(chordStartTime + 0.12)

					this.musicNodes.push(osc, gain)
				})
			})

			// Silly bouncy melody (sounds like a cartoon!)
			const melodyNotes = [
				{ freq: 523.25, start: 0, duration: 0.2 },      // C5
				{ freq: 659.25, start: 0.3, duration: 0.2 },    // E5
				{ freq: 783.99, start: 0.6, duration: 0.3 },    // G5
				{ freq: 659.25, start: 1.0, duration: 0.2 },    // E5
				{ freq: 587.33, start: 1.5, duration: 0.2 },    // D5
				{ freq: 783.99, start: 1.8, duration: 0.2 },    // G5
				{ freq: 880.00, start: 2.1, duration: 0.3 },    // A5
				{ freq: 783.99, start: 2.5, duration: 0.2 },    // G5
				{ freq: 698.46, start: 3.0, duration: 0.2 },    // F5
				{ freq: 659.25, start: 3.3, duration: 0.2 },    // E5
				{ freq: 587.33, start: 3.6, duration: 0.2 },    // D5
				{ freq: 523.25, start: 3.9, duration: 0.3 },    // C5
				{ freq: 659.25, start: 4.5, duration: 0.15 },   // E5
				{ freq: 698.46, start: 4.7, duration: 0.15 },   // F5
				{ freq: 783.99, start: 4.9, duration: 0.6 }     // G5 (held)
			]

			melodyNotes.forEach(note => {
				const noteStartTime = startTime + note.start
				const osc = ctx.createOscillator()
				osc.type = 'triangle' // Softer for melody
				osc.frequency.setValueAtTime(note.freq, noteStartTime)

				const gain = ctx.createGain()
				gain.gain.setValueAtTime(0, noteStartTime)
				gain.gain.linearRampToValueAtTime(0.1, noteStartTime + 0.01)
				gain.gain.setValueAtTime(0.1, noteStartTime + note.duration - 0.05)
				gain.gain.linearRampToValueAtTime(0, noteStartTime + note.duration)

				osc.connect(gain)
				gain.connect(this.musicGain!)
				osc.start(noteStartTime)
				osc.stop(noteStartTime + note.duration)

				this.musicNodes.push(osc, gain)
			})

			// Add silly "boing" sound effects randomly
			const boingTimes = [2.0, 4.2, 5.4]
			boingTimes.forEach(boingTime => {
				const boingStart = startTime + boingTime
				const boing = ctx.createOscillator()
				boing.type = 'sine'
				boing.frequency.setValueAtTime(800, boingStart)
				boing.frequency.exponentialRampToValueAtTime(200, boingStart + 0.15)

				const boingGain = ctx.createGain()
				boingGain.gain.setValueAtTime(0.08, boingStart)
				boingGain.gain.exponentialRampToValueAtTime(0.001, boingStart + 0.15)

				boing.connect(boingGain)
				boingGain.connect(this.musicGain!)
				boing.start(boingStart)
				boing.stop(boingStart + 0.2)

				this.musicNodes.push(boing, boingGain)
			})

			// Schedule next loop iteration
			this.time.delayedCall(loopDuration * 1000, playLoop)
		}

		// Start the music immediately (from the beginning!)
		this.musicGain.gain.setValueAtTime(0, ctx.currentTime)
		this.musicGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.5)

		playLoop()
	}

	private stopMusic(): void {
		this.musicNodes.forEach(node => {
			try {
				if ('stop' in node && typeof node.stop === 'function') {
					node.stop()
				}
				node.disconnect()
			} catch (e) {
				// Ignore errors during cleanup
			}
		})
		this.musicNodes = []

		if (this.musicGain) {
			try {
				this.musicGain.disconnect()
			} catch (e) {
				// Ignore errors during cleanup
			}
		}
	}

	private goToControlsScene(): void {
		// Fade out effect
		this.cameras.main.fadeOut(500, 0, 0, 0)

		this.cameras.main.once('camerafadeoutcomplete', () => {
			// Stop this scene and start the controls scene
			this.scene.start('ControlsScene')
		})
	}

	/**
	 * Check if the key buffer matches the "brause" code and toggle brause mode if it does
	 */
	private checkBrauseCode(): void {
		if (this.keyBuffer === this.brauseCode) {
			// Toggle brause mode
			const isBrauseMode = this.gameConfigService.toggleBrauseMode()

			// Show feedback message
			const statusText = isBrauseMode ? 'BRAUSE MODE ACTIVATED!' : 'BRAUSE MODE DEACTIVATED!'
			const color = isBrauseMode ? '#ff00ff' : '#00ffff'

			const text = this.add.text(
				this.scale.width / 2,
				this.scale.height / 4,
				statusText,
				{
					fontFamily: 'Arial, sans-serif',
					fontSize: '32px',
					color: color,
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

			// Reset the key buffer
			this.keyBuffer = ''

			// Restart active game scenes to refresh textures
			this.restartActiveScenes()
		}
	}

	/**
	 * Restart active game scenes to refresh textures when brause mode changes
	 */
	private restartActiveScenes(): void {
		// Check if game scenes are active
		const gameSceneActive = this.scene.isActive('GameScene')
		const uiSceneActive = this.scene.isActive('UIScene')
		const statisticsSceneActive = this.scene.isActive('StatisticsScene')

		// If any game scene is active, restart all active scenes
		if (gameSceneActive || uiSceneActive || statisticsSceneActive) {
			// Stop all active scenes
			if (gameSceneActive) this.scene.stop('GameScene')
			if (uiSceneActive) this.scene.stop('UIScene')
			if (statisticsSceneActive) this.scene.stop('StatisticsScene')

			// Relaunch all previously active scenes
			if (gameSceneActive) this.scene.launch('GameScene')
			if (uiSceneActive) this.scene.launch('UIScene')
			if (statisticsSceneActive) this.scene.launch('StatisticsScene')
		}
	}
}
