/**
 * stateManager.js
 * Manages persistent game state using localStorage with proper namespacing
 */

class StateManager {
  constructor() {
    this.storagePrefix = GAME_CONFIG.STORAGE_PREFIX;
    this.loadState();
  }

  /**
   * Load game state from localStorage
   */
  loadState() {
    try {
      const savedState = localStorage.getItem(this.storagePrefix + 'gameState');
      if (savedState) {
        const state = JSON.parse(savedState);
        this.restoreState(state);
      } else {
        this.resetState();
      }
    } catch (e) {
      console.error('Error loading game state:', e);
      this.resetState();
    }
  }

  /**
   * Reset to initial game state
   */
  resetState() {
    this.currentLevel = 1;
    this.health = GAME_CONFIG.PLAYER.baseHealth;
    this.maxHealth = GAME_CONFIG.PLAYER.baseHealth;
    this.score = 0;
    
    // Relationship system
    this.relationshipScore = 50;  // Starting at neutral
    this.unlockedMilestones = new Set();
    this.combatBonuses = this.calculateCombatBonuses();
    
    // Progression tracking
    this.completedDates = new Set();
    this.defeatedBosses = new Set();
    this.inventory = new Map();
    this.inventory.set("hearts", 3); // Starting with 3 healing items
    
    // Game settings
    this.settings = {
      musicVolume: GAME_CONFIG.AUDIO.volume.music,
      effectsVolume: GAME_CONFIG.AUDIO.volume.effects,
      colorblindMode: false,
      inputAssist: false
    };
    
    this.saveState();
  }

  /**
   * Restore state from saved data
   * @param {Object} state - Saved state object
   */
  restoreState(state) {
    // Core game state
    this.currentLevel = state.currentLevel || 1;
    this.health = state.health || GAME_CONFIG.PLAYER.baseHealth;
    this.maxHealth = state.maxHealth || GAME_CONFIG.PLAYER.baseHealth;
    this.score = state.score || 0;
    
    // Relationship system
    this.relationshipScore = Math.min(Math.max(state.relationshipScore || 50, 0), 100);
    this.unlockedMilestones = new Set(state.unlockedMilestones || []);
    this.combatBonuses = this.calculateCombatBonuses();
    
    // Progression tracking
    this.completedDates = new Set(state.completedDates || []);
    this.defeatedBosses = new Set(state.defeatedBosses || []);
    this.inventory = new Map(Object.entries(state.inventory || { "hearts": 3 }));
    
    // Game settings
    this.settings = {
      musicVolume: state.settings?.musicVolume ?? GAME_CONFIG.AUDIO.volume.music,
      effectsVolume: state.settings?.effectsVolume ?? GAME_CONFIG.AUDIO.volume.effects,
      colorblindMode: state.settings?.colorblindMode ?? false,
      inputAssist: state.settings?.inputAssist ?? false
    };
  }

  /**
   * Save current state to localStorage
   */
  saveState() {
    try {
      const state = {
        currentLevel: this.currentLevel,
        health: this.health,
        maxHealth: this.maxHealth,
        score: this.score,
        relationshipScore: this.relationshipScore,
        unlockedMilestones: Array.from(this.unlockedMilestones),
        completedDates: Array.from(this.completedDates),
        defeatedBosses: Array.from(this.defeatedBosses),
        inventory: Object.fromEntries(this.inventory),
        settings: this.settings
      };
      
      localStorage.setItem(this.storagePrefix + 'gameState', JSON.stringify(state));
    } catch (e) {
      console.error('Error saving game state:', e);
    }
  }

  /**
   * Update relationship score and recalculate bonuses
   * @param {number} change - Amount to change relationship score by
   */
  updateRelationship(change) {
    const oldScore = this.relationshipScore;
    this.relationshipScore = Math.min(Math.max(this.relationshipScore + change, 0), 100);
    this.combatBonuses = this.calculateCombatBonuses();
    
    // Check for tier changes
    const oldTier = GAME_CONFIG.getRelationshipTier(oldScore);
    const newTier = GAME_CONFIG.getRelationshipTier(this.relationshipScore);
    
    if (oldTier !== newTier) {
      this.handleTierChange(oldTier, newTier);
    }
    
    this.saveState();
    return this.relationshipScore;
  }

  /**
   * Calculate combat bonuses based on current relationship score
   * @returns {Object} Combat bonus values
   */
  calculateCombatBonuses() {
    const tier = GAME_CONFIG.getRelationshipTier(this.relationshipScore);
    return GAME_CONFIG.getCombatBonuses(tier);
  }

  /**
   * Handle relationship tier change
   * @param {string} oldTier
   * @param {string} newTier
   */
  handleTierChange(oldTier, newTier) {
    console.log(`Relationship tier changed from ${oldTier} to ${newTier}`);
    
    // Add milestone unlocks based on tier
    if (newTier === 'growing' && !this.unlockedMilestones.has('first_date')) {
      this.unlockedMilestones.add('first_date');
      this.inventory.set("hearts", (this.inventory.get("hearts") || 0) + 1);
    }
    
    if (newTier === 'strong' && !this.unlockedMilestones.has('sync_attack')) {
      this.unlockedMilestones.add('sync_attack');
    }
    
    if (newTier === 'unbreakable' && !this.unlockedMilestones.has('true_partner')) {
      this.unlockedMilestones.add('true_partner');
      this.maxHealth = Math.min(this.maxHealth + 20, 150);
      this.health = this.maxHealth;
    }
  }

  /**
   * Heal the player, respecting max health
   * @param {number} amount - Amount to heal
   * @returns {number} Actual amount healed
   */
  heal(amount) {
    const oldHealth = this.health;
    this.health = Math.min(this.health + amount, this.maxHealth);
    const actualHealed = this.health - oldHealth;
    
    if (actualHealed > 0) {
      this.saveState();
    }
    
    return actualHealed;
  }

  /**
   * Take damage, applying any relevant modifiers
   * @param {number} amount - Amount of damage
   * @returns {number} Actual damage taken
   */
  takeDamage(amount) {
    const oldHealth = this.health;
    this.health = Math.max(this.health - amount, 0);
    const damageTaken = oldHealth - this.health;
    
    this.saveState();
    return damageTaken;
  }

  /**
   * Check if the player has a specific milestone unlocked
   * @param {string} milestone - Milestone name
   * @returns {boolean}
   */
  hasMilestone(milestone) {
    return this.unlockedMilestones.has(milestone);
  }

  /**
   * Check if the game is in a win state
   * @returns {boolean}
   */
  isWinState() {
    return this.currentLevel > 5 && this.relationshipScore >= 70;
  }

  /**
   * Check if the game is in a loss state
   * @returns {string|null} Loss reason or null if not in loss state
   */
  isLossState() {
    if (this.health <= 0) {
      return 'combat';
    }
    
    if (this.relationshipScore < 30) {
      return 'relationship';
    }
    
    return null;
  }

  /**
   * Clear saved game state
   */
  clearSave() {
    try {
      // Only remove keys with our prefix
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error('Error clearing save data:', e);
    }
  }
}

// Create singleton instance
const stateManager = new StateManager();
window.stateManager = stateManager; // For debugging purposes only

// Export for module systems
if (typeof module !== 'undefined') {
  module.exports = StateManager;
}
