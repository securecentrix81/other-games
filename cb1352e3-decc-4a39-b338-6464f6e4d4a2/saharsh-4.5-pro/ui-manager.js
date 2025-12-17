/**
 * UI Manager - Complete User Interface Management System
 * 
 * Purpose: Manages all UI interactions, menus, modal dialogs, and user interface elements
 * Dependencies: This file requires game-engine.js to be loaded first
 * Exports: window.UIManager - Complete UI management system
 */

class UIManager {
    constructor(engine) {
        this.engine = engine;
        this.ui = {};
        this.activeModal = null;
        this.modalQueue = [];
        this.notifications = [];
        this.keyboardShortcuts = new Map();
        this.draggedElement = null;
        this.tooltips = new Map();
        this.uiAnimations = new Map();
        this.isMobile = this.detectMobile();
        
        // UI state management
        this.uiState = {
            currentPanel: null,
            previousPanel: null,
            isModalOpen: false,
            isDragging: false,
            focusElement: null,
            lastInteraction: Date.now()
        };
        
        // Initialize when DOM is ready
        this.initialize();
    }

    /**
     * Initialize UI manager
     */
    initialize() {
        this.initUIReferences();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupTooltips();
        this.setupDragAndDrop();
        this.setupNotifications();
        
        console.log('UI Manager initialized');
    }

    /**
     * Initialize UI element references
     */
    initUIReferences() {
        // Main menu elements
        this.ui.mainMenu = document.getElementById('main-menu');
        this.ui.newGameBtn = document.getElementById('new-game-btn');
        this.ui.continueBtn = document.getElementById('continue-btn');
        this.ui.helpBtn = document.getElementById('help-btn');
        
        // Game UI elements
        this.ui.gameHeader = document.getElementById('game-header');
        this.ui.weekIndicator = document.getElementById('current-week');
        
        // HUD elements
        this.ui.playerHUD = document.getElementById('player-hud');
        this.ui.healthFill = document.getElementById('health-fill');
        this.ui.healthText = document.getElementById('health-text');
        this.ui.stressFill = document.getElementById('stress-fill');
        this.ui.stressText = document.getElementById('stress-text');
        this.ui.knowledgeText = document.getElementById('knowledge-text');
        this.ui.levelText = document.getElementById('level-text');
        this.ui.expText = document.getElementById('exp-text');
        
        // Panel elements
        this.ui.inventoryPanel = document.getElementById('inventory-panel');
        this.ui.inventoryToggle = document.getElementById('inventory-toggle');
        this.ui.inventoryGrid = document.getElementById('inventory-grid');
        this.ui.settingsPanel = document.getElementById('settings-panel');
        this.ui.settingsBtn = document.getElementById('settings-btn');
        this.ui.settingsClose = document.getElementById('settings-close');
        this.ui.helpPanel = document.getElementById('help-panel');
        this.ui.helpClose = document.getElementById('help-close');
        this.ui.saveLoadPanel = document.getElementById('save-load-panel');
        this.ui.saveLoadTitle = document.getElementById('save-load-title');
        this.ui.saveLoadClose = document.getElementById('save-load-close');
        
        // Map elements
        this.ui.schoolMap = document.getElementById('school-map');
        this.ui.mapClose = document.getElementById('map-close');
        
        // Dialogue elements
        this.ui.dialogueContainer = document.getElementById('dialogue-container');
        this.ui.dialogueName = document.getElementById('dialogue-name');
        this.ui.dialogueText = document.getElementById('dialogue-text');
        this.ui.dialogueChoices = document.getElementById('dialogue-choices');
        this.ui.dialoguePortrait = document.getElementById('dialogue-portrait');
        
        // Battle elements
        this.ui.battleInterface = document.getElementById('battle-interface');
        this.ui.enemyName = document.getElementById('enemy-name');
        this.ui.enemyHealthFill = document.getElementById('enemy-health-fill');
        this.ui.enemyHealthText = document.getElementById('enemy-health-text');
        this.ui.playerHealthFill = document.getElementById('player-health-fill');
        this.ui.playerHealthText = document.getElementById('player-health-text');
        this.ui.battleLog = document.getElementById('battle-log');
        this.ui.attackBtn = document.getElementById('attack-btn');
        this.ui.defendBtn = document.getElementById('defend-btn');
        this.ui.itemBtn = document.getElementById('item-btn');
        this.ui.specialBtn = document.getElementById('special-btn');
        
        // Control elements
        this.ui.saveBtn = document.getElementById('save-btn');
        this.ui.loadBtn = document.getElementById('load-btn');
        
        // Settings controls
        this.ui.masterVolume = document.getElementById('master-volume');
        this.ui.musicVolume = document.getElementById('music-volume');
        this.ui.sfxVolume = document.getElementById('sfx-volume');
        this.ui.textSpeed = document.getElementById('text-speed');
        
        // Save/Load elements
        this.ui.saveSlots = document.getElementById('save-slots');
    }

    /**
     * Setup comprehensive event listeners
     */
    setupEventListeners() {
        // Menu event listeners
        this.ui.newGameBtn?.addEventListener('click', () => this.handleNewGame());
        this.ui.continueBtn?.addEventListener('click', () => this.handleContinueGame());
        this.ui.helpBtn?.addEventListener('click', () => this.showHelp());
        
        // Panel toggle listeners
        this.ui.inventoryToggle?.addEventListener('click', () => this.toggleInventory());
        this.ui.settingsBtn?.addEventListener('click', () => this.showSettings());
        this.ui.settingsClose?.addEventListener('click', () => this.hideSettings());
        this.ui.helpClose?.addEventListener('click', () => this.hideHelp());
        this.ui.saveLoadClose?.addEventListener('click', () => this.hideSaveLoad());
        this.ui.mapClose?.addEventListener('click', () => this.hideMap());
        
        // Save/Load listeners
        this.ui.saveBtn?.addEventListener('click', () => this.showSave());
        this.ui.loadBtn?.addEventListener('click', () => this.showLoad());
        
        // Settings control listeners
        this.ui.masterVolume?.addEventListener('input', (e) => this.updateVolume('master', e.target.value));
        this.ui.musicVolume?.addEventListener('input', (e) => this.updateVolume('music', e.target.value));
        this.ui.sfxVolume?.addEventListener('input', (e) => this.updateVolume('sfx', e.target.value));
        this.ui.textSpeed?.addEventListener('change', (e) => this.updateTextSpeed(e.target.value));
        
        // Battle action listeners
        this.ui.attackBtn?.addEventListener('click', () => this.handleBattleAction('attack'));
        this.ui.defendBtn?.addEventListener('click', () => this.handleBattleAction('defend'));
        this.ui.itemBtn?.addEventListener('click', () => this.handleBattleAction('item'));
        this.ui.specialBtn?.addEventListener('click', () => this.handleBattleAction('special'));
        
        // Global event listeners
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
        document.addEventListener('click', (e) => this.handleGlobalClick(e));
        document.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        
        // Window resize listener
        window.addEventListener('resize', () => this.handleResize());
        
        // Visibility change listener for pause
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        // Global shortcuts
        this.addKeyboardShortcut('Escape', () => this.handleEscape());
        this.addKeyboardShortcut('Tab', () => this.handleTab(), { preventDefault: true });
        this.addKeyboardShortcut('KeyM', () => this.handleMapToggle(), { preventDefault: true });
        this.addKeyboardShortcut('KeyI', () => this.handleInventoryToggle(), { preventDefault: true });
        this.addKeyboardShortcut('KeyH', () => this.handleHelpToggle(), { preventDefault: true });
        
        // Battle shortcuts
        this.addKeyboardShortcut('Digit1', () => this.handleBattleAction('attack'), { gameState: 'battle' });
        this.addKeyboardShortcut('Digit2', () => this.handleBattleAction('defend'), { gameState: 'battle' });
        this.addKeyboardShortcut('Digit3', () => this.handleBattleAction('item'), { gameState: 'battle' });
        this.addKeyboardShortcut('Digit4', () => this.handleBattleAction('special'), { gameState: 'battle' });
        this.addKeyboardShortcut('Space', () => this.advanceDialogue(), { gameState: 'dialogue' });
        
        // Save/Load shortcuts
        this.addKeyboardShortcut('KeyS', () => this.handleQuickSave(), { ctrlKey: true });
        this.addKeyboardShortcut('KeyO', () => this.handleQuickLoad(), { ctrlKey: true });
    }

    /**
     * Add keyboard shortcut
     */
    addKeyboardShortcut(key, callback, options = {}) {
        this.keyboardShortcuts.set(key, { callback, options });
    }

    /**
     * Setup tooltip system
     */
    setupTooltips() {
        // Tooltip elements can be added dynamically - use mouseover with element check
        document.addEventListener('mouseover', (e) => {
            if (e.target && e.target.nodeType === 1 && typeof e.target.getAttribute === 'function') {
                this.showTooltip(e);
            }
        }, true);
        document.addEventListener('mouseout', (e) => this.hideTooltip(e), true);
    }

    /**
     * Setup drag and drop system
     */
    setupDragAndDrop() {
        // Inventory drag and drop
        document.addEventListener('dragstart', (e) => this.handleDragStart(e));
        document.addEventListener('dragover', (e) => this.handleDragOver(e));
        document.addEventListener('drop', (e) => this.handleDrop(e));
        document.addEventListener('dragend', (e) => this.handleDragEnd(e));
    }

    /**
     * Setup notification system
     */
    setupNotifications() {
        // Toast notification system
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'notification-container';
        this.notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(this.notificationContainer);
    }

    /**
     * Handle global keyboard events
     */
    handleGlobalKeydown(e) {
        const shortcut = this.keyboardShortcuts.get(e.code);
        if (!shortcut) return;
        
        // Check conditions
        if (shortcut.options.gameState && this.engine.state !== shortcut.options.gameState) {
            return;
        }
        
        if (shortcut.options.ctrlKey && !e.ctrlKey) return;
        if (shortcut.options.shiftKey && !e.shiftKey) return;
        if (shortcut.options.altKey && !e.altKey) return;
        
        if (shortcut.options.preventDefault) {
            e.preventDefault();
        }
        
        shortcut.callback();
    }

    /**
     * Handle global click events
     */
    handleGlobalClick(e) {
        // Close dropdowns when clicking outside
        if (!e.target.closest('.dropdown') && !e.target.closest('.panel')) {
            this.closeAllDropdowns();
        }
        
        // Handle button clicks with feedback
        if (e.target.matches('button, .button, .ui-button')) {
            this.addButtonPressEffect(e.target);
        }
        
        // Handle inventory item clicks
        if (e.target.closest('.inventory-item')) {
            this.handleInventoryItemClick(e.target.closest('.inventory-item'));
        }
        
        // Handle map area clicks
        if (e.target.closest('.map-area')) {
            this.handleMapAreaClick(e.target.closest('.map-area'));
        }
    }

    /**
     * Handle context menu
     */
    handleContextMenu(e) {
        // Prevent context menu on game canvas
        if (e.target === this.engine.canvas) {
            e.preventDefault();
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Update UI layout for responsive design
        this.updateResponsiveLayout();
        
        // Hide tooltips on resize
        this.hideTooltip();
        
        // Trigger resize events for components
        this.engine.onResize?.();
    }

    /**
     * Handle page visibility change
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // Auto-pause when tab becomes hidden
            if (this.engine.state === 'playing') {
                this.showPauseNotification();
            }
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            pointer-events: auto;
            min-width: 200px;
            max-width: 300px;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>${this.getNotificationIcon(type)}</span>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    margin-left: auto;
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 16px;
                ">×</button>
            </div>
        `;
        
        this.notificationContainer.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto remove
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
        
        this.notifications.push(notification);
    }

    /**
     * Get notification color by type
     */
    getNotificationColor(type) {
        const colors = {
            info: '#3498db',
            success: '#27ae60',
            warning: '#f39c12',
            error: '#e74c3c'
        };
        return colors[type] || colors.info;
    }

    /**
     * Get notification icon by type
     */
    getNotificationIcon(type) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        return icons[type] || icons.info;
    }

    /**
     * Show pause notification
     */
    showPauseNotification() {
        this.showNotification('Game paused - tab not visible', 'info', 2000);
    }

    /**
     * Handle new game button
     */
    handleNewGame() {
        this.hideMainMenu();
        this.engine.newGame();
        this.showNotification('New game started!', 'success');
    }

    /**
     * Handle continue game button
     */
    handleContinueGame() {
        this.hideMainMenu();
        this.engine.loadGame();
        this.showNotification('Game loaded!', 'success');
    }

    /**
     * Show help panel
     */
    showHelp() {
        this.showPanel(this.ui.helpPanel, 'help');
    }

    /**
     * Hide help panel
     */
    hideHelp() {
        this.hidePanel(this.ui.helpPanel);
    }

    /**
     * Show settings panel
     */
    showSettings() {
        this.showPanel(this.ui.settingsPanel, 'settings');
        this.loadSettingsValues();
    }

    /**
     * Hide settings panel
     */
    hideSettings() {
        this.hidePanel(this.ui.settingsPanel);
    }

    /**
     * Show save panel
     */
    showSave() {
        this.showPanel(this.ui.saveLoadPanel, 'save');
        this.ui.saveLoadTitle.textContent = 'Save Game';
        this.engine.save?.displaySaveSlots();
    }

    /**
     * Show load panel
     */
    showLoad() {
        this.showPanel(this.ui.saveLoadPanel, 'load');
        this.ui.saveLoadTitle.textContent = 'Load Game';
        this.engine.save?.displaySaveSlots();
    }

    /**
     * Hide save/load panel
     */
    hideSaveLoad() {
        this.hidePanel(this.ui.saveLoadPanel);
    }

    /**
     * Show school map
     */
    showMap() {
        if (this.engine.state !== 'playing') return;
        
        this.uiState.currentPanel = 'map';
        this.ui.schoolMap.classList.add('map-visible');
        this.engine.school?.updateMapDisplay();
    }

    /**
     * Hide school map
     */
    hideMap() {
        this.uiState.currentPanel = null;
        this.ui.schoolMap.classList.remove('map-visible');
    }

    /**
     * Toggle inventory panel
     */
    toggleInventory() {
        if (this.engine.state !== 'playing') return;
        
        const isVisible = this.ui.inventoryPanel.classList.contains('visible');
        if (isVisible) {
            this.hideInventory();
        } else {
            this.showInventory();
        }
    }

    /**
     * Show inventory panel
     */
    showInventory() {
        this.uiState.currentPanel = 'inventory';
        this.ui.inventoryPanel.classList.add('visible');
        this.engine.inventory?.updateDisplay();
    }

    /**
     * Hide inventory panel
     */
    hideInventory() {
        this.uiState.currentPanel = null;
        this.ui.inventoryPanel.classList.remove('visible');
    }

    /**
     * Show panel with animation
     */
    showPanel(panel, panelType = null) {
        this.uiState.previousPanel = this.uiState.currentPanel;
        this.uiState.currentPanel = panelType;
        panel.classList.remove('panel-hidden');
        this.animatePanel(panel, 'slide_in');
    }

    /**
     * Hide panel with animation
     */
    hidePanel(panel) {
        this.animatePanel(panel, 'slide_out', () => {
            panel.classList.add('panel-hidden');
            this.uiState.currentPanel = null;
        });
    }

    /**
     * Animate panel entry/exit
     */
    animatePanel(panel, animationType, callback = null) {
        const animation = this.createUIAnimation(panel, animationType, 300, callback);
        this.uiAnimations.set(panel, animation);
    }

    /**
     * Create UI animation
     */
    createUIAnimation(element, animationType, duration = 300, callback = null) {
        const animation = {
            element: element,
            type: animationType,
            duration: duration,
            startTime: Date.now(),
            complete: false,
            callback: callback
        };
        
        return animation;
    }

    /**
     * Handle escape key
     */
    handleEscape() {
        switch (this.engine.state) {
            case 'playing':
                this.showMap();
                break;
            case 'map':
                this.hideMap();
                break;
            case 'inventory':
                this.hideInventory();
                break;
            case 'settings':
                this.hideSettings();
                break;
            case 'dialogue':
                this.advanceDialogue();
                break;
        }
    }

    /**
     * Handle tab key
     */
    handleTab() {
        if (this.engine.state === 'playing') {
            this.toggleInventory();
        }
    }

    /**
     * Handle map toggle
     */
    handleMapToggle() {
        if (this.engine.state === 'playing') {
            if (this.uiState.currentPanel === 'map') {
                this.hideMap();
            } else {
                this.showMap();
            }
        }
    }

    /**
     * Handle inventory toggle
     */
    handleInventoryToggle() {
        if (this.engine.state === 'playing') {
            this.toggleInventory();
        }
    }

    /**
     * Handle help toggle
     */
    handleHelpToggle() {
        if (this.engine.state === 'menu') {
            this.showHelp();
        }
    }

    /**
     * Handle battle action
     */
    handleBattleAction(action) {
        if (this.engine.state !== 'battle') return;
        
        this.engine.handleBattleAction(action);
        
        // Disable buttons temporarily
        this.setBattleButtonsEnabled(false);
    }

    /**
     * Set battle buttons enabled/disabled
     */
    setBattleButtonsEnabled(enabled) {
        [this.ui.attackBtn, this.ui.defendBtn, this.ui.itemBtn, this.ui.specialBtn].forEach(btn => {
            if (btn) btn.disabled = !enabled;
        });
    }

    /**
     * Advance dialogue
     */
    advanceDialogue() {
        if (this.engine.state === 'dialogue') {
            this.engine.dialogue?.advanceDialogue();
        }
    }

    /**
     * Update volume settings
     */
    updateVolume(type, value) {
        const volume = value / 100;
        this.engine.updateVolume(type, volume);
    }

    /**
     * Update text speed setting
     */
    updateTextSpeed(speed) {
        if (this.engine.dialogue) {
            this.engine.dialogue.textSpeed = speed;
        }
        this.engine.updateTextSpeed(speed);
    }

    /**
     * Load settings values into controls
     */
    loadSettingsValues() {
        const audio = this.engine.audio;
        if (audio && audio.settings) {
            if (this.ui.masterVolume) this.ui.masterVolume.value = audio.settings.master * 100;
            if (this.ui.musicVolume) this.ui.musicVolume.value = audio.settings.music * 100;
            if (this.ui.sfxVolume) this.ui.sfxVolume.value = audio.settings.sfx * 100;
        }
        
        if (this.ui.textSpeed && this.engine.dialogue) {
            this.ui.textSpeed.value = this.engine.dialogue.textSpeed || 'normal';
        }
    }

    /**
     * Update responsive layout
     */
    updateResponsiveLayout() {
        const isMobile = this.isMobile;
        
        // Adjust UI elements for mobile
        document.body.classList.toggle('mobile-layout', isMobile);
        
        // Adjust panel sizes
        if (isMobile) {
            this.adjustMobileLayout();
        } else {
            this.adjustDesktopLayout();
        }
    }

    /**
     * Adjust mobile layout
     */
    adjustMobileLayout() {
        // Make panels full screen on mobile
        const panels = document.querySelectorAll('.side-panel, .map-container');
        panels.forEach(panel => {
            panel.style.width = '100vw';
            panel.style.height = '100vh';
            panel.style.right = '0';
            panel.style.top = '0';
            panel.style.borderRadius = '0';
        });
        
        // Adjust HUD for mobile
        this.ui.playerHUD.style.left = '10px';
        this.ui.playerHUD.style.top = '70px';
    }

    /**
     * Adjust desktop layout
     */
    adjustDesktopLayout() {
        // Reset panel sizes
        const panels = document.querySelectorAll('.side-panel');
        panels.forEach(panel => {
            panel.style.width = '300px';
            panel.style.maxHeight = '60vh';
            panel.style.right = '20px';
            panel.style.top = '80px';
            panel.style.borderRadius = '10px';
        });
    }

    /**
     * Add button press effect
     */
    addButtonPressEffect(element) {
        element.style.transform = 'scale(0.95)';
        setTimeout(() => {
            element.style.transform = '';
        }, 150);
    }

    /**
     * Handle inventory item click
     */
    handleInventoryItemClick(itemElement) {
        const slotIndex = parseInt(itemElement.dataset.slot);
        if (!isNaN(slotIndex)) {
            this.engine.inventory?.selectItem(slotIndex);
        }
    }

    /**
     * Handle map area click
     */
    handleMapAreaClick(areaElement) {
        const areaId = areaElement.dataset.area;
        if (areaId && !areaElement.classList.contains('locked')) {
            this.handleMapClick(areaId);
        }
    }

    /**
     * Handle map click
     */
    handleMapClick(areaId) {
        this.engine.school?.travelToArea(areaId);
        this.hideMap();
    }

    /**
     * Close all dropdowns
     */
    closeAllDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown.open');
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('open');
        });
    }

    /**
     * Show tooltip
     */
    showTooltip(e) {
        const element = e.target;
        
        // Safety check - ensure element exists and has getAttribute method
        if (!element || typeof element.getAttribute !== 'function') {
            return;
        }
        
        const tooltipText = element.getAttribute('data-tooltip');
        
        if (tooltipText) {
            this.createTooltip(tooltipText, e.pageX, e.pageY);
        }
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        const tooltip = document.getElementById('ui-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    /**
     * UpdateTooltipPosition
     */
    updateTooltipPosition(e = null) {
        const tooltip = document.getElementById('ui-tooltip');
        if (tooltip && e && e.pageX !== undefined && e.pageY !== undefined) {
            tooltip.style.left = (e.pageX + 10) + 'px';
            tooltip.style.top = (e.pageY - 10) + 'px';
        }
    }

    /**
     * Create tooltip
     */
    createTooltip(text, x, y) {
        this.hideTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.id = 'ui-tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10000;
            pointer-events: none;
            white-space: nowrap;
        `;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        tooltip.style.left = (x + 10) + 'px';
        tooltip.style.top = (y - 10) + 'px';
    }

    /**
     * Detect mobile device
     */
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    /**
     * Handle drag start
     */
    handleDragStart(e) {
        const element = e.target;
        if (element.draggable) {
            this.draggedElement = element;
            e.dataTransfer.effectAllowed = 'move';
        }
    }

    /**
     * Handle drag over
     */
    handleDragOver(e) {
        if (this.draggedElement) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }
    }

    /**
     * Handle drop
     */
    handleDrop(e) {
        if (this.draggedElement) {
            e.preventDefault();
            // Handle inventory item drops
            this.handleInventoryDrop(e);
            this.draggedElement = null;
        }
    }

    /**
     * Handle drag end
     */
    handleDragEnd(e) {
        this.draggedElement = null;
    }

    /**
     * Handle inventory item drop
     */
    handleInventoryDrop(e) {
        // Implementation for inventory drag and drop
        console.log('Inventory item dropped');
    }

    /**
     * Show main menu
     */
    showMainMenu() {
        this.ui.mainMenu.classList.add('menu-visible');
        this.engine.state = 'menu';
    }

    /**
     * Hide main menu
     */
    hideMainMenu() {
        this.ui.mainMenu.classList.remove('menu-visible');
    }

    /**
     * Update UI manager
     */
    update(deltaTime) {
        // Update animations
        this.updateAnimations(deltaTime);
        
        // Update notifications
        this.updateNotifications(deltaTime);
        
        // Update tooltips
        this.updateTooltips(deltaTime);
    }

    /**
     * Update animations
     */
    updateAnimations(deltaTime) {
        for (const [element, animation] of this.uiAnimations) {
            const elapsed = Date.now() - animation.startTime;
            const progress = Math.min(elapsed / animation.duration, 1);
            
            // Apply animation progress
            this.applyAnimationProgress(animation, progress);
            
            if (progress >= 1 && !animation.complete) {
                animation.complete = true;
                if (animation.callback) {
                    animation.callback();
                }
                this.uiAnimations.delete(element);
            }
        }
    }

    /**
     * Apply animation progress
     */
    applyAnimationProgress(animation, progress) {
        const element = animation.element;
        const type = animation.type;
        
        switch (type) {
            case 'slide_in':
                const translateX = this.lerp(100, 0, progress);
                element.style.transform = `translateX(${translateX}%)`;
                element.style.opacity = progress.toString();
                break;
            case 'slide_out':
                const outTranslateX = this.lerp(0, 100, progress);
                element.style.transform = `translateX(${outTranslateX}%)`;
                element.style.opacity = (1 - progress).toString();
                break;
            case 'fade_in':
                element.style.opacity = progress.toString();
                break;
            case 'fade_out':
                element.style.opacity = (1 - progress).toString();
                break;
        }
    }

    /**
     * Linear interpolation
     */
    lerp(start, end, progress) {
        return start + (end - start) * progress;
    }

    /**
     * Update notifications
     */
    updateNotifications(deltaTime) {
        // Remove old notifications if needed
        while (this.notifications.length > 5) {
            const notification = this.notifications.shift();
            if (notification && notification.parentElement) {
                notification.remove();
            }
        }
    }

    /**
     * Update tooltips
     */
    updateTooltips(deltaTime) {
        // Tooltip logic handled by event listeners
    }
}

// Export for use by other systems
window.UIManager = UIManager;
