/**
 * Eric m failing class - Core Game Engine
 * 
 * Purpose: Main game engine handling state management, input, rendering, and scene transitions
 * Dependencies: All other game system files must be loaded before this file
 * Exports: window.GameEngine - Main game engine instance
 */

class GameEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.state = 'menu';
        this.gameData = {};
        this.input = {};
        this.ui = {};
        this.loadingProgress = 0;
        
        // Game systems (initialized later)
        this.character = null;
        this.inventory = null;
        this.combat = null;
        this.school = null;
        this.dialogue = null;
        this.save = null;
        this.audio = null;
        this.teacherAI = null;
        this.enemiesAndRivals = null;
        this.visualEffects = null;
        this.uiManager = null;
        
        // Time management
        this.lastTime = 0;
        this.deltaTime = 0;
        this.uiUpdateTimer = 0;
        
        console.log('GameEngine constructor called');
    }

    init() {
        console.log('GameEngine.init() starting...');
        
        try {
            // Get canvas and context
            this.canvas = document.getElementById('game-canvas');
            if (!this.canvas) {
                console.error('Canvas not found!');
                return;
            }
            this.ctx = this.canvas.getContext('2d');
            console.log('Canvas initialized');
            
            // Setup canvas
            this.setupCanvas();
            
            // Initialize UI references
            this.initUI();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize game systems
            this.initGameSystems();
            
            // Hide loading screen and show menu
            this.hideLoadingScreen();
            this.showMainMenu();
            
            // Start game loop
            this.lastTime = performance.now();
            this.gameLoop(this.lastTime);
            
            console.log('Game Engine initialized successfully');
        } catch (error) {
            console.error('Failed to initialize game engine:', error);
        }
    }

    setupCanvas() {
        this.resizeCanvas();
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.textBaseline = 'top';
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        if (!this.canvas) return;
        const container = document.getElementById('game-canvas-container');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        this.canvas.width = Math.max(800, rect.width);
        this.canvas.height = Math.max(600, rect.height);
    }

    initUI() {
        this.ui = {
            mainMenu: document.getElementById('main-menu'),
            newGameBtn: document.getElementById('new-game-btn'),
            continueBtn: document.getElementById('continue-btn'),
            helpBtn: document.getElementById('help-btn'),
            currentWeekSpan: document.getElementById('current-week'),
            playerHUD: document.getElementById('player-hud'),
            healthFill: document.getElementById('health-fill'),
            healthText: document.getElementById('health-text'),
            stressFill: document.getElementById('stress-fill'),
            stressText: document.getElementById('stress-text'),
            knowledgeText: document.getElementById('knowledge-text'),
            levelText: document.getElementById('level-text'),
            expText: document.getElementById('exp-text'),
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
            saveBtn: document.getElementById('save-btn'),
            loadBtn: document.getElementById('load-btn'),
            schoolMap: document.getElementById('school-map'),
            mapClose: document.getElementById('map-close'),
            dialogueContainer: document.getElementById('dialogue-container'),
            dialogueName: document.getElementById('dialogue-name'),
            dialogueText: document.getElementById('dialogue-text'),
            dialogueChoices: document.getElementById('dialogue-choices'),
            dialoguePortrait: document.getElementById('dialogue-portrait'),
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
            loadingScreen: document.getElementById('loading-screen'),
            loadingProgress: document.getElementById('loading-progress'),
            loadingText: document.getElementById('loading-text'),
            masterVolume: document.getElementById('master-volume'),
            musicVolume: document.getElementById('music-volume'),
            sfxVolume: document.getElementById('sfx-volume'),
            textSpeed: document.getElementById('text-speed')
        };
        
        console.log('UI initialized:', {
            mainMenu: !!this.ui.mainMenu,
            newGameBtn: !!this.ui.newGameBtn,
            continueBtn: !!this.ui.continueBtn,
            helpBtn: !!this.ui.helpBtn
        });
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Menu buttons - using arrow functions to preserve 'this' context
        if (this.ui.newGameBtn) {
            this.ui.newGameBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('New Game clicked');
                this.newGame();
            });
        }
        
        if (this.ui.continueBtn) {
            this.ui.continueBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Continue clicked');
                this.continueGame();
            });
        }
        
        if (this.ui.helpBtn) {
            this.ui.helpBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Help clicked');
                this.showHelp();
            });
        }
        
        // Panel toggles
        if (this.ui.inventoryToggle) {
            this.ui.inventoryToggle.addEventListener('click', () => this.toggleInventory());
        }
        if (this.ui.settingsBtn) {
            this.ui.settingsBtn.addEventListener('click', () => this.showSettings());
        }
        if (this.ui.settingsClose) {
            this.ui.settingsClose.addEventListener('click', () => this.hideSettings());
        }
        if (this.ui.helpClose) {
            this.ui.helpClose.addEventListener('click', () => this.hideHelp());
        }
        if (this.ui.saveLoadClose) {
            this.ui.saveLoadClose.addEventListener('click', () => this.hideSaveLoad());
        }
        if (this.ui.mapClose) {
            this.ui.mapClose.addEventListener('click', () => this.hideMap());
        }
        if (this.ui.saveBtn) {
            this.ui.saveBtn.addEventListener('click', () => this.showSave());
        }
        if (this.ui.loadBtn) {
            this.ui.loadBtn.addEventListener('click', () => this.showLoad());
        }
        
        // Battle actions
        if (this.ui.attackBtn) {
            this.ui.attackBtn.addEventListener('click', () => this.handleBattleAction('attack'));
        }
        if (this.ui.defendBtn) {
            this.ui.defendBtn.addEventListener('click', () => this.handleBattleAction('defend'));
        }
        if (this.ui.itemBtn) {
            this.ui.itemBtn.addEventListener('click', () => this.handleBattleAction('item'));
        }
        if (this.ui.specialBtn) {
            this.ui.specialBtn.addEventListener('click', () => this.handleBattleAction('special'));
        }
        
        // Keyboard input
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Prevent context menu on canvas
        if (this.canvas) {
            this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        }
        
        // Map area clicks
        document.querySelectorAll('.map-area').forEach(area => {
            area.addEventListener('click', (e) => {
                const areaId = e.currentTarget.dataset.area;
                if (areaId && !e.currentTarget.classList.contains('locked')) {
                    this.handleMapClick(areaId);
                }
            });
        });
        
        console.log('Event listeners set up complete');
    }

    initGameSystems() {
        console.log('Initializing game systems...');
        
        // Initialize game data
        this.gameData = {
            version: '1.0.0',
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
                energy: 100,
                maxEnergy: 100,
                stats: {
                    attack: 15,
                    defense: 10,
                    speed: 12,
                    intelligence: 18,
                    charisma: 8,
                    luck: 10
                },
                abilities: ['Speed Dash'],
                inventory: [
                    { id: 'notebook', name: 'Notebook', type: 'tool', quantity: 1 },
                    { id: 'pencil', name: 'Pencil', type: 'weapon', quantity: 3 },
                    { id: 'energy_drink', name: 'Energy Drink', type: 'consumable', quantity: 2 }
                ],
                equipment: { weapon: null, armor: null, accessory: null },
                statusEffects: [],
                achievements: [],
                storyFlags: {},
                unlockedAreas: ['hallway1', 'classroom1', 'library']
            },
            school: {
                currentArea: 'hallway1',
                unlockedAreas: ['hallway1', 'classroom1', 'library'],
                visitedAreas: ['hallway1']
            },
            level67Unlocked: false
        };
        
        // Initialize systems if classes exist
        if (typeof CharacterSystem !== 'undefined') {
            this.character = new CharacterSystem(this);
            console.log('CharacterSystem initialized');
        }
        
        if (typeof InventorySystem !== 'undefined') {
            this.inventory = new InventorySystem(this);
            console.log('InventorySystem initialized');
        }
        
        if (typeof SchoolSystem !== 'undefined') {
            this.school = new SchoolSystem(this);
            console.log('SchoolSystem initialized');
        }
        
        if (typeof EnemiesAndRivals !== 'undefined') {
            this.enemiesAndRivals = new EnemiesAndRivals(this);
            console.log('EnemiesAndRivals initialized');
        }
        
        if (typeof CombatSystem !== 'undefined') {
            this.combat = new CombatSystem(this);
            console.log('CombatSystem initialized');
        }
        
        if (typeof DialogueSystem !== 'undefined') {
            this.dialogue = new DialogueSystem(this);
            console.log('DialogueSystem initialized');
        }
        
        if (typeof TeacherAI !== 'undefined') {
            this.teacherAI = new TeacherAI(this);
            console.log('TeacherAI initialized');
        }
        
        if (typeof SaveSystem !== 'undefined') {
            this.save = new SaveSystem(this);
            console.log('SaveSystem initialized');
        }
        
        if (typeof AudioSystem !== 'undefined') {
            this.audio = new AudioSystem(this);
            console.log('AudioSystem initialized');
        }
        
        if (typeof VisualEffects !== 'undefined') {
            this.visualEffects = new VisualEffects(this);
            console.log('VisualEffects initialized');
        }
        
        if (typeof UIManager !== 'undefined') {
            this.uiManager = new UIManager(this);
            console.log('UIManager initialized');
        }
        
        console.log('Game systems initialized');
    }

    hideLoadingScreen() {
        if (this.ui.loadingScreen) {
            this.ui.loadingScreen.style.display = 'none';
        }
    }

    showMainMenu() {
        console.log('Showing main menu');
        this.state = 'menu';
        if (this.ui.mainMenu) {
            this.ui.mainMenu.classList.add('menu-visible');
        }
    }

    hideMainMenu() {
        console.log('Hiding main menu');
        if (this.ui.mainMenu) {
            this.ui.mainMenu.classList.remove('menu-visible');
        }
    }

    newGame() {
        console.log('Starting new game...');
        this.hideMainMenu();
        this.state = 'playing';
        
        // Reset game data
        this.gameData.week = 1;
        this.gameData.player.level = 1;
        this.gameData.player.exp = 0;
        this.gameData.player.health = 100;
        this.gameData.player.stress = 0;
        this.gameData.player.knowledge = 50;
        
        // Update character if available
        if (this.character) {
            this.character.data = this.gameData.player;
            this.character.updateStats();
        }
        
        // Show opening dialogue
        if (this.dialogue) {
            this.dialogue.startDialogue('Narrator', 
                'Welcome to your worst nightmare... school. You are Eric M., and you are failing. The school has become a monster-filled dungeon, and your only way out is to survive and pass the final exam.',
                [{ text: 'Begin my journey...', action: () => this.endDialogue() }]
            );
            this.state = 'dialogue';
        }
        
        this.updateUI();
        console.log('New game started, state:', this.state);
    }

    continueGame() {
        console.log('Continuing game...');
        if (this.save) {
            const loaded = this.save.loadGame(1);
            if (loaded) {
                this.hideMainMenu();
                this.state = 'playing';
                this.updateUI();
                console.log('Game loaded successfully');
            } else {
                console.log('No save found, starting new game');
                this.newGame();
            }
        } else {
            this.newGame();
        }
    }

    showHelp() {
        console.log('Showing help panel');
        if (this.ui.helpPanel) {
            this.ui.helpPanel.classList.remove('panel-hidden');
            this.ui.helpPanel.style.display = 'block';
            this.ui.helpPanel.style.position = 'fixed';
            this.ui.helpPanel.style.top = '50%';
            this.ui.helpPanel.style.left = '50%';
            this.ui.helpPanel.style.transform = 'translate(-50%, -50%)';
            this.ui.helpPanel.style.zIndex = '2000';
            this.ui.helpPanel.style.background = 'rgba(44, 62, 80, 0.98)';
            this.ui.helpPanel.style.padding = '20px';
            this.ui.helpPanel.style.borderRadius = '10px';
            this.ui.helpPanel.style.maxWidth = '500px';
            this.ui.helpPanel.style.maxHeight = '80vh';
            this.ui.helpPanel.style.overflow = 'auto';
        }
    }

    hideHelp() {
        console.log('Hiding help panel');
        if (this.ui.helpPanel) {
            this.ui.helpPanel.classList.add('panel-hidden');
            this.ui.helpPanel.style.display = 'none';
        }
    }

    showSettings() {
        if (this.ui.settingsPanel) {
            this.ui.settingsPanel.classList.remove('panel-hidden');
            this.ui.settingsPanel.style.display = 'block';
            this.ui.settingsPanel.style.position = 'fixed';
            this.ui.settingsPanel.style.top = '50%';
            this.ui.settingsPanel.style.left = '50%';
            this.ui.settingsPanel.style.transform = 'translate(-50%, -50%)';
            this.ui.settingsPanel.style.zIndex = '2000';
        }
    }

    hideSettings() {
        if (this.ui.settingsPanel) {
            this.ui.settingsPanel.classList.add('panel-hidden');
            this.ui.settingsPanel.style.display = 'none';
        }
    }

    showSave() {
        if (this.ui.saveLoadPanel) {
            this.ui.saveLoadTitle.textContent = 'Save Game';
            this.ui.saveLoadPanel.classList.remove('panel-hidden');
            if (this.save) this.save.displaySaveSlots();
        }
    }

    showLoad() {
        if (this.ui.saveLoadPanel) {
            this.ui.saveLoadTitle.textContent = 'Load Game';
            this.ui.saveLoadPanel.classList.remove('panel-hidden');
            if (this.save) this.save.displaySaveSlots();
        }
    }

    hideSaveLoad() {
        if (this.ui.saveLoadPanel) {
            this.ui.saveLoadPanel.classList.add('panel-hidden');
        }
    }

    showMap() {
        if (this.state !== 'playing') return;
        this.state = 'map';
        if (this.ui.schoolMap) {
            this.ui.schoolMap.classList.add('map-visible');
        }
        if (this.school) {
            this.school.updateMapDisplay();
        }
    }

    hideMap() {
        this.state = 'playing';
        if (this.ui.schoolMap) {
            this.ui.schoolMap.classList.remove('map-visible');
        }
    }

    handleMapClick(areaId) {
        if (this.school) {
            this.school.travelToArea(areaId);
        }
        this.hideMap();
    }

    toggleInventory() {
        if (this.state !== 'playing') return;
        if (this.ui.inventoryPanel) {
            const isVisible = this.ui.inventoryPanel.classList.contains('visible');
            if (isVisible) {
                this.ui.inventoryPanel.classList.remove('visible');
            } else {
                this.ui.inventoryPanel.classList.add('visible');
                if (this.inventory) {
                    this.inventory.updateDisplay();
                }
            }
        }
    }

    startBattle(enemy) {
        this.state = 'battle';
        if (this.ui.battleInterface) {
            this.ui.battleInterface.classList.add('battle-visible');
        }
        if (this.combat) {
            this.combat.startBattle(enemy);
        }
    }

    endBattle(victory = true) {
        this.state = 'playing';
        if (this.ui.battleInterface) {
            this.ui.battleInterface.classList.remove('battle-visible');
        }
        if (victory && this.character) {
            this.character.gainExperience(25);
        }
    }

    handleBattleAction(action) {
        if (this.state !== 'battle') return;
        if (this.combat) {
            this.combat.handlePlayerAction(action);
        }
    }

    startDialogue(character, text, choices = []) {
        this.state = 'dialogue';
        if (this.ui.dialogueContainer) {
            this.ui.dialogueContainer.classList.add('dialogue-visible');
        }
        if (this.dialogue) {
            this.dialogue.start(character, text, choices);
        }
    }

    endDialogue() {
        this.state = 'playing';
        if (this.ui.dialogueContainer) {
            this.ui.dialogueContainer.classList.remove('dialogue-visible');
        }
    }

    handleKeyDown(e) {
        this.input[e.code] = true;
        
        if (e.code === 'Escape') {
            if (this.state === 'playing') {
                this.showMap();
            } else if (this.state === 'map') {
                this.hideMap();
            }
        }
        
        if (e.code === 'Tab') {
            e.preventDefault();
            this.toggleInventory();
        }
        
        if (e.code === 'KeyM' && this.state === 'playing') {
            e.preventDefault();
            this.showMap();
        }
        
        if (this.state === 'playing' && this.school) {
            this.school.handleInput(e);
        }
        
        if (this.state === 'dialogue' && (e.code === 'Space' || e.code === 'Enter')) {
            if (this.dialogue) {
                this.dialogue.advanceDialogue();
            }
        }
    }

    handleKeyUp(e) {
        this.input[e.code] = false;
    }

    updateUI() {
        if (!this.gameData || !this.gameData.player) return;
        
        const player = this.gameData.player;
        
        if (this.ui.currentWeekSpan) {
            this.ui.currentWeekSpan.textContent = this.gameData.week;
        }
        
        const healthPercent = (player.health / player.maxHealth) * 100;
        if (this.ui.healthFill) {
            this.ui.healthFill.style.width = `${healthPercent}%`;
        }
        if (this.ui.healthText) {
            this.ui.healthText.textContent = `${player.health}/${player.maxHealth}`;
        }
        
        const stressPercent = (player.stress / player.maxStress) * 100;
        if (this.ui.stressFill) {
            this.ui.stressFill.style.width = `${stressPercent}%`;
        }
        if (this.ui.stressText) {
            this.ui.stressText.textContent = `${player.stress}/${player.maxStress}`;
        }
        
        if (this.ui.knowledgeText) {
            this.ui.knowledgeText.textContent = player.knowledge;
        }
        if (this.ui.levelText) {
            this.ui.levelText.textContent = player.level;
        }
        if (this.ui.expText) {
            this.ui.expText.textContent = `${player.exp}/${player.expToNext}`;
        }
    }

    updateVolume(type, value) {
        if (this.audio) {
            this.audio.updateVolume(type, value / 100);
        }
    }

    updateTextSpeed(speed) {
        if (this.dialogue) {
            this.dialogue.textSpeed = speed;
        }
    }

    gameLoop(currentTime) {
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(this.deltaTime);
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(deltaTime) {
        if (this.state === 'playing') {
            if (this.school) this.school.update(deltaTime);
            if (this.character) this.character.update(deltaTime);
            if (this.teacherAI) this.teacherAI.update(deltaTime);
        } else if (this.state === 'battle') {
            if (this.combat) this.combat.update(deltaTime);
        } else if (this.state === 'dialogue') {
            if (this.dialogue) this.dialogue.update(deltaTime);
        }
        
        this.uiUpdateTimer += deltaTime;
        if (this.uiUpdateTimer > 100) {
            this.updateUI();
            this.uiUpdateTimer = 0;
        }
    }

    render() {
        if (!this.ctx || !this.canvas) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.state === 'menu') {
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (this.state === 'playing' || this.state === 'map') {
            if (this.school) this.school.render(this.ctx);
            if (this.character) this.character.render(this.ctx);
            if (this.teacherAI && this.teacherAI.active) this.teacherAI.render(this.ctx);
        } else if (this.state === 'battle') {
            this.ctx.fillStyle = '#1a252f';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (this.state === 'dialogue') {
            if (this.school) this.school.render(this.ctx);
        }
        
        if (this.visualEffects) {
            this.visualEffects.render();
        }
    }
}

// Export for use by other systems
window.GameEngine = GameEngine;

// Initialize the game when DOM is fully loaded
function initializeGame() {
    if (window.gameEngineInitialized) return;
    window.gameEngineInitialized = true;
    
    console.log('Initializing game...');
    window.gameEngine = new GameEngine();
    window.gameEngine.init();
}

// Try multiple ways to ensure initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    // DOM already loaded
    initializeGame();
}

// Also try on window load as a fallback
window.addEventListener('load', initializeGame);
