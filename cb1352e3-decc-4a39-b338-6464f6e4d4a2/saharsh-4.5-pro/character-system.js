/**
 * Character System - Player Character Management
 * 
 * Purpose: Manages player character stats, leveling, abilities, and progression
 * Dependencies: This file requires game-engine.js to be loaded first
 * Exports: window.CharacterSystem - Character management class
 */

class CharacterSystem {
    constructor(engine) {
        this.engine = engine;
        this.data = engine.gameData.player;
        this.levelUpCallback = null;
        this.statChangeCallbacks = [];
        
        // Initialize character data structure
        this.initializeCharacterData();
    }

    /**
     * Initialize character data with proper structure
     */
    initializeCharacterData() {
        if (!this.data) {
            this.data = {
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
                unlockedAreas: ['hallway1'],
                currentArea: 'hallway1',
                inventory: [],
                equipment: {
                    weapon: null,
                    armor: null,
                    accessory: null
                },
                statusEffects: [],
                achievements: [],
                storyFlags: {}
            };
        }

        // Ensure all required properties exist
        this.ensureDataIntegrity();
    }

    /**
     * Ensure character data has all required properties
     */
    ensureDataIntegrity() {
        const defaults = {
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
            unlockedAreas: ['hallway1'],
            currentArea: 'hallway1',
            inventory: [],
            equipment: {
                weapon: null,
                armor: null,
                accessory: null
            },
            statusEffects: [],
            achievements: [],
            storyFlags: {}
        };

        // Merge defaults with existing data
        Object.keys(defaults).forEach(key => {
            if (this.data[key] === undefined) {
                this.data[key] = defaults[key];
            }
        });

        // Ensure nested objects exist
        Object.keys(defaults.stats).forEach(stat => {
            if (this.data.stats[stat] === undefined) {
                this.data.stats[stat] = defaults.stats[stat];
            }
        });

        Object.keys(defaults.equipment).forEach(slot => {
            if (this.data.equipment[slot] === undefined) {
                this.data.equipment[slot] = defaults.equipment[slot];
            }
        });
    }

    /**
     * Update character stats based on level and equipment
     */
    updateStats() {
        const baseStats = this.getBaseStats();
        const equipmentBonus = this.getEquipmentBonuses();
        
        // Apply equipment bonuses to stats
        Object.keys(baseStats).forEach(stat => {
            this.data.stats[stat] = baseStats[stat] + (equipmentBonus[stat] || 0);
        });

        // Recalculate derived stats
        this.data.maxHealth = 100 + (this.data.level - 1) * 15;
        this.data.maxStress = 100 + (this.data.level - 1) * 10;
        this.data.maxEnergy = 100 + (this.data.level - 1) * 5;
        
        // Ensure current values don't exceed new maximums
        this.data.health = Math.min(this.data.health, this.data.maxHealth);
        this.data.stress = Math.min(this.data.stress, this.data.maxStress);
        this.data.energy = Math.min(this.data.energy, this.data.maxEnergy);
        
        // Notify listeners of stat changes
        this.notifyStatChange();
    }

    /**
     * Get base stats for current level
     */
    getBaseStats() {
        const base = {
            attack: 15,
            defense: 10,
            speed: 12,
            intelligence: 18,
            charisma: 8,
            luck: 10
        };

        // Apply level-based bonuses
        const levelBonus = Math.floor(this.data.level / 2);
        base.attack += levelBonus;
        base.defense += levelBonus;
        base.speed += levelBonus;
        base.intelligence += levelBonus;
        base.charisma += Math.floor(levelBonus / 2);
        base.luck += Math.floor(levelBonus / 3);

        // Apply knowledge bonus to intelligence
        base.intelligence += Math.floor(this.data.knowledge / 10);

        return base;
    }

    /**
     * Get equipment stat bonuses
     */
    getEquipmentBonuses() {
        const bonuses = {
            attack: 0,
            defense: 0,
            speed: 0,
            intelligence: 0,
            charisma: 0,
            luck: 0
        };

        Object.values(this.data.equipment).forEach(item => {
            if (item && item.statBonuses) {
                Object.keys(item.statBonuses).forEach(stat => {
                    bonuses[stat] += item.statBonuses[stat];
                });
            }
        });

        return bonuses;
    }

    /**
     * Gain experience points and handle leveling
     */
    gainExperience(amount) {
        const originalLevel = this.data.level;
        this.data.exp += amount;
        
        // Check for level up
        while (this.data.exp >= this.data.expToNext) {
            this.levelUp();
        }
        
        // Update UI if level changed
        if (this.data.level > originalLevel) {
            this.engine.updateUI();
            if (this.levelUpCallback) {
                this.levelUpCallback(this.data.level);
            }
        }
    }

    /**
     * Level up the character
     */
    levelUp() {
        this.data.exp -= this.data.expToNext;
        this.data.level++;
        
        // Calculate next level requirement
        this.data.expToNext = Math.floor(this.data.expToNext * 1.25 + 20);
        
        // Increase stats
        const statGains = this.getLevelUpGains();
        Object.keys(statGains).forEach(stat => {
            this.data.stats[stat] += statGains[stat];
        });
        
        // Increase maximums
        this.data.maxHealth += 10;
        this.data.maxStress += 8;
        this.data.maxEnergy += 5;
        this.data.knowledge += 3;
        
        // Restore some health and energy
        this.data.health = Math.min(this.data.health + 20, this.data.maxHealth);
        this.data.energy = Math.min(this.data.energy + 15, this.data.maxEnergy);
        
        // Unlock new abilities occasionally
        if (this.data.level % 3 === 0) {
            this.unlockRandomAbility();
        }
        
        // Award achievement
        this.addAchievement(`Level ${this.data.level} Reached`);
    }

    /**
     * Get stat gains for level up
     */
    getLevelUpGains() {
        return {
            attack: Math.floor(Math.random() * 3) + 1,
            defense: Math.floor(Math.random() * 2) + 1,
            speed: Math.floor(Math.random() * 2) + 1,
            intelligence: Math.floor(Math.random() * 3) + 1,
            charisma: Math.floor(Math.random() * 2) + 1,
            luck: Math.floor(Math.random() * 2) + 1
        };
    }

    /**
     * Unlock a random new ability
     */
    unlockRandomAbility() {
        const availableAbilities = [
            'Study Shield', 'Homework Strike', 'Excuse Escape', 'Knowledge Boost',
            'Stress Resistance', 'Quick Think', 'Peer Pressure', 'Detention Dodge',
            'Note Taking', 'Cram Session', 'Office Hours', 'Study Group',
            'Academic Focus', 'Procrastination Cancel', 'Grade Boost'
        ];
        
        const unlocked = this.data.abilities;
        const newAbilities = availableAbilities.filter(ability => !unlocked.includes(ability));
        
        if (newAbilities.length > 0) {
            const randomAbility = newAbilities[Math.floor(Math.random() * newAbilities.length)];
            this.data.abilities.push(randomAbility);
            this.addAchievement(`Unlocked: ${randomAbility}`);
        }
    }

    /**
     * Add a status effect
     */
    addStatusEffect(effect) {
        const existingEffect = this.data.statusEffects.find(e => e.type === effect.type);
        
        if (existingEffect) {
            // Extend duration or increase stacks
            existingEffect.duration = Math.max(existingEffect.duration, effect.duration);
            existingEffect.stacks = Math.min(existingEffect.stacks + 1, effect.maxStacks || 1);
        } else {
            // Add new effect
            this.data.statusEffects.push({...effect});
        }
    }

    /**
     * Remove a status effect
     */
    removeStatusEffect(type) {
        this.data.statusEffects = this.data.statusEffects.filter(e => e.type !== type);
    }

    /**
     * Update status effects
     */
    updateStatusEffects(deltaTime) {
        this.data.statusEffects.forEach(effect => {
            effect.duration -= deltaTime / 1000; // Convert to seconds
        });
        
        // Remove expired effects
        this.data.statusEffects = this.data.statusEffects.filter(effect => effect.duration > 0);
    }

    /**
     * Take damage
     */
    takeDamage(amount, type = 'physical') {
        let damage = amount;
        
        // Apply defense reduction
        const defense = this.data.stats.defense;
        damage = Math.max(1, damage - Math.floor(defense * 0.3));
        
        // Apply status effect modifiers
        this.data.statusEffects.forEach(effect => {
            if (effect.type === 'defending') {
                damage = Math.floor(damage * 0.5);
            }
            if (effect.damageReduction) {
                damage = Math.floor(damage * (1 - effect.damageReduction));
            }
        });
        
        this.data.health -= damage;
        
        if (this.data.health <= 0) {
            this.data.health = 0;
            this.onDeath();
        }
        
        return damage;
    }

    /**
     * Heal the character
     */
    heal(amount) {
        const oldHealth = this.data.health;
        this.data.health = Math.min(this.data.health + amount, this.data.maxHealth);
        return this.data.health - oldHealth;
    }

    /**
     * Increase stress
     */
    increaseStress(amount) {
        const oldStress = this.data.stress;
        this.data.stress = Math.min(this.data.stress + amount, this.data.maxStress);
        
        if (this.data.stress >= this.data.maxStress) {
            this.onStressOverload();
        }
        
        return this.data.stress - oldStress;
    }

    /**
     * Decrease stress
     */
    decreaseStress(amount) {
        const oldStress = this.data.stress;
        this.data.stress = Math.max(this.data.stress - amount, 0);
        return oldStress - this.data.stress;
    }

    /**
     * Use energy
     */
    useEnergy(amount) {
        const oldEnergy = this.data.energy;
        this.data.energy = Math.max(this.data.energy - amount, 0);
        return oldEnergy - this.data.energy;
    }

    /**
     * Restore energy
     */
    restoreEnergy(amount) {
        const oldEnergy = this.data.energy;
        this.data.energy = Math.min(this.data.energy + amount, this.data.maxEnergy);
        return this.data.energy - oldEnergy;
    }

    /**
     * Increase knowledge
     */
    increaseKnowledge(amount) {
        const oldKnowledge = this.data.knowledge;
        this.data.knowledge = Math.min(this.data.knowledge + amount, 999);
        return this.data.knowledge - oldKnowledge;
    }

    /**
     * Handle character death
     */
    onDeath() {
        this.addAchievement('Defeated');
        // Trigger game over or respawn logic
        if (this.engine.handlePlayerDeath) {
            this.engine.handlePlayerDeath();
        }
    }

    /**
     * Handle stress overload
     */
    onStressOverload() {
        this.addStatusEffect({
            type: 'panic',
            duration: 30000, // 30 seconds
            description: 'Panic state - reduced effectiveness',
            statModifiers: {
                attack: -5,
                speed: -3,
                intelligence: -10
            }
        });
    }

    /**
     * Add achievement
     */
    addAchievement(achievement) {
        if (!this.data.achievements.includes(achievement)) {
            this.data.achievements.push(achievement);
            console.log(`Achievement unlocked: ${achievement}`);
        }
    }

    /**
     * Check if character has achievement
     */
    hasAchievement(achievement) {
        return this.data.achievements.includes(achievement);
    }

    /**
     * Set story flag
     */
    setStoryFlag(flag, value = true) {
        this.data.storyFlags[flag] = value;
    }

    /**
     * Get story flag
     */
    getStoryFlag(flag) {
        return this.data.storyFlags[flag] || false;
    }

    /**
     * Check if story flag is set
     */
    hasStoryFlag(flag) {
        return this.getStoryFlag(flag) === true;
    }

    /**
     * Register callback for stat changes
     */
    onStatChange(callback) {
        this.statChangeCallbacks.push(callback);
    }

    /**
     * Notify listeners of stat changes
     */
    notifyStatChange() {
        this.statChangeCallbacks.forEach(callback => {
            try {
                callback(this.data);
            } catch (error) {
                console.error('Error in stat change callback:', error);
            }
        });
    }

    /**
     * Set level up callback
     */
    onLevelUp(callback) {
        this.levelUpCallback = callback;
    }

    /**
     * Update character systems
     */
    update(deltaTime) {
        // Update status effects
        this.updateStatusEffects(deltaTime);
        
        // Passive energy regeneration
        if (this.data.energy < this.data.maxEnergy) {
            this.restoreEnergy(deltaTime * 0.01); // 1% per second
        }
        
        // Passive stress recovery in safe areas
        if (this.engine.school && this.engine.school.isSafeArea()) {
            this.decreaseStress(deltaTime * 0.005); // 0.5% per second
        }
    }

    /**
     * Get character display info
     */
    getDisplayInfo() {
        return {
            name: this.data.name,
            level: this.data.level,
            exp: this.data.exp,
            expToNext: this.data.expToNext,
            health: this.data.health,
            maxHealth: this.data.maxHealth,
            stress: this.data.stress,
            maxStress: this.data.maxStress,
            knowledge: this.data.knowledge,
            energy: this.data.energy,
            maxEnergy: this.data.maxEnergy,
            stats: {...this.data.stats},
            abilities: [...this.data.abilities],
            statusEffects: [...this.data.statusEffects],
            achievements: [...this.data.achievements]
        };
    }

    /**
     * Render character to canvas
     */
    render(ctx) {
        if (!ctx || !this.engine.canvas) return;
        
        const canvas = this.engine.canvas;
        const x = canvas.width / 2;
        const y = canvas.height / 2 + 50;
        
        // Character sprite
        ctx.fillStyle = '#3498db';
        ctx.fillRect(x - 20, y - 20, 40, 40);
        
        // Character name
        ctx.fillStyle = '#ecf0f1';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.data.name, x, y - 30);
        
        // Level indicator
        ctx.fillStyle = '#f39c12';
        ctx.font = '14px Arial';
        ctx.fillText(`Lv.${this.data.level}`, x, y + 35);
    }

    /**
     * Save character data
     */
    save() {
        const storageKey = location.pathname + "character_data";
        try {
            localStorage.setItem(storageKey, JSON.stringify(this.data));
        } catch (error) {
            console.error('Failed to save character data:', error);
        }
    }

    /**
     * Load character data
     */
    load() {
        const storageKey = location.pathname + "character_data";
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                this.data = JSON.parse(saved);
                this.ensureDataIntegrity();
                this.updateStats();
                return true;
            }
        } catch (error) {
            console.error('Failed to load character data:', error);
        }
        return false;
    }
}

// Export for use by other systems
window.CharacterSystem = CharacterSystem;
