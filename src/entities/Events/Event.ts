import { GameScene } from '../../scenes/GameScene'

export interface Event {
    id: string;
    name: string;
    description: string;
    cost: number;
    duration: number;
    icon: string;
    key: string;
    activate(scene: GameScene): void;
    deactivate(scene: GameScene): void;
    update(deltaMs: number, scene: GameScene): void;
    isActive(): boolean;
}

export abstract class BaseEvent implements Event {
    id: string;
    name: string;
    description: string;
    cost: number;
    duration: number;
    icon: string;
    key: string;
    
    private active: boolean = false;
    private timeRemaining: number = 0;
    
    protected constructor(id: string, name: string, description: string, cost: number, duration: number, icon: string, key: string) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.cost = cost;
        this.duration = duration;
        this.icon = icon;
        this.key = key;
    }
    
    activate(_scene: GameScene): void {
        this.active = true;
        this.timeRemaining = this.duration;
        console.log(`Event ${this.name} activated for ${this.duration}ms`);
    }
    
    deactivate(_scene: GameScene): void {
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
}