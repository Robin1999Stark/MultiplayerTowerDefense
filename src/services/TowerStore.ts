import Phaser from 'phaser'

export enum TowerTypeID {
    BASIC = 'basic',
    SNIPER = 'sniper',
    RAPID = 'rapid',
    AOE = 'aoe',
    CHAIN = 'chain',
    FROST = 'frost'
}

export interface TowerLevelUpgrade {
    range: number
    fireRateMs: number
    damage: number
    cost: number
    hp: number
    baseScale?: number
    slowDownMs?: number
    slowFactor?: number
}

export interface TowerType {
    id: TowerTypeID
    name: string
    key: string
    color: number
    description: string
    levels: Map<number, TowerLevelUpgrade>
}

export class TowerStore {
    private static instance: TowerStore
    private towerTypes: Map<TowerTypeID, TowerType> = new Map()

    private constructor() {
        this.initializeTowerTypes()
    }

    public static getInstance(): TowerStore {
        if (!TowerStore.instance) {
            TowerStore.instance = new TowerStore()
        }
        return TowerStore.instance
    }

    private initializeTowerTypes(): void {
        const types: TowerType[] = [
            {
                id: TowerTypeID.FROST,
                name: 'Frost Tower',
                key: '6',
                color: 0x00aaff,
                description: 'Slows enemies for 10 seconds',
                levels: new Map([
                    [1, { range: 200, fireRateMs: 3000, damage: 0, hp: 80, slowDownMs: 5000, slowFactor: 0.8, cost: 100 }],
                    [2, { range: 240, fireRateMs: 2600, damage: 10, hp: 100, slowDownMs: 6000, slowFactor: 0.7, cost: 120 }],
                    [3, { range: 260, fireRateMs: 2100, damage: 20, hp: 120, slowDownMs: 7000, slowFactor: 0.6, cost: 160 }],
                    [4, { range: 290, fireRateMs: 1300, damage: 30, hp: 150, slowDownMs: 8000, slowFactor: 0.5, cost: 220 }],
                    [5, { range: 360, fireRateMs: 800, damage: 40, hp: 200, slowDownMs: 10000, slowFactor: 0.4, cost: 240 }]
                ]),
            },
            {
                id: TowerTypeID.RAPID,
                name: 'Rapid Fire Tower',
                key: '5',
                color: 0x2205ff,
                description: 'Short range, fast fire rate, low damage',
                levels: new Map([
                    [1, { range: 80, fireRateMs: 8, damage: 100, hp: 80, cost: 80 }],
                    [2, { range: 100, fireRateMs: 6, damage: 200, hp: 100, cost: 100 }],
                    [3, { range: 120, fireRateMs: 4, damage: 400, hp: 120, cost: 120 }],
                    [4, { range: 140, fireRateMs: 2, damage: 600, hp: 150, cost: 140 }],
                    [5, { range: 200, fireRateMs: 1, damage: 800, hp: 200, cost: 160 }]
                ]),
            },
            {
                id: TowerTypeID.SNIPER,
                name: 'Sniper Tower',
                key: '4',
                color: 0x5f27cd,
                description: 'Long range, high damage, slow fire rate',
                levels: new Map([
                    [1, { range: 1000, fireRateMs: 3000, damage: 1200, hp: 100, cost: 120 }],
                    [2, { range: 1200, fireRateMs: 2400, damage: 1800, hp: 120, cost: 140 }],
                    [3, { range: 1400, fireRateMs: 1500, damage: 2400, hp: 150, cost: 160 }],
                    [4, { range: 1600, fireRateMs: 800, damage: 2800, hp: 200, cost: 180 }],
                    [5, { range: 2000, fireRateMs: 500, damage: 3400, hp: 250, cost: 200 }]
                ]),
            },
            {
                id: TowerTypeID.AOE,
                name: 'AOE Tower',
                key: '3',
                color: 0xff6348,
                description: 'creates a large area of damage',
                levels: new Map([
                    [1, { range: 140, fireRateMs: 1200, damage: 500, hp: 100, cost: 110 }],
                    [2, { range: 170, fireRateMs: 1000, damage: 800, hp: 120, cost: 140 }],
                    [3, { range: 200, fireRateMs: 800, damage: 1100, hp: 150, cost: 160 }],
                    [4, { range: 240, fireRateMs: 500, damage: 1400, hp: 200, cost: 180 }],
                    [5, { range: 280, fireRateMs: 200, damage: 2000, hp: 250, cost: 220 }]
                ]),
            },
            {
                id: TowerTypeID.CHAIN,
                name: 'Chain Explosion Tower',
                key: '2',
                color: 0xefcc00,
                description: 'triggers a chain of explosions',
                levels: new Map([
                    [1, { range: 800, fireRateMs: 800, damage: 300, hp: 80, cost: 140 }],
                    [2, { range: 900, fireRateMs: 600, damage: 400, hp: 100, cost: 160 }],
                    [3, { range: 1000, fireRateMs: 400, damage: 500, hp: 130, cost: 180 }],
                    [4, { range: 1200, fireRateMs: 200, damage: 600, hp: 150, cost: 200 }],
                    [5, { range: 1400, fireRateMs: 100, damage: 700, hp: 200, cost: 240 }]
                ]),
            },
            {
                id: TowerTypeID.BASIC,
                name: 'Basic Tower',
                key: '1',
                color: 0x2ed573,
                description: 'Balanced tower with moderate damage and fire rate',
                levels: new Map([
                    [1, { range: 200, fireRateMs: 1000, damage: 50, hp: 60, cost: 10 }],
                    [2, { range: 240, fireRateMs: 800, damage: 100, hp: 80, cost: 20 }],
                    [3, { range: 260, fireRateMs: 600, damage: 200, hp: 100, cost: 30 }],
                    [4, { range: 290, fireRateMs: 400, damage: 400, hp: 120, cost: 50 }],
                    [5, { range: 360, fireRateMs: 200, damage: 800, hp: 150, cost: 60 }],
                    [6, { range: 400, fireRateMs: 100, damage: 1000, hp: 180, cost: 100 }]
                ]),
            }
        ]

        types.forEach(type => {
            this.towerTypes.set(type.id, type)
        })
    }

    public getTowerTypeByKey(key: string): TowerType | undefined {
        for (const type of this.towerTypes.values()) {
            if (type.key.toLowerCase() === key.toLowerCase()) {
                return type
            }
        }
        return undefined
    }

    public getAllTowerTypes(): TowerType[] {
        return Array.from(this.towerTypes.values())
    }

    public generateTowerTexture(scene: Phaser.Scene, type: TowerType): void {
        const g = scene.add.graphics()
        g.clear()
        g.fillStyle(type.color, 1)
        g.fillRoundedRect(0, 0, 32, 32, 6)
        g.generateTexture(`tower_${type.id}`, 32, 32)
        g.destroy()
    }

    public generateAllTowerTextures(scene: Phaser.Scene): void {
        this.getAllTowerTypes().forEach(type => {
            this.generateTowerTexture(scene, type)
        })
    }
}

