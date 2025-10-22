import Phaser from 'phaser'
import { GameScene } from '../../scenes/GameScene'

export interface Event {
    id: string;
    name: string;
    description: string;
    cost: number;
    duration: number;
    icon: string;
    key: string;
    
    // Method to activate the event
    activate(scene: GameScene): void;
    
    // Method to deactivate the event
    deactivate(scene: GameScene): void;
    
    // Method to update the event (for time-based events)
    update(deltaMs: number, scene: GameScene): void;
    
    // Method to check if the event is active
    isActive(): boolean;
}

export abstract class BaseEvent implements Event {
    id: string;
    name: string;
    description: string;
    cost: number;
    duration: number; // in milliseconds
    icon: string;
    key: string;
    
    private active: boolean = false;
    private timeRemaining: number = 0;
    
    constructor(id: string, name: string, description: string, cost: number, duration: number, icon: string, key: string) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.cost = cost;
        this.duration = duration;
        this.icon = icon;
        this.key = key;
    }
    
    activate(scene: GameScene): void {
        this.active = true;
        this.timeRemaining = this.duration;
        console.log(`Event ${this.name} activated for ${this.duration}ms`);
    }
    
    deactivate(scene: GameScene): void {
        this.active = false;
        this.timeRemaining = 0;
        console.log(`Event ${this.name} deactivated`);
    }
    
    update(deltaMs: number, scene: GameScene): void {
        if (!this.active) return;
        
        this.timeRemaining -= deltaMs;
        
        if (this.timeRemaining <= 0) {
            this.deactivate(scene);
        }
    }
    
    isActive(): boolean {
        return this.active;
    }
    
    getRemainingTime(): number {
        return this.timeRemaining;
    }
}