import { TowerTypeID } from './TowerStore';

/**
 * Unlockable items in the campaign
 */
export interface UnlockableItem {
    id: string;
    name: string;
    description: string;
    cost: number; // Cost in campaign points
    type: 'tower' | 'skill';
    towerTypeId?: TowerTypeID; // Only for tower unlocks
}

/**
 * Campaign progression data
 */
interface CampaignProgressionData {
    campaignPoints: number;
    totalPointsEarned: number; // Track total points earned for statistics
    unlockedTowers: Set<TowerTypeID>;
    unlockedSkills: Set<string>;
}

/**
 * CampaignProgressionService - Singleton service to manage campaign progression
 * 
 * This service manages:
 * - Campaign points (earned by killing enemies)
 * - Unlocked towers and skills
 * - Persistence using localStorage
 */
export class CampaignProgressionService {
    private static instance: CampaignProgressionService;
    private static readonly STORAGE_KEY = 'tower_defense_campaign_progress';
    private static readonly STORAGE_VERSION = 2; // Increment this when changing save format
    
    private campaignPoints: number = 0;
    private totalPointsEarned: number = 0;
    private unlockedTowers: Set<TowerTypeID> = new Set();
    private unlockedSkills: Set<string> = new Set();
    
    // Define all unlockable items
    private unlockableItems: Map<string, UnlockableItem> = new Map();

    /**
     * Private constructor to enforce singleton pattern
     */
    private constructor() {
        this.initializeUnlockables();
        this.loadProgress();
        
        // Expose reset function to window for debugging (in browser console)
        if (typeof window !== 'undefined') {
            (window as any).resetCampaign = () => {
                this.clearAndReset();
                console.log('✅ Campaign progress has been reset! Reload the page to see changes.');
            };
        }
    }

    /**
     * Get the singleton instance of CampaignProgressionService
     */
    public static getInstance(): CampaignProgressionService {
        if (!CampaignProgressionService.instance) {
            CampaignProgressionService.instance = new CampaignProgressionService();
        }
        return CampaignProgressionService.instance;
    }

    /**
     * Initialize all unlockable items (towers and skills)
     */
    private initializeUnlockables(): void {
        // Tower unlocks (in order of progression)
        this.unlockableItems.set('tower_chain', {
            id: 'tower_chain',
            name: 'Chain Explosion Tower',
            description: 'Triggers chain explosions between enemies',
            cost: 100,
            type: 'tower',
            towerTypeId: TowerTypeID.CHAIN
        });

        this.unlockableItems.set('tower_aoe', {
            id: 'tower_aoe',
            name: 'AOE Tower',
            description: 'Creates large area damage explosions',
            cost: 150,
            type: 'tower',
            towerTypeId: TowerTypeID.AOE
        });

        this.unlockableItems.set('tower_sniper', {
            id: 'tower_sniper',
            name: 'Sniper Tower',
            description: 'Long range, high damage, slow fire rate',
            cost: 200,
            type: 'tower',
            towerTypeId: TowerTypeID.SNIPER
        });

        this.unlockableItems.set('tower_rapid', {
            id: 'tower_rapid',
            name: 'Rapid Fire Tower',
            description: 'Short range, fast fire rate',
            cost: 250,
            type: 'tower',
            towerTypeId: TowerTypeID.RAPID
        });

        this.unlockableItems.set('tower_frost', {
            id: 'tower_frost',
            name: 'Frost Tower',
            description: 'Slows enemies down significantly',
            cost: 300,
            type: 'tower',
            towerTypeId: TowerTypeID.FROST
        });

        // Skill unlocks
        this.unlockableItems.set('skill_starting_gold', {
            id: 'skill_starting_gold',
            name: 'Extra Starting Gold',
            description: 'Start with +50 gold',
            cost: 50,
            type: 'skill'
        });

        this.unlockableItems.set('skill_gold_bonus', {
            id: 'skill_gold_bonus',
            name: 'Gold Rush',
            description: '+20% gold from enemy kills',
            cost: 100,
            type: 'skill'
        });

        this.unlockableItems.set('skill_tower_discount', {
            id: 'skill_tower_discount',
            name: 'Tower Discount',
            description: '-10% cost for all towers',
            cost: 150,
            type: 'skill'
        });

        this.unlockableItems.set('skill_extra_lives', {
            id: 'skill_extra_lives',
            name: 'Extra Lives',
            description: 'Start with +5 lives',
            cost: 200,
            type: 'skill'
        });

        this.unlockableItems.set('skill_tower_damage', {
            id: 'skill_tower_damage',
            name: 'Tower Damage Boost',
            description: '+15% damage for all towers',
            cost: 250,
            type: 'skill'
        });

        this.unlockableItems.set('skill_tower_range', {
            id: 'skill_tower_range',
            name: 'Tower Range Boost',
            description: '+20% range for all towers',
            cost: 250,
            type: 'skill'
        });
    }

    /**
     * Reset campaign progression (for new game or reset)
     * This clears all progress and starts fresh with only the Basic tower unlocked
     */
    public resetProgress(): void {
        console.log('Resetting campaign progress to default state...');
        this.campaignPoints = 0;
        this.totalPointsEarned = 0;
        this.unlockedTowers.clear();
        this.unlockedSkills.clear();
        
        // Basic tower is always unlocked in campaign mode
        this.unlockedTowers.add(TowerTypeID.BASIC);
        
        this.saveProgress();
        console.log('Campaign progress reset complete. Only Basic tower is unlocked.');
    }
    
    /**
     * Force clear all saved data and reset (for debugging or user request)
     */
    public clearAndReset(): void {
        try {
            localStorage.removeItem(CampaignProgressionService.STORAGE_KEY);
            console.log('Cleared campaign save data from localStorage');
        } catch (error) {
            console.error('Failed to clear campaign save data:', error);
        }
        this.resetProgress();
    }

    /**
     * Get current campaign points
     */
    public getCampaignPoints(): number {
        return this.campaignPoints;
    }

    /**
     * Get total campaign points earned (for statistics)
     */
    public getTotalPointsEarned(): number {
        return this.totalPointsEarned;
    }

    /**
     * Add campaign points (called when enemies are killed)
     */
    public addCampaignPoints(points: number): void {
        this.campaignPoints += points;
        this.totalPointsEarned += points;
        this.saveProgress();
    }

    /**
     * Check if a tower is unlocked
     */
    public isTowerUnlocked(towerTypeId: TowerTypeID): boolean {
        return this.unlockedTowers.has(towerTypeId);
    }

    /**
     * Check if a skill is unlocked
     */
    public isSkillUnlocked(skillId: string): boolean {
        return this.unlockedSkills.has(skillId);
    }

    /**
     * Unlock an item (tower or skill)
     * @returns true if unlock was successful, false if not enough points or already unlocked
     */
    public unlockItem(itemId: string): boolean {
        const item = this.unlockableItems.get(itemId);
        if (!item) {
            console.error(`Item ${itemId} not found`);
            return false;
        }

        // Check if already unlocked
        if (item.type === 'tower' && item.towerTypeId && this.unlockedTowers.has(item.towerTypeId)) {
            return false;
        }
        if (item.type === 'skill' && this.unlockedSkills.has(itemId)) {
            return false;
        }

        // Check if enough points
        if (this.campaignPoints < item.cost) {
            return false;
        }

        // Deduct points and unlock
        this.campaignPoints -= item.cost;
        
        if (item.type === 'tower' && item.towerTypeId) {
            this.unlockedTowers.add(item.towerTypeId);
        } else if (item.type === 'skill') {
            this.unlockedSkills.add(itemId);
        }

        this.saveProgress();
        return true;
    }

    /**
     * Get all unlockable items
     */
    public getAllUnlockableItems(): UnlockableItem[] {
        return Array.from(this.unlockableItems.values());
    }

    /**
     * Get unlockable items by type
     */
    public getUnlockableItemsByType(type: 'tower' | 'skill'): UnlockableItem[] {
        return this.getAllUnlockableItems().filter(item => item.type === type);
    }

    /**
     * Get an unlockable item by ID
     */
    public getUnlockableItem(itemId: string): UnlockableItem | undefined {
        return this.unlockableItems.get(itemId);
    }

    /**
     * Check if an item can be unlocked (has enough points and not already unlocked)
     */
    public canUnlockItem(itemId: string): boolean {
        const item = this.unlockableItems.get(itemId);
        if (!item) return false;

        // Check if already unlocked
        if (item.type === 'tower' && item.towerTypeId && this.unlockedTowers.has(item.towerTypeId)) {
            return false;
        }
        if (item.type === 'skill' && this.unlockedSkills.has(itemId)) {
            return false;
        }

        // Check if enough points
        return this.campaignPoints >= item.cost;
    }

    /**
     * Apply skill bonuses to a value
     */
    public applySkillBonus(baseValue: number, bonusType: 'gold' | 'damage' | 'range' | 'cost'): number {
        let multiplier = 1;

        switch (bonusType) {
            case 'gold':
                if (this.isSkillUnlocked('skill_gold_bonus')) {
                    multiplier += 0.2; // +20% gold
                }
                break;
            case 'damage':
                if (this.isSkillUnlocked('skill_tower_damage')) {
                    multiplier += 0.15; // +15% damage
                }
                break;
            case 'range':
                if (this.isSkillUnlocked('skill_tower_range')) {
                    multiplier += 0.2; // +20% range
                }
                break;
            case 'cost':
                if (this.isSkillUnlocked('skill_tower_discount')) {
                    multiplier -= 0.1; // -10% cost
                }
                break;
        }

        return Math.round(baseValue * multiplier);
    }

    /**
     * Get starting gold bonus
     */
    public getStartingGoldBonus(): number {
        return this.isSkillUnlocked('skill_starting_gold') ? 50 : 0;
    }

    /**
     * Get starting lives bonus
     */
    public getStartingLivesBonus(): number {
        return this.isSkillUnlocked('skill_extra_lives') ? 5 : 0;
    }

    /**
     * Save progression to localStorage
     */
    private saveProgress(): void {
        try {
            const data = {
                version: CampaignProgressionService.STORAGE_VERSION,
                campaignPoints: this.campaignPoints,
                totalPointsEarned: this.totalPointsEarned,
                unlockedTowers: Array.from(this.unlockedTowers),
                unlockedSkills: Array.from(this.unlockedSkills)
            };
            localStorage.setItem(CampaignProgressionService.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save campaign progress:', error);
        }
    }

    /**
     * Load progression from localStorage
     */
    private loadProgress(): void {
        try {
            const savedData = localStorage.getItem(CampaignProgressionService.STORAGE_KEY);
            if (savedData) {
                const data = JSON.parse(savedData);
                
                // Check version - if version doesn't match or doesn't exist, reset
                if (!data.version || data.version !== CampaignProgressionService.STORAGE_VERSION) {
                    console.log('Campaign save version mismatch or missing. Resetting campaign progress...');
                    this.resetProgress();
                    return;
                }
                
                this.campaignPoints = data.campaignPoints || 0;
                this.totalPointsEarned = data.totalPointsEarned || 0;
                this.unlockedTowers = new Set(data.unlockedTowers || [TowerTypeID.BASIC]);
                this.unlockedSkills = new Set(data.unlockedSkills || []);
            } else {
                // First time playing - reset progress
                console.log('No saved campaign progress found. Starting fresh...');
                this.resetProgress();
            }
        } catch (error) {
            console.error('Failed to load campaign progress:', error);
            this.resetProgress();
        }
    }

    /**
     * Get statistics for display
     */
    public getStatistics(): {
        campaignPoints: number;
        totalPointsEarned: number;
        towersUnlocked: number;
        totalTowers: number;
        skillsUnlocked: number;
        totalSkills: number;
    } {
        const allItems = this.getAllUnlockableItems();
        const towerItems = allItems.filter(item => item.type === 'tower');
        const skillItems = allItems.filter(item => item.type === 'skill');

        return {
            campaignPoints: this.campaignPoints,
            totalPointsEarned: this.totalPointsEarned,
            towersUnlocked: this.unlockedTowers.size,
            totalTowers: towerItems.length + 1, // +1 for basic tower which is always unlocked
            skillsUnlocked: this.unlockedSkills.size,
            totalSkills: skillItems.length
        };
    }
}

