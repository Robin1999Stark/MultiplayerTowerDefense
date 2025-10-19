import Phaser from 'phaser'

export enum TowerTypeID {
    BASIC = 'basic',
    SNIPER = 'sniper',
    RAPID = 'rapid',
    AOE = 'aoe',
    CHAIN = 'chain',
    FROST = 'frost'
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
                cost: 250,
                range: 200,
                fireRateMs: 3000,
                damage: 0,
                color: 0x00aaff,
                description: 'Slows enemies for 10 seconds'
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
                description: 'Short range, fast fire rate, low damage'
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
                description: 'Long range, high damage, slow fire rate'
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
                description: 'creates a large area of damage'
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
                description: 'triggers a chain of explosions'
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

