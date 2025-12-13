/**
 * config.js
 * Global game configuration and constants
 * All values are namespaced under GAME_CONFIG
 */

const GAME_CONFIG = {
  // Game identity
  GAME_NAME: 'Calvin with Eric',
  VERSION: '1.1.0',
  STORAGE_PREFIX: window.location.pathname.replace(/[^a-zA-Z0-9]/g, '_') + '_calvinWithEric_',
  
  // Display settings
  WIDTH: 1024,
  HEIGHT: 768,
  SCALE_MODE: Phaser.Scale.FIT,
  AUTO_CENTER: Phaser.Scale.CENTER_BOTH,
  
  // Physics configuration
  PHYSICS: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1500 },
      debug: false,
      debugShowBody: false,
      debugShowVelocity: false,
      debugVelocityColor: 0xffff00,
      debugBodyColor: 0x0000ff,
      debugVelocityScale: 0.5
    }
  },
  
  // Display boundaries
  WORLD_BOUNDS: {
    minX: 0,
    maxX: 1024 * 12, // 12 times the screen width
    minY: 0,
    maxY: 768 * 4   // 4 times the screen height
  },
  
  // Player configuration
  PLAYER: {
    moveSpeed: 400,
    jumpForce: -900,
    attackRange: 80,
    attackDamage: 10,
    invincibilityDuration: 1.0, // seconds
    baseHealth: 100,
    healAmount: 15, // Amount restored by healing items
    maxHealth: 150
  },
  
  // Camera configuration
  CAMERA: {
    followLerp: 0.1, // Camera follow smoothness
    zoom: 1.0,
    boundaryBuffer: 100 // Pixel buffer before camera stops following
  },
  
  // Progression configuration
  PROGRESSION: {
    LEVELS: 15,
    BOSS_LEVELS: [5, 10, 15],
    DATE_EVENTS: [3, 7, 12], // Level numbers where dates occur
    MINI_GAMES: [2, 6, 9, 13],
    
    // Unlock thresholds
    UNLOCKS: {
      doubleJump: { relationship: 65, level: 3 },
      syncAttack: { relationship: 75, level: 4 },
      relationshipPulse: { relationship: 85, level: 5 },
      ultimateCombo: { relationship: 90, level: 7 }
    }
  },
  
  // Relationship system configuration
  RELATIONSHIP: {
    TIER_THRESHOLDS: {
      strained: 30,
      growing: 60,
      strong: 85,
      unbreakable: 100
    },
    COMBAT_BONUSES: {
      strained: { damageBoost: 0, healChance: 0, syncAttack: false },
      growing: { damageBoost: 0, healChance: 0.05, syncAttack: false },
      strong: { damageBoost: 0.15, healChance: 0.1, syncAttack: true },
      unbreakable: { damageBoost: 0.3, healChance: 0.2, syncAttack: true }
    },
    // Relationship impact values for choices
    CHOICE_IMPACT: {
      positive: { min: 3, max: 12 },
      slightlyPositive: { min: 1, max: 4 },
      neutral: { min: -1, max: 1 },
      negative: { min: -5, max: -2 },
      veryNegative: { min: -8, max: -4 }
    },
    MAX_SCORE: 100,
    MIN_SCORE: 0,
    
    // Memory system - choices in dates affect future events
    MEMORIES: {
      loveLanguages: ['words', 'touch', 'gifts', 'acts', 'time'],
      importantDates: ['firstMeeting', 'firstDate', 'firstFight', 'resolution'],
      emotionalTriggers: ['insecurity', 'independence', 'connection', 'safety']
    }
  },
  
  // Game modes configuration
  MODES: {
    MAIN_STORY: {
      id: 'main',
      name: 'Main Story',
      description: 'Follow Calvin and Eric\'s journey',
      unlocks: []
    },
    ENDLESS_ARENA: {
      id: 'arena',
      name: 'Endless Arena',
      description: 'Survive endless waves of monsters',
      unlocks: ['defeatedFirstBoss']
    },
    TIME_TRIAL: {
      id: 'trial',
      name: 'Time Trial',
      description: 'Complete levels as fast as possible',
      unlocks: ['completedThreeLevels']
    },
    RELATIONSHIP_RECALL: {
      id: 'recall',
      name: 'Relationship Recall',
      description: 'Revisit important relationship moments',
      unlocks: ['unlockedMemories']
    },
    SECRET: {
      id: 'secret',
      name: 'Shadow Realm',
      description: 'A hidden reality only lovers can access',
      unlocks: ['allDatesCompleted', 'unbreakableRelationship']
    }
  },
  
  // Challenge system
  CHALLENGES: {
    DAILY: [
      { id: 'damageless', name: 'Flawless Victory', description: 'Complete a level without taking damage', reward: { relationship: 5, currency: 100 } },
      { id: 'speedrun', name: 'Quick Pace', description: 'Complete any level under 2 minutes', reward: { relationship: 3, currency: 80 } },
      { id: 'combo', name: 'Combo Master', description: 'Achieve a 5x combo in combat', reward: { relationship: 2, currency: 50 } },
      { id: 'explore', name: 'Explorer', description: 'Visit 3 new areas in the world', reward: { relationship: 4, currency: 70 } }
    ],
    
    GLOBAL: [
      { id: '100enemies', name: 'Monster Slayer', description: 'Defeat 100 enemies', reward: { relationship: 10, currency: 250, unlock: 'doubleJump' } },
      { id: '1000points', name: 'High Scorer', description: 'Reach 1000 points', reward: { relationship: 8, currency: 200, unlock: 'extraHealth' } },
      { id: '3dates', name: 'Romance Pro', description: 'Complete 3 dates successfully', reward: { relationship: 15, currency: 300, unlock: 'giftGiver' } },
      { id: 'unbreakable', name: 'Unbreakable Bond', description: 'Reach maximum relationship level', reward: { relationship: 20, currency: 500, unlock: 'secretMode' } },
      { id: 'hearts', name: 'Caring Partner', description: 'Use healing items 10 times', reward: { relationship: 5, currency: 100, item: 'heartUpgrade' } }
    ]
  },
  
  // Currency system
  CURRENCY: {
    TYPES: ['love', 'courage', 'trust'],
    RATE: 1.0, // Base rate of currency gain per action
  
    // Currency conversion (for shop)
    CONVERSION: {
      'love': { 'love': 1, 'courage': 0.5, 'trust': 0.3 },
      'courage': { 'love': 0.5, 'courage': 1, 'trust': 0.2 },
      'trust': { 'love': 0.7, 'courage': 0.3, 'trust': 1 }
    }
  },
  
  // Date mini-game configuration
  MINIGAMES: {
    COOKING: {
      ingredientCount: 3,
      baseTimer: 10.0, // seconds
      successThreshold: 0.5, // seconds
      relationshipBonus: 5,
      failPenalty: -2,
      currencyReward: { love: 10, courage: 5 }
    },
    STARGAZING: {
      connectionThreshold: 0.3, // seconds
      maxAttempts: 3,
      relationshipBonus: 8,
      failPenalty: -3,
      currencyReward: { trust: 12, love: 8 }
    },
    MUSIC: {
      noteCount: 4,
      sequenceLength: 8,
      reactionTime: 0.8, // seconds to press before note passes
      relationshipBonus: 10,
      failPenalty: -4,
      currencyReward: { love: 15, courage: 10 }
    },
    PUZZLE: {
      gridSize: { width: 3, height: 3 },
      scrambleMoves: 15,
      timeLimit: 60, // seconds
      relationshipBonus: 12,
      failPenalty: -5,
      currencyReward: { trust: 20, love: 10 }
    },
    MEMORY_MATCH: {
      gridSize: { width: 4, height: 3 },
      pairs: 6,
      timeLimit: 75,
      relationshipBonus: 15,
      failPenalty: -3,
      currencyReward: { love: 25, trust: 15 }
    },
    DANCE: {
      sequenceLength: 12,
      reactionTime: 1.0,
      relationshipBonus: 20,
      failPenalty: -5,
      currencyReward: { love: 30, courage: 20 }
    }
  },
  
  // Audio configuration
  AUDIO: {
    volume: {
      music: 0.5,
      effects: 0.7,
      dialogue: 0.8
    },
    fadeDuration: 1000, // milliseconds
    activeMusic: null
  },
  
  // Particle configuration
  PARTICLES: {
    MAX_COUNT: 100,
    DEFAULT_LIFESPAN: 2000,
    GRAVITY: 100
  },
  
  // Combat configuration
  COMBAT: {
    MONSTER_SPAWN: {
      baseRate: 0.005, // Chance per second
      rateIncrease: 0.001, // Increase per level
      maxDistance: 300 // Maximum spawn distance from player
    },
    PROJECTILE: {
      speed: 300,
      lifespan: 2000 // ms
    },
    ARENA: {
      waveDuration: 120, // seconds per wave
      enemyMultiplier: 1.3, // Increase per wave
      bossWaveInterval: 5, // Boss every 5 waves
      difficultyCurve: 'exponential' // 'linear', 'exponential', 'intermittent'
    }
  },
  
  // Scene transitions
  TRANSITIONS: {
    duration: 800, // ms
    scale: 10
  },
  
  // Global game references
  scenes: {
    boot: 'BootScene',
    title: 'TitleScene',
    world: 'WorldScene',
    combat: 'CombatScene',
    date: 'DateScene',
    miniGame: 'MiniGameScene',
    gameOver: 'GameOverScene',
    win: 'WinScene',
    challenge: 'ChallengeScene',
    endless: 'EndlessScene'
  },
  
  // Stat tracking
  STATS: {
    tracked: [
      'totalPlayTime',
      'enemiesDefeated',
      'datesCompleted',
      'levelsCompleted',
      'deaths',
      'healingUses',
      'relationshipsChanged',
      'currencyEarned',
      'challengesCompleted'
    ]
  },
  
  // Daily challenge system
  DAILY_CHALLENGES: {
    seed: null, // Generated from current date
    refreshTime: '00:00', // When challenges reset
    activeChallenge: null
  },
  
  // New Game+ configuration
  NEW_GAME_PLUS: {
    enemyHealthMultiplier: 1.5,
    enemyDamageMultiplier: 1.3,
    currencyGainMultiplier: 0.8,
    relationshipGainMultiplier: 0.7,
    unlockables: ['secretCharacters', 'hardMode', 'ultimateAbilities']
  }
};

// Helper functions (existing ones remain, adding new ones)

/**
 * Get progress percentage
 * @returns {number} Progress percentage (0-100)
 */
GAME_CONFIG.getProgressPercent = function() {
  if (!window.stateManager) return 0;
  
  const maxLevel = 15;
  const levelProgress = window.stateManager.currentLevel / maxLevel * 50;
  
  const maxDates = 4;
  const dateProgress = window.stateManager.completedDates.size / maxDates * 30;
  
  const maxRelationship = 100;
  const relationshipProgress = window.stateManager.relationshipScore / maxRelationship * 20;
  
  return Math.min(levelProgress + dateProgress + relationshipProgress, 100);
};

/**
 * Check if a challenge is completed
 * @param {string} challengeId
 * @returns {boolean}
 */
GAME_CONFIG.isChallengeCompleted = function(challengeId) {
  return window.stateManager?.completedChallenges?.has(challengeId) || false;
};

/**
 * Get next available game mode
 * @returns {Object|null} Mode object or null
 */
GAME_CONFIG.getNextAvailableMode = function() {
  const current = window.stateManager?.unlockedModes || new Set();
  
  for (const modeId in this.MODES) {
    const mode = this.MODES[modeId];
    // Skip main mode
    if (mode.id === 'main') continue;
    
    // Check if already unlocked
    if (current.has(mode.id)) continue;
    
    // Check unlock requirements
    if (!mode.unlocks || mode.unlocks.length === 0) return mode;
    
    // Check if all requirements met
    const met = mode.unlocks.every(req => current.has(req));
    if (met) return mode;
  }
  
  return null;
};

/**
 * Calculate relationship memory impact
 * @param {string} memoryType
 * @param {string} choiceType
 * @returns {number} Impact value
 */
GAME_CONFIG.calculateMemoryImpact = function(memoryType, choiceType) {
  const base = GAME_CONFIG.getRandomRelationshipImpact(choiceType);
  const multiplier = window.stateManager?.memoryAffinity?.[memoryType] || 1.0;
  return Math.round(base * multiplier);
};

/**
 * Generate daily challenge seed
 * @returns {number}
 */
GAME_CONFIG.generateDailySeed = function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Create consistent seed for the day
  return (year * 10000 + month * 100 + day) % 1000000;
};

/**
 * Get active daily challenge
 * @returns {Object|null}
 */
GAME_CONFIG.getActiveDailyChallenge = function() {
  if (!GAME_CONFIG.DAILY_CHALLENGES.activeChallenge) {
    // Generate or retrieve
    const seed = GAME_CONFIG.generateDailySeed();
    
    // Use seed to pick a challenge
    const available = GAME_CONFIG.CHALLENGES.DAILY;
    if (available.length === 0) return null;
    
    const index = seed % available.length;
    GAME_CONFIG.DAILY_CHALLENGES.activeChallenge = {...available[index]};
  }
  
  return GAME_CONFIG.DAILY_CHALLENGES.activeChallenge;
};

/**
 * Get relationship tier from score
 * @param {number} score - Relationship score (0-100)
 * @returns {string} Tier name ('strained', 'growing', 'strong', 'unbreakable')
 */
GAME_CONFIG.getRelationshipTier = function(score) {
  const thresholds = this.RELATIONSHIP.TIER_THRESHOLDS;
  if (score >= thresholds.unbreakable) return 'unbreakable';
  if (score >= thresholds.strong) return 'strong';
  if (score >= thresholds.growing) return 'growing';
  return 'strained';
};

/**
 * Get combat bonuses for a given relationship tier
 * @param {string} tier - Relationship tier
 * @returns {Object} Combat bonus values
 */
GAME_CONFIG.getCombatBonuses = function(tier) {
  if (!tier) {
    console.warn('Invalid tier passed to getCombatBonuses:', tier);
    tier = 'strained';
  }
  
  return this.RELATIONSHIP.COMBAT_BONUSES[tier] || 
         this.RELATIONSHIP.COMBAT_BONUSES.strained;
};

/**
 * Generate random relationship impact within range
 * @param {string} type - 'positive', 'slightlyPositive', 'neutral', 'negative', 'veryNegative'
 * @returns {number} Random impact value
 */
GAME_CONFIG.getRandomRelationshipImpact = function(type) {
  const range = this.RELATIONSHIP.CHOICE_IMPACT[type];
  if (!range) {
    console.warn(`Invalid relationship impact type: ${type}`);
    return 0;
  }
  
  // Use Math.floor for whole numbers, add 0.5 for possible floating point values
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
};

/**
 * Clamp a value between min and max
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number} Clamped value
 */
GAME_CONFIG.clamp = function(value, min, max) {
  return Math.min(Math.max(value, min), max);
};

/**
 * Set active music track
 * @param {string} trackKey
 */
GAME_CONFIG.setActiveMusic = function(trackKey) {
  this.AUDIO.activeMusic = trackKey;
};

/**
 * Get active music track
 * @returns {string|null}
 */
GAME_CONFIG.getActiveMusic = function() {
  return this.AUDIO.activeMusic;
};

/**
 * Check if a position is within world bounds
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
GAME_CONFIG.isWithinBounds = function(x, y) {
  const bounds = this.WORLD_BOUNDS;
  return x >= bounds.minX && x <= bounds.maxX && 
         y >= bounds.minY && y <= bounds.maxY;
};

/**
 * Convert timer value to display format (MM:SS)
 * @param {number} seconds
 * @returns {string}
 */
GAME_CONFIG.formatTime = function(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
