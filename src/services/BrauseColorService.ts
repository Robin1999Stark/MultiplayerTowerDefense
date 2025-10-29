/**
 * Service for managing Brause colors
 * This centralizes the definition of Brause colors to ensure consistency across the application
 */
export class BrauseColorService {
    private static instance: BrauseColorService;

    /**
     * The Brause colors used throughout the application
     */
    public static readonly BRAUSE_COLORS: number[] = [
        0xfaff66, // Yellow
        0x36ff33, // Green
        0xfc8105, // Orange
        0xf705af  // Pink
    ];

    private constructor() {
        // Private constructor to prevent direct construction calls with the `new` operator
    }

    /**
     * Get the singleton instance of the BrauseColorService
     * @returns The singleton instance
     */
    public static getInstance(): BrauseColorService {
        if (!BrauseColorService.instance) {
            BrauseColorService.instance = new BrauseColorService();
        }
        return BrauseColorService.instance;
    }

    /**
     * Get a random Brause color
     * @returns A random Brause color
     */
    public getRandomColor(): number {
        return BrauseColorService.BRAUSE_COLORS[
            Math.floor(Math.random() * BrauseColorService.BRAUSE_COLORS.length)
        ];
    }
}