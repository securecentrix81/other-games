/**
 * Combat System - Turn-Based Battle Engine
 * 
 * Purpose: Handles all turn-based combat encounters including enemies, rivals, and boss fights
 * Dependencies: This file requires game-engine.js and character-system.js to be loaded first
 * Exports: window.CombatSystem - Battle management class
 */

class CombatSystem {
    constructor(engine) {
        this.engine = engine;
        this.battleActive = false;
        this.currentEnemy = null;
        this.playerTurn = true;
        this.turnOrder = [];
        this.currentTurnIndex = 0;
        this.battleLog = [];
        this.battleState = 'player_turn'; // player_turn, enemy_turn, victory, defeat
        this.autoBattle = false;
        this.turnTimer = null;
        this.battleConfig = {
            maxTurns: 50,
            autoSave: true,
            allowFlee: true
        };
        
        // Battle UI elements
        this.ui = {
            enemyName: null,
            enemyHealthFill: null,
            enemyHealthText: null,
            playerHealthFill: null,
            playerHealthText: null,
            battleLog: null,
            attackBtn: null,
            defendBtn: null,
            itemBtn: null,
            specialBtn: null
        };

        this.initializeCombatUI();
    }

    /**
     * Initialize combat UI references
     */
    initializeCombatUI() {
        this.ui.enemyName = this.engine.ui.enemyName;
        this.ui.enemyHealthFill = this.engine.ui.enemyHealthFill;
        this.ui.enemyHealthText = this.engine.ui.enemyHealthText;
        this.ui.playerHealthFill = this.engine.ui.playerHealthFill;
        this.ui.playerHealthText = this.engine.ui.playerHealthText;
        this.ui.battleLog = this.engine.ui.battleLog;
        this.ui.attackBtn = this.engine.ui.attackBtn;
        this.ui.defendBtn = this.engine.ui.defendBtn;
        this.ui.itemBtn = this.engine.ui.itemBtn;
        this.ui.specialBtn = this.engine.ui.specialBtn;
    }

    /**
     * Start a battle encounter
     */
    startBattle(enemyData, battleType = 'normal') {
        this.battleActive = true;
        this.battleState = 'player_turn';
        this.battleLog = [];
        this.currentTurnIndex = 0;
        
        // Create enemy object
        this.currentEnemy = this.createEnemy(enemyData);
        
        // Determine turn order
        this.determineTurnOrder();
        
        // Update battle UI
        this.updateBattleUI();
        this.addBattleLog(`A ${this.currentEnemy.name} appears!`);
        this.addBattleLog(`Battle type: ${battleType}`);
        
        // Set up battle event listeners
        this.setupBattleListeners();
        
        // Check for surprise attacks or special conditions
        this.checkBattleStartConditions();
        
        console.log(`Battle started against ${this.currentEnemy.name}`);
    }

    /**
     * Create enemy object with full stats and AI
     */
    createEnemy(enemyData) {
        const enemy = {
            name: enemyData.name || 'Unknown Enemy',
            level: enemyData.level || 1,
            health: enemyData.health || enemyData.maxHealth || 50,
            maxHealth: enemyData.maxHealth || enemyData.health || 50,
            stress: 0,
            maxStress: enemyData.maxStress || 50,
            energy: enemyData.energy || 100,
            maxEnergy: enemyData.maxEnergy || 100,
            stats: {
                attack: enemyData.attack || 10,
                defense: enemyData.defense || 5,
                speed: enemyData.speed || 8,
                intelligence: enemyData.intelligence || 5,
                charisma: enemyData.charisma || 1,
                luck: enemyData.luck || 5
            },
            abilities: enemyData.abilities || ['Basic Attack'],
            equipment: enemyData.equipment || {},
            statusEffects: [],
            ai: enemyData.ai || this.getDefaultAI(),
            drops: enemyData.drops || [],
            expReward: enemyData.expReward || 25,
            moneyReward: enemyData.moneyReward || 0,
            isBoss: enemyData.isBoss || false,
            uniqueAbilities: enemyData.uniqueAbilities || []
        };

        return enemy;
    }

    /**
     * Get default AI behavior for enemies
     */
    getDefaultAI() {
        return {
            type: 'aggressive', // aggressive, defensive, balanced, cunning
            preferAttack: 0.7,
            preferDefend: 0.2,
            preferItem: 0.1,
            specialChance: 0.3,
            fleeChance: 0.1
        };
    }

    /**
     * Determine turn order based on speed stats
     */
    determineTurnOrder() {
        const playerSpeed = this.engine.character.data.stats.speed;
        const enemySpeed = this.currentEnemy.stats.speed;
        
        this.turnOrder = [
            { type: 'player', speed: playerSpeed },
            { type: 'enemy', speed: enemySpeed }
        ];
        
        // Sort by speed (highest first)
        this.turnOrder.sort((a, b) => b.speed - a.speed);
        
        // If tied, randomize
        if (this.turnOrder[0].speed === this.turnOrder[1].speed) {
            if (Math.random() < 0.5) {
                this.turnOrder.reverse();
            }
        }
        
        this.currentTurnIndex = 0;
        this.playerTurn = this.turnOrder[0].type === 'player';
    }

    /**
     * Update battle UI elements
     */
    updateBattleUI() {
        if (!this.currentEnemy) return;
        
        // Update enemy info
        if (this.ui.enemyName) {
            this.ui.enemyName.textContent = this.currentEnemy.name;
        }
        this.updateHealthBar('enemy', this.currentEnemy.health, this.currentEnemy.maxHealth);
        
        // Update player info
        const player = this.engine.character.data;
        this.updateHealthBar('player', player.health, player.maxHealth);
        
        // Update ability buttons
        this.updateAbilityButtons();
        
        // Enable/disable buttons based on turn
        this.updateButtonStates();
    }

    /**
     * Update health bar display
     */
    updateHealthBar(type, current, max) {
        const percent = Math.max(0, Math.min(100, (current / max) * 100));
        
        if (type === 'enemy') {
            if (this.ui.enemyHealthFill) {
                this.ui.enemyHealthFill.style.width = `${percent}%`;
            }
            if (this.ui.enemyHealthText) {
                this.ui.enemyHealthText.textContent = `${Math.max(0, current)}/${max}`;
            }
        } else {
            if (this.ui.playerHealthFill) {
                this.ui.playerHealthFill.style.width = `${percent}%`;
            }
            if (this.ui.playerHealthText) {
                this.ui.playerHealthText.textContent = `${Math.max(0, current)}/${max}`;
            }
        }
    }

    /**
     * Update ability button states
     */
    updateAbilityButtons() {
        const player = this.engine.character.data;
        
        // Update special button with current ability
        if (this.ui.specialBtn && player.abilities.length > 0) {
            const currentAbility = player.abilities[0]; // Could implement ability rotation
            this.ui.specialBtn.textContent = currentAbility;
        }
    }

    /**
     * Update button enabled/disabled states
     */
    updateButtonStates() {
        const enableButtons = this.playerTurn && this.battleActive;
        
        [this.ui.attackBtn, this.ui.defendBtn, this.ui.itemBtn, this.ui.specialBtn].forEach(btn => {
            if (btn) {
                btn.disabled = !enableButtons;
            }
        });
    }

    /**
     * Add message to battle log
     */
    addBattleLog(message) {
        this.battleLog.push({
            message: message,
            timestamp: Date.now(),
            type: 'normal'
        });
        
        // Update UI if available
        if (this.ui.battleLog) {
            const logElement = this.ui.battleLog;
            const messageDiv = document.createElement('div');
            messageDiv.textContent = message;
            messageDiv.className = 'battle-message';
            logElement.appendChild(messageDiv);
            
            // Auto-scroll to bottom
            logElement.scrollTop = logElement.scrollHeight;
            
            // Keep only last 10 messages
            while (logElement.children.length > 10) {
                logElement.removeChild(logElement.firstChild);
            }
        }
    }

    /**
     * Handle player action selection
     */
    handlePlayerAction(action) {
        if (!this.playerTurn || !this.battleActive) return;
        
        this.playerTurn = false;
        this.updateButtonStates();
        
        switch (action) {
            case 'attack':
                this.playerAttack();
                break;
            case 'defend':
                this.playerDefend();
                break;
            case 'item':
                this.playerUseItem();
                break;
            case 'special':
                this.playerUseSpecial();
                break;
            case 'flee':
                this.playerFlee();
                break;
            default:
                console.warn('Unknown player action:', action);
                this.playerTurn = true;
                this.updateButtonStates();
        }
    }

    /**
     * Player attack action
     */
    playerAttack() {
        const player = this.engine.character.data;
        const damage = this.calculateDamage(player, this.currentEnemy, 'physical');
        
        this.currentEnemy.health -= damage;
        this.addBattleLog(`Eric attacks for ${damage} damage!`);
        
        // Check for critical hits
        if (this.isCriticalHit(player, this.currentEnemy)) {
            this.addBattleLog('Critical hit!');
        }
        
        // Apply any on-hit effects
        this.applyAttackEffects(player, this.currentEnemy);
        
        this.checkBattleEnd();
        
        if (this.battleActive) {
            setTimeout(() => this.enemyTurn(), 1500);
        }
    }

    /**
     * Player defend action
     */
    playerDefend() {
        const player = this.engine.character.data;
        
        // Add defending status effect
        player.statusEffects = player.statusEffects || [];
        player.statusEffects.push({
            type: 'defending',
            duration: 1, // One turn
            description: 'Defending - 50% damage reduction'
        });
        
        this.addBattleLog('Eric takes a defensive stance!');
        
        setTimeout(() => this.enemyTurn(), 1500);
    }

    /**
     * Player use item action
     */
    playerUseItem() {
        // Open inventory for item selection
        if (this.engine.inventory) {
            this.engine.inventory.selectItemForBattle();
            this.addBattleLog('Choose an item to use.');
        } else {
            this.addBattleLog('No inventory system available!');
            this.playerTurn = true;
            this.updateButtonStates();
        }
    }

    /**
     * Player use special ability
     */
    playerUseSpecial() {
        const player = this.engine.character.data;
        
        if (player.abilities && player.abilities.length > 0) {
            const ability = player.abilities[0];
            this.useAbility(ability, player, this.currentEnemy);
        } else {
            this.addBattleLog('No special abilities available!');
            this.playerTurn = true;
            this.updateButtonStates();
        }
    }

    /**
     * Player attempt to flee
     */
    playerFlee() {
        if (!this.battleConfig.allowFlee) {
            this.addBattleLog('Cannot flee from this battle!');
            this.playerTurn = true;
            this.updateButtonStates();
            return;
        }
        
        const player = this.engine.character.data;
        const playerSpeed = player.stats.speed;
        const enemySpeed = this.currentEnemy.stats.speed;
        
        // Flee chance based on speed difference
        let fleeChance = 0.5;
        if (playerSpeed > enemySpeed) {
            fleeChance = 0.7;
        } else if (playerSpeed < enemySpeed) {
            fleeChance = 0.3;
        }
        
        if (Math.random() < fleeChance) {
            this.addBattleLog('Eric successfully fled!');
            setTimeout(() => this.endBattle('fled'), 1000);
        } else {
            this.addBattleLog('Failed to flee!');
            setTimeout(() => this.enemyTurn(), 1500);
        }
    }

    /**
     * Enemy turn logic
     */
    enemyTurn() {
        if (!this.battleActive) return;
        
        this.battleState = 'enemy_turn';
        
        // Small delay for dramatic effect
        setTimeout(() => {
            this.executeEnemyAction();
        }, 500);
    }

    /**
     * Execute enemy AI action
     */
    executeEnemyAction() {
        if (!this.currentEnemy || !this.battleActive) return;
        
        const enemy = this.currentEnemy;
        const player = this.engine.character.data;
        const action = this.selectEnemyAction(enemy);
        
        switch (action) {
            case 'attack':
                this.enemyAttack(enemy, player);
                break;
            case 'defend':
                this.enemyDefend(enemy);
                break;
            case 'special':
                this.enemyUseSpecial(enemy, player);
                break;
            case 'flee':
                this.enemyFlee(enemy);
                break;
            default:
                this.enemyAttack(enemy, player);
        }
        
        if (this.battleActive) {
            this.playerTurn = true;
            this.battleState = 'player_turn';
            this.updateButtonStates();
        }
    }

    /**
     * Select enemy action based on AI
     */
    selectEnemyAction(enemy) {
        const ai = enemy.ai;
        const player = this.engine.character.data;
        const random = Math.random();
        
        // Health-based decisions
        const lowHealth = enemy.health < enemy.maxHealth * 0.3;
        const playerLowHealth = player.health < player.maxHealth * 0.3;
        
        // Adjust probabilities based on situation
        let attackProb = ai.preferAttack;
        let defendProb = ai.preferDefend;
        let specialProb = ai.specialChance;
        let fleeProb = ai.fleeChance;
        
        // Low health enemies might flee or use special
        if (lowHealth) {
            defendProb += 0.2;
            specialProb += 0.2;
            if (enemy.isBoss) {
                fleeProb = 0; // Bosses don't flee
            }
        }
        
        // If player is low health, enemies might focus on attack
        if (playerLowHealth) {
            attackProb += 0.1;
        }
        
        // Normalize probabilities
        const total = attackProb + defendProb + specialProb + fleeProb;
        attackProb /= total;
        defendProb /= total;
        specialProb /= total;
        
        // Select action
        if (random < attackProb) return 'attack';
        if (random < attackProb + defendProb) return 'defend';
        if (random < attackProb + defendProb + specialProb) return 'special';
        return 'flee';
    }

    /**
     * Enemy attack action
     */
    enemyAttack(enemy, player) {
        const damage = this.calculateDamage(enemy, player, 'physical');
        
        player.health -= damage;
        this.addBattleLog(`${enemy.name} attacks for ${damage} damage!`);
        
        // Check for critical hits
        if (this.isCriticalHit(enemy, player)) {
            this.addBattleLog('Critical hit!');
        }
        
        this.checkBattleEnd();
    }

    /**
     * Enemy defend action
     */
    enemyDefend(enemy) {
        enemy.statusEffects = enemy.statusEffects || [];
        enemy.statusEffects.push({
            type: 'defending',
            duration: 1,
            description: 'Defending - 50% damage reduction'
        });
        
        this.addBattleLog(`${enemy.name} takes a defensive stance!`);
    }

    /**
     * Enemy use special ability
     */
    enemyUseSpecial(enemy, player) {
        if (enemy.uniqueAbilities && enemy.uniqueAbilities.length > 0) {
            const ability = enemy.uniqueAbilities[0];
            this.useAbility(ability, enemy, player, true);
        } else {
            // Fallback to regular attack with increased damage
            const damage = this.calculateDamage(enemy, player, 'physical') * 1.5;
            player.health -= Math.floor(damage);
            this.addBattleLog(`${enemy.name} uses a special attack for ${Math.floor(damage)} damage!`);
        }
        
        this.checkBattleEnd();
    }

    /**
     * Enemy attempt to flee
     */
    enemyFlee(enemy) {
        this.addBattleLog(`${enemy.name} attempts to flee!`);
        
        if (Math.random() < 0.3) {
            this.addBattleLog(`${enemy.name} successfully fled!`);
            setTimeout(() => this.endBattle('enemy_fled'), 1000);
        } else {
            this.addBattleLog(`${enemy.name} failed to flee!`);
            this.playerTurn = true;
            this.updateButtonStates();
        }
    }

    /**
     * Calculate damage between attacker and defender
     */
    calculateDamage(attacker, defender, attackType = 'physical') {
        let baseDamage = attacker.stats.attack;
        
        // Add randomness
        baseDamage += Math.random() * 10;
        
        // Apply intelligence bonus for certain attack types
        if (attackType === 'intelligence' || attackType === 'psychological') {
            baseDamage += attacker.stats.intelligence * 0.5;
        }
        
        // Apply charisma bonus for social attacks
        if (attackType === 'social' || attackType === 'verbal') {
            baseDamage += attacker.stats.charisma * 0.3;
        }
        
        // Apply defense reduction
        const defense = defender.stats.defense;
        baseDamage = Math.max(1, baseDamage - defense * 0.4);
        
        // Apply status effect modifiers
        baseDamage = this.applyStatusDamageModifiers(baseDamage, attacker, defender);
        
        return Math.floor(baseDamage);
    }

    /**
     * Apply status effect modifiers to damage
     */
    applyStatusDamageModifiers(baseDamage, attacker, defender) {
        let damage = baseDamage;
        
        // Attacker status effects
        if (attacker.statusEffects) {
            attacker.statusEffects.forEach(effect => {
                if (effect.damageBonus) {
                    damage *= (1 + effect.damageBonus);
                }
                if (effect.type === 'rage') {
                    damage *= 1.5;
                }
            });
        }
        
        // Defender status effects
        if (defender.statusEffects) {
            defender.statusEffects.forEach(effect => {
                if (effect.damageReduction) {
                    damage *= (1 - effect.damageReduction);
                }
                if (effect.type === 'defending') {
                    damage *= 0.5;
                }
            });
        }
        
        return damage;
    }

    /**
     * Check for critical hits
     */
    isCriticalHit(attacker, defender) {
        const critChance = (attacker.stats.luck + attacker.stats.speed) / 100;
        return Math.random() < critChance * 0.1; // 10% of luck/speed chance
    }

    /**
     * Use an ability
     */
    useAbility(abilityName, user, target, isEnemy = false) {
        const ability = this.getAbility(abilityName);
        if (!ability) {
            this.addBattleLog(`${isEnemy ? target.name : 'Eric'} tried to use ${abilityName}, but it failed!`);
            return;
        }
        
        const player = this.engine.character.data;
        const energyCost = ability.energyCost || 0;
        
        // Check energy cost
        if (user.energy < energyCost) {
            this.addBattleLog(`${user.name} doesn't have enough energy for ${abilityName}!`);
            return;
        }
        
        // Use energy
        user.energy -= energyCost;
        
        // Execute ability effect
        this.executeAbilityEffect(ability, user, target);
        
        this.addBattleLog(`${user.name} uses ${abilityName}!`);
        
        // Check battle end after ability use
        this.checkBattleEnd();
        
        if (!isEnemy && this.battleActive) {
            setTimeout(() => this.enemyTurn(), 1500);
        }
    }

    /**
     * Get ability data
     */
    getAbility(abilityName) {
        const abilities = {
            'Speed Dash': {
                type: 'attack',
                damage: 20,
                energyCost: 15,
                effect: 'quick_attack'
            },
            'Study Shield': {
                type: 'defense',
                effect: 'defend',
                duration: 2,
                energyCost: 20
            },
            'Homework Strike': {
                type: 'attack',
                damage: 30,
                energyCost: 25,
                effect: 'intelligence_based'
            },
            'Excuse Escape': {
                type: 'flee',
                effect: 'guaranteed_flee',
                energyCost: 10
            },
            'Knowledge Boost': {
                type: 'buff',
                effect: 'intelligence_boost',
                duration: 3,
                energyCost: 15
            },
            'Stress Resistance': {
                type: 'buff',
                effect: 'stress_resistance',
                duration: 5,
                energyCost: 20
            },
            'Quick Think': {
                type: 'attack',
                damage: 25,
                energyCost: 20,
                effect: 'speed_based'
            },
            'Peer Pressure': {
                type: 'social',
                damage: 15,
                energyCost: 15,
                effect: 'charisma_based'
            },
            'Detention Dodge': {
                type: 'flee',
                effect: 'guaranteed_flee',
                energyCost: 30
            },
            'Note Taking': {
                type: 'heal',
                amount: 30,
                energyCost: 15,
                effect: 'recover_health'
            },
            'Cram Session': {
                type: 'buff',
                effect: 'damage_boost',
                duration: 3,
                energyCost: 25
            },
            'Office Hours': {
                type: 'heal',
                amount: 50,
                energyCost: 30,
                effect: 'major_heal'
            },
            'Study Group': {
                type: 'buff',
                effect: 'team_boost',
                duration: 4,
                energyCost: 20
            },
            'Academic Focus': {
                type: 'buff',
                effect: 'all_stats_boost',
                duration: 3,
                energyCost: 25
            },
            'Procrastination Cancel': {
                type: 'debuff',
                effect: 'enemy_debuff',
                duration: 3,
                energyCost: 20
            },
            'Grade Boost': {
                type: 'ultimate',
                damage: 50,
                energyCost: 40,
                effect: 'massive_damage'
            }
        };
        
        return abilities[abilityName];
    }

    /**
     * Execute ability effect
     */
    executeAbilityEffect(ability, user, target) {
        switch (ability.type) {
            case 'attack':
                const damage = ability.damage + (user.stats.intelligence * 0.3);
                target.health -= Math.floor(damage);
                break;
                
            case 'heal':
                user.health += ability.amount;
                user.health = Math.min(user.health, user.maxHealth);
                break;
                
            case 'defense':
                user.statusEffects = user.statusEffects || [];
                user.statusEffects.push({
                    type: 'defending',
                    duration: ability.duration || 1,
                    damageReduction: 0.5,
                    description: 'Enhanced defense'
                });
                break;
                
            case 'buff':
                user.statusEffects = user.statusEffects || [];
                user.statusEffects.push({
                    type: 'buffed',
                    duration: ability.duration || 3,
                    description: 'Stat boost'
                });
                break;
                
            case 'debuff':
                target.statusEffects = target.statusEffects || [];
                target.statusEffects.push({
                    type: 'debuffed',
                    duration: ability.duration || 3,
                    description: 'Stat reduction'
                });
                break;
                
            case 'flee':
                // Guaranteed flee logic
                this.addBattleLog(`${user.name} successfully escapes!`);
                setTimeout(() => this.endBattle('fled'), 1000);
                break;
        }
    }

    /**
     * Apply attack effects (poison, bleed, etc.)
     */
    applyAttackEffects(attacker, defender) {
        // Could implement various attack effects here
        // For now, just placeholder for future expansion
    }

    /**
     * Check battle end conditions
     */
    checkBattleEnd() {
        if (!this.currentEnemy || !this.battleActive) return;
        
        const player = this.engine.character.data;
        
        // Check if enemy is defeated
        if (this.currentEnemy.health <= 0) {
            this.addBattleLog(`${this.currentEnemy.name} is defeated!`);
            setTimeout(() => this.victory(), 1500);
            return;
        }
        
        // Check if player is defeated
        if (player.health <= 0) {
            this.addBattleLog('Eric has been defeated!');
            setTimeout(() => this.defeat(), 2000);
            return;
        }
        
        // Update UI after damage/healing
        this.updateBattleUI();
    }

    /**
     * Handle victory
     */
    victory() {
        this.battleActive = false;
        this.battleState = 'victory';
        
        const enemy = this.currentEnemy;
        const player = this.engine.character.data;
        
        // Award experience
        const expGained = enemy.expReward;
        this.engine.character.gainExperience(expGained);
        this.addBattleLog(`Gained ${expGained} experience points!`);
        
        // Award money/items
        if (enemy.moneyReward > 0) {
            this.addBattleLog(`Found ${enemy.moneyReward} coins!`);
            // Update player money when implemented
        }
        
        // Drop items
        if (enemy.drops && enemy.drops.length > 0) {
            enemy.drops.forEach(drop => {
                if (Math.random() < drop.chance) {
                    this.addBattleLog(`Found: ${drop.item}`);
                    // Add item to inventory when inventory system is ready
                }
            });
        }
        
        // Achievement checks
        if (enemy.isBoss) {
            this.engine.character.addAchievement(`Defeated ${enemy.name}`);
        }
        
        setTimeout(() => {
            this.endBattle('victory');
        }, 3000);
    }

    /**
     * Handle defeat
     */
    defeat() {
        this.battleActive = false;
        this.battleState = 'defeat';
        
        this.addBattleLog('Battle lost...');
        
        // Handle defeat consequences
        this.handleDefeatConsequences();
        
        setTimeout(() => {
            this.endBattle('defeat');
        }, 2000);
    }

    /**
     * Handle consequences of defeat
     */
    handleDefeatConsequences() {
        const player = this.engine.character.data;
        
        // Lose some experience
        const expLoss = Math.floor(player.exp * 0.1);
        player.exp = Math.max(0, player.exp - expLoss);
        this.addBattleLog(`Lost ${expLoss} experience points.`);
        
        // Increase stress
        player.stress = Math.min(player.stress + 20, player.maxStress);
        
        // Possible detention
        if (Math.random() < 0.3) {
            this.addBattleLog('Sent to detention for losing!');
            if (this.engine.handleDetention) {
                this.engine.handleDetention();
            }
        }
    }

    /**
     * End battle and cleanup
     */
    endBattle(result = 'ended') {
        this.battleActive = false;
        this.battleState = 'ended';
        this.currentEnemy = null;
        
        // Clear battle log
        if (this.ui.battleLog) {
            this.ui.battleLog.innerHTML = '';
        }
        
        // Remove battle event listeners
        this.removeBattleListeners();
        
        // Return to main game
        if (this.engine.endBattle) {
            this.engine.endBattle(result === 'victory');
        }
        
        console.log(`Battle ended: ${result}`);
    }

    /**
     * Setup battle event listeners
     */
    setupBattleListeners() {
        if (this.ui.attackBtn) {
            this.attackListener = () => this.handlePlayerAction('attack');
            this.ui.attackBtn.addEventListener('click', this.attackListener);
        }
        
        if (this.ui.defendBtn) {
            this.defendListener = () => this.handlePlayerAction('defend');
            this.ui.defendBtn.addEventListener('click', this.defendListener);
        }
        
        if (this.ui.itemBtn) {
            this.itemListener = () => this.handlePlayerAction('item');
            this.ui.itemBtn.addEventListener('click', this.itemListener);
        }
        
        if (this.ui.specialBtn) {
            this.specialListener = () => this.handlePlayerAction('special');
            this.ui.specialBtn.addEventListener('click', this.specialListener);
        }
    }

    /**
     * Remove battle event listeners
     */
    removeBattleListeners() {
        [this.ui.attackBtn, this.ui.defendBtn, this.ui.itemBtn, this.ui.specialBtn].forEach(btn => {
            if (btn) {
                btn.removeEventListener('click', this.attackListener || this.defendListener || this.itemListener || this.specialListener);
            }
        });
    }

    /**
     * Check for special battle start conditions
     */
    checkBattleStartConditions() {
        const player = this.engine.character.data;
        const enemy = this.currentEnemy;
        
        // Surprise attack chance
        if (enemy.stats.speed > player.stats.speed && Math.random() < 0.3) {
            this.addBattleLog(`${enemy.name} gets the first strike!`);
            this.playerTurn = false;
            setTimeout(() => this.enemyTurn(), 1000);
        }
        
        // Preemptive strike chance
        if (player.stats.speed > enemy.stats.speed && Math.random() < 0.2) {
            this.addBattleLog('Eric gets the first move!');
            this.playerTurn = true;
        }
    }

    /**
     * Update combat system
     */
    update(deltaTime) {
        if (!this.battleActive) return;
        
        // Update status effects
        this.updateStatusEffects();
        
        // Check for auto-battle actions
        if (this.autoBattle && this.playerTurn) {
            // Auto-battle logic could be implemented here
        }
    }

    /**
     * Update status effects for all combat participants
     */
    updateStatusEffects() {
        if (!this.battleActive) return;
        
        const player = this.engine.character.data;
        const enemy = this.currentEnemy;
        
        // Update player status effects
        if (player.statusEffects) {
            player.statusEffects.forEach(effect => {
                effect.duration--;
            });
            player.statusEffects = player.statusEffects.filter(effect => effect.duration > 0);
        }
        
        // Update enemy status effects
        if (enemy && enemy.statusEffects) {
            enemy.statusEffects.forEach(effect => {
                effect.duration--;
            });
            enemy.statusEffects = enemy.statusEffects.filter(effect => effect.duration > 0);
        }
    }

    /**
     * Get current battle state
     */
    getBattleState() {
        return {
            active: this.battleActive,
            enemy: this.currentEnemy,
            playerTurn: this.playerTurn,
            battleState: this.battleState,
            turnOrder: this.turnOrder,
            currentTurnIndex: this.currentTurnIndex,
            battleLog: this.battleLog
        };
    }

    /**
     * Set auto-battle mode
     */
    setAutoBattle(enabled) {
        this.autoBattle = enabled;
    }

    /**
     * Save battle data
     */
    save() {
        const storageKey = location.pathname + "combat_data";
        try {
            const battleData = {
                battleActive: this.battleActive,
                battleState: this.battleState,
                currentEnemy: this.currentEnemy,
                playerTurn: this.playerTurn,
                battleLog: this.battleLog
            };
            localStorage.setItem(storageKey, JSON.stringify(battleData));
        } catch (error) {
            console.error('Failed to save combat data:', error);
        }
    }

    /**
     * Load battle data
     */
    load() {
        const storageKey = location.pathname + "combat_data";
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const battleData = JSON.parse(saved);
                this.battleState = battleData.battleState;
                this.currentEnemy = battleData.currentEnemy;
                this.playerTurn = battleData.playerTurn;
                this.battleLog = battleData.battleLog || [];
                return true;
            }
        } catch (error) {
            console.error('Failed to load combat data:', error);
        }
        return false;
    }
}
