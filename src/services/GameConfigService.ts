/**
 * GameConfigService - Singleton service to manage game configuration across the game
 * 
 * This service maintains global configuration states that persist across all scenes.
 * It provides methods to check and set the "brause" mode state.
 */
export class GameConfigService {
    private static instance: GameConfigService;
    private _isBrauseMode: boolean = false;

    /**
     * Private constructor to enforce singleton pattern
     */
    private constructor() {
        // Initialize with brause mode disabled
        this._isBrauseMode = false;
    }

    /**
     * Get the singleton instance of GameConfigService
     */
    public static getInstance(): GameConfigService {
        if (!GameConfigService.instance) {
            GameConfigService.instance = new GameConfigService();
        }
        return GameConfigService.instance;
    }

    /**
     * Check if brause mode is currently enabled
     */
    public isBrauseMode(): boolean {
        return this._isBrauseMode;
    }

    /**
     * Set the brause mode state directly
     */
    public setBrauseMode(enabled: boolean): void {
        this._isBrauseMode = enabled;
    }

    /**
     * Toggle the brause mode state
     * @returns The new brause mode state
     */
    public toggleBrauseMode(): boolean {
        this._isBrauseMode = !this._isBrauseMode;
        return this._isBrauseMode;
    }
}