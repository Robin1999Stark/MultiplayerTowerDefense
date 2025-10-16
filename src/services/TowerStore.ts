import Phaser from 'phaser'

export interface TowerType {
    id: string
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
    private towerTypes: Map<string, TowerType> = new Map()

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
                id: 'basic',
                name: 'Basic Tower',
                key: 'E',
                cost: 50,
                range: 1000,
                fireRateMs: 200,
                damage: 400,
                color: 0x2ed573,
                description: 'Balanced tower with moderate damage and fire rate'
            },
            {
                id: 'sniper',
                name: 'Sniper Tower',
                key: 'R',
                cost: 100,
                range: 1500,
                fireRateMs: 800,
                damage: 1200,
                color: 0x5f27cd,
                description: 'Long range, high damage, slow fire rate'
            },
            {
                id: 'rapid',
                name: 'Rapid Tower',
                key: 'T',
                cost: 75,
                range: 700,
                fireRateMs: 80,
                damage: 150,
                color: 0xff6348,
                description: 'Short range, fast fire rate, low damage'
            }
        ]

        types.forEach(type => {
            this.towerTypes.set(type.id, type)
        })
    }

    public getTowerType(id: string): TowerType | undefined {
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

