/**
 * AudioManager - Singleton service to manage audio state across the game
 * 
 * This service maintains a global mute state that persists across all scenes.
 * It provides methods to toggle mute, check mute state, and set mute state directly.
 */
export class AudioManager {
    private static instance: AudioManager;
    private _isMuted: boolean = false;

    /**
     * Private constructor to enforce singleton pattern
     */
    private constructor() {
        // Explicitly set mute state to false to ensure music plays by default
        this._isMuted = false;
    }

    /**
     * Get the singleton instance of AudioManager
     */
    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    /**
     * Check if audio is currently muted
     */
    public isMuted(): boolean {
        return this._isMuted;
    }

    /**
     * Set the mute state directly
     */
    public setMuted(muted: boolean): void {
        this._isMuted = muted;
    }

    /**
     * Toggle the mute state
     * @returns The new mute state
     */
    public toggleMute(): boolean {
        this._isMuted = !this._isMuted;
        return this._isMuted;
    }
}