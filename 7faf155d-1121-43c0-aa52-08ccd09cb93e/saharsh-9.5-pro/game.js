/**
 * game.js - Main Game Controller for osu! Web Clone
 * Orchestrates all game systems: rendering, input, audio, scoring, mods, and UI
 * Dependencies: ALL other modules - this is the central hub
 * 
 * IMPORTANT: This file requires all other modules to be loaded first.
 * Load order should follow the dependency graph in the development plan.
 */

import { 
    calculateTimingWindows, 
    calculateApproachTime, 
    calculateCircleRadius,
    OSU_PLAYFIELD,
    MOD_FLAGS 
} from './constants.js';
import { clamp } from './utils.js';
import { Renderer } from './renderer.js';
import { InputManager } from './input.js';
import { AudioManager } from './audio.js';
import { ScoreManager } from './scoring.js';
import { ModManager } from './mods.js';
import { AutoplayController } from './autoplay.js';
import { EffectsManager } from './effects.js';
import { Circle, Slider, Spinner } from './hitObjects.js';
import { UIManager } from './ui.js';
import { SongSelectManager } from './songSelect.js';
import { preloadAllBeatmaps, getBeatmapSets } from './beatmapLoader.js';

// Game states
const GameState = {
    LOADING: 'loading',
    MENU: 'menu',
    SONG_SELECT: 'songSelect',
    MOD_SELECT: 'modSelect',
    COUNTDOWN: 'countdown',
    PLAYING: 'playing',
    PAUSED: 'paused',
    RESULTS: 'results',
    FAILED: 'failed'
};

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Initialize all managers
        this.renderer = new Renderer(canvas);
        this.input = new InputManager();
        this.audio = new AudioManager();
        this.scoring = new ScoreManager();
        this.mods = new ModManager();
        this.autoplay = new AutoplayController();
        this.effects = new EffectsManager();
        this.ui = new UIManager();
        this.songSelect = new SongSelectManager(this.audio);
        
        // Game state
        this.state = GameState.LOADING;
        this.beatmap = null;
        this.hitObjects = [];
        this.activeObjectIndex = 0;
        
        // Timing
        this.gameStartTime = 0;
        this.currentTime = 0;
        this.pauseStartTime = 0;
        this.totalPausedTime = 0;
        this.lastFrameTime = 0;
        this.animationFrameId = null;
        
        // Calculated values (updated when beatmap loads)
        this.circleRadius = 54;
        this.approachTime = 1200;
        this.hitWindows = { hitWindow300: 80, hitWindow100: 140, hitWindow50: 200 };
        this.effectiveHP = 5;
        
        // Audio offset for synchronization
        this.audioOffset = 0;
        this.leadInTime = 2000; // 2 second lead-in
        
        // Storage prefix for localStorage
        this.storagePrefix = location.pathname + '_osu_';
    }

    /**
     * Initialize the game and all systems
     */
    async initialize() {
        this.ui.init();
        this.ui.showScreen('loading-screen');
        
        this.input.attach();
        
        this.setupUICallbacks();
        this.setupInputCallbacks();
        
        try {
            // Preload all beatmaps with progress updates
            await preloadAllBeatmaps((progress, message) => {
                this.ui.updateLoadingProgress(progress, message);
            });
            
            // Initialize song select with beatmap data
            const beatmapSets = getBeatmapSets();
            await this.songSelect.initialize(beatmapSets);
            
            this.ui.updateLoadingProgress(1, 'Ready!');
            
            // Short delay before showing menu
            await new Promise(resolve => setTimeout(resolve, 500));
            
            this.changeState(GameState.MENU);
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.ui.showError('Failed to load game resources: ' + error.message);
        }
    }

    /**
     * Setup UI event callbacks
     */
    setupUICallbacks() {
        // Menu
        this.ui.on('play', () => this.changeState(GameState.SONG_SELECT));
        
        // Song select
        this.ui.on('openMods', () => this.changeState(GameState.MOD_SELECT));
        this.ui.on('backToMenu', () => this.changeState(GameState.MENU));
        this.ui.on('startGame', () => this.startGameWithSelectedBeatmap());
        
        // Mods
        this.ui.on('closeMods', () => this.changeState(GameState.SONG_SELECT));
        this.ui.on('resetMods', () => {
            this.mods.resetMods();
            this.ui.updateModButtons(this.mods.activeMods);
        });
        this.ui.on('modToggle', (flag) => {
            this.mods.toggleMod(flag);
            this.ui.updateModButtons(this.mods.activeMods);
        });
        
        // Pause
        this.ui.on('resume', () => this.resumeGame());
        this.ui.on('retry', () => this.retryGame());
        this.ui.on('quit', () => this.quitToSongSelect());
        
        // Song select events
        this.songSelect.on('play', (beatmap) => this.startGame(beatmap));
        this.songSelect.on('difficultySelected', ({ beatmap }) => {
            this.ui.updateSongInfo(beatmap);
        });
        this.songSelect.on('back', () => this.changeState(GameState.MENU));
        this.songSelect.on('error', (msg) => this.ui.showError(msg));
    }

    /**
     * Setup input callbacks
     */
    setupInputCallbacks() {
        // ESC key handling
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.handleEscape();
            }
        });
    }

    /**
     * Handle ESC key based on current state
     */
    handleEscape() {
        switch (this.state) {
            case GameState.PLAYING:
                this.pauseGame();
                break;
            case GameState.PAUSED:
                this.resumeGame();
                break;
            case GameState.SONG_SELECT:
                this.changeState(GameState.MENU);
                break;
            case GameState.MOD_SELECT:
                this.changeState(GameState.SONG_SELECT);
                break;
            case GameState.RESULTS:
            case GameState.FAILED:
                this.quitToSongSelect();
                break;
        }
    }

    /**
     * Change game state
     */
    changeState(newState) {
        const oldState = this.state;
        this.state = newState;
        
        switch (newState) {
            case GameState.MENU:
                this.ui.showScreen('menu-screen');
                this.stopGameLoop();
                break;
                
            case GameState.SONG_SELECT:
                this.ui.showScreen('song-select-screen');
                this.songSelect.refresh();
                break;
                
            case GameState.MOD_SELECT:
                this.ui.showScreen('mod-select-screen');
                this.ui.updateModButtons(this.mods.activeMods);
                break;
                
            case GameState.COUNTDOWN:
                this.ui.showScreen('gameplay-screen');
                break;
                
            case GameState.PLAYING:
                this.ui.showScreen('gameplay-screen');
                this.ui.hidePause();
                break;
                
            case GameState.PAUSED:
                this.ui.showPause();
                break;
                
            case GameState.RESULTS:
                this.showResults();
                break;
                
            case GameState.FAILED:
                this.showFailed();
                break;
        }
    }

    /**
     * Start game with the selected beatmap from song select
     */
    async startGameWithSelectedBeatmap() {
        const beatmap = this.songSelect.getSelectedBeatmap();
        if (beatmap) {
            await this.startGame(beatmap);
        } else {
            this.ui.showError('No beatmap selected');
        }
    }

    /**
     * Start the game with a beatmap
     */
    async startGame(beatmap) {
        if (!beatmap) {
            this.ui.showError('No beatmap provided');
            return;
        }
        
        this.beatmap = beatmap;
        
        // Apply mods to difficulty
        const modifiedDiff = this.mods.applyDifficultyMods({
            cs: beatmap.circleSize,
            ar: beatmap.approachRate,
            od: beatmap.overallDifficulty,
            hp: beatmap.hpDrainRate
        });
        
        // Calculate effective values
        this.circleRadius = calculateCircleRadius(modifiedDiff.cs);
        this.approachTime = calculateApproachTime(modifiedDiff.ar);
        this.hitWindows = calculateTimingWindows(modifiedDiff.od);
        this.effectiveHP = modifiedDiff.hp;
        
        // Create hit objects from beatmap data
        this.createHitObjects(beatmap);
        
        // Apply Hard Rock flip if needed
        if (this.mods.shouldFlipVertically()) {
            this.flipHitObjectsY();
        }
        
        // Reset systems
        this.scoring.reset();
        this.scoring.setModMultiplier(this.mods.getScoreMultiplier());
        this.effects.clear();
        this.activeObjectIndex = 0;
        
        // Setup autoplay mode
        if (this.mods.isModActive(MOD_FLAGS.AUTO)) {
            this.autoplay.setMode('auto');
        } else if (this.mods.isModActive(MOD_FLAGS.RELAX)) {
            this.autoplay.setMode('relax');
        } else if (this.mods.isModActive(MOD_FLAGS.AUTOPILOT)) {
            this.autoplay.setMode('autopilot');
        } else {
            this.autoplay.setMode('none');
        }
        
        // Set audio playback rate
        this.audio.setPlaybackRate(this.mods.getSpeedMultiplier());
        
        // Reset timing
        this.totalPausedTime = 0;
        this.pauseStartTime = 0;
        
        // Show countdown
        this.changeState(GameState.COUNTDOWN);
        await this.ui.showCountdown();
        
        // Start the game loop
        this.startGameLoop();
    }

    /**
     * Create hit object instances from beatmap data
     */
    createHitObjects(beatmap) {
        this.hitObjects = [];
        
        if (!beatmap.hitObjects || !Array.isArray(beatmap.hitObjects)) return;
        
        beatmap.hitObjects.forEach((objData, index) => {
            let hitObject = null;
            
            try {
                // Determine object type from type bitmask
                const isCircle = (objData.type & 1) !== 0;
                const isSlider = (objData.type & 2) !== 0;
                const isSpinner = (objData.type & 8) !== 0;
                
                if (isCircle) {
                    // Circle
                    hitObject = new Circle(
                        objData.x || 0,
                        objData.y || 0,
                        objData.time || 0,
                        objData.comboNumber || 1,
                        objData.comboColorIndex || 0
                    );
                } else if (isSlider) {
                    // Slider
                    hitObject = new Slider(
                        objData.x || 0,
                        objData.y || 0,
                        objData.time || 0,
                        objData.comboNumber || 1,
                        objData.comboColorIndex || 0,
                        objData.curveType || 'L',
                        objData.controlPoints || [],
                        objData.slides || 1,
                        objData.length || 100,
                        objData.duration || 500,
                        objData.curvePoints || []
                    );
                } else if (isSpinner) {
                    // Spinner
                    hitObject = new Spinner(
                        objData.time || 0,
                        objData.endTime || (objData.time + 3000)
                    );
                }
                
                if (hitObject) {
                    hitObject.index = index;
                    hitObject.resultProcessed = false;
                    this.hitObjects.push(hitObject);
                }
            } catch (err) {
                console.warn(`Failed to create hit object at index ${index}:`, err);
            }
        });
        
        // Sort by time to ensure proper order
        this.hitObjects.sort((a, b) => a.time - b.time);
    }

    /**
     * Flip all hit objects vertically (for Hard Rock)
     */
    flipHitObjectsY() {
        this.hitObjects.forEach(obj => {
            if (obj.y !== undefined) {
                obj.y = OSU_PLAYFIELD.HEIGHT - obj.y;
            }
            
            // Flip slider control points
            if (obj.controlPoints) {
                obj.controlPoints = obj.controlPoints.map(p => ({
                    x: p.x,
                    y: OSU_PLAYFIELD.HEIGHT - p.y
                }));
            }
            
            // Flip curve points
            if (obj.curvePoints) {
                obj.curvePoints = obj.curvePoints.map(p => ({
                    x: p.x,
                    y: OSU_PLAYFIELD.HEIGHT - p.y
                }));
            }
        });
    }

    /**
     * Start the main game loop
     */
    startGameLoop() {
        this.gameStartTime = performance.now();
        this.lastFrameTime = this.gameStartTime;
        
        // Start audio with lead-in
        const firstObjectTime = this.hitObjects.length > 0 ? this.hitObjects[0].time : 0;
        const leadIn = Math.max(this.leadInTime, this.approachTime + 500);
        
        this.audio.play(-leadIn);
        
        this.changeState(GameState.PLAYING);
        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    /**
     * Stop the game loop
     */
    stopGameLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.audio.stop();
    }

    /**
     * Main game loop
     */
    gameLoop(timestamp) {
        if (this.state !== GameState.PLAYING) return;
        
        const deltaTime = Math.min(timestamp - this.lastFrameTime, 100); // Cap at 100ms
        this.lastFrameTime = timestamp;
        
        // Get current time from audio (fallback to performance timer if audio unavailable)
        try {
            this.currentTime = this.audio.getCurrentTime() + this.audioOffset;
        } catch (err) {
            // Fallback timing if audio fails
            this.currentTime = timestamp - this.gameStartTime - this.totalPausedTime - this.leadInTime;
        }
        
        // Update input
        this.input.update();
        
        // Get cursor position
        const playfieldRect = this.renderer.getPlayfieldRect();
        let cursor = this.input.getOsuPosition(playfieldRect);
        
        // Ensure cursor has valid values
        if (!cursor || isNaN(cursor.x) || isNaN(cursor.y)) {
            cursor = { x: OSU_PLAYFIELD.WIDTH / 2, y: OSU_PLAYFIELD.HEIGHT / 2 };
        }
        
        // Handle autoplay
        const autoResult = this.autoplay.update(
            this.currentTime, 
            this.hitObjects, 
            this.circleRadius,
            this.approachTime
        );
        
        if (autoResult && autoResult.x !== null && !isNaN(autoResult.x)) {
            cursor = { x: autoResult.x, y: autoResult.y };
        }
        
        // Determine action state (check for autoplay modes)
        const isAutoplay = this.autoplay.mode === 'auto' || this.autoplay.mode === 'relax';
        const isAutopilot = this.autoplay.mode === 'auto' || this.autoplay.mode === 'autopilot';
        
        let actionPressed, actionJustPressed;
        
        if (isAutoplay) {
            // Auto or Relax: autoplay handles clicking
            actionPressed = autoResult.click === 'press' || autoResult.click === 'hold';
            actionJustPressed = autoResult.click === 'press';
        } else {
            // Player handles clicking
            actionPressed = this.input.isActionPressed();
            actionJustPressed = this.input.isActionJustPressed();
        }
        
        // Update effects
        this.effects.update(deltaTime, timestamp);
        this.effects.addCursorPoint(cursor.x, cursor.y, timestamp);
        
        // Update hit objects
        this.updateHitObjects({ actionPressed, actionJustPressed }, cursor);
        
        // Apply HP drain (reduced drain rate to make it more forgiving)
        if (!this.mods.isModActive(MOD_FLAGS.NO_FAIL)) {
            this.scoring.applyHealthDrain(deltaTime * 0.5, this.effectiveHP);
        }
        
        // Check fail condition
        if (this.scoring.isFailed() && !this.mods.isModActive(MOD_FLAGS.NO_FAIL)) {
            this.changeState(GameState.FAILED);
            return;
        }
        
        // Check if map is complete
        if (this.isMapComplete()) {
            this.changeState(GameState.RESULTS);
            return;
        }
        
        // Render
        this.render(cursor, actionPressed);
        
        // Update HUD
        this.ui.updateHUD({
            score: this.scoring.score,
            combo: this.scoring.combo,
            accuracy: this.scoring.accuracy,
            health: this.scoring.health
        });
        
        // Continue loop
        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    /**
     * Update all active hit objects
     */
    updateHitObjects(input, cursor) {
        const { actionPressed, actionJustPressed } = input;
        
        // Get visible range
        const visibleStart = this.currentTime - 500; // 500ms after hit time for fadeout
        const visibleEnd = this.currentTime + this.approachTime + 100;
        
        for (let i = this.activeObjectIndex; i < this.hitObjects.length; i++) {
            const obj = this.hitObjects[i];
            
            // Skip if too far in future
            if (obj.time > visibleEnd) break;
            
            // Skip already finished objects
            if (obj.isFinished()) {
                if (!obj.resultProcessed) {
                    this.processHitResult(obj);
                    obj.resultProcessed = true;
                }
                continue;
            }
            
            // Update object
            obj.update(
                this.currentTime,
                this.approachTime,
                { isActionPressed: () => actionPressed, isActionJustPressed: () => actionJustPressed },
                cursor,
                this.circleRadius,
                this.hitWindows
            );
        }
        
        // Advance active index past finished objects
        while (
            this.activeObjectIndex < this.hitObjects.length && 
            this.hitObjects[this.activeObjectIndex].isFinished() &&
            this.hitObjects[this.activeObjectIndex].resultProcessed
        ) {
            this.activeObjectIndex++;
        }
    }

    /**
     * Process hit result from a hit object
     */
    processHitResult(obj) {
        const result = obj.hitResult;
        
        this.scoring.processHit(result, obj.type === 'slider', obj.type === 'spinner');
        
        // Add hit burst effect
        const burstX = obj.type === 'spinner' ? OSU_PLAYFIELD.WIDTH / 2 : obj.x;
        const burstY = obj.type === 'spinner' ? OSU_PLAYFIELD.HEIGHT / 2 : obj.y;
        this.effects.addHitBurst(burstX, burstY, result, performance.now());
        
        // Add particles on hit (not miss)
        if (result !== 'miss' && result !== 0) {
            const colorIndex = obj.comboColorIndex || 0;
            const colors = this.beatmap.comboColors || ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
            const color = colors[colorIndex % colors.length];
            this.effects.addHitParticles(burstX, burstY, color, 8);
        }
    }

    /**
     * Check if all hit objects are finished
     */
    isMapComplete() {
        if (this.hitObjects.length === 0) return false;
        
        return this.hitObjects.every(obj => obj.isFinished() && obj.resultProcessed);
    }

    /**
     * Render the game
     */
    render(cursor, isPressed) {
        this.renderer.clear();
        this.renderer.drawPlayfieldBorder();
        
        const flipY = this.mods.shouldFlipVertically();
        const isHidden = this.mods.isModActive(MOD_FLAGS.HIDDEN);
        
        // Get visible objects
        const visibleObjects = this.getVisibleObjects();
        
        // Draw hit objects (reverse order for proper layering)
        const colors = this.beatmap.comboColors || ['#ff66aa', '#66aaff', '#aaff66', '#ffaa66'];
        
        for (let i = visibleObjects.length - 1; i >= 0; i--) {
            const obj = visibleObjects[i];
            const color = colors[obj.comboColorIndex % colors.length];
            
            switch (obj.type) {
                case 'circle':
                    this.renderer.drawCircle(obj, this.circleRadius, color, isHidden, flipY);
                    break;
                case 'slider':
                    this.renderer.drawSlider(obj, this.circleRadius, color, isHidden, flipY);
                    break;
                case 'spinner':
                    this.renderer.drawSpinner(obj, flipY);
                    break;
            }
        }
        
        // Draw effects
        const hitBursts = this.effects.getHitBursts();
        hitBursts.forEach(burst => {
            this.renderer.drawHitBurst(burst, flipY);
        });
        
        // Draw cursor trail
        const cursorTrail = this.effects.getCursorTrail();
        this.renderer.drawCursorTrail(cursorTrail, flipY);
        
        // Draw cursor
        this.renderer.drawCursor(cursor.x, cursor.y, isPressed, flipY);
        
        // Draw flashlight if active
        if (this.mods.isModActive(MOD_FLAGS.FLASHLIGHT)) {
            this.renderer.drawFlashlight(cursor.x, cursor.y, flipY);
        }
    }

    /**
     * Get currently visible hit objects
     */
    getVisibleObjects() {
        const visible = [];
        const visibleEnd = this.currentTime + this.approachTime + 100;
        
        for (let i = this.activeObjectIndex; i < this.hitObjects.length; i++) {
            const obj = this.hitObjects[i];
            
            if (obj.time > visibleEnd) break;
            
            // Include if not finished or still fading out
            if (!obj.isFinished() || obj.opacity > 0) {
                visible.push(obj);
            }
        }
        
        return visible;
    }

    /**
     * Pause the game
     */
    pauseGame() {
        if (this.state !== GameState.PLAYING) return;
        
        this.pauseStartTime = performance.now();
        this.audio.pause();
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this.changeState(GameState.PAUSED);
    }

    /**
     * Resume the game
     */
    resumeGame() {
        if (this.state !== GameState.PAUSED) return;
        
        this.totalPausedTime += performance.now() - this.pauseStartTime;
        this.audio.resume();
        
        this.changeState(GameState.PLAYING);
        this.lastFrameTime = performance.now();
        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    /**
     * Retry the current beatmap
     */
    async retryGame() {
        this.stopGameLoop();
        this.ui.cleanup();
        
        if (this.beatmap) {
            await this.startGame(this.beatmap);
        }
    }

    /**
     * Quit to song select
     */
    quitToSongSelect() {
        this.stopGameLoop();
        this.ui.cleanup();
        this.changeState(GameState.SONG_SELECT);
    }

    /**
     * Show results screen
     */
    showResults() {
        this.stopGameLoop();
        
        const resultData = this.scoring.getResultData();
        resultData.title = this.beatmap.title;
        resultData.version = this.beatmap.version;
        
        this.ui.showResults(resultData);
        
        // Save high score
        this.saveHighScore(resultData);
    }

    /**
     * Show failed screen
     */
    showFailed() {
        this.stopGameLoop();
        this.ui.showFailed();
    }

    /**
     * Save high score to localStorage
     */
    saveHighScore(data) {
        try {
            const beatmapId = this.beatmap.beatmapId || this.beatmap.title;
            const key = `${this.storagePrefix}highScores`;
            const scoreKey = `${beatmapId}_${this.mods.activeMods}`;
            
            const existing = JSON.parse(localStorage.getItem(key) || '{}');
            
            if (!existing[scoreKey] || data.score > existing[scoreKey].score) {
                existing[scoreKey] = {
                    score: data.score,
                    accuracy: data.accuracy,
                    grade: data.grade,
                    maxCombo: data.maxCombo,
                    mods: this.mods.activeMods,
                    date: new Date().toISOString()
                };
                localStorage.setItem(key, JSON.stringify(existing));
            }
        } catch (error) {
            console.error('Failed to save high score:', error);
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.renderer.calculatePlayfield();
    }
}

export default Game;
