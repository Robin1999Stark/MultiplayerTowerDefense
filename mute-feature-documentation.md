# Mute Feature Implementation

## Overview

This document describes the implementation of a mute toggle feature in the Tower Defense game. The feature allows players to toggle all background music and sound effects by pressing the "M" key on the keyboard.

## Implementation Details

### 1. Audio Management System

The mute functionality is centralized in the `AudioManager` class, which follows the singleton pattern to ensure a single source of truth for the audio state across the entire game.

```typescript
// src/services/AudioManager.ts
export class AudioManager {
    private static instance: AudioManager;
    private _isMuted: boolean = false;

    private constructor() {
        // Explicitly set mute state to false to ensure music plays by default
        this._isMuted = false;
    }

    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    public isMuted(): boolean {
        return this._isMuted;
    }

    public setMuted(muted: boolean): void {
        this._isMuted = muted;
    }

    public toggleMute(): boolean {
        this._isMuted = !this._isMuted;
        return this._isMuted;
    }
}
```

### 2. Key Listeners

The "M" key event listeners were added to both the `StartScene` and `GameScene` to ensure the mute toggle works in all game states:

```typescript
// In StartScene.create() method
this.input.keyboard?.on('keydown-M', () => {
    this.audioManager.toggleMute()
})

// In GameScene.create() method
this.input.keyboard.on('keydown-M', () => {
    this.audioManager.toggleMute()
})
```

### 3. Sound-Producing Code Modifications

All sound-producing code was modified to respect the mute state. This involved:

1. Importing the AudioManager
2. Initializing it in the constructor
3. Checking the mute state before playing sounds

#### Example in Tower Base Class:

```typescript
// In Tower.playShootTone() method
protected playShootTone(): void {
    // Don't play sound if muted
    if (this.audioManager.isMuted()) return
    
    // Rest of the sound playing code...
}
```

#### Example in StartScene:

```typescript
// In StartScene.startEpicMusic() method
this.musicGain = ctx.createGain()
// Set initial gain based on mute state
const initialGain = this.audioManager.isMuted() ? 0 : 0.3
this.musicGain.gain.setValueAtTime(initialGain, ctx.currentTime)
```

### 4. Specialized Tower Classes

Each specialized tower class that has its own sound method was updated to check the mute state:

- `FrostTower.playShootTone()`
- `AOETower.playAOESound()`
- `ChainTower.playChainSound()`
- `RapidFireTower.playRapidFireSound()`
- `SnipingTower.playSnipeSound()`

## Usage

Players can press the "M" key at any time during gameplay to toggle all sounds on or off. The mute state persists across all scenes due to the singleton pattern of the AudioManager.

## Technical Notes

1. The mute state is maintained in a single AudioManager instance that is shared across all components.
2. Each sound-producing method checks the mute state before playing any sounds.
3. For background music, the gain is set based on the mute state.
4. The mute toggle is available in both the start menu and during gameplay.

## Future Improvements

Potential future improvements to the audio system could include:

1. Separate toggles for music and sound effects
2. Volume sliders for fine-grained control
3. Saving audio preferences to local storage
4. Visual indicator of the current mute state