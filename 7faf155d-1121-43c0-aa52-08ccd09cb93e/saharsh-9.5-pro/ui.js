/**
 * ui.js - UI Management for osu! Web Clone
 * Handles all screen transitions, HUD updates, mod buttons, and results display
 * Dependencies: constants.js, mods.js, scoring.js (for display data)
 */

import { GRADES, MOD_FLAGS } from './constants.js';

export class UIManager {
    constructor() {
        this.screens = {};
        this.currentScreen = null;
        this.hud = {};
        this.modButtons = [];
        this.resultsElements = {};
        this.callbacks = {};
        this.countdownElement = null;
        this.countdownTimeout = null;
    }

    /**
     * Initialize all UI elements and cache DOM references
     */
    init() {
        this.initScreens();
        this.initHUD();
        this.initResultsElements();
        this.initModButtons();
        this.initEventListeners();
    }

    /**
     * Cache all screen DOM elements
     */
    initScreens() {
        const screenIds = [
            'loading-screen',
            'menu-screen',
            'song-select-screen',
            'mod-select-screen',
            'gameplay-screen',
            'pause-screen',
            'results-screen',
            'failed-screen'
        ];

        screenIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.screens[id] = element;
            }
        });

        // Loading specific elements
        this.loadingProgress = document.getElementById('loading-progress');
        this.loadingText = document.getElementById('loading-text');
        this.loadingBar = document.getElementById('loading-bar');
    }

    /**
     * Initialize HUD elements
     */
    initHUD() {
        this.hud = {
            score: document.getElementById('hud-score'),
            combo: document.getElementById('hud-combo'),
            accuracy: document.getElementById('hud-accuracy'),
            healthBar: document.getElementById('health-bar-fill'),
            healthContainer: document.getElementById('health-bar')
        };
    }

    /**
     * Initialize results screen elements
     */
    initResultsElements() {
        this.resultsElements = {
            grade: document.getElementById('result-grade'),
            score: document.getElementById('result-score'),
            accuracy: document.getElementById('result-accuracy'),
            maxCombo: document.getElementById('result-max-combo'),
            count300: document.getElementById('result-300'),
            count100: document.getElementById('result-100'),
            count50: document.getElementById('result-50'),
            countMiss: document.getElementById('result-miss'),
            title: document.getElementById('result-title'),
            version: document.getElementById('result-version')
        };
    }

    /**
     * Initialize mod buttons and their click handlers
     */
    initModButtons() {
        const modContainer = document.getElementById('mod-buttons');
        if (!modContainer) return;

        const modDefinitions = [
            { id: 'EZ', name: 'Easy', flag: MOD_FLAGS.EASY, desc: 'Reduces difficulty' },
            { id: 'NF', name: 'No Fail', flag: MOD_FLAGS.NO_FAIL, desc: 'Cannot fail' },
            { id: 'HT', name: 'Half Time', flag: MOD_FLAGS.HALF_TIME, desc: '0.75x speed' },
            { id: 'HR', name: 'Hard Rock', flag: MOD_FLAGS.HARD_ROCK, desc: 'Increases difficulty' },
            { id: 'DT', name: 'Double Time', flag: MOD_FLAGS.DOUBLE_TIME, desc: '1.5x speed' },
            { id: 'HD', name: 'Hidden', flag: MOD_FLAGS.HIDDEN, desc: 'Fading circles' },
            { id: 'FL', name: 'Flashlight', flag: MOD_FLAGS.FLASHLIGHT, desc: 'Limited vision' },
            { id: 'RX', name: 'Relax', flag: MOD_FLAGS.RELAX, desc: 'Auto click' },
            { id: 'AP', name: 'Autopilot', flag: MOD_FLAGS.AUTOPILOT, desc: 'Auto aim' },
            { id: 'AT', name: 'Auto', flag: MOD_FLAGS.AUTO, desc: 'Watch autoplay' }
        ];

        modContainer.innerHTML = '';
        
        modDefinitions.forEach(mod => {
            const button = document.createElement('button');
            button.className = 'mod-button';
            button.dataset.flag = mod.flag;
            button.dataset.id = mod.id;
            button.innerHTML = `
                <span class="mod-id">${mod.id}</span>
                <span class="mod-name">${mod.name}</span>
            `;
            button.title = mod.desc;
            
            button.addEventListener('click', () => {
                this.emit('modToggle', mod.flag);
            });
            
            modContainer.appendChild(button);
            this.modButtons.push({ element: button, flag: mod.flag });
        });
    }

    /**
     * Initialize main event listeners for UI buttons
     */
    initEventListeners() {
        // Menu buttons
        this.addClickListener('btn-play', () => this.emit('play'));
        
        // Song select buttons
        this.addClickListener('btn-mods', () => this.emit('openMods'));
        this.addClickListener('btn-back-menu', () => this.emit('backToMenu'));
        this.addClickListener('btn-start-game', () => this.emit('startGame'));
        
        // Mod select buttons
        this.addClickListener('btn-close-mods', () => this.emit('closeMods'));
        this.addClickListener('btn-reset-mods', () => this.emit('resetMods'));
        
        // Pause screen buttons
        this.addClickListener('btn-resume', () => this.emit('resume'));
        this.addClickListener('btn-retry-pause', () => this.emit('retry'));
        this.addClickListener('btn-quit-pause', () => this.emit('quit'));
        
        // Results screen buttons
        this.addClickListener('btn-retry-results', () => this.emit('retry'));
        this.addClickListener('btn-back-results', () => this.emit('quit'));
        
        // Failed screen buttons
        this.addClickListener('btn-retry-failed', () => this.emit('retry'));
        this.addClickListener('btn-quit-failed', () => this.emit('quit'));
    }

    /**
     * Helper to add click listener to element by ID
     */
    addClickListener(id, callback) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', callback);
        }
    }

    /**
     * Event emitter pattern for UI events
     */
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(cb => cb(data));
        }
    }

    /**
     * Show a specific screen, hiding all others
     */
    showScreen(screenId) {
        Object.values(this.screens).forEach(screen => {
            if (screen) {
                screen.classList.remove('active');
                screen.style.display = 'none';
            }
        });

        const screen = this.screens[screenId];
        if (screen) {
            screen.style.display = 'flex';
            // Force reflow for animation
            screen.offsetHeight;
            screen.classList.add('active');
            this.currentScreen = screenId;
        }
    }

    /**
     * Update loading screen progress
     */
    updateLoadingProgress(progress, text = '') {
        if (this.loadingBar) {
            this.loadingBar.style.width = `${progress * 100}%`;
        }
        if (this.loadingText && text) {
            this.loadingText.textContent = text;
        }
        if (this.loadingProgress) {
            this.loadingProgress.textContent = `${Math.round(progress * 100)}%`;
        }
    }

    /**
     * Update HUD elements during gameplay
     */
    updateHUD(data) {
        if (this.hud.score) {
            this.hud.score.textContent = String(data.score).padStart(8, '0');
        }
        
        if (this.hud.combo) {
            this.hud.combo.textContent = data.combo > 0 ? `${data.combo}x` : '';
        }
        
        if (this.hud.accuracy) {
            this.hud.accuracy.textContent = `${data.accuracy.toFixed(2)}%`;
        }
        
        if (this.hud.healthBar) {
            this.hud.healthBar.style.width = `${data.health}%`;
            
            // Color based on health level
            if (data.health > 50) {
                this.hud.healthBar.style.backgroundColor = '#4ade80';
            } else if (data.health > 25) {
                this.hud.healthBar.style.backgroundColor = '#fb923c';
            } else {
                this.hud.healthBar.style.backgroundColor = '#ef4444';
            }
        }
    }

    /**
     * Update mod button visual states
     */
    updateModButtons(activeMods) {
        this.modButtons.forEach(({ element, flag }) => {
            if (activeMods & flag) {
                element.classList.add('active');
            } else {
                element.classList.remove('active');
            }
        });

        // Update score multiplier display
        this.updateScoreMultiplier(activeMods);
    }

    /**
     * Update score multiplier display based on active mods
     */
    updateScoreMultiplier(activeMods) {
        const multiplierElement = document.getElementById('score-multiplier');
        if (!multiplierElement) return;

        let multiplier = 1.0;
        
        if (activeMods & MOD_FLAGS.EASY) multiplier *= 0.5;
        if (activeMods & MOD_FLAGS.NO_FAIL) multiplier *= 0.5;
        if (activeMods & MOD_FLAGS.HALF_TIME) multiplier *= 0.3;
        if (activeMods & MOD_FLAGS.HARD_ROCK) multiplier *= 1.06;
        if (activeMods & MOD_FLAGS.DOUBLE_TIME) multiplier *= 1.12;
        if (activeMods & MOD_FLAGS.HIDDEN) multiplier *= 1.06;
        if (activeMods & MOD_FLAGS.FLASHLIGHT) multiplier *= 1.12;
        
        // Unranked mods
        if (activeMods & (MOD_FLAGS.RELAX | MOD_FLAGS.AUTOPILOT | MOD_FLAGS.AUTO)) {
            multiplier = 0;
        }

        multiplierElement.textContent = multiplier === 0 
            ? 'Unranked' 
            : `${multiplier.toFixed(2)}x`;
    }

    /**
     * Show countdown before gameplay starts
     */
    async showCountdown() {
        return new Promise(resolve => {
            this.countdownElement = document.getElementById('countdown');
            if (!this.countdownElement) {
                resolve();
                return;
            }

            this.countdownElement.style.display = 'flex';
            let count = 3;
            
            const updateCountdown = () => {
                if (count > 0) {
                    this.countdownElement.textContent = count;
                    this.countdownElement.classList.remove('pulse');
                    void this.countdownElement.offsetWidth; // Force reflow
                    this.countdownElement.classList.add('pulse');
                    count--;
                    this.countdownTimeout = setTimeout(updateCountdown, 1000);
                } else if (count === 0) {
                    this.countdownElement.textContent = 'GO!';
                    this.countdownElement.classList.remove('pulse');
                    void this.countdownElement.offsetWidth;
                    this.countdownElement.classList.add('pulse');
                    count--;
                    this.countdownTimeout = setTimeout(updateCountdown, 500);
                } else {
                    this.countdownElement.style.display = 'none';
                    resolve();
                }
            };
            
            updateCountdown();
        });
    }

    /**
     * Cancel any active countdown
     */
    cancelCountdown() {
        if (this.countdownTimeout) {
            clearTimeout(this.countdownTimeout);
            this.countdownTimeout = null;
        }
        if (this.countdownElement) {
            this.countdownElement.style.display = 'none';
        }
    }

    /**
     * Show results screen with game data
     */
    showResults(data) {
        // Update all result fields
        if (this.resultsElements.grade) {
            this.resultsElements.grade.textContent = data.grade;
            this.resultsElements.grade.className = `grade grade-${data.grade.toLowerCase().replace('+', 'plus')}`;
        }
        
        if (this.resultsElements.score) {
            this.resultsElements.score.textContent = data.score.toLocaleString();
        }
        
        if (this.resultsElements.accuracy) {
            this.resultsElements.accuracy.textContent = `${data.accuracy.toFixed(2)}%`;
        }
        
        if (this.resultsElements.maxCombo) {
            this.resultsElements.maxCombo.textContent = `${data.maxCombo}x`;
        }
        
        if (this.resultsElements.count300) {
            this.resultsElements.count300.textContent = data.count300;
        }
        
        if (this.resultsElements.count100) {
            this.resultsElements.count100.textContent = data.count100;
        }
        
        if (this.resultsElements.count50) {
            this.resultsElements.count50.textContent = data.count50;
        }
        
        if (this.resultsElements.countMiss) {
            this.resultsElements.countMiss.textContent = data.countMiss;
        }
        
        if (this.resultsElements.title) {
            this.resultsElements.title.textContent = data.title || 'Unknown';
        }
        
        if (this.resultsElements.version) {
            this.resultsElements.version.textContent = data.version || '';
        }

        this.showScreen('results-screen');
    }

    /**
     * Show failed screen
     */
    showFailed() {
        this.showScreen('failed-screen');
    }

    /**
     * Show pause overlay
     */
    showPause() {
        const pauseScreen = this.screens['pause-screen'];
        if (pauseScreen) {
            pauseScreen.style.display = 'flex';
            pauseScreen.classList.add('active');
        }
    }

    /**
     * Hide pause overlay
     */
    hidePause() {
        const pauseScreen = this.screens['pause-screen'];
        if (pauseScreen) {
            pauseScreen.classList.remove('active');
            pauseScreen.style.display = 'none';
        }
    }

    /**
     * Update song info display in song select
     */
    updateSongInfo(beatmap) {
        const titleEl = document.getElementById('selected-title');
        const artistEl = document.getElementById('selected-artist');
        const mapperEl = document.getElementById('selected-mapper');
        const versionEl = document.getElementById('selected-version');
        
        if (titleEl) titleEl.textContent = beatmap.title || 'Unknown';
        if (artistEl) artistEl.textContent = beatmap.artist || 'Unknown Artist';
        if (mapperEl) mapperEl.textContent = `Mapped by ${beatmap.creator || 'Unknown'}`;
        if (versionEl) versionEl.textContent = beatmap.version || '';

        // Update difficulty stats
        this.updateDifficultyStats(beatmap);
    }

    /**
     * Update difficulty stats display
     */
    updateDifficultyStats(beatmap) {
        const stats = [
            { id: 'stat-cs', value: beatmap.circleSize },
            { id: 'stat-ar', value: beatmap.approachRate },
            { id: 'stat-od', value: beatmap.overallDifficulty },
            { id: 'stat-hp', value: beatmap.hpDrainRate }
        ];

        stats.forEach(stat => {
            const el = document.getElementById(stat.id);
            const barEl = document.getElementById(`${stat.id}-bar`);
            
            if (el) {
                el.textContent = stat.value?.toFixed(1) || '0';
            }
            if (barEl) {
                barEl.style.width = `${(stat.value || 0) * 10}%`;
            }
        });

        // Object count
        const objectCountEl = document.getElementById('object-count');
        if (objectCountEl && beatmap.hitObjects) {
            objectCountEl.textContent = `${beatmap.hitObjects.length} objects`;
        }
    }

    /**
     * Show error message to user
     */
    showError(message) {
        const errorEl = document.getElementById('error-message');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 5000);
        } else {
            console.error('Game Error:', message);
        }
    }

    /**
     * Reset HUD to initial values
     */
    resetHUD() {
        this.updateHUD({
            score: 0,
            combo: 0,
            accuracy: 100,
            health: 100
        });
    }

    /**
     * Cleanup UI state
     */
    cleanup() {
        this.cancelCountdown();
        this.hidePause();
    }
}

export default UIManager;
