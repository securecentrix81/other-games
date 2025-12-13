/**
 * RelationshipManager.js
 * Handles relationship system mechanics and UI updates
 */

class RelationshipManager {
  constructor(scene) {
    this.scene = scene;
    this.stateManager = window.stateManager;
    this.relationshipMeter = document.getElementById('relationship-meter');
    this.relationshipFill = document.getElementById('relationship-fill');
    this.relationshipLabel = document.getElementById('relationship-label');
    
    // Initialize UI
    this.updateUI();
    
    // Listen for relationship changes
    this.scene.events.on('relationshipChanged', this.updateUI.bind(this));
  }

  /**
   * Update the relationship meter UI
   */
  updateUI() {
    const score = this.stateManager.relationshipScore;
    const tier = GAME_CONFIG.getRelationshipTier(score);
    
    // Update fill width (50% relationship = 50% width)
    this.relationshipFill.style.width = `${score}%`;
    
    // Update gradient based on tier
    let gradient;
    switch(tier) {
      case 'unbreakable':
        gradient = 'linear-gradient(90deg, #ff4d4d, #ff8c42, #ffd700, #90ee90, #4caf50)';
        break;
      case 'strong':
        gradient = 'linear-gradient(90deg, #ff4d4d, #ff8c42, #ffd700, #90ee90)';
        break;
      case 'growing':
        gradient = 'linear-gradient(90deg, #ff4d4d, #ff8c42, #ffd700)';
        break;
      default: // strained
        gradient = 'linear-gradient(90deg, #ff4d4d, #ff8c42)';
    }
    this.relationshipFill.style.background = gradient;
    
    // Update label
    this.relationshipLabel.textContent = this.getTierLabel(tier);
    
    // Add visual effect for high relationship
    if (score >= 85) {
      this.relationshipMeter.classList.add('glowing');
    } else {
      this.relationshipMeter.classList.remove('glowing');
    }
  }

  /**
   * Get display label for relationship tier
   * @param {string} tier
   * @returns {string}
   */
  getTierLabel(tier) {
    switch(tier) {
      case 'unbreakable': return 'Unbreakable';
      case 'strong': return 'Strong';
      case 'growing': return 'Growing';
      default: return 'Strained';
    }
  }

  /**
   * Create visual effect for relationship changes
   * @param {number} change - Amount of change
   */
  createRelationshipEffect(change) {
    const effect = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY - 100,
      `${change > 0 ? '+' : ''}${change}`,
      {
        fontSize: '48px',
        color: change > 0 ? '#4caf50' : '#f44336',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    
    effect.setOrigin(0.5);
    effect.setDepth(1000);
    
    // Animate the effect
    this.scene.tweens.add({
      targets: effect,
      y: effect.y - 100,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        effect.destroy();
      }
    });
    
    // Add screen pulse for positive changes
    if (change > 0) {
      this.createPositivePulse();
    }
  }

  /**
   * Create a positive visual pulse effect
   */
  createPositivePulse() {
    const pulse = this.scene.add.circle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      0,
      0x4caf50,
      0.2
    );
    pulse.setDepth(999);
    
    this.scene.tweens.add({
      targets: pulse,
      radius: Math.max(this.scene.game.config.width, this.scene.game.config.height),
      alpha: 0,
      duration: 1000,
      ease: 'Power2'
    });
  }

  /**
   * Create a scene transition effect based on relationship
   */
  createSceneTransition() {
    const transition = this.scene.add.dom(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      '<div class="scene-transition"></div>'
    );
    
    transition.setOrigin(0.5);
    
    // Animate the transition
    setTimeout(() => {
      const element = transition.getChildByName('div');
      if (element) {
        element.classList.add('active');
        
        // Remove after animation completes
        setTimeout(() => {
          transition.destroy();
        }, 800);
      }
    }, 50);
  }

  /**
   * Handle relationship change with visual feedback
   * @param {number} change - Amount to change relationship by
   */
  changeRelationship(change) {
    const oldScore = this.stateManager.relationshipScore;
    const newScore = this.stateManager.updateRelationship(change);
    const oldTier = GAME_CONFIG.getRelationshipTier(oldScore);
    const newTier = GAME_CONFIG.getRelationshipTier(newScore);
    
    // Create visual effect
    this.createRelationshipEffect(change);
    
    // Handle tier change
    if (oldTier !== newTier) {
      this.handleTierChange(oldTier, newTier);
    }
    
    // Emit event for other systems
    this.scene.events.emit('relationshipChanged', newScore, change);
  }

  /**
   * Handle relationship tier change with special effects
   * @param {string} oldTier
   * @param {string} newTier
   */
  handleTierChange(oldTier, newTier) {
    console.log(`Relationship tier changed from ${oldTier} to ${newTier}`);
    
    // Play appropriate sound
    let soundKey;
    switch(newTier) {
      case 'growing':
        soundKey = 'tier-up-1';
        break;
      case 'strong':
        soundKey = 'tier-up-2';
        break;
      case 'unbreakable':
        soundKey = 'tier-up-3';
        break;
      default: // strained
        soundKey = 'tier-down';
    }
    
    if (this.scene.sound && this.scene.sound.exists(soundKey)) {
      this.scene.sound.play(soundKey);
    }
    
    // Create special visual effect for tier up
    if (oldTier !== 'strained' && newTier !== 'strained') {
      this.createTierUpEffect(newTier);
    }
  }

  /**
   * Create special effect for tier up
   * @param {string} tier
   */
  createTierUpEffect(tier) {
    // Create heart particles
    const hearts = ['❤', '💕', '💖', '💘'];
    const count = tier === 'unbreakable' ? 20 : (tier === 'strong' ? 15 : 10);
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 100;
      const x = this.scene.cameras.main.centerX + Math.cos(angle) * distance;
      const y = this.scene.cameras.main.centerY + Math.sin(angle) * distance;
      
      const heart = this.scene.add.text(
        this.scene.cameras.main.centerX,
        this.scene.cameras.main.centerY,
        hearts[Math.floor(Math.random() * hearts.length)],
        {
          fontSize: '24px',
          color: '#ff8c42'
        }
      );
      
      heart.setOrigin(0.5);
      heart.setDepth(100);
      
      this.scene.tweens.add({
        targets: heart,
        x: x,
        y: y,
        alpha: 0,
        duration: 1500 + Math.random() * 1000,
        ease: 'Power2'
      });
    }
  }
}

// Export for module systems
if (typeof module !== 'undefined') {
  module.exports = RelationshipManager;
}
