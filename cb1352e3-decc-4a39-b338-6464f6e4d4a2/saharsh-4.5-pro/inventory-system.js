/**
 * Inventory System - Item and Equipment Management
 * 
 * Purpose: Manages all inventory items, equipment, consumables, and their effects
 * Dependencies: This file requires game-engine.js and character-system.js to be loaded first
 * Exports: window.InventorySystem - Inventory management class
 */

class InventorySystem {
    constructor(engine) {
        this.engine = engine;
        this.selectedItem = null;
        this.selectedSlot = null;
        this.maxSlots = 20;
        this.battleItemMode = false;
        this.itemUsageCallback = null;
        
        // Item categories and types
        this.itemCategories = {
            consumable: 'consumable',
            weapon: 'weapon',
            armor: 'armor',
            accessory: 'accessory',
            tool: 'tool',
            quest: 'quest'
        };

        // Initialize inventory data
        this.initializeInventory();
        
        // Setup UI event listeners
        this.setupInventoryListeners();
    }

    /**
     * Initialize inventory system
     */
    initializeInventory() {
        const player = this.engine.character.data;
        
        // Ensure inventory exists
        if (!player.inventory) {
            player.inventory = [];
        }
        
        // Ensure equipment slots exist
        if (!player.equipment) {
            player.equipment = {
                weapon: null,
                armor: null,
                accessory: null
            };
        }

        // Add starting items if inventory is empty
        if (player.inventory.length === 0) {
            this.addItem('notebook', 1);
            this.addItem('pencil', 3);
            this.addItem('energy_drink', 2);
        }
    }

    /**
     * Setup inventory UI event listeners
     */
    setupInventoryListeners() {
        // Item selection in inventory grid
        document.addEventListener('click', (e) => {
            if (e.target.closest('.inventory-item')) {
                const itemElement = e.target.closest('.inventory-item');
                const slotIndex = parseInt(itemElement.dataset.slot);
                this.selectItem(slotIndex);
            }
        });

        // Item usage on double-click
        document.addEventListener('dblclick', (e) => {
            if (e.target.closest('.inventory-item')) {
                const itemElement = e.target.closest('.inventory-item');
                const slotIndex = parseInt(itemElement.dataset.slot);
                this.useItem(slotIndex);
            }
        });
    }

    /**
     * Get item data from ID
     */
    getItemData(itemId) {
        const items = {
            // Consumables
            'energy_drink': {
                name: 'Energy Drink',
                type: 'consumable',
                icon: '⚡',
                description: 'Restores 30 energy and reduces stress by 10',
                effect: { energy: 30, stress: -10 },
                value: 15,
                rarity: 'common'
            },
            'health_potion': {
                name: 'Health Potion',
                type: 'consumable',
                icon: '🧪',
                description: 'Restores 40 health points',
                effect: { health: 40 },
                value: 20,
                rarity: 'common'
            },
            'stress_pill': {
                name: 'Stress Pill',
                type: 'consumable',
                icon: '💊',
                description: 'Reduces stress by 25 points',
                effect: { stress: -25 },
                value: 18,
                rarity: 'common'
            },
            'smart_pill': {
                name: 'Smart Pill',
                type: 'consumable',
                icon: '🧠',
                description: 'Temporarily increases intelligence by 5',
                effect: { intelligence: 5, duration: 300 }, // 5 minutes
                value: 30,
                rarity: 'uncommon'
            },
            'focus_cookie': {
                name: 'Focus Cookie',
                type: 'consumable',
                icon: '🍪',
                description: 'Increases focus - better critical hit chance',
                effect: { luck: 3, duration: 180 },
                value: 25,
                rarity: 'uncommon'
            },

            // Weapons
            'pencil': {
                name: 'Pencil',
                type: 'weapon',
                icon: '✏️',
                description: 'Basic writing tool. +2 attack',
                statBonuses: { attack: 2 },
                value: 5,
                rarity: 'common'
            },
            'mechanical_pencil': {
                name: 'Mechanical Pencil',
                type: 'weapon',
                icon: '🖊️',
                description: 'Precision writing tool. +4 attack',
                statBonuses: { attack: 4 },
                value: 15,
                rarity: 'uncommon'
            },
            'calculator': {
                name: 'Calculator',
                type: 'weapon',
                icon: '🧮',
                description: 'Math weapon. +6 attack, +3 intelligence',
                statBonuses: { attack: 6, intelligence: 3 },
                value: 35,
                rarity: 'rare'
            },
            'textbook': {
                name: 'Heavy Textbook',
                type: 'weapon',
                icon: '📚',
                description: 'Knowledge weapon. +8 attack, +5 intelligence',
                statBonuses: { attack: 8, intelligence: 5 },
                value: 50,
                rarity: 'rare'
            },

            // Tools
            'notebook': {
                name: 'Notebook',
                type: 'tool',
                icon: '📓',
                description: 'Essential study tool. +3 intelligence, +2 defense',
                statBonuses: { intelligence: 3, defense: 2 },
                value: 20,
                rarity: 'common'
            },
            'highlighters': {
                name: 'Highlighters Set',
                type: 'tool',
                icon: '🖍️',
                description: 'Colorful study tools. +4 intelligence, +2 luck',
                statBonuses: { intelligence: 4, luck: 2 },
                value: 30,
                rarity: 'uncommon'
            },
            'study_guide': {
                name: 'Study Guide',
                type: 'tool',
                icon: '📖',
                description: 'Comprehensive study material. +8 intelligence',
                statBonuses: { intelligence: 8 },
                value: 45,
                rarity: 'rare'
            },
            'flashcards': {
                name: 'Flashcards',
                type: 'tool',
                icon: '🗂️',
                description: 'Memory aids. +6 intelligence, +3 speed',
                statBonuses: { intelligence: 6, speed: 3 },
                value: 40,
                rarity: 'rare'
            },

            // Armor/Protection
            'hoodie': {
                name: 'Comfy Hoodie',
                type: 'armor',
                icon: '🧥',
                description: 'Cozy protection. +5 defense, +2 stress resistance',
                statBonuses: { defense: 5 },
                value: 25,
                rarity: 'common'
            },
            'backpack': {
                name: 'Heavy Backpack',
                type: 'armor',
                icon: '🎒',
                description: 'Weighted protection. +8 defense, -1 speed',
                statBonuses: { defense: 8, speed: -1 },
                value: 35,
                rarity: 'uncommon'
            },
            'lucky_charm': {
                name: 'Lucky Charm',
                type: 'accessory',
                icon: '🍀',
                description: 'Fortune favor. +4 luck, +2 charisma',
                statBonuses: { luck: 4, charisma: 2 },
                value: 30,
                rarity: 'uncommon'
            },

            // Special Items
            'hall_pass': {
                name: 'Hall Pass',
                type: 'quest',
                icon: '🎫',
                description: 'Permission to be anywhere. Can escape any battle',
                effect: { fleeGuaranteed: true },
                value: 100,
                rarity: 'legendary'
            },
            'detention_slip': {
                name: 'Detention Slip',
                type: 'quest',
                icon: '📋',
                description: 'Proof of punishment. Reduces teacher pursuit',
                effect: { teacherResistance: 0.5 },
                value: 75,
                rarity: 'rare'
            },
            'teacher_approval': {
                name: 'Teacher Approval',
                type: 'quest',
                icon: '⭐',
                description: 'Teacher favor. Boosts all stats slightly',
                statBonuses: { attack: 2, defense: 2, intelligence: 2, charisma: 2 },
                value: 200,
                rarity: 'legendary'
            },

            // Food Items (Cafeteria)
            'pizza_slice': {
                name: 'Pizza Slice',
                type: 'consumable',
                icon: '🍕',
                description: 'Basic cafeteria food. +20 health, +5 energy',
                effect: { health: 20, energy: 5 },
                value: 8,
                rarity: 'common'
            },
            'energy_bar': {
                name: 'Energy Bar',
                type: 'consumable',
                icon: '🍫',
                description: 'Quick energy boost. +40 energy, +10 health',
                effect: { energy: 40, health: 10 },
                value: 12,
                rarity: 'common'
            },
            'mystery_meat': {
                name: 'Mystery Meat',
                type: 'consumable',
                icon: '🥩',
                description: 'Cafeteria special. +15 health, -10 stress (risky)',
                effect: { health: 15, stress: -10, risk: 0.2 },
                value: 10,
                rarity: 'uncommon'
            }
        };

        return items[itemId] || null;
    }

    /**
     * Add item to inventory
     */
    addItem(itemId, quantity = 1) {
        const player = this.engine.character.data;
        const itemData = this.getItemData(itemId);
        
        if (!itemData) {
            console.warn(`Unknown item: ${itemId}`);
            return false;
        }

        // Check if item can stack
        if (itemData.stackable !== false) {
            // Find existing stack
            const existingItem = player.inventory.find(item => item.id === itemId);
            if (existingItem) {
                existingItem.quantity += quantity;
                this.updateInventoryDisplay();
                return true;
            }
        }

        // Check inventory capacity
        if (player.inventory.length >= this.maxSlots) {
            this.showInventoryFullMessage();
            return false;
        }

        // Add new item
        player.inventory.push({
            id: itemId,
            name: itemData.name,
            type: itemData.type,
            icon: itemData.icon,
            quantity: quantity,
            description: itemData.description,
            effect: itemData.effect,
            statBonuses: itemData.statBonuses,
            value: itemData.value,
            rarity: itemData.rarity,
            equipped: false
        });

        this.updateInventoryDisplay();
        console.log(`Added ${quantity}x ${itemData.name} to inventory`);
        return true;
    }

    /**
     * Remove item from inventory
     */
    removeItem(slotIndex, quantity = 1) {
        const player = this.engine.character.data;
        
        if (slotIndex < 0 || slotIndex >= player.inventory.length) {
            return false;
        }

        const item = player.inventory[slotIndex];
        item.quantity -= quantity;

        if (item.quantity <= 0) {
            // Unequip if equipped
            if (item.equipped) {
                this.unequipItem(item);
            }
            player.inventory.splice(slotIndex, 1);
        }

        this.updateInventoryDisplay();
        return true;
    }

    /**
     * Use item from inventory
     */
    useItem(slotIndex) {
        const player = this.engine.character.data;
        
        if (slotIndex < 0 || slotIndex >= player.inventory.length) {
            return false;
        }

        const item = player.inventory[slotIndex];
        const itemData = this.getItemData(item.id);
        
        if (!itemData) {
            return false;
        }

        // Check if item can be used
        if (!this.canUseItem(item, itemData)) {
            return false;
        }

        // Apply item effect
        const success = this.applyItemEffect(item, itemData);
        
        if (success) {
            // Consume item if it's a consumable
            if (itemData.type === 'consumable') {
                this.removeItem(slotIndex, 1);
            }
            
            this.updateInventoryDisplay();
            this.engine.updateUI();
            
            // Show usage message
            this.showItemUsageMessage(itemData.name);
        }

        return success;
    }

    /**
     * Check if item can be used
     */
    canUseItem(item, itemData) {
        // Check if item requires equipment slot
        if (itemData.type === 'weapon' || itemData.type === 'armor' || itemData.type === 'accessory') {
            const slot = itemData.type === 'weapon' ? 'weapon' : 
                        itemData.type === 'armor' ? 'armor' : 'accessory';
            
            // If already equipped, allow unequip
            if (item.equipped) {
                return true;
            }
            
            // Check if slot is occupied
            if (this.engine.character.data.equipment[slot]) {
                return confirm(`Unequip current ${slot} to equip ${item.name}?`);
            }
        }

        // Check special conditions
        if (itemData.effect) {
            if (itemData.effect.teacherResistance && this.engine.character.data.stress >= 100) {
                alert('Stress too high to use this item effectively!');
                return false;
            }
        }

        return true;
    }

    /**
     * Apply item effect
     */
    applyItemEffect(item, itemData) {
        const player = this.engine.character.data;
        
        try {
            // Handle different item types
            switch (itemData.type) {
                case 'consumable':
                    return this.useConsumable(itemData.effect);
                    
                case 'weapon':
                case 'armor':
                case 'accessory':
                    return this.equipItem(item);
                    
                case 'tool':
                    return this.useTool(itemData);
                    
                case 'quest':
                    return this.useQuestItem(itemData);
                    
                default:
                    console.warn(`Unknown item type: ${itemData.type}`);
                    return false;
            }
        } catch (error) {
            console.error('Error applying item effect:', error);
            return false;
        }
    }

    /**
     * Use consumable item
     */
    useConsumable(effect) {
        const player = this.engine.character.data;
        let success = false;

        // Health effect
        if (effect.health) {
            const healAmount = Math.min(effect.health, player.maxHealth - player.health);
            if (healAmount > 0) {
                player.health += healAmount;
                success = true;
            }
        }

        // Energy effect
        if (effect.energy) {
            const energyAmount = Math.min(effect.energy, player.maxEnergy - player.energy);
            if (energyAmount > 0) {
                player.energy += energyAmount;
                success = true;
            }
        }

        // Stress effect
        if (effect.stress) {
            const stressChange = Math.min(Math.abs(effect.stress), player.stress);
            if (stressChange > 0) {
                player.stress -= stressChange;
                success = true;
            }
        }

        // Knowledge effect
        if (effect.knowledge) {
            player.knowledge += effect.knowledge;
            success = true;
        }

        // Temporary stat buffs
        if (effect.intelligence || effect.luck || effect.attack) {
            if (effect.intelligence) player.stats.intelligence += effect.intelligence;
            if (effect.luck) player.stats.luck += effect.luck;
            if (effect.attack) player.stats.attack += effect.attack;
            
            // Add temporary status effect
            if (effect.duration) {
                player.statusEffects = player.statusEffects || [];
                player.statusEffects.push({
                    type: 'item_boost',
                    duration: effect.duration,
                    description: `${itemData.name} effect`,
                    statModifiers: {
                        intelligence: effect.intelligence || 0,
                        luck: effect.luck || 0,
                        attack: effect.attack || 0
                    }
                });
            }
            success = true;
        }

        // Risk effects (like mystery meat)
        if (effect.risk && Math.random() < effect.risk) {
            player.health -= 15; // Negative effect
            this.showRiskMessage();
        }

        return success;
    }

    /**
     * Equip item
     */
    equipItem(item) {
        const player = this.engine.character.data;
        const slot = item.type === 'weapon' ? 'weapon' : 
                    item.type === 'armor' ? 'armor' : 'accessory';
        
        // Unequip current item in slot
        if (player.equipment[slot]) {
            this.unequipItem(player.equipment[slot]);
        }
        
        // Equip new item
        player.equipment[slot] = item;
        item.equipped = true;
        
        // Apply stat bonuses
        if (item.statBonuses) {
            Object.keys(item.statBonuses).forEach(stat => {
                player.stats[stat] += item.statBonuses[stat];
            });
        }
        
        this.engine.character.updateStats();
        return true;
    }

    /**
     * Unequip item
     */
    unequipItem(item) {
        const player = this.engine.character.data;
        const slot = item.type === 'weapon' ? 'weapon' : 
                    item.type === 'armor' ? 'armor' : 'accessory';
        
        // Remove stat bonuses
        if (item.statBonuses) {
            Object.keys(item.statBonuses).forEach(stat => {
                player.stats[stat] -= item.statBonuses[stat];
            });
        }
        
        // Unequip item
        player.equipment[slot] = null;
        item.equipped = false;
        
        this.engine.character.updateStats();
    }

    /**
     * Use tool item
     */
    useTool(itemData) {
        const player = this.engine.character.data;
        
        // Tools provide permanent stat bonuses
        if (itemData.statBonuses) {
            Object.keys(itemData.statBonuses).forEach(stat => {
                player.stats[stat] += itemData.statBonuses[stat];
            });
        }
        
        this.engine.character.updateStats();
        return true;
    }

    /**
     * Use quest item
     */
    useQuestItem(itemData) {
        const player = this.engine.character.data;
        
        if (itemData.effect.fleeGuaranteed) {
            // Hall pass effect - guaranteed escape from battle
            player.hasHallPass = true;
        }
        
        if (itemData.effect.teacherResistance) {
            // Detention slip effect - reduces teacher pursuit
            player.teacherResistance = itemData.effect.teacherResistance;
        }
        
        if (itemData.statBonuses) {
            // Teacher approval effect - permanent stat boosts
            Object.keys(itemData.statBonuses).forEach(stat => {
                player.stats[stat] += itemData.statBonuses[stat];
            });
        }
        
        this.engine.character.updateStats();
        return true;
    }

    /**
     * Select item in inventory
     */
    selectItem(slotIndex) {
        this.selectedSlot = slotIndex;
        this.selectedItem = this.engine.character.data.inventory[slotIndex];
        
        // Update UI selection
        this.updateInventoryDisplay();
        
        // Show item details
        this.showItemDetails();
    }

    /**
     * Show item details in UI
     */
    showItemDetails() {
        // Could implement item detail panel here
        // For now, just log to console
        if (this.selectedItem) {
            console.log('Selected item:', this.selectedItem);
        }
    }

    /**
     * Update inventory display
     */
    updateInventoryDisplay() {
        const grid = this.engine.ui.inventoryGrid;
        if (!grid) return;
        
        grid.innerHTML = '';
        
        const inventory = this.engine.character.data.inventory;
        
        // Create grid items
        for (let i = 0; i < this.maxSlots; i++) {
            const itemElement = document.createElement('div');
            itemElement.className = 'inventory-item';
            itemElement.dataset.slot = i;
            
            if (i === this.selectedSlot) {
                itemElement.classList.add('selected');
            }
            
            const item = inventory[i];
            
            if (item) {
                itemElement.innerHTML = `
                    <div class="item-icon">${item.icon}</div>
                    <div class="item-name">${item.name}</div>
                    <div class="item-quantity">${item.quantity}</div>
                    <div class="item-rarity rarity-${item.rarity}"></div>
                `;
                
                if (item.equipped) {
                    itemElement.classList.add('equipped');
                }
            } else {
                itemElement.innerHTML = `
                    <div class="item-icon empty-slot">+</div>
                    <div class="item-name empty">Empty</div>
                `;
                itemElement.classList.add('empty');
            }
            
            grid.appendChild(itemElement);
        }
    }

    /**
     * Select item for battle usage
     */
    selectItemForBattle() {
        this.battleItemMode = true;
        this.updateInventoryDisplay();
        
        // Show battle item selection UI
        if (this.engine.ui.battleLog) {
            this.engine.ui.battleLog.innerHTML += '<div>Battle item selection mode - click an item to use</div>';
        }
    }

    /**
     * Handle battle item selection
     */
    handleBattleItemSelection(slotIndex) {
        if (!this.battleItemMode) return;
        
        const success = this.useItem(slotIndex);
        
        if (success) {
            this.battleItemMode = false;
            
            // Continue with enemy turn
            if (this.engine.combat) {
                setTimeout(() => this.engine.combat.enemyTurn(), 1500);
            }
        }
    }

    /**
     * Get inventory summary
     */
    getInventorySummary() {
        const inventory = this.engine.character.data.inventory;
        const summary = {
            totalItems: inventory.length,
            totalSlots: this.maxSlots,
            categories: {},
            totalValue: 0,
            equipped: this.engine.character.data.equipment
        };

        inventory.forEach(item => {
            // Count by category
            if (!summary.categories[item.type]) {
                summary.categories[item.type] = 0;
            }
            summary.categories[item.type] += item.quantity;
            
            // Calculate total value
            summary.totalValue += item.value * item.quantity;
        });

        return summary;
    }

    /**
     * Find items by type
     */
    findItemsByType(type) {
        return this.engine.character.data.inventory.filter(item => item.type === type);
    }

    /**
     * Find consumable items
     */
    findConsumables() {
        return this.findItemsByType('consumable');
    }

    /**
     * Find equipment items
     */
    findEquipment() {
        return this.findItemsByType('weapon')
            .concat(this.findItemsByType('armor'))
            .concat(this.findItemsByType('accessory'));
    }

    /**
     * Get item value for trading/selling
     */
    getItemValue(itemId, quantity = 1) {
        const itemData = this.getItemData(itemId);
        if (!itemData) return 0;
        
        // Reduce value for used/equipped items
        let value = itemData.value;
        
        if (itemData.type === 'consumable') {
            value = Math.floor(value * 0.5); // 50% value for consumables
        } else if (itemData.type === 'weapon' || itemData.type === 'armor') {
            value = Math.floor(value * 0.7); // 70% value for equipment
        }
        
        return value * quantity;
    }

    /**
     * Show inventory full message
     */
    showInventoryFullMessage() {
        if (this.engine.ui.battleLog) {
            this.engine.ui.battleLog.innerHTML += '<div>Inventory is full!</div>';
        } else {
            alert('Inventory is full!');
        }
    }

    /**
     * Show item usage message
     */
    showItemUsageMessage(itemName) {
        if (this.engine.ui.battleLog) {
            this.engine.ui.battleLog.innerHTML += `<div>Used ${itemName}!</div>`;
            this.engine.ui.battleLog.scrollTop = this.engine.ui.battleLog.scrollHeight;
        }
    }

    /**
     * Show risk effect message
     */
    showRiskMessage() {
        if (this.engine.ui.battleLog) {
            this.engine.ui.battleLog.innerHTML += '<div>Risk effect triggered! -15 health</div>';
            this.engine.ui.battleLog.scrollTop = this.engine.ui.battleLog.scrollHeight;
        }
    }

    /**
     * Sort inventory by various criteria
     */
    sortInventory(criteria = 'name') {
        const inventory = this.engine.character.data.inventory;
        
        inventory.sort((a, b) => {
            switch (criteria) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'type':
                    return a.type.localeCompare(b.type);
                case 'rarity':
                    const rarityOrder = { common: 1, uncommon: 2, rare: 3, legendary: 4 };
                    return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
                case 'value':
                    return b.value - a.value;
                default:
                    return 0;
            }
        });
        
        this.updateInventoryDisplay();
    }

    /**
     * Update inventory system
     */
    update(deltaTime) {
        // Handle any time-based item effects
        // Update temporary status effects from items
        const player = this.engine.character.data;
        
        if (player.statusEffects) {
            player.statusEffects.forEach(effect => {
                if (effect.type === 'item_boost') {
                    effect.duration -= deltaTime / 1000;
                    
                    // Remove expired effects and restore stats
                    if (effect.duration <= 0) {
                        if (effect.statModifiers) {
                            Object.keys(effect.statModifiers).forEach(stat => {
                                player.stats[stat] -= effect.statModifiers[stat];
                            });
                        }
                    }
                }
            });
            
            // Clean up expired effects
            player.statusEffects = player.statusEffects.filter(effect => 
                effect.duration > 0 || effect.type !== 'item_boost'
            );
        }
    }

    /**
     * Save inventory data
     */
    save() {
        const storageKey = location.pathname + "inventory_data";
        try {
            const inventoryData = {
                selectedSlot: this.selectedSlot,
                battleItemMode: this.battleItemMode
            };
            localStorage.setItem(storageKey, JSON.stringify(inventoryData));
        } catch (error) {
            console.error('Failed to save inventory data:', error);
        }
    }

    /**
     * Load inventory data
     */
    load() {
        const storageKey = location.pathname + "inventory_data";
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const inventoryData = JSON.parse(saved);
                this.selectedSlot = inventoryData.selectedSlot;
                this.battleItemMode = inventoryData.battleItemMode;
                return true;
            }
        } catch (error) {
            console.error('Failed to load inventory data:', error);
        }
        return false;
    }
}
