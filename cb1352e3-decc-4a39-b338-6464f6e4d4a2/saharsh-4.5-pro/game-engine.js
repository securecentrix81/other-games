/**
 * Eric m failing class - Core Game Engine
 * 
 * Purpose: Main game engine handling state management, input, rendering, and scene transitions
 * Dependencies: This file requires index.html to be loaded first
 * Exports: window.GameEngine - Main game engine instance
 */

class GameEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.scene = null;
        this.state = 'menu'; // menu, playing, battle, dialogue, inventory, map, settings
        this.gameData = {};
        this.input = {};
        this.ui = {};
        this.audio = null;
        this.renderer = null;
        this.camera = null;
        this.loadingProgress = 0;
        
        // Game systems
        this.character = null;
        this.inventory = null;
        this.combat = null;
        this.school = null;
        this.dialogue = null;
        this.save = null;
        
        // Time management
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 60;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        try {
            // Get canvas and context
            this.canvas = document.getElementById('game-canvas');
            this.ctx = this.canvas.getContext('2d');
            
            // Setup canvas
            this.setupCanvas();
            
            // Initialize UI references
            this.initUI();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize game systems
            await this.initGameSystems();
            
            // Start game loop
            this.gameLoop(0);
            
            console.log('Game Engine initialized successfully');
        } catch (error) {
            console.error('Failed to initialize game engine:', error);
            this.showError('Failed to initialize game. Please refresh the page.');
        }
    }

    setupCanvas() {
        // Set canvas size
        this.resizeCanvas();
        
        // Setup 2D context
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.textBaseline = 'top';
        
        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        if (!this.canvas) return;
        
        const container = document.getElementById('game-canvas-container');
        const rect = container.getBoundingClientRect();
        
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    initUI() {
        // Store UI element references
        this.ui = {
            // Main menu
            mainMenu: document.getElementById('main-menu'),
            newGameBtn: document.getElementById('new-game-btn'),
            continueBtn: document.getElementById('continue-btn'),
            helpBtn: document.getElementById('help-btn'),
            
            // Header
            currentWeekSpan: document.getElementById('current-week'),
            
            // HUD
            playerHUD: document.getElementById('player-hud'),
            healthFill: document.getElementById('health-fill'),
            healthText: document.getElementById('health-text'),
            stressFill: document.getElementById('stress-fill'),
            stressText: document.getElementById('stress-text'),
            knowledgeText: document.getElementById('knowledge-text'),
            levelText: document.getElementById('level-text'),
            expText: document.getElementById('exp-text'),
            
            // Panels
            inventoryPanel: document.getElementById('inventory-panel'),
            inventoryToggle: document.getElementById('inventory-toggle'),
            inventoryGrid: document.getElementById('inventory-grid'),
            settingsPanel: document.getElementById('settings-panel'),
            settingsBtn: document.getElementById('settings-btn'),
            settingsClose: document.getElementById('settings-close'),
            helpPanel: document.getElementById('help-panel'),
            helpClose: document.getElementById('help-close'),
            saveLoadPanel: document.getElementById('save-load-panel'),
            saveLoadTitle: document.getElementById('save-load-title'),
            saveLoadClose: document.getElementById('save-load-close'),
            
            // Save/Load buttons
            saveBtn: document.getElementById('save-btn'),
            loadBtn: document.getElementById('load-btn'),
            
            // School map
            schoolMap: document.getElementById('school-map'),
            mapClose: document.getElementById('map-close'),
            
            // Dialogue
            dialogueContainer: document.getElementById('dialogue-container'),
            dialogueName: document.getElementById('dialogue-name'),
            dialogueText: document.getElementById('dialogue-text'),
            dialogueChoices: document.getElementById('dialogue-choices'),
            dialoguePortrait: document.getElementById('dialogue-portrait'),
            
            // Battle interface
            battleInterface: document.getElementById('battle-interface'),
            enemyName: document.getElementById('enemy-name'),
            enemyHealthFill: document.getElementById('enemy-health-fill'),
            enemyHealthText: document.getElementById('enemy-health-text'),
            playerHealthFill: document.getElementById('player-health-fill'),
            playerHealthText: document.getElementById('player-health-text'),
            battleLog: document.getElementById('battle-log'),
            attackBtn: document.getElementById('attack-btn'),
            defendBtn: document.getElementById('defend-btn'),
            itemBtn: document.getElementById('item-btn'),
            specialBtn: document.getElementById('special-btn'),
            
            // Loading screen
            loadingScreen: document.getElementById('loading-screen'),
            loadingProgress: document.getElementById('loading-progress'),
            loadingText: document.getElementById('loading-text'),
            
            // Settings controls
            masterVolume: document.getElementById('master-volume'),
            musicVolume: document.getElementById('music-volume'),
            sfxVolume: document.getElementById('sfx-volume'),
            textSpeed: document.getElementById('text-speed')
        };
    }

    setupEventListeners() {
        // Keyboard input
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Mouse input for UI
        document.addEventListener('click', (e) => this.handleMouseClick(e));
        
        // Menu buttons
        this.ui.newGameBtn?.addEventListener('click', () => this.newGame());
        this.ui.continueBtn?.addEventListener('click', () => this.loadGame());
        this.ui.helpBtn?.addEventListener('click', () => this.showHelp());
        
        // Panel toggles
        this.ui.inventoryToggle?.addEventListener('click', () => this.toggleInventory());
        this.ui.settingsBtn?.addEventListener('click', () => this.showSettings());
        this.ui.settingsClose?.addEventListener('click', () => this.hideSettings());
        this.ui.helpClose?.addEventListener('click', () => this.hideHelp());
        this.ui.saveLoadClose?.addEventListener('click', () => this.hideSaveLoad());
        this.ui.mapClose?.addEventListener('click', () => this.hideMap());
        
        // Save/Load buttons
        this.ui.saveBtn?.addEventListener('click', () => this.showSave());
        this.ui.loadBtn?.addEventListener('click', () => this.showLoad());
        
        // Settings controls
        this.ui.masterVolume?.addEventListener('input', (e) => this.updateVolume('master', e.target.value));
        this.ui.musicVolume?.addEventListener('input', (e) => this.updateVolume('music', e.target.value));
        this.ui.sfxVolume?.addEventListener('input', (e) => this.updateVolume('sfx', e.target.value));
        this.ui.textSpeed?.addEventListener('change', (e) => this.updateTextSpeed(e.target.value));
        
        // Battle actions
        this.ui.attackBtn?.addEventListener('click', () => this.handleBattleAction('attack'));
        this.ui.defendBtn?.addEventListener('click', () => this.handleBattleAction('defend'));
        this.ui.itemBtn?.addEventListener('click', () => this.handleBattleAction('item'));
        this.ui.specialBtn?.addEventListener('click', () => this.handleBattleAction('special'));
        
        // Prevent context menu on canvas
        this.canvas?.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    async initGameSystems() {
        try {
            this.updateLoadingProgress(10, 'Initializing audio system...');
            
            // Initialize audio system
            if (typeof Howler !== 'undefined') {
                this.audio = new AudioSystem(this);
            }
            
            this.updateLoadingProgress(25, 'Loading game data...');
            
            // Initialize game data structure
            this.gameData = {
                week: 1,
                maxWeeks: 10,
                player: {
                    name: 'Eric M.',
                    level: 1,
                    exp: 0,
                    expToNext: 100,
                    health: 100,
                    maxHealth: 100,
                    stress: 0,
                    maxStress: 100,
                    knowledge: 50,
                    stats: {
                        attack: 15,
                        defense: 10,
                        speed: 12,
                        intelligence: 18
                    },
                    abilities: ['Speed Dash'],
                    inventory: [
                        { id: 'notebook', name: 'Notebook', type: 'tool', quantity: 1 },
                        { id: 'pencil', name: 'Pencil', type: 'weapon', quantity: 3 },
                        { id: 'energy_drink', name: 'Energy Drink', type: 'consumable', quantity: 2 }
                    ]
                },
                school: {
                    currentArea: 'hallway1',
                    unlockedAreas: ['hallway1', 'classroom1', 'library'],
                    visitedAreas: ['hallway1'],
                    teacherPursuit: {
                        active: false,
                        strength: 1,
                        lastSeen: null
                    }
                },
                story: {
                    flags: {},
                    completedQuests: [],
                    currentQuest: null
                }
            };
            
            this.updateLoadingProgress(50, 'Setting up character system...');
            
            // Initialize character system
            this.character = new CharacterSystem(this);
            
            this.updateLoadingProgress(60, 'Initializing inventory system...');
            
            // Initialize inventory system
            this.inventory = new InventorySystem(this);
            
            this.updateLoadingProgress(70, 'Loading school areas...');
            
            // Initialize school system
            this.school = new SchoolSystem(this);
            
            this.updateLoadingProgress(80, 'Initializing enemies and rivals...');
            
            // Initialize enemies and rivals system
            this.enemiesAndRivals = new EnemiesAndRivals(this);
            
            this.updateLoadingProgress(85, 'Setting up combat system...');
            
            // Initialize combat system
            this.combat = new CombatSystem(this);
            
            this.updateLoadingProgress(90, 'Loading dialogue system...');
            
            // Initialize dialogue system
            this.dialogue = new DialogueSystem(this);
            
            // Initialize teacher AI
            this.teacherAI = new TeacherAI(this);
            
            this.updateLoadingProgress(95, 'Setting up save system...');
            
            // Initialize save system
            this.save = new SaveSystem(this);
            
            this.updateLoadingProgress(100, 'Ready!');
            
            // Hide loading screen after a brief delay
            setTimeout(() => {
                this.hideLoadingScreen();
                this.showMainMenu();
            }, 500);
            
        } catch (error) {
            console.error('Failed to initialize game systems:', error);
            throw error;
        }
    }

    updateLoadingProgress(progress, text) {
        this.loadingProgress = progress;
        if (this.ui.loadingProgress) {
            this.ui.loadingProgress.style.width = `${progress}%`;
        }
        if (this.ui.loadingText && text) {
            this.ui.loadingText.textContent = text;
        }
    }

    hideLoadingScreen() {
        if (this.ui.loadingScreen) {
            this.ui.loadingScreen.style.display = 'none';
        }
    }

    showMainMenu() {
        this.state = 'menu';
        if (this.ui.mainMenu) {
            this.ui.mainMenu.classList.add('menu-visible');
        }
        this.updateUI();
    }

    hideMainMenu() {
        if (this.ui.mainMenu) {
            this.ui.mainMenu.classList.remove('menu-visible');
        }
    }

    newGame() {
        this.hideMainMenu();
        this.startGame();
    }

    async startGame() {
        this.state = 'playing';
        this.gameData.week = 1;
        this.gameData.player = {
            name: 'Eric M.',
            level: 1,
            exp: 0,
            expToNext: 100,
            health: 100,
            maxHealth: 100,
            stress: 0,
            maxStress: 100,
            knowledge: 50,
            stats: {
                attack: 15,
                defense: 10,
                speed: 12,
                intelligence: 18
            },
            abilities: ['Speed Dash'],
            inventory: [
                { id: 'notebook', name: 'Notebook', type: 'tool', quantity: 1 },
                { id: 'pencil', name: 'Pencil', type: 'weapon', quantity: 3 },
                { id: 'energy_drink', name: 'Energy Drink', type: 'consumable', quantity: 2 }
            ]
        };
        
        this.character.updateStats();
        this.updateUI();
    }

    // Input handling
    handleKeyDown(e) {
        this.input[e.code] = true;
        
        // Global shortcuts
        if (e.code === 'Escape') {
            if (this.state === 'playing') {
                this.showMap();
            } else if (this.state === 'map') {
                this.hideMap();
            } else if (this.state === 'inventory') {
                this.toggleInventory();
            } else if (this.state === 'settings') {
                this.hideSettings();
            }
        }
        
        if (e.code === 'Tab') {
            e.preventDefault();
            this.toggleInventory();
        }
        
        if (e.code === 'KeyM') {
            e.preventDefault();
            if (this.state === 'playing') {
                this.showMap();
            }
        }
        
        // Game-specific input
        if (this.state === 'playing') {
            this.handleGameInput(e);
        } else if (this.state === 'battle') {
            this.handleBattleInput(e);
        }
    }

    handleKeyUp(e) {
        this.input[e.code] = false;
    }

    handleMouseClick(e) {
        // Handle UI clicks that don't have specific handlers
        if (e.target.classList.contains('map-area')) {
            this.handleMapClick(e.target.dataset.area);
        }
    }

    handleGameInput(e) {
        // Movement handling will be implemented in school system
        if (this.school) {
            this.school.handleInput(e);
        }
    }

    handleBattleInput(e) {
        // Battle input handling
        if (e.code === 'Digit1' || e.code === 'Numpad1') {
            this.handleBattleAction('attack');
        } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
            this.handleBattleAction('defend');
        } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
            this.handleBattleAction('item');
        } else if (e.code === 'Digit4' || e.code === 'Numpad4') {
            this.handleBattleAction('special');
        }
    }

    // UI Management
    toggleInventory() {
        if (this.state !== 'playing') return;
        
        const panel = this.ui.inventoryPanel;
        if (panel.classList.contains('visible')) {
            panel.classList.remove('visible');
            this.state = 'playing';
        } else {
            panel.classList.add('visible');
            this.state = 'inventory';
            this.inventory.updateDisplay();
        }
    }

    showSettings() {
        this.state = 'settings';
        this.ui.settingsPanel.classList.remove('panel-hidden');
    }

    hideSettings() {
        this.state = 'playing';
        this.ui.settingsPanel.classList.add('panel-hidden');
    }

    showHelp() {
        this.ui.helpPanel.classList.remove('panel-hidden');
    }

    hideHelp() {
        this.ui.helpPanel.classList.add('panel-hidden');
    }

    showSave() {
        this.state = 'save';
        this.ui.saveLoadTitle.textContent = 'Save Game';
        this.ui.saveLoadPanel.classList.remove('panel-hidden');
        this.save.displaySaveSlots();
    }

    showLoad() {
        this.state = 'load';
        this.ui.saveLoadTitle.textContent = 'Load Game';
        this.ui.saveLoadPanel.classList.remove('panel-hidden');
        this.save.displaySaveSlots();
    }

    hideSaveLoad() {
        this.state = 'playing';
        this.ui.saveLoadPanel.classList.add('panel-hidden');
    }

    showMap() {
        if (this.state !== 'playing') return;
        
        this.state = 'map';
        this.ui.schoolMap.classList.add('map-visible');
        this.school.updateMapDisplay();
    }

    hideMap() {
        this.state = 'playing';
        this.ui.schoolMap.classList.remove('map-visible');
    }

    handleMapClick(areaId) {
        this.school.travelToArea(areaId);
        this.hideMap();
    }

    // Battle system integration
    startBattle(enemy) {
        this.state = 'battle';
        this.ui.battleInterface.classList.add('battle-visible');
        this.combat.startBattle(enemy);
    }

    endBattle(victory = true) {
        this.state = 'playing';
        this.ui.battleInterface.classList.remove('battle-visible');
        
        if (victory) {
            this.character.gainExperience(25);
        }
    }

    handleBattleAction(action) {
        if (this.state !== 'battle') return;
        this.combat.handlePlayerAction(action);
    }

    // Dialogue system integration
    startDialogue(character, text, choices = []) {
        this.state = 'dialogue';
        this.ui.dialogueContainer.classList.add('dialogue-visible');
        this.dialogue.start(character, text, choices);
    }

    endDialogue() {
        this.state = 'playing';
        this.ui.dialogueContainer.classList.remove('dialogue-visible');
    }

    // UI Updates
    updateUI() {
        if (!this.character) return;
        
        const player = this.character.data;
        
        // Update week indicator
        if (this.ui.currentWeekSpan) {
            this.ui.currentWeekSpan.textContent = this.gameData.week;
        }
        
        // Update health
        const healthPercent = (player.health / player.maxHealth) * 100;
        if (this.ui.healthFill) {
            this.ui.healthFill.style.width = `${healthPercent}%`;
        }
        if (this.ui.healthText) {
            this.ui.healthText.textContent = `${player.health}/${player.maxHealth}`;
        }
        
        // Update stress
        const stressPercent = (player.stress / player.maxStress) * 100;
        if (this.ui.stressFill) {
            this.ui.stressFill.style.width = `${stressPercent}%`;
        }
        if (this.ui.stressText) {
            this.ui.stressText.textContent = `${player.stress}/${player.maxStress}`;
        }
        
        // Update other stats
        if (this.ui.knowledgeText) {
            this.ui.knowledgeText.textContent = player.knowledge;
        }
        if (this.ui.levelText) {
            this.ui.levelText.textContent = player.level;
        }
        if (this.ui.expText) {
            this.ui.expText.textContent = `${player.exp}/${player.expToNext}`;
        }
        
        // Update inventory display
        if (this.state === 'inventory') {
            this.inventory.updateDisplay();
        }
    }

    updateVolume(type, value) {
        if (this.audio) {
            this.audio[type] = value / 100;
            
            // Apply volume to all sounds
            Object.values(this.audio.sounds).forEach(sound => {
                if (sound) {
                    sound.volume(this.audio[type]);
                }
            });
        }
    }

    updateTextSpeed(speed) {
        this.gameData.settings = this.gameData.settings || {};
        this.gameData.settings.textSpeed = speed;
    }

    // Error handling
    showError(message) {
        console.error(message);
        // Could implement a proper error dialog here
        alert(message);
    }

    // Game Loop
    gameLoop(currentTime) {
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Update
        this.update(this.deltaTime);
        
        // Render
        this.render();
        
        // Continue loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(deltaTime) {
        // Update based on current state
        switch (this.state) {
            case 'playing':
                this.updatePlaying(deltaTime);
                break;
            case 'battle':
                this.updateBattle(deltaTime);
                break;
            case 'dialogue':
                this.updateDialogue(deltaTime);
                break;
        }
        
        // Update UI periodically
        this.uiUpdateTimer = (this.uiUpdateTimer || 0) + deltaTime;
        if (this.uiUpdateTimer > 100) { // Update UI every 100ms
            this.updateUI();
            this.uiUpdateTimer = 0;
        }
    }

    updatePlaying(deltaTime) {
        // Update school system
        if (this.school) {
            this.school.update(deltaTime);
        }
        
        // Update character
        if (this.character) {
            this.character.update(deltaTime);
        }
    }

    updateBattle(deltaTime) {
        // Update combat system
        if (this.combat) {
            this.combat.update(deltaTime);
        }
    }

    updateDialogue(deltaTime) {
        // Update dialogue system
        if (this.dialogue) {
            this.dialogue.update(deltaTime);
        }
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render based on current state
        switch (this.state) {
            case 'menu':
                this.renderMenu();
                break;
            case 'playing':
                this.renderPlaying();
                break;
            case 'battle':
                this.renderBattle();
                break;
            case 'dialogue':
                this.renderDialogue();
                break;
            default:
                this.renderPlaying();
        }
    }

    renderMenu() {
        // Menu is rendered by CSS, just show a simple background
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderPlaying() {
        // Render school area
        if (this.school) {
            this.school.render(this.ctx);
        }
        
        // Render player
        if (this.character) {
            this.character.render(this.ctx);
        }
    }

    renderBattle() {
        // Battle interface is rendered by CSS/HTML
        // Just render battle background effects if needed
        this.ctx.fillStyle = '#1a252f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderDialogue() {
        // Dialogue is rendered by CSS/HTML
        // Could add background effects here
        this.ctx.fillStyle = 'rgba(26, 37, 47, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// Export for use by other systems
window.GameEngine = GameEngine;
