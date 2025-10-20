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
    baseScale?: number
}

export interface TowerType {
    id: TowerTypeID
    name: string
    key: string
    cost: number
    range: number
    fireRateMs: number
    damage: number
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
                cost: 200,
                range: 200,
                fireRateMs: 3000,
                damage: 0,
                color: 0x00aaff,
                description: 'Slows enemies for 10 seconds',
                levels: new Map([
                    [1, { range: 200, fireRateMs: 3000, damage: 0, cost: 200 }],
                    [2, { range: 240, fireRateMs: 2600, damage: 10, cost: 300 }],
                    [3, { range: 260, fireRateMs: 2200, damage: 20, cost: 400 }],
                    [4, { range: 290, fireRateMs: 1800, damage: 30, cost: 500 }],
                    [5, { range: 360, fireRateMs: 1000, damage: 40, cost: 600 }]
                ]),
             },
            {
                id: TowerTypeID.RAPID,
                name: 'Rapid Fire Tower',
                key: '5',
                cost: 150,
                range: 80,
                fireRateMs: 2,
                damage: 100,
                color: 0x2205ff,
                description: 'Short range, fast fire rate, low damage',
                levels: new Map([
                    [1, { range: 80, fireRateMs: 8, damage: 100, cost: 150 }],
                    [2, { range: 100, fireRateMs: 6, damage: 150, cost: 180 }],
                    [3, { range: 120, fireRateMs: 4, damage: 200, cost: 210 }],
                    [4, { range: 140, fireRateMs: 2, damage: 250, cost: 240 }],
                    [5, { range: 160, fireRateMs: 1, damage: 300, cost: 270 }]
                ]),
            },
            {
                id: TowerTypeID.SNIPER,
                name: 'Sniper Tower',
                key: '4',
                cost: 200,
                range: 1200,
                fireRateMs: 3000,
                damage: 1200,
                color: 0x5f27cd,
                description: 'Long range, high damage, slow fire rate',
                levels: new Map([
                    [1, { range: 1000, fireRateMs: 3000, damage: 1200, cost: 200 }],
                    [2, { range: 1200, fireRateMs: 2800, damage: 1400, cost: 300 }],
                    [3, { range: 1400, fireRateMs: 2400, damage: 1600, cost: 400 }],
                    [4, { range: 1600, fireRateMs: 2000, damage: 1800, cost: 500 }],
                    [5, { range: 2000, fireRateMs: 1500, damage: 2000, cost: 600 }]
                ]),
            },
            {
                id: TowerTypeID.AOE,
                name: 'AOE Tower',
                key: '3',
                cost: 150,
                range: 140,
                fireRateMs: 2000,
                damage: 500,
                color: 0xff6348,
                description: 'creates a large area of damage',
                levels: new Map([
                    [1, { range: 140, fireRateMs: 2000, damage: 500, cost: 150 }],
                    [2, { range: 160, fireRateMs: 1800, damage: 800, cost: 200 }],
                    [3, { range: 180, fireRateMs: 1600, damage: 1100, cost: 250 }],
                    [4, { range: 200, fireRateMs: 1400, damage: 1400, cost: 300 }],
                    [5, { range: 240, fireRateMs: 1000, damage: 2000, cost: 350 }]
                ]),
            },
            {
                id: TowerTypeID.CHAIN,
                name: 'Chain Explosion Tower',
                key: '2',
                cost: 250,
                range: 800,
                fireRateMs: 400,
                damage: 300,
                color: 0xefcc00,
                description: 'triggers a chain of explosions',
                levels: new Map([
                    [1, { range: 800, fireRateMs: 400, damage: 300, cost: 250 }],
                    [2, { range: 900, fireRateMs: 2600, damage: 400, cost: 300 }],
                    [3, { range: 1000, fireRateMs: 2200, damage: 500, cost: 400 }],
                    [4, { range: 1200, fireRateMs: 1800, damage: 600, cost: 500 }],
                    [5, { range: 1400, fireRateMs: 1000, damage: 700, cost: 600 }]
                ]),
            },
            {
                id: TowerTypeID.BASIC,
                name: 'Basic Tower',
                key: '1',
                cost: 10,
                range: 1000,
                fireRateMs: 200,
                damage: 50,
                color: 0x2ed573,
                description: 'Balanced tower with moderate damage and fire rate',
                levels: new Map([
                    [1, { range: 200, fireRateMs: 3000, damage: 50, cost: 10 }],
                    [2, { range: 240, fireRateMs: 2600, damage: 100, cost: 60 }],
                    [3, { range: 260, fireRateMs: 2200, damage: 150, cost: 110 }],
                    [4, { range: 290, fireRateMs: 1800, damage: 200, cost: 160 }],
                    [5, { range: 360, fireRateMs: 1000, damage: 250, cost: 200 }]
                ]),
            }
        ]

        types.forEach(type => {
            this.towerTypes.set(type.id, type)
        })
    }

    public getTowerType(id: TowerTypeID): TowerType | undefined {
        return this.towerTypes.get(id)
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

