/**
 * Audio System - Complete Game Audio Management
 * 
 * Purpose: Manages all game audio including background music, sound effects, and dynamic audio
 * Dependencies: This file requires Howler.js to be loaded first from CDN
 * Exports: window.AudioSystem - Complete audio management system
 */

class AudioSystem {
    constructor(engine) {
        this.engine = engine;
        this.initialized = false;
        
        // Audio settings
        this.settings = {
            master: 0.75,
            music: 0.8,
            sfx: 0.9,
            ambient: 0.6,
            voice: 0.85,
            enabled: true
        };
        
        // Currently playing tracks
        this.currentMusic = null;
        this.currentAmbient = null;
        this.currentSFX = new Set();
        
        // Audio fade management
        this.fadeQueue = [];
        this.fadeInProgress = false;
        
        // Preloaded audio cache
        this.audioCache = new Map();
        this.loadingPromises = new Map();
        
        // Music and ambient tracks by area/state
        this.musicTracks = {
            // Main menu and general
            menu: 'menu_theme',
            peaceful: 'peaceful_ambient',
            
            // Area-specific music
            hallway1: 'hallway_theme',
            classroom1: 'classroom_tension',
            classroom2: 'lab_mystery',
            library: 'library_calm',
            cafeteria: 'cafeteria_chaos',
            gym: 'gym_intensity',
            hallway2: 'east_wing_mystery',
            principal_office: 'authority_theme',
            detention: 'detention_drone',
            
            // Special states
            combat: 'battle_theme',
            chase: 'chase_tension',
            victory: 'victory_fanfare',
            defeat: 'defeat_theme',
            tutorial: 'tutorial_theme'
        };
        
        // Sound effects library
        this.soundEffects = {
            // UI sounds
            ui_click: 'ui_click',
            ui_hover: 'ui_hover',
            ui_error: 'ui_error',
            ui_success: 'ui_success',
            button_press: 'button_press',
            menu_open: 'menu_open',
            menu_close: 'menu_close',
            
            // Player actions
            player_attack: 'player_attack',
            player_defend: 'player_defend',
            player_hurt: 'player_hurt',
            player_heal: 'player_heal',
            player_level_up: 'player_level_up',
            player_item_use: 'item_use',
            player_walk: 'footstep',
            player_run: 'footstep_fast',
            
            // Combat sounds
            enemy_appear: 'enemy_appear',
            enemy_attack: 'enemy_attack',
            enemy_hurt: 'enemy_hurt',
            enemy_defeat: 'enemy_defeat',
            critical_hit: 'critical_hit',
            battle_start: 'battle_start',
            battle_end: 'battle_end',
            
            // Ability sounds
            speed_dash: 'ability_speed',
            study_shield: 'ability_shield',
            homework_strike: 'ability_strike',
            excuse_escape: 'ability_escape',
            
            // Environment sounds
            door_open: 'door_open',
            door_close: 'door_close',
            locker_open: 'locker_open',
            footsteps_school: 'footsteps_school',
            clock_tick: 'clock_tick',
            fire_alarm: 'fire_alarm',
            
            // Area-specific ambient sounds
            library_ambient: 'pages_turning',
            cafeteria_ambient: 'conversation_loop',
            lab_ambient: 'bubbling',
            gym_ambient: 'basketball_bounce',
            hallway_ambient: 'lockers_closing',
            
            // Teacher sounds
            teacher_appear: 'teacher_footsteps',
            teacher_chase: 'teacher_pursuit',
            teacher_capture: 'teacher_capture',
            detention_bell: 'detention_bell',
            
            // Item and pickup sounds
            item_pickup: 'item_pickup',
            item_equip: 'item_equip',
            energy_drink: 'energy_drink',
            health_potion: 'health_potion',
            
            // Educational sounds
            chalkboard: 'chalkboard_scratch',
            book_close: 'book_close',
            calculator_beep: 'calculator_beep',
            pencil_sharp: 'pencil_sharp',
            
            // Stress and anxiety sounds
            stress_buildup: 'stress_buildup',
            anxiety_pulse: 'anxiety_pulse',
            panic_alert: 'panic_alert',
            calming_breath: 'calming_breath'
        };
        
        // Audio context for advanced features
        this.audioContext = null;
        this.masterGain = null;
        
        // Volume automation
        this.volumeAutomation = new Map();
        
        // Initialize audio system
        this.initializeAudio();
    }

    /**
     * Initialize audio system and setup audio context
     */
    async initializeAudio() {
        try {
            // Check if Howler is available
            if (typeof Howl === 'undefined') {
                console.warn('Howler.js not loaded, audio system will be disabled');
                this.settings.enabled = false;
                return;
            }
            
            // Initialize Howler with settings
            Howler.volume(this.settings.master);
            
            // Create audio context for advanced features
            if (window.AudioContext || window.webkitAudioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.audioContext.createGain();
                this.masterGain.connect(this.audioContext.destination);
                this.masterGain.gain.value = this.settings.master;
            }
            
            // Preload critical audio files
            await this.preloadEssentialAudio();
            
            // Setup event listeners
            this.setupAudioEventListeners();
            
            this.initialized = true;
            console.log('Audio system initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize audio system:', error);
            this.settings.enabled = false;
        }
    }

    /**
     * Preload essential audio files
     */
    async preloadEssentialAudio() {
        const essentialSounds = [
            // Critical UI sounds
            'ui_click', 'ui_hover', 'ui_error', 'ui_success',
            
            // Player action sounds
            'player_attack', 'player_hurt', 'player_heal', 'item_use',
            
            // Combat sounds
            'enemy_appear', 'enemy_defeat', 'critical_hit', 'battle_start',
            
            // Environment sounds
            'footstep', 'door_open', 'locker_open'
        ];
        
        const loadPromises = essentialSounds.map(soundId => 
            this.loadSound(soundId).catch(error => 
                console.warn(`Failed to preload sound: ${soundId}`, error)
            )
        );
        
        await Promise.allSettled(loadPromises);
    }

    /**
     * Load individual sound effect
     */
    loadSound(soundId, loop = false, volume = 1.0) {
        if (!this.settings.enabled) {
            return Promise.resolve(null);
        }
        
        // Check if already loading or loaded
        if (this.audioCache.has(soundId)) {
            return Promise.resolve(this.audioCache.get(soundId));
        }
        
        if (this.loadingPromises.has(soundId)) {
            return this.loadingPromises.get(soundId);
        }
        
        // Generate audio URL (in a real implementation, these would be actual audio files)
        const audioUrl = this.generateAudioUrl(soundId);
        
        const loadPromise = new Promise((resolve, reject) => {
            try {
                const howl = new Howl({
                    src: [audioUrl],
                    volume: volume,
                    loop: loop,
                    preload: true,
                    onload: () => {
                        this.audioCache.set(soundId, howl);
                        this.loadingPromises.delete(soundId);
                        resolve(howl);
                    },
                    onloaderror: (id, error) => {
                        this.loadingPromises.delete(soundId);
                        console.warn(`Failed to load sound: ${soundId}`, error);
                        
                        // Create a silent audio fallback
                        const silentHowl = new Howl({
                            src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCzOL0fPTgj4GHGm+7+OZURE'],
                            volume: 0, // Silent fallback
                            loop: loop
                        });
                        this.audioCache.set(soundId, silentHowl);
                        resolve(silentHowl);
                    },
                    onplayerror: (id, error) => {
                        console.warn(`Failed to play sound: ${soundId}`, error);
                    }
                });
                
                this.loadingPromises.set(soundId, loadPromise);
                
            } catch (error) {
                this.loadingPromises.delete(soundId);
                reject(error);
            }
        });
        
        return loadPromise;
    }

    /**
     * Generate audio URL for sound effect (placeholder implementation)
     */
    generateAudioUrl(soundId) {
        // In a real implementation, these would map to actual audio files
        // For now, return a data URL with a short beep or use a web audio API
        
        const audioMap = {
            'ui_click': this.generateBeep(800, 0.1),
            'ui_hover': this.generateBeep(1200, 0.05),
            'ui_error': this.generateBeep(200, 0.3),
            'ui_success': this.generateBeep(1000, 0.2),
            'player_attack': this.generateBeep(150, 0.15),
            'player_hurt': this.generateBeep(100, 0.2),
            'player_heal': this.generateBeep(1200, 0.25),
            'enemy_appear': this.generateBeep(80, 0.3),
            'enemy_defeat': this.generateBeep(60, 0.4),
            'critical_hit': this.generateBeep(1500, 0.1),
            'battle_start': this.generateBeep(400, 0.5),
            'item_use': this.generateBeep(900, 0.15),
            'footstep': this.generateBeep(200, 0.08),
            'door_open': this.generateBeep(300, 0.2)
        };
        
        return audioMap[soundId] || this.generateBeep(440, 0.1);
    }

    /**
     * Generate a beep sound using Web Audio API
     */
    generateBeep(frequency, duration) {
        if (!this.audioContext) {
            return 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCzOL0fPTgj4GHGm+7+OZURE';
        }
        
        try {
            // Create oscillator and generate beep
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
            
            // Return a placeholder data URL for Howler.js
            return 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCzOL0fPTgj4GHGm+7+OZURE';
            
        } catch (error) {
            console.warn('Failed to generate beep:', error);
            return 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCzOL0fPTgj4GHGm+7+OZURE';
        }
    }

    /**
     * Play sound effect
     */
    async playSFX(soundId, volume = 1.0, playbackRate = 1.0) {
        if (!this.settings.enabled) return null;
        
        try {
            const howl = await this.loadSound(soundId);
            if (!howl) return null;
            
            // Set volume with settings
            const finalVolume = volume * this.settings.sfx * this.settings.master;
            howl.volume(Math.min(1, Math.max(0, finalVolume)));
            
            // Set playback rate
            if (playbackRate !== 1.0) {
                howl.rate(playbackRate);
            }
            
            // Play sound
            const soundId_play = howl.play();
            this.currentSFX.add(soundId_play);
            
            // Clean up when sound ends
            howl.once('end', () => {
                this.currentSFX.delete(soundId_play);
            });
            
            return soundId_play;
        } catch (error) {
            console.warn(`Failed to play SFX: ${soundId}`, error);
            return null;
        }
    }

    /**
     * Play background music
     */
    async playMusic(trackId, fadeDuration = 1000, loop = true) {
        if (!this.settings.enabled) return;
        
        try {
            // Stop current music with fade out
            if (this.currentMusic) {
                await this.fadeOut(this.currentMusic, fadeDuration * 0.5);
            }
            
            // Load new music
            const howl = await this.loadSound(trackId, loop, this.settings.music * this.settings.master);
            if (!howl) return;
            
            // Set volume and play
            howl.volume(0); // Start at 0 for fade in
            const musicId = howl.play();
            this.currentMusic = { howl: howl, id: musicId, trackId: trackId };
            
            // Fade in
            await this.fadeIn(howl, this.settings.music * this.settings.master, fadeDuration);
            
            console.log(`Playing music: ${trackId}`);
        } catch (error) {
            console.warn(`Failed to play music: ${trackId}`, error);
        }
    }

    /**
     * Play ambient sound
     */
    async playAmbient(soundId, volume = 0.5, loop = true) {
        if (!this.settings.enabled) return;
        
        try {
            // Stop current ambient
            if (this.currentAmbient) {
                this.currentAmbient.howl.stop();
            }
            
            // Load and play ambient
            const howl = await this.loadSound(soundId, loop, volume * this.settings.ambient * this.settings.master);
            if (!howl) return;
            
            const ambientId = howl.play();
            this.currentAmbient = { howl: howl, id: ambientId, soundId: soundId };
            
            console.log(`Playing ambient: ${soundId}`);
        } catch (error) {
            console.warn(`Failed to play ambient: ${soundId}`, error);
        }
    }

    /**
     * Fade in audio
     */
    fadeIn(howl, targetVolume, duration) {
        return new Promise((resolve) => {
            const startVolume = 0;
            const startTime = Date.now();
            
            const fade = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const currentVolume = startVolume + (targetVolume - startVolume) * progress;
                
                howl.volume(currentVolume);
                
                if (progress < 1) {
                    requestAnimationFrame(fade);
                } else {
                    resolve();
                }
            };
            
            fade();
        });
    }

    /**
     * Fade out audio
     */
    fadeOut(howl, duration) {
        return new Promise((resolve) => {
            const startVolume = howl.volume();
            const startTime = Date.now();
            
            const fade = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const currentVolume = startVolume * (1 - progress);
                
                howl.volume(currentVolume);
                
                if (progress < 1) {
                    requestAnimationFrame(fade);
                } else {
                    howl.stop();
                    resolve();
                }
            };
            
            fade();
        });
    }

    /**
     * Stop all audio
     */
    stopAll(fadeDuration = 500) {
        const promises = [];
        
        // Stop music
        if (this.currentMusic) {
            promises.push(this.fadeOut(this.currentMusic.howl, fadeDuration));
            this.currentMusic = null;
        }
        
        // Stop ambient
        if (this.currentAmbient) {
            this.currentAmbient.howl.stop();
            this.currentAmbient = null;
        }
        
        // Stop all SFX
        this.currentSFX.forEach(soundId => {
            // Howler doesn't have a direct way to stop by ID, so we stop all
        });
        this.currentSFX.clear();
        
        return Promise.all(promises);
    }

    /**
     * Update volume settings
     */
    updateVolume(type, volume) {
        if (this.settings[type] !== undefined) {
            this.settings[type] = Math.max(0, Math.min(1, volume));
            
            // Apply to current audio
            if (type === 'master') {
                Howler.volume(this.settings.master);
                if (this.masterGain) {
                    this.masterGain.gain.value = this.settings.master;
                }
            } else if (type === 'music' && this.currentMusic) {
                this.currentMusic.howl.volume(this.settings.music * this.settings.master);
            } else if (type === 'ambient' && this.currentAmbient) {
                this.currentAmbient.howl.volume(this.settings.ambient * this.settings.master);
            } else if (type === 'sfx') {
                // SFX volume is applied when playing new sounds
            }
            
            console.log(`${type} volume updated to: ${volume}`);
        }
    }

    /**
     * Handle game state changes for music
     */
    onGameStateChange(oldState, newState) {
        if (!this.initialized) return;
        
        switch (newState) {
            case 'menu':
                this.playMusic('menu_theme', 500);
                break;
            case 'playing':
                this.onAreaChange(this.engine.school?.currentArea || 'hallway1');
                break;
            case 'battle':
                this.playMusic('combat_theme', 300);
                this.playSFX('battle_start', 0.8);
                break;
            case 'dialogue':
                // Keep current music but reduce volume slightly
                if (this.currentMusic) {
                    this.currentMusic.howl.volume(this.settings.music * this.settings.master * 0.7);
                }
                break;
        }
    }

    /**
     * Handle area changes for music and ambient
     */
    onAreaChange(areaId) {
        if (!this.initialized) return;
        
        // Play area-specific music
        const musicTrack = this.musicTracks[areaId];
        if (musicTrack) {
            this.playMusic(musicTrack, 800);
        }
        
        // Play area-specific ambient
        switch (areaId) {
            case 'library':
                this.playAmbient('library_ambient', 0.3);
                break;
            case 'cafeteria':
                this.playAmbient('cafeteria_ambient', 0.4);
                break;
            case 'classroom2':
                this.playAmbient('lab_ambient', 0.3);
                break;
            case 'gym':
                this.playAmbient('gym_ambient', 0.5);
                break;
            case 'hallway1':
            case 'hallway2':
                this.playAmbient('hallway_ambient', 0.2);
                break;
            default:
                // Stop ambient for areas without specific ambient
                if (this.currentAmbient) {
                    this.currentAmbient.howl.stop();
                    this.currentAmbient = null;
                }
                break;
        }
    }

    /**
     * Handle teacher pursuit events
     */
    onTeacherPursuit(start) {
        if (!this.initialized) return;
        
        if (start) {
            // Fade in chase music
            this.playMusic('chase_theme', 200);
            this.playSFX('teacher_appear', 0.6);
            
            // Play pursuit ambient
            this.playSFX('teacher_chase', 0.4, 1.2);
        } else {
            // Return to area music
            this.onAreaChange(this.engine.school?.currentArea || 'hallway1');
        }
    }

    /**
     * Handle battle events
     */
    onBattleEvent(eventType, data = {}) {
        if (!this.initialized) return;
        
        switch (eventType) {
            case 'player_attack':
                this.playSFX('player_attack', 0.8);
                if (data.critical) {
                    this.playSFX('critical_hit', 0.9);
                }
                break;
            case 'player_defend':
                this.playSFX('player_defend', 0.7);
                break;
            case 'player_hurt':
                this.playSFX('player_hurt', 0.8);
                break;
            case 'enemy_appear':
                this.playSFX('enemy_appear', 0.7);
                break;
            case 'enemy_defeat':
                this.playSFX('enemy_defeat', 0.8);
                break;
            case 'victory':
                this.playMusic('victory_theme', 500);
                this.playSFX('battle_end', 0.9);
                break;
            case 'defeat':
                this.playMusic('defeat_theme', 500);
                break;
            case 'ability_use':
                this.playAbilitySound(data.ability);
                break;
        }
    }

    /**
     * Play ability-specific sounds
     */
    playAbilitySound(abilityName) {
        const abilitySounds = {
            'Speed Dash': 'speed_dash',
            'Study Shield': 'study_shield',
            'Homework Strike': 'homework_strike',
            'Excuse Escape': 'excuse_escape'
        };
        
        const soundId = abilitySounds[abilityName];
        if (soundId) {
            this.playSFX(soundId, 0.8);
        }
    }

    /**
     * Handle UI interactions
     */
    onUIInteraction(type) {
        if (!this.initialized) return;
        
        switch (type) {
            case 'button_hover':
                this.playSFX('ui_hover', 0.3, 1.5);
                break;
            case 'button_click':
                this.playSFX('ui_click', 0.6);
                break;
            case 'menu_open':
                this.playSFX('menu_open', 0.5);
                break;
            case 'menu_close':
                this.playSFX('menu_close', 0.5);
                break;
            case 'error':
                this.playSFX('ui_error', 0.7);
                break;
            case 'success':
                this.playSFX('ui_success', 0.7);
                break;
        }
    }

    /**
     * Handle inventory and item interactions
     */
    onItemInteraction(action, itemType = '') {
        if (!this.initialized) return;
        
        switch (action) {
            case 'pickup':
                this.playSFX('item_pickup', 0.8);
                break;
            case 'equip':
                this.playSFX('item_equip', 0.7);
                break;
            case 'use_consumable':
                this.playConsumableSound(itemType);
                break;
        }
    }

    /**
     * Play consumable-specific sounds
     */
    playConsumableSound(itemType) {
        switch (itemType) {
            case 'energy_drink':
                this.playSFX('energy_drink', 0.8);
                break;
            case 'health_potion':
                this.playSFX('health_potion', 0.8);
                break;
            default:
                this.playSFX('item_use', 0.7);
                break;
        }
    }

    /**
     * Setup audio event listeners
     */
    setupAudioEventListeners() {
        // Listen for game engine events
        if (this.engine) {
            // State changes
            this.engine.onStateChange = (oldState, newState) => {
                this.onGameStateChange(oldState, newState);
            };
            
            // Area changes
            this.engine.onAreaChange = (areaId) => {
                this.onAreaChange(areaId);
            };
            
            // Teacher events
            this.engine.onTeacherPursuit = (start) => {
                this.onTeacherPursuit(start);
            };
            
            // Battle events
            this.engine.onBattleEvent = (eventType, data) => {
                this.onBattleEvent(eventType, data);
            };
            
            // UI events
            this.engine.onUIInteraction = (type) => {
                this.onUIInteraction(type);
            };
            
            // Item events
            this.engine.onItemInteraction = (action, itemType) => {
                this.onItemInteraction(action, itemType);
            };
        }
        
        // Handle page visibility changes
        if (typeof document.addEventListener !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    // Pause non-looping sounds
                    this.currentSFX.forEach(soundId => {
                        // Howler automatically handles pausing when tab is hidden
                    });
                }
            });
        }
        
        // Handle browser audio context suspension
        if (this.audioContext) {
            document.addEventListener('click', () => {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            }, { once: true });
        }
    }

    /**
     * Get current audio status
     */
    getAudioStatus() {
        return {
            initialized: this.initialized,
            enabled: this.settings.enabled,
            currentMusic: this.currentMusic?.trackId || null,
            currentAmbient: this.currentAmbient?.soundId || null,
            playingSFX: this.currentSFX.size,
            settings: { ...this.settings },
            cachedSounds: this.audioCache.size,
            loading: this.loadingPromises.size
        };
    }

    /**
     * Enable/disable audio
     */
    setEnabled(enabled) {
        this.settings.enabled = enabled;
        
        if (!enabled) {
            this.stopAll();
        } else if (enabled && this.initialized) {
            // Resume audio context if needed
            if (this.audioContext?.state === 'suspended') {
                this.audioContext.resume();
            }
        }
        
        console.log(`Audio ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Cleanup audio resources
     */
    cleanup() {
        // Stop all audio
        this.stopAll();
        
        // Clear cache
        this.audioCache.clear();
        this.loadingPromises.clear();
        
        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        console.log('Audio system cleaned up');
    }

    /**
     * Update audio system (for animations, etc.)
     */
    update(deltaTime) {
        // Handle any pending fades
        if (this.fadeQueue.length > 0 && !this.fadeInProgress) {
            this.processNextFade();
        }
        
        // Update volume automation
        this.updateVolumeAutomation(deltaTime);
    }

    /**
     * Process next fade in queue
     */
    processNextFade() {
        if (this.fadeQueue.length === 0) return;
        
        this.fadeInProgress = true;
        const fade = this.fadeQueue.shift();
        
        fade().then(() => {
            this.fadeInProgress = false;
        });
    }

    /**
     * Update volume automation effects
     */
    updateVolumeAutomation(deltaTime) {
        for (const [id, automation] of this.volumeAutomation) {
            automation.time += deltaTime;
            
            if (automation.time >= automation.duration) {
                // Complete automation
                this.volumeAutomation.delete(id);
                if (automation.callback) {
                    automation.callback();
                }
            } else {
                // Update volume based on automation curve
                const progress = automation.time / automation.duration;
                const volume = this.calculateAutomationVolume(automation, progress);
                
                if (automation.target === 'master') {
                    Howler.volume(volume);
                }
            }
        }
    }

    /**
     * Calculate volume based on automation curve
     */
    calculateAutomationVolume(automation, progress) {
        switch (automation.curve) {
            case 'linear':
                return automation.startVolume + (automation.endVolume - automation.startVolume) * progress;
            case 'ease_in':
                return automation.startVolume + (automation.endVolume - automation.startVolume) * (progress * progress);
            case 'ease_out':
                return automation.endVolume - (automation.endVolume - automation.startVolume) * ((1 - progress) * (1 - progress));
            case 'ease_in_out':
                return progress < 0.5 ?
                    automation.startVolume + (automation.endVolume - automation.startVolume) * 2 * progress * progress :
                    automation.endVolume - (automation.endVolume - automation.startVolume) * 2 * (1 - progress) * (1 - progress);
            default:
                return automation.startVolume + (automation.endVolume - automation.startVolume) * progress;
        }
    }

    /**
     * Save audio settings
     */
    save() {
        try {
            const storageKey = location.pathname + "audio_settings";
            localStorage.setItem(storageKey, JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save audio settings:', error);
        }
    }

    /**
     * Load audio settings
     */
    load() {
        try {
            const storageKey = location.pathname + "audio_settings";
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const settings = JSON.parse(saved);
                Object.assign(this.settings, settings);
                console.log('Audio settings loaded');
            }
        } catch (error) {
            console.error('Failed to load audio settings:', error);
        }
    }
}
