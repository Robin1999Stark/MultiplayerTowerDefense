/**
 * AudioManager - Singleton service to manage audio state across the game
 * 
 * This service maintains a global mute state that persists across all scenes.
 * It provides methods to toggle mute, check mute state, and set mute state directly.
 * It also manages background music playback, including track sequencing and navigation.
 */
export class AudioManager {
    private static instance: AudioManager;
    private _isMuted: boolean = false;

    // Music player properties
    private musicTracks: string[] = [
        'assets/sound/music/defenders_of_the_realm.mp3',
        'assets/sound/music/epic_quest.mp3',
        'assets/sound/music/pixel_paradise.mp3',
        'assets/sound/music/together_we_stand.mp3'
    ];
    private currentTrackIndex: number = 0;
    private audioElement: HTMLAudioElement | null = null;
    private isPlaying: boolean = false;

    /**
     * Private constructor to enforce singleton pattern
     */
    private constructor() {
        // Explicitly set mute state to false to ensure music plays by default
        this._isMuted = false;

        // Initialize the audio element
        this.initAudioElement();
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
     * Initialize the audio element for music playback
     */
    private initAudioElement(): void {
        this.audioElement = new Audio();

        // Set up event listeners
        this.audioElement.addEventListener('ended', () => {
            this.playNextTrack();
        });
    }

    /**
     * Start playing music tracks sequentially
     */
    public startMusic(): void {
        if (!this.audioElement) {
            this.initAudioElement();
        }

        if (this.audioElement && !this.isPlaying) {
            this.currentTrackIndex = 0;
            this.playCurrentTrack();
        }
    }

    /**
     * Play the current track
     */
    private playCurrentTrack(): void {
        if (!this.audioElement) return;

        const track = this.musicTracks[this.currentTrackIndex];
        if (!track) return;

        this.audioElement.src = track;
        this.audioElement.volume = this._isMuted ? 0 : 0.5;

        // Use the play() promise to handle autoplay restrictions
        const playPromise = this.audioElement.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.isPlaying = true;
                console.log(`Now playing: ${track}`);
            }).catch(error => {
                console.error('Playback prevented by browser:', error);
                // We'll need user interaction to play audio
                this.isPlaying = false;
            });
        }
    }

    /**
     * Play the next track in the playlist
     */
    public playNextTrack(): void {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.musicTracks.length;
        this.playCurrentTrack();
    }

    /**
     * Play the previous track in the playlist
     */
    public playPreviousTrack(): void {
        this.currentTrackIndex = (this.currentTrackIndex - 1 + this.musicTracks.length) % this.musicTracks.length;
        this.playCurrentTrack();
    }

    /**
     * Stop music playback
     */
    public stopMusic(): void {
        if (this.audioElement && this.isPlaying) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.isPlaying = false;
        }
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

        // Update audio element volume if it exists
        if (this.audioElement) {
            this.audioElement.volume = muted ? 0 : 0.5;
        }
    }

    /**
     * Toggle the mute state
     * @returns The new mute state
     */
    public toggleMute(): boolean {
        this._isMuted = !this._isMuted;

        // Update audio element volume if it exists
        if (this.audioElement) {
            this.audioElement.volume = this._isMuted ? 0 : 0.5;
        }

        return this._isMuted;
    }
}
