import Phaser from 'phaser'
import { Event } from '../entities/Events/Event'
import { EventTypeID } from '../entities/Events/EventFactory'
import { SlowEnemiesEvent } from '../entities/Events/SlowEnemiesEvent'
import { AreaDamageEvent } from '../entities/Events/AreaDamageEvent'
import { GoldRushEvent } from '../entities/Events/GoldRushEvent'

export class EventStore {
    private static instance: EventStore
    private eventTypes: Map<EventTypeID, () => Event> = new Map()

    private constructor() {
        this.registerEvents()
    }

    public static getInstance(): EventStore {
        if (!EventStore.instance) {
            EventStore.instance = new EventStore()
        }
        return EventStore.instance
    }

    private registerEvents(): void {
        this.eventTypes.set(EventTypeID.SLOW_ENEMIES, () => new SlowEnemiesEvent())
        this.eventTypes.set(EventTypeID.AREA_DAMAGE, () => new AreaDamageEvent())
        this.eventTypes.set(EventTypeID.GOLD_RUSH, () => new GoldRushEvent())
    }

    public createEvent(eventTypeId: EventTypeID): Event | undefined {
        const eventCreator = this.eventTypes.get(eventTypeId)
        if (!eventCreator) {
            console.error(`Event type ${eventTypeId} not found`)
            return undefined
        }
        return eventCreator()
    }

    public getAllEventTypes(): Event[] {
        return Array.from(this.eventTypes.values()).map(creator => creator())
    }

    public getEventByKey(key: string): Event | undefined {
        for (const creator of this.eventTypes.values()) {
            const event = creator()
            if (event.key.toLowerCase() === key.toLowerCase()) {
                return event
            }
        }
        return undefined
    }

    public generateEventTexture(scene: Phaser.Scene, event: Event): void {
        const g = scene.add.graphics()
        g.clear()
        
        // Draw a circular background
        g.fillStyle(0x1a1a2e, 1)
        g.fillCircle(16, 16, 16)
        
        // Draw a border
        g.lineStyle(2, 0x333333, 1)
        g.strokeCircle(16, 16, 16)
        
        // Generate the texture
        g.generateTexture(event.icon, 32, 32)
        g.destroy()
    }

    public generateAllEventTextures(scene: Phaser.Scene): void {
        this.getAllEventTypes().forEach(event => {
            this.generateEventTexture(scene, event)
        })
    }

    public showEventActivationMessage(scene: Phaser.Scene, event: Event): void {
        // Create a text message that appears briefly when an event is activated
        const text = scene.add.text(
            scene.scale.width / 2, 
            scene.scale.height / 4, 
            `${event.name} Activated!`, 
            {
                fontFamily: 'Arial',
                fontSize: '24px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
                shadow: { color: '#000000', blur: 10, stroke: true, fill: true }
            }
        )
        text.setOrigin(0.5)
        text.setDepth(1000)
        
        // Fade in and out animation
        scene.tweens.add({
            targets: text,
            alpha: { from: 0, to: 1 },
            duration: 500,
            yoyo: true,
            hold: 1000,
            onComplete: () => {
                text.destroy()
            }
        })
    }
}