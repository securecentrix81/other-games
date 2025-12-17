/**
 * Game Data - Centralized Configuration and Balance Values
 * 
 * Purpose: Contains all static game data, configuration values, and balance parameters
 * Dependencies: This file should be loaded after all other systems
 * Exports: window.GameData - Central game configuration object
 */

window.GameData = {
    // Character progression configuration
    character: {
        // Level progression curve
        levelCurve: [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250, 3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10450],
        
        // Stat growth per level
        statGrowth: {
            attack: { base: 15, growth: 2.5 },
            defense: { base: 10, growth: 2.0 },
            speed: { base: 12, growth: 2.0 },
            intelligence: { base: 18, growth: 3.0 },
            charisma: { base: 8, growth: 1.5 },
            luck: { base: 10, growth: 1.8 }
        },
        
        // Health and stress scaling
        maxHealth: { base: 100, growth: 15 },
        maxStress: { base: 100, growth: 10 },
        maxEnergy: { base: 100, growth: 5 },
        
        // Knowledge bonuses
        knowledgeThresholds: [30, 50, 75, 100, 150, 200, 300],
        intelligenceBonusPerKnowledge: 0.1
    },

    // Combat balance configuration
    combat: {
        // Damage calculation parameters
        damage: {
            baseAttackMultiplier: 1.0,
            defenseReduction: 0.4,
            minDamage: 1,
            critChanceBase: 0.05,
            critDamageMultiplier: 1.5,
            randomDamageRange: [0.8, 1.2]
        },
        
        // Turn order calculation
        turnOrder: {
            speedWeight: 1.0,
            luckWeight: 0.1,
            tieBreakerRandom: true
        },
        
        // Status effect durations (in turns)
        statusEffects: {
            defending: 1,
            buffed: 3,
            debuffed: 3,
            stressed: 5,
            confident: 4
        },
        
        // Battle rewards
        rewards: {
            expPerEnemyLevel: 25,
            expPerDifficultyMultiplier: 1.2,
            moneyPerLevel: 10,
            dropChanceBase: 0.3,
            rareDropChance: 0.1
        }
    },

    // Enemy configuration database
    enemies: {
        // Basic enemy templates
        stress_monster: {
            health: 30,
            attack: 12,
            defense: 8,
            speed: 10,
            intelligence: 5,
            abilities: ['Overwhelming Pressure'],
            expReward: 15,
            dropTable: [
                { item: 'stress_pill', chance: 0.4 },
                { item: 'energy_drink', chance: 0.6 }
            ]
        },
        
        anxiety_wisp: {
            health: 25,
            attack: 15,
            defense: 5,
            speed: 15,
            intelligence: 8,
            abilities: ['Doubt Whisper'],
            expReward: 12,
            dropTable: [
                { item: 'focus_cookie', chance: 0.5 }
            ]
        },
        
        homework_creature: {
            health: 35,
            attack: 10,
            defense: 12,
            speed: 8,
            intelligence: 15,
            abilities: ['Endless Tasks'],
            expReward: 18,
            dropTable: [
                { item: 'notebook', chance: 0.7 },
                { item: 'pencil', chance: 0.8 }
            ]
        },
        
        test_anxiety: {
            health: 40,
            attack: 18,
            defense: 10,
            speed: 12,
            intelligence: 12,
            abilities: ['Time Pressure', 'Blank Mind'],
            expReward: 20,
            dropTable: [
                { item: 'smart_pill', chance: 0.3 },
                { item: 'study_guide', chance: 0.4 }
            ]
        },
        
        calculator_ghost: {
            health: 50,
            attack: 20,
            defense: 15,
            speed: 14,
            intelligence: 20,
            abilities: ['Math Trauma', 'Formula Confusion'],
            expReward: 25,
            dropTable: [
                { item: 'calculator', chance: 0.4 },
                { item: 'smart_pill', chance: 0.6 }
            ]
        },
        
        lunch_monster: {
            health: 55,
            attack: 19,
            defense: 14,
            speed: 12,
            intelligence: 6,
            abilities: ['Food Hoarding'],
            expReward: 22,
            dropTable: [
                { item: 'pizza_slice', chance: 0.8 },
                { item: 'energy_bar', chance: 0.6 }
            ]
        },
        
        cafeteria_lady: {
            health: 80,
            attack: 30,
            defense: 25,
            speed: 5,
            intelligence: 15,
            abilities: ['Portion Control', 'Rule Enforcement'],
            expReward: 30,
            dropTable: [
                { item: 'mystery_meat', chance: 0.7 }
            ]
        },
        
        sports_stress: {
            health: 100,
            attack: 40,
            defense: 35,
            speed: 18,
            intelligence: 8,
            abilities: ['Performance Anxiety', 'Team Pressure'],
            expReward: 45,
            dropTable: [
                { item: 'lucky_charm', chance: 0.5 },
                { item: 'energy_drink', chance: 0.8 }
            ]
        },
        
        gym_teacher_shadow: {
            health: 150,
            attack: 50,
            defense: 45,
            speed: 15,
            intelligence: 15,
            abilities: ['Maximum Effort', 'No Pain No Gain'],
            expReward: 60,
            dropTable: [
                { item: 'teacher_approval', chance: 0.2 },
                { item: 'hall_pass', chance: 0.1 }
            ]
        }
    },

    // Item configuration database
    items: {
        // Weapons
        pencil: {
            name: 'Pencil',
            type: 'weapon',
            icon: '✏️',
            description: 'Basic writing tool. +2 attack',
            statBonuses: { attack: 2 },
            value: 5,
            rarity: 'common'
        },
        
        mechanical_pencil: {
            name: 'Mechanical Pencil',
            type: 'weapon',
            icon: '🖊️',
            description: 'Precision writing tool. +4 attack',
            statBonuses: { attack: 4 },
            value: 15,
            rarity: 'uncommon'
        },
        
        calculator: {
            name: 'Calculator',
            type: 'weapon',
            icon: '🧮',
            description: 'Math weapon. +6 attack, +3 intelligence',
            statBonuses: { attack: 6, intelligence: 3 },
            value: 35,
            rarity: 'rare'
        },
        
        textbook: {
            name: 'Heavy Textbook',
            type: 'weapon',
            icon: '📚',
            description: 'Knowledge weapon. +8 attack, +5 intelligence',
            statBonuses: { attack: 8, intelligence: 5 },
            value: 50,
            rarity: 'rare'
        },

        // Tools
        notebook: {
            name: 'Notebook',
            type: 'tool',
            icon: '📓',
            description: 'Essential study tool. +3 intelligence, +2 defense',
            statBonuses: { intelligence: 3, defense: 2 },
            value: 20,
            rarity: 'common'
        },
        
        study_guide: {
            name: 'Study Guide',
            type: 'tool',
            icon: '📖',
            description: 'Comprehensive study material. +8 intelligence',
            statBonuses: { intelligence: 8 },
            value: 45,
            rarity: 'rare'
        },
        
        flashcards: {
            name: 'Flashcards',
            type: 'tool',
            icon: '🗂️',
            description: 'Memory aids. +6 intelligence, +3 speed',
            statBonuses: { intelligence: 6, speed: 3 },
            value: 40,
            rarity: 'rare'
        },

        // Consumables
        energy_drink: {
            name: 'Energy Drink',
            type: 'consumable',
            icon: '⚡',
            description: 'Restores 30 energy and reduces stress by 10',
            effect: { energy: 30, stress: -10 },
            value: 15,
            rarity: 'common'
        },
        
        health_potion: {
            name: 'Health Potion',
            type: 'consumable',
            icon: '🧪',
            description: 'Restores 40 health points',
            effect: { health: 40 },
            value: 20,
            rarity: 'common'
        },
        
        stress_pill: {
            name: 'Stress Pill',
            type: 'consumable',
            icon: '💊',
            description: 'Reduces stress by 25 points',
            effect: { stress: -25 },
            value: 18,
            rarity: 'common'
        },
        
        smart_pill: {
            name: 'Smart Pill',
            type: 'consumable',
            icon: '🧠',
            description: 'Temporarily increases intelligence by 5',
            effect: { intelligence: 5, duration: 300 },
            value: 30,
            rarity: 'uncommon'
        },
        
        focus_cookie: {
            name: 'Focus Cookie',
            type: 'consumable',
            icon: '🍪',
            description: 'Increases focus - better critical hit chance',
            effect: { luck: 3, duration: 180 },
            value: 25,
            rarity: 'uncommon'
        },

        // Special Items
        hall_pass: {
            name: 'Hall Pass',
            type: 'quest',
            icon: '🎫',
            description: 'Permission to be anywhere. Can escape any battle',
            effect: { fleeGuaranteed: true },
            value: 100,
            rarity: 'legendary'
        },
        
        teacher_approval: {
            name: 'Teacher Approval',
            type: 'quest',
            icon: '⭐',
            description: 'Teacher favor. Boosts all stats slightly',
            statBonuses: { attack: 2, defense: 2, intelligence: 2, charisma: 2 },
            value: 200,
            rarity: 'legendary'
        },
        
        level_67_scroll: {
            name: 'Ancient Scroll of Mastery',
            type: 'quest',
            icon: '📜',
            description: 'Legendary scroll from level 67. Grants immense knowledge.',
            effect: { intelligence: 25, luck: 15, knowledge: 100 },
            value: 1000,
            rarity: 'legendary'
        }
    },

    // Ability configuration
    abilities: {
        'Speed Dash': {
            type: 'attack',
            damage: 20,
            energyCost: 15,
            description: 'Quick strike based on speed'
        },
        
        'Study Shield': {
            type: 'defense',
            effect: 'defend',
            duration: 2,
            energyCost: 20,
            description: 'Enhanced defense for multiple turns'
        },
        
        'Homework Strike': {
            type: 'attack',
            damage: 30,
            energyCost: 25,
            description: 'Intelligence-based heavy attack'
        },
        
        'Excuse Escape': {
            type: 'flee',
            effect: 'guaranteed_flee',
            energyCost: 10,
            description: 'Always successful escape attempt'
        },
        
        'Knowledge Boost': {
            type: 'buff',
            effect: 'intelligence_boost',
            duration: 3,
            energyCost: 15,
            description: 'Temporarily increases intelligence'
        },
        
        'Stress Resistance': {
            type: 'buff',
            effect: 'stress_resistance',
            duration: 5,
            energyCost: 20,
            description: 'Reduces stress accumulation'
        },
        
        'Quick Think': {
            type: 'attack',
            damage: 25,
            energyCost: 20,
            description: 'Speed-based critical attack'
        },
        
        'Peer Pressure': {
            type: 'social',
            damage: 15,
            energyCost: 15,
            description: 'Charisma-based social attack'
        },
        
        'Detention Dodge': {
            type: 'flee',
            effect: 'guaranteed_flee',
            energyCost: 30,
            description: 'Ultimate escape from teacher pursuit'
        },
        
        'Note Taking': {
            type: 'heal',
            amount: 30,
            energyCost: 15,
            description: 'Restores health through focused study'
        },
        
        'Cram Session': {
            type: 'buff',
            effect: 'damage_boost',
            duration: 3,
            energyCost: 25,
            description: 'Intensive study temporarily boosts damage'
        },
        
        'Office Hours': {
            type: 'heal',
            amount: 50,
            energyCost: 30,
            description: 'Major health restoration'
        },
        
        'Study Group': {
            type: 'buff',
            effect: 'team_boost',
            duration: 4,
            energyCost: 20,
            description: 'Collaborative learning boosts all stats'
        },
        
        'Academic Focus': {
            type: 'buff',
            effect: 'all_stats_boost',
            duration: 3,
            energyCost: 25,
            description: 'Comprehensive stat enhancement'
        },
        
        'Procrastination Cancel': {
            type: 'debuff',
            effect: 'enemy_debuff',
            duration: 3,
            energyCost: 20,
            description: 'Reduces enemy effectiveness'
        },
        
        'Grade Boost': {
            type: 'ultimate',
            damage: 50,
            energyCost: 40,
            description: 'Final exam-level devastating attack'
        }
    },

    // School areas configuration
    areas: {
        hallway1: {
            name: 'Main Hallway',
            type: 'neutral',
            enemies: ['stress_monster', 'anxiety_wisp'],
            items: ['pencil', 'energy_drink'],
            safe: false,
            difficulty: 1
        },
        
        classroom1: {
            name: 'Math Class',
            type: 'battle',
            enemies: ['homework_creature', 'test_anxiety', 'calculator_ghost'],
            items: ['calculator', 'mechanical_pencil', 'study_guide'],
            safe: false,
            difficulty: 2
        },
        
        library: {
            name: 'Library',
            type: 'safe',
            enemies: [],
            items: ['study_guide', 'flashcards', 'notebook'],
            safe: true,
            difficulty: 0
        },
        
        cafeteria: {
            name: 'Cafeteria',
            type: 'danger',
            enemies: ['lunch_monster', 'cafeteria_lady'],
            items: ['pizza_slice', 'energy_bar', 'mystery_meat'],
            safe: false,
            difficulty: 3
        },
        
        gym: {
            name: 'Gymnasium',
            type: 'boss',
            enemies: ['sports_stress', 'gym_teacher_shadow'],
            items: ['lucky_charm', 'stress_pill'],
            safe: false,
            difficulty: 5
        }
    },

    // Teacher AI configuration
    teacher: {
        baseIntelligence: 1,
        baseSpeed: 2,
        baseAggression: 1,
        weeklyIntelligenceGrowth: 0.2,
        weeklySpeedGrowth: 0.1,
        weeklyAggressionGrowth: 0.15,
        detectionRange: 8,
        pursuitRange: 15,
        memoryDuration: 30, // seconds
        searchDuration: 60, // seconds
        captureCooldown: 300 // seconds
    },

    // Difficulty scaling configuration
    difficulty: {
        weeklyProgression: {
            enemyStatMultiplier: 1.15,
            encounterRateMultiplier: 1.1,
            teacherSpeedMultiplier: 1.05
        },
        
        levelScaling: {
            enemyLevelBonus: 0.5,
            expRewardMultiplier: 1.1,
            itemDropRateMultiplier: 1.05
        }
    },

    // Game progression configuration
    progression: {
        maxWeeks: 10,
        knowledgeThresholds: [30, 50, 75, 100, 150, 200, 300],
        level67Unlock: {
            level: 67,
            unlockMessage: 'Mastery achieved! Level 67 unlocks hidden potential.',
            bonusStats: { intelligence: 10, luck: 5 }
        },
        
        weeklyMilestones: {
            1: { event: 'First encounter', description: 'Meet your rivals' },
            2: { event: 'Rival alliances', description: 'First relationship choices matter' },
            5: { event: 'Midterm crisis', description: 'Academic pressure peaks' },
            7: { event: 'Final preparations', description: 'Prepare for the ultimate test' },
            10: { event: 'Final exam', description: 'Everything comes down to this' }
        }
    },

    // Audio configuration
    audio: {
        masterVolume: 0.75,
        musicVolume: 0.8,
        sfxVolume: 0.9,
        ambientVolume: 0.6,
        
        musicTracks: {
            menu: 'menu_theme',
            peaceful: 'peaceful_ambient',
            combat: 'battle_theme',
            chase: 'chase_tension',
            victory: 'victory_fanfare',
            defeat: 'defeat_theme'
        },
        
        sfxCategories: {
            ui: ['ui_click', 'ui_hover', 'ui_error', 'ui_success'],
            combat: ['player_attack', 'player_hurt', 'enemy_appear', 'critical_hit'],
            items: ['item_pickup', 'item_use', 'energy_drink', 'health_potion'],
            abilities: ['speed_dash', 'study_shield', 'homework_strike', 'excuse_escape']
        }
    },

    // UI configuration
    ui: {
        animationDuration: 300, // milliseconds
        particleMaxCount: 100,
        battleLogMaxMessages: 10,
        inventoryMaxSlots: 20,
        
        colors: {
            primary: '#3498db',
            secondary: '#2ecc71',
            danger: '#e74c3c',
            warning: '#f39c12',
            success: '#27ae60',
            info: '#3498db'
        },
        
        fonts: {
            primary: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
            mono: 'Consolas, Monaco, Lucida Console, monospace'
        }
    },

    // Save system configuration
    save: {
        maxSlots: 5,
        autoSaveInterval: 300000, // 5 minutes
        enableBackups: true,
        compressionEnabled: true,
        version: '1.0.0'
    },

    // Debug and development settings
    debug: {
        enableConsole: false,
        showFPS: false,
        godMode: false,
        skipTutorials: false,
        unlockAllAreas: false,
        infiniteResources: false
    }
};

// Export for use by other systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.GameData;
}
