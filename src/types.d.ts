// Type declarations for browser APIs
interface Window {
	AudioContext: typeof AudioContext
	webkitAudioContext?: typeof AudioContext
	audioCtx?: AudioContext
}

interface PhaserSound {
	context?: AudioContext
}

declare module 'phaser' {
	namespace Scene {
		interface Scene {
			sound: PhaserSound
		}
	}
}

// Game Mode Types
export type GameMode = 'quick-defense' | 'campaign'

// Campaign Progression Types
export interface CampaignPoints {
    points: number
    totalEarned: number
}
