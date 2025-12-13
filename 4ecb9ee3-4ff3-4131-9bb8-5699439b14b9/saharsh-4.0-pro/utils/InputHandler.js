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
    this.zKey = null;
    this.xKey = null;
    
    // Input state
    this.inputBlocked = false;
    this.lastAttackTime = 0;
    this.attackCooldown = 300; // ms
    this.lastJumpTime = 0;
    this.jumpBuffer = 100; // ms - allow jumping shortly after leaving ground
    
    // Action mapping
    this.keyActions = new Map();
    
    // Initialize input
    this.initializeInput();
    
    // Prevent default scrolling behavior
    this.setupScrollPrevention();
    
    // Bind pause event
    this.scene.events.on('pause', this.pause.bind(this));
    this.scene.events.on('resume', this.resume.bind(this));
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
    this.zKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.xKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    
    // Add keyup listeners for specific behaviors
    this.scene.input.keyboard.on('keyup-ESC', () => {
      if (!this.inputBlocked) {
        this.scene.togglePause();
      }
    });
    
    this.scene.input.keyboard.on('keyup-ENTER', () => {
      if (!this.inputBlocked && this.scene.dialogueSystem?.isDialogueActive && 
          this.scene.dialogueSystem.isTyping) {
        this.scene.dialogueSystem.completeTyping();
      }
    });
    
    // Space key handling (separate from attack to prevent rapid fire)
    this.scene.input.keyboard.on('keydown-SPACE', (event) => {
      if (this.inputBlocked) return;
      
      // For dialogue advancement
      if (this.scene.dialogueSystem?.isDialogueActive && this.scene.dialogueSystem.isTyping) {
        this.scene.dialogueSystem.completeTyping();
        event.preventDefault();
        return;
      }
      
      // For attacking
      const now = Date.now();
      if (now - this.lastAttackTime > this.attackCooldown) {
        this.lastAttackTime = now;
        this.scene.calvin?.attack();
        event.preventDefault();
      }
    });
    
    // Z key for secondary action (healing item)
    this.scene.input.keyboard.on('keydown-Z', (event) => {
      if (this.inputBlocked) return;
      
      if (this.scene.stateManager.useHealingItem()) {
        this.scene.calvin.heal(GAME_CONFIG.PLAYER.healAmount);
        event.preventDefault();
      }
    });
    
    // X key for pause
    this.scene.input.keyboard.on('keydown-X', (event) => {
      if (this.inputBlocked) return;
      this.scene.togglePause();
      event.preventDefault();
    });
  }

  /**
   * Setup prevention of page scrolling from game controls
   */
  setupScrollPrevention() {
    // Prevent default for arrow keys and space
    const preventScrollKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Z', 'X'];
    
    document.addEventListener('keydown', (e) => {
      if (preventScrollKeys.includes(e.key)) {
        // Only prevent default if the key is used in-game
        // and not in a text input
        const target = e.target.tagName.toLowerCase();
        if (target !== 'input' && target !== 'textarea') {
          e.preventDefault();
        }
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
      space: this.spaceKey.isDown,
      z: this.zKey.isDown,
      x: this.xKey.isDown
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
   * Check if jump input is active (with buffer)
   * @returns {boolean}
   */
  isJumpInputActive() {
    const now = Date.now();
    if (now - this.lastJumpTime > this.jumpBuffer) {
      this.lastJumpTime = now;
      return this.cursors.up.isDown || this.spaceKey.isDown;
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
    this.scene.input.keyboard.off('keydown-Z');
    this.scene.input.keyboard.off('keydown-X');
    
    // Clear references
    this.cursors = null;
    this.spaceKey = null;
    this.enterKey = null;
    this.escKey = null;
    this.zKey = null;
    this.xKey = null;
    
    // Remove from scene events
    this.scene.events.off('pause', this.pause);
    this.scene.events.off('resume', this.resume);
  }

  /**
   * Pause input handling
   */
  pause() {
    this.inputBlocked = true;
  }

  /**
   * Resume input handling
   */
  resume() {
    this.inputBlocked = false;
  }

  /**
   * Enable/disable input assist mode
   * @param {boolean} enabled
   */
  setInputAssist(enabled) {
    if (enabled) {
      // Reduce cooldown for input assist
      this.attackCooldown = 150;
      this.jumpBuffer = 150;
    } else {
      // Reset to normal values
      this.attackCooldown = 300;
      this.jumpBuffer = 100;
    }
  }
}

// Export for module systems
if (typeof module !== 'undefined') {
  module.exports = InputHandler;
}
