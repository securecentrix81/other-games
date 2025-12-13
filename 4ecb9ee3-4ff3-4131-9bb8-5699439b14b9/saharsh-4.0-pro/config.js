/**
 * config.js
 * Global game configuration and constants
 * All values are namespaced under GAME_CONFIG
 */

const GAME_CONFIG = {
  // Game identity
  GAME_NAME: 'Calvin with Eric',
  VERSION: '1.0.0',
  STORAGE_PREFIX: window.location.pathname + '_calvinWithEric_',
  
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
  
  // Player configuration
  PLAYER: {
    moveSpeed: 400,
    jumpForce: -900,
    attackRange: 80,
    attackDamage: 10,
    invincibilityDuration: 1.0, // seconds
    baseHealth: 100
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
      negative: { min: -5, max: -2 }
    }
  },
  
  // Date mini-game configuration
  MINIGAMES: {
    COOKING: {
      ingredientCount: 3,
      baseTimer: 10.0, // seconds
      successThreshold: 0.5, // seconds
      relationshipBonus: 5
    },
    STARGAZING: {
      connectionThreshold: 0.3, // seconds
      maxAttempts: 3
    }
  },
  
  // Audio configuration
  AUDIO: {
    volume: {
      music: 0.5,
      effects: 0.7
    },
    fadeDuration: 1000 // milliseconds
  }
};

/**
 * Helper function to get relationship tier from score
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
  return this.RELATIONSHIP.COMBAT_BONUSES[tier] || 
         this.RELATIONSHIP.COMBAT_BONUSES.strained;
};

/**
 * Generate random relationship impact within range
 * @param {string} type - 'positive' or 'negative'
 * @returns {number} Random impact value
 */
GAME_CONFIG.getRandomRelationshipImpact = function(type) {
  const range = this.RELATIONSHIP.CHOICE_IMPACT[type];
  if (!range) return 0;
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
};
