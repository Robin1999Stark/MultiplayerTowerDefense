import { Event } from './Event';
import { SlowEnemiesEvent } from './SlowEnemiesEvent';

export enum EventTypeID {
    SLOW_ENEMIES = 'slow_enemies',
}

export class EventFactory {
    private static instance: EventFactory;
    private events: Map<EventTypeID, () => Event> = new Map();

    private constructor() {
        this.registerEvents();
    }

    public static getInstance(): EventFactory {
        if (!EventFactory.instance) {
            EventFactory.instance = new EventFactory();
        }
        return EventFactory.instance;
    }

    private registerEvents(): void {
        this.events.set(EventTypeID.SLOW_ENEMIES, () => new SlowEnemiesEvent());
    }

    public createEvent(eventTypeId: EventTypeID): Event | undefined {
        const eventCreator = this.events.get(eventTypeId);
        if (!eventCreator) {
            console.error(`Event type ${eventTypeId} not found`);
            return undefined;
        }
        return eventCreator();
    }

    public getAllEventTypes(): Event[] {
        return Array.from(this.events.values()).map(creator => creator());
    }

    public getEventByKey(key: string): Event | undefined {
        for (const creator of this.events.values()) {
            const event = creator();
            if (event.key.toLowerCase() === key.toLowerCase()) {
                return event;
            }
        }
        return undefined;
    }
}