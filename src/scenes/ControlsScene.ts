import Phaser from 'phaser'

export class ControlsScene extends Phaser.Scene {
	static KEY = 'ControlsScene'

	constructor() {
		super(ControlsScene.KEY)
	}

	create(): void {
		const centerX = this.scale.width / 2
		const centerY = this.scale.height / 2

		// Background
		this.cameras.main.setBackgroundColor('#0b1020')

		// Title
		const title = this.add.text(centerX, 80, 'CONTROLS', {
			fontSize: '48px',
			color: '#00d4ff',
			fontFamily: 'Arial, sans-serif',
			fontStyle: 'bold',
			resolution: 2
		})
		title.setOrigin(0.5)
		title.setStroke('#001a33', 6)

		// Controls list
		const controlsY = 150
		const controls = [
			{ key: 'M', description: 'Toggle mute' },
			{ key: '+', description: 'Zoom in' },
			{ key: '-', description: 'Zoom out' },
			{ key: ',', description: 'Previous music track' },
			{ key: '.', description: 'Next music track' },
			{ key: 'Arrow Keys', description: 'Move camera' },
			{ key: '1-6', description: 'Select tower types' },
			{ key: 'A', description: 'Use Area Damage' },
			{ key: 'G', description: 'Use Gold Rush' },
			{ key: 'S', description: 'Use Slow' },
			{ key: 'ESC', description: 'Cancel tower placement' }
		]

		controls.forEach((control, index) => {
			// Key label
			const keyText = this.add.text(centerX - 200, controlsY + index * 40, control.key, {
				fontSize: '20px',
				color: '#ffd700',
				fontFamily: 'Arial, sans-serif',
				fontStyle: 'bold',
				resolution: 2
			})
			keyText.setOrigin(0, 0.5)

			// Description
			const descText = this.add.text(centerX - 50, controlsY + index * 40, control.description, {
				fontSize: '18px',
				color: '#cccccc',
				fontFamily: 'Arial, sans-serif',
				resolution: 2
			})
			descText.setOrigin(0, 0.5)
		})

		// Back button
		const buttonY = centerY + 250
		const buttonWidth = 200
		const buttonHeight = 50

		// Button background
		const buttonBg = this.add.rectangle(centerX, buttonY, buttonWidth, buttonHeight, 0x00d4ff, 0.2)
		buttonBg.setStrokeStyle(2, 0x00d4ff)
		buttonBg.setInteractive({ useHandCursor: true })

		// Button text
		const buttonText = this.add.text(centerX, buttonY, 'BACK', {
			fontSize: '24px',
			color: '#00d4ff',
			fontFamily: 'Arial, sans-serif',
			fontStyle: 'bold',
			resolution: 2
		})
		buttonText.setOrigin(0.5)

		// Button hover effects
		buttonBg.on('pointerover', () => {
			buttonBg.setFillStyle(0x00d4ff, 0.4)
			buttonText.setColor('#ffffff')
			this.tweens.add({
				targets: [buttonBg, buttonText],
				scale: 1.05,
				duration: 200,
				ease: 'Power2'
			})
		})

		buttonBg.on('pointerout', () => {
			buttonBg.setFillStyle(0x00d4ff, 0.2)
			buttonText.setColor('#00d4ff')
			this.tweens.add({
				targets: [buttonBg, buttonText],
				scale: 1,
				duration: 200,
				ease: 'Power2'
			})
		})

		// Go back to start scene on click
		buttonBg.on('pointerdown', () => {
			this.goToStartScene()
		})

		// Also allow pressing ESC to go back
		this.input.keyboard?.on('keydown-ESC', () => {
			this.goToStartScene()
		})
	}

	private goToStartScene(): void {
		// Fade out effect
		this.cameras.main.fadeOut(500, 0, 0, 0)

		this.cameras.main.once('camerafadeoutcomplete', () => {
			// Stop this scene and start the start scene
			this.scene.stop()
			this.scene.start('StartScene')
		})
	}
}