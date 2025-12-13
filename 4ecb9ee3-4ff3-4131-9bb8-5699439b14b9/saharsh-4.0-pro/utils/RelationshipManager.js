/**
 * RelationshipManager.js
 * Handles relationship system mechanics and UI updates
 */

class RelationshipManager {
  constructor(scene) {
    this.scene = scene;
    this.stateManager = window.stateManager;
    
    // DOM elements
    this.relationshipMeter = document.getElementById('relationship-meter');
    this.relationshipFill = document.getElementById('relationship-fill');
    this.relationshipLabel = document.getElementById('relationship-label');
    
    // Visual effects
    this.currentEffect = null;
    
    // Initialize UI
    this.updateUI();
    
    // Listen for relationship changes
    this.scene.events.on('relationshipChanged', this.handleRelationshipChange.bind(this));
    this.scene.events.on('tierChanged', this.handleTierChange.bind(this));
  }

  /**
   * Update the relationship meter UI
   */
  updateUI() {
    const score = this.stateManager.relationshipScore;
    const tier = GAME_CONFIG.getRelationshipTier(score);
    
    // Update fill width (50% relationship = 50% width)
    this.relationshipFill.style.width = `${score}%`;
    
    // Update gradient based on tier and colorblind mode
    let gradient;
    const useColorblindMode = this.stateManager.settings.colorblindMode;
    
    if (useColorblindMode) {
      // Colorblind-friendly gradient
      gradient = 'linear-gradient(90deg, #f22, #fa0, #ff0, #00ff00)';
    } else {
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
    }
    
    this.relationshipFill.style.background = gradient;
    
    // Update label
    this.relationshipLabel.textContent = this.getTierLabel(tier);
    
    // Update meter color in colorblind mode
    if (useColorblindMode) {
      this.relationshipMeter.style.filter = 'hue-rotate(0deg)';
    } else {
      this.relationshipMeter.style.filter = 'none';
    }
    
    // Add visual effect for high relationship or colorblind mode
    if (score >= 85 || useColorblindMode) {
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
    // Cancel any existing effect
    if (this.currentEffect) {
      this.currentEffect.destroy();
    }
    
    // Create new effect text
    const prefix = change > 0 ? '+' : '';
    const effect = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY - 150,
      `${prefix}${change}`,
      {
        fontSize: '48px',
        color: change > 0 ? '#4caf50' : '#f44336',
        stroke: '#000000',
        strokeThickness: 4,
        fontFamily: '"Press Start 2P", cursive'
      }
    );
    
    effect.setOrigin(0.5);
    effect.setDepth(1000);
    
    // Animate the effect
    this.scene.tweens.add({
      targets: effect,
      y: effect.y - 100,
      alpha: { value: 0, duration: 800 },
      scale: { value: 1.5, duration: 800 },
      ease: 'Power2',
      onComplete: () => {
        effect.destroy();
        this.currentEffect = null;
      }
    });
    
    // Save reference to current effect
    this.currentEffect = effect;
  }

  /**
   * Create a positive visual pulse effect
   */
  createPositivePulse() {
    // Add concentric pulsed circles
    const centerX = this.scene.cameras.main.centerX;
    const centerY = this.scene.cameras.main.centerY;
    const maxRadius = Math.max(this.scene.game.config.width, this.scene.game.config.height) * 1.2;
    
    for (let i = 0; i < 3; i++) {
      const pulse = this.scene.add.circle(
        centerX,
        centerY,
        0,
        0x4caf50,
        0.2
      );
      pulse.setDepth(998 + i);
      
      this.scene.time.delayedCall(i * 100, () => {
        this.scene.tweens.add({
          targets: pulse,
          radius: { start: 0, value: maxRadius, duration: 600 },
          alpha: { value: 0, duration: 600 },
          ease: 'Power2',
          onComplete: () => {
            pulse.destroy();
          }
        });
      });
    }
  }

  /**
   * Create a scene transition effect based on relationship
   */
  createSceneTransition() {
    const transition = this.scene.add.circle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      0,
      0xffffff,
      1.0
    );
    
    transition.setDepth(99999);
    
    // Animate the transition
    this.scene.tweens.add({
      targets: transition,
      radius: { value: GAME_CONFIG.TRANSITIONS.scale * 100, duration: GAME_CONFIG.TRANSITIONS.duration },
      alpha: { value: 1, duration: GAME_CONFIG.TRANSITIONS.duration / 2 },
      ease: 'Cubic.easeOut',
      onComplete: () => {
        // Transition complete - will be destroyed by scene
        this.scene.events.emit('sceneTransitionComplete');
      }
    });
    
    return transition;
  }

  /**
   * Handle relationship change with visual feedback
   * @param {number} newScore - New relationship score
   * @param {number} change - Amount of change
   */
  handleRelationshipChange(newScore, change) {
    // Update UI
    this.updateUI();
    
    // Create visual effect
    if (Math.abs(change) >= 2) { // Only show effect for meaningful changes
      this.createRelationshipEffect(change);
    }
    
    // Emit tier changed event if tier changed
    const oldTier = GAME_CONFIG.getRelationshipTier(newScore - change);
    const newTier = GAME_CONFIG.getRelationshipTier(newScore);
    
    if (oldTier !== newTier) {
      this.scene.events.emit('tierChanged', oldTier, newTier);
    }
    
    // Create special effects for positive changes
    if (change > 0 && change >= 5) {
      this.createPositivePulse();
    }
  }

  /**
   * Handle relationship tier change with special effects
   * @param {string} oldTier
   * @param {string} newTier
   */
  handleTierChange(oldTier, newTier) {
    console.log(`** Relationship tier changed from ${oldTier} to ${newTier} **`);
    
    // Play appropriate sound based on tier up/down
    let soundKey;
    if (newTier === 'unbreakable') {
      soundKey = 'tier-up-3';
    } else if (newTier === 'strong') {
      soundKey = 'tier-up-2';
    } else if (newTier === 'growing') {
      soundKey = 'tier-up-1';
    } else if (newTier === 'strained' && oldTier !== 'strained') {
      soundKey = 'tier-down';
    }
    
    if (soundKey && this.scene.sound && this.scene.sound.exists(soundKey)) {
      this.scene.sound.play(soundKey, { volume: this.stateManager.settings.effectsVolume });
    }
    
    // Create special visual effect for tier change
    if (newTier !== 'strained') {
      this.createTierUpEffect(newTier);
    } else if (oldTier !== 'strained') {
      this.createTierDownEffect();
    }
    
    // Emit scene transition event for tier up
    if (newTier !== 'strained' && oldTier !== newTier) {
      this.scene.events.emit('tierUp', newTier);
    }
  }

  /**
   * Create special effect for tier up
   * @param {string} tier
   */
  createTierUpEffect(tier) {
    // Create heart particles that form the pattern
    const hearts = ['❤', '💕', '💖', '💘', '💗'];
    const count = tier === 'unbreakable' ? 30 : (tier === 'strong' ? 20 : 15);
    const centerX = this.scene.cameras.main.centerX;
    const centerY = this.scene.cameras.main.centerY;
    
    // Create a heart burst effect
    for (let i = 0; i < count; i++) {
      // Use a spiral pattern for more pleasing distribution
      const radius = 50 + Math.random() * 80;
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      const heart = this.scene.add.text(
        centerX,
        centerY,
        hearts[Math.floor(Math.random() * hearts.length)],
        {
          fontSize: '24px',
          color: '#ff8c42'
        }
      );
      
      heart.setOrigin(0.5);
      heart.setDepth(100);
      
      // Small random rotation
      heart.setRotation(Math.random() * 0.5 - 0.25);
      
      // Animate the heart
      this.scene.tweens.add({
        targets: heart,
        x: x,
        y: y,
        alpha: 0,
        duration: 1500 + Math.random() * 500,
        scale: { from: 0, to: 1.2, duration: 200 },
        ease: 'Power2'
      });
    }
    
    // Add a large text effect
    const tierText = this.scene.add.text(
      centerX,
      centerY - 100,
      newTier.toUpperCase(),
      {
        fontSize: '48px',
        color: '#ffd700',
        fontFamily: '"Press Start 2P", cursive',
        fontStyle: 'bold'
      }
    );
    
    tierText.setOrigin(0.5);
    tierText.setDepth(101);
    
    // Pulse and fade out
    this.scene.tweens.add({
      targets: tierText,
      scale: 1.2,
      duration: 300,
      yoyo: true,
      repeat: 1,
      ease: 'Power2'
    });
    
    this.scene.tweens.add({
      targets: tierText,
      alpha: 0,
      delay: 1000,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        tierText.destroy();
      }
    });
  }

  /**
   * Create special effect for tier down
   */
  createTierDownEffect() {
    // Create falling tears or raindrops
    const tears = ['💧', '😢', '💔'];
    const count = 15;
    
    for (let i = 0; i < count; i++) {
      const tear = this.scene.add.text(
        this.scene.cameras.main.centerX + (Math.random() - 0.5) * 200,
        this.scene.cameras.main.centerY - 100,
        tears[Math.floor(Math.random() * tears.length)],
        {
          fontSize: '24px',
          color: '#666'
        }
      );
      
      tear.setOrigin(0.5);
      tear.setDepth(100);
      
      // Animate falling with slight sway
      this.scene.tweens.add({
        targets: tear,
        y: this.scene.cameras.main.height + 50,
        x: '+=10',
        rotation: Math.random() * 0.2,
        alpha: 0,
        duration: 2000 + Math.random() * 1000,
        ease: 'Linear',
        onComplete: () => {
          tear.destroy();
        }
      });
    }
  }

  /**
   * Create a heart connection effect between characters
   * @param {Phaser.GameObjects.Sprite} calvinSprite
   * @param {Phaser.GameObjects.Sprite} ericSprite
   */
  createHeartConnection(calvinSprite, ericSprite) {
    // Calculate midpoint
    const midX = (calvinSprite.x + ericSprite.x) / 2;
    const midY = (calvinSprite.y + ericSprite.y) / 2 - 50; // Higher for better visibility
    
    // Create a pulsing heart
    const heart = this.scene.add.text(
      midX,
      midY,
      '❤',
      {
        fontSize: '32px',
        color: '#ff8c42'
      }
    );
    
    heart.setOrigin(0.5);
    heart.setDepth(50);
    
    // Pulse animation
    this.scene.tweens.add({
      targets: heart,
      scale: 1.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Connect with lines from characters
    const graphics = this.scene.add.graphics();
    graphics.setDepth(49);
    
    const drawConnection = () => {
      graphics.clear();
      graphics.lineStyle(2, 0xff8c42, 0.7);
      graphics.beginPath();
      graphics.moveTo(calvinSprite.x, calvinSprite.y - 20);
      graphics.lineTo(midX, midY);
      graphics.lineTo(ericSprite.x, ericSprite.y - 20);
      graphics.strokePath();
    };
    
    // Update connection when characters move
    this.scene.events.on('update', drawConnection);
    
    // Cleanup function
    const cleanup = () => {
      heart.destroy();
      graphics.destroy();
      this.scene.events.off('update', drawConnection);
    };
    
    // Auto-remove after 3 seconds
    this.scene.time.delayedCall(3000, cleanup);
    
    return { heart, graphics, cleanup };
  }
}

// Export for module systems
if (typeof module !== 'undefined') {
  module.exports = RelationshipManager;
}
