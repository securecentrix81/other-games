/**
 * InputHandler.js
 * Manages game input with edge case handling
 */

class InputHandler {
  constructor(scene) {
    this.scene = scene;
    this.cursors = null;
    this.spaceKey = null;
    this.enterKey = null;
    this.escKey = null;
    
    // Input state
    this.inputBlocked = false;
    this.lastAttackTime = 0;
    this.attackCooldown = 300; // ms
    
    // Initialize input
    this.initializeInput();
    
    // Prevent default scrolling behavior
    this.setupScrollPrevention();
  }

  /**
   * Initialize keyboard input
   */
  initializeInput() {
    // Create cursor keys
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    
    // Create additional keys
    this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.enterKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    
    // Add keyup listeners for specific behaviors
    this.scene.input.keyboard.on('keyup-ESC', () => {
      if (!this.inputBlocked) {
        this.scene.togglePause();
      }
    });
    
    this.scene.input.keyboard.on('keyup-ENTER', () => {
      if (!this.inputBlocked && this.scene.dialogueSystem?.typingComplete) {
        this.scene.dialogueSystem.advanceDialogue();
      }
    });
    
    // Space key handling (separate from attack to prevent rapid fire)
    this.scene.input.keyboard.on('keydown-SPACE', (event) => {
      if (this.inputBlocked) return;
      
      const now = Date.now();
      if (now - this.lastAttackTime > this.attackCooldown) {
        this.lastAttackTime = now;
        this.scene.calvin.attack();
      }
    });
  }

  /**
   * Setup prevention of page scrolling from game controls
   */
  setupScrollPrevention() {
    // Prevent default for arrow keys and space
    const preventScrollKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
    
    document.addEventListener('keydown', (e) => {
      if (preventScrollKeys.includes(e.key)) {
        e.preventDefault();
      }
    }, { passive: false });
    
    // Additional prevention for mobile
    document.addEventListener('touchmove', (e) => {
      if (this.inputBlocked) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  /**
   * Block all input temporarily
   * @param {number} duration - Milliseconds to block input
   */
  blockInput(duration = 0) {
    this.inputBlocked = true;
    
    if (duration > 0) {
      this.scene.time.delayedCall(duration, () => {
        this.inputBlocked = false;
      });
    }
  }

  /**
   * Get current input state for movement
   * @returns {Object} Input state for movement
   */
  getMovementInput() {
    return {
      left: this.cursors.left.isDown,
      right: this.cursors.right.isDown,
      up: this.cursors.up.isDown,
      down: this.cursors.down.isDown,
      space: this.spaceKey.isDown
    };
  }

  /**
   * Check if attack input is active (with cooldown)
   * @returns {boolean}
   */
  isAttackInputActive() {
    const now = Date.now();
    if (now - this.lastAttackTime > this.attackCooldown) {
      this.lastAttackTime = now;
      return true;
    }
    return false;
  }

  /**
   * Cleanup input handlers
   */
  destroy() {
    // Remove key listeners
    this.scene.input.keyboard.off('keyup-ESC');
    this.scene.input.keyboard.off('keyup-ENTER');
    this.scene.input.keyboard.off('keydown-SPACE');
    
    // Clear references
    this.cursors = null;
    this.spaceKey = null;
    this.enterKey = null;
    this.escKey = null;
  }
}

// Export for module systems
if (typeof module !== 'undefined') {
  module.exports = InputHandler;
}
