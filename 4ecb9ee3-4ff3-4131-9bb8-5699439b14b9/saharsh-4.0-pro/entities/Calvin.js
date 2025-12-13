/**
 * Calvin.js
 * Player character entity
 */

class Calvin {
  constructor(scene, x, y) {
    this.scene = scene;
    this.stateManager = window.stateManager;
    this.relationshipManager = scene.relationshipManager;
    
    // Create sprite
    this.sprite = scene.physics.add.sprite(x, y, 'calvin');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setOrigin(0.5, 1); // Bottom-center origin for platforming
    this.sprite.setDepth(10);
    
    // Animation states
    this.state = 'idle'; // 'idle', 'running', 'jumping', 'attacking', 'hurt', 'dead'
    this.isAttacking = false;
    this.attackCooldown = 0;
    this.isInvincible = false;
    this.invincibilityTimer = 0;
    this.damageFlashDuration = 0.1; // seconds
    this.damageFlashTimer = 0;
    this.flashAlpha = 1;
    
    // Movement properties
    this.lastDirection = 'right'; // 'left' or 'right'
    this.jumpCount = 0;
    this.maxJumps = 2; // Double jump capability
    this.hasDoubleJump = false; // Unlocked via progression
    
    // Combat properties
    this.comboCounter = 0;
    this.comboTimer = 0;
    this.comboWindow = 2.0; // seconds to continue combo
    
    // Initialize animations
    this.createAnimations();
    
    // Start with idle animation
    this.sprite.anims.play('calvin-idle', true);
    
    // Setup events
    this.setupEvents();
  }

  /**
   * Create character animations
   */
  createAnimations() {
    const frameRate = {
      idle: 5,
      run: 10,
      jump: 1,
      attack: 15,
      hurt: 1,
      die: 5
    };
    
    // Idle animation
    this.scene.anims.create({
      key: 'calvin-idle',
      frames: this.scene.anims.generateFrameNumbers('calvin', { start: 0, end: 3 }),
      frameRate: frameRate.idle,
      repeat: -1
    });
    
    // Running animation
    this.scene.anims.create({
      key: 'calvin-run',
      frames: this.scene.anims.generateFrameNumbers('calvin', { start: 4, end: 7 }),
      frameRate: frameRate.run,
      repeat: -1
    });
    
    // Jumping animation
    this.scene.anims.create({
      key: 'calvin-jump',
      frames: [{ key: 'calvin', frame: 8 }],
      frameRate: frameRate.jump,
      repeat: 0
    });
    
    // Attacking animation
    this.scene.anims.create({
      key: 'calvin-attack',
      frames: this.scene.anims.generateFrameNumbers('calvin', { start: 9, end: 11 }),
      frameRate: frameRate.attack,
      repeat: 0
    });
    
    // Hurt animation
    this.scene.anims.create({
      key: 'calvin-hurt',
      frames: [{ key: 'calvin', frame: 12 }],
      frameRate: frameRate.hurt,
      repeat: 0
    });
    
    // Death animation
    this.scene.anims.create({
      key: 'calvin-die',
      frames: this.scene.anims.generateFrameNumbers('calvin', { start: 13, end: 15 }),
      frameRate: frameRate.die,
      repeat: 0
    });
  }

  /**
   * Setup event listeners
   */
  setupEvents() {
    // Listen for player death
    this.scene.events.on('gameOver', () => {
      this.destroy();
    });
  }

  /**
   * Update method called each frame
   * @param {Object} input - Movement input from InputHandler
   */
  update(input) {
    // Skip update if dead
    if (this.state === 'dead') {
      return;
    }
    
    // Handle invincibility and flashing
    this.updateInvincibility();
    
    // Get relationship tier for combat bonuses
    const relationshipTier = GAME_CONFIG.getRelationshipTier(this.stateManager.relationshipScore);
    
    // Reset animation state
    let playAnimation = null;
    
    // Update combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= this.scene.game.loop.delta / 1000;
      if (this.comboTimer <= 0) {
        this.comboCounter = 0;
      }
    }
    
    // Horizontal movement
    if (input.left) {
      this.sprite.setVelocityX(-GAME_CONFIG.PLAYER.moveSpeed);
      this.lastDirection = 'left';
      this.sprite.flipX = true;
      playAnimation = 'calvin-run';
    } else if (input.right) {
      this.sprite.setVelocityX(GAME_CONFIG.PLAYER.moveSpeed);
      this.lastDirection = 'right';
      this.sprite.flipX = false;
      playAnimation = 'calvin-run';
    } else {
      this.sprite.setVelocityX(0);
      playAnimation = 'calvin-idle';
    }
    
    // Jumping logic
    if ((input.up || input.space) && !this.isAttacking) {
      // Allow double jump
      const canJump = this.sprite.body.onFloor() || 
                      (this.jumpCount < this.maxJumps && this.hasDoubleJump);
      
      if (canJump && this.jumpCount < 2) {
        this.sprite.setVelocityY(GAME_CONFIG.PLAYER.jumpForce);
        this.jumpCount++;
        playAnimation = 'calvin-jump';
        
        // Play jump sound
        if (this.scene.sound.exists('jump')) {
          this.scene.sound.play('jump', { volume: this.stateManager.settings.effectsVolume });
        }
      }
    } else if (this.sprite.body.onFloor()) {
      // Reset jump count when on ground
      this.jumpCount = 0;
    }
    
    // Attack logic
    if ((input.space || input.z) && !this.isAttacking && this.attackCooldown <= 0) {
      this.attack(relationshipTier);
    }
    
    // Update attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= this.scene.game.loop.delta / 1000;
    }
    
    // Play appropriate animation
    if (playAnimation && this.state !== playAnimation.replace('calvin-', '')) {
      this.sprite.anims.play(playAnimation, true);
      this.state = playAnimation.replace('calvin-', '');
    }
  }

  /**
   * Update invincibility state and visual feedback
   */
  updateInvincibility() {
    if (this.isInvincible) {
      this.invincibilityTimer -= this.scene.game.loop.delta / 1000;
      
      if (this.invincibilityTimer <= 0) {
        this.isInvincible = false;
        this.sprite.setTint(0xffffff);
      } else {
        // Flash effect
        this.damageFlashTimer -= this.scene.game.loop.delta / 1000;
        if (this.damageFlashTimer <= 0) {
          this.flashAlpha = this.flashAlpha === 1 ? 0.5 : 1;
          this.damageFlashTimer = this.damageFlashDuration;
        }
        
        const tintValue = this.flashAlpha === 1 ? 0xffffff : 0xff6666;
        this.sprite.setTint(tintValue);
      }
    } else {
      this.sprite.setTint(0xffffff);
    }
  }

  /**
   * Perform attack action
   * @param {string} relationshipTier - Current relationship tier
   */
  attack(relationshipTier) {
    this.isAttacking = true;
    this.attackCooldown = 0.5; // 500ms cooldown
    this.state = 'attacking';
    
    // Play attack animation
    this.sprite.anims.play('calvin-attack', true);
    
    // Update combo
    this.comboCounter++;
    this.comboTimer = this.comboWindow;
    
    // Calculate damage
    let damage = GAME_CONFIG.PLAYER.attackDamage;
    const baseDamage = GAME_CONFIG.PLAYER.attackDamage;
    
    // Apply relationship-based damage boost
    if (relationshipTier === 'strong' || relationshipTier === 'unbreakable') {
      const bonus = GAME_CONFIG.getCombatBonuses(relationshipTier).damageBoost;
      damage += Math.floor(baseDamage * bonus);
    }
    
    // Apply combo bonus
    if (this.comboCounter >= 3) {
      damage += Math.floor(baseDamage * 0.2 * Math.min(this.comboCounter, 10));
    }
    
    // Create attack hitbox
    const attackRange = GAME_CONFIG.PLAYER.attackRange;
    const offsetY = -attackRange * 0.2; // Slightly above center
    const offsetX = this.lastDirection === 'right' ? attackRange : -attackRange;
    
    // Create hitbox with physics
    const hitbox = this.scene.add.rectangle(
      this.sprite.x + offsetX,
      this.sprite.y + offsetY,
      attackRange,
      attackRange * 0.8,
      0xff0000,
      0
    );
    
    hitbox.alpha = 0; // Invisible hitbox
    this.scene.physics.world.enable(hitbox);
    hitbox.body.setAllowGravity(false);
    hitbox.body.setImmovable(true);
    hitbox.body.setCircle(attackRange * 0.4);
    
    // Track hit targets to prevent double hits
    const hitTargets = new Set();
    
    // Check for collisions with monsters
    this.scene.physics.add.overlap(hitbox, this.scene.monsters, (hitbox, monster) => {
      // Prevent multiple hits from same attack
      if (hitTargets.has(monster)) return;
      hitTargets.add(monster);
      
      monster.takeDamage(damage);
      
      // Create hit effect
      this.createHitEffect(monster.x, monster.y);
      
      // Update score
      this.stateManager.score += 10;
      
      // Play hit sound
      if (this.scene.sound.exists('hit')) {
        this.scene.sound.play('hit', { volume: this.stateManager.settings.effectsVolume });
      }
    });
    
    // Remove hitbox after short duration
    this.scene.time.delayedCall(100, () => {
      hitbox.destroy();
      this.isAttacking = false;
      
      // Return to appropriate animation
      if (this.sprite.body.onFloor()) {
        this.sprite.anims.play('calvin-idle', true);
        this.state = 'idle';
      }
    });
  }

  /**
   * Create visual effect for attack hit
   * @param {number} x
   * @param {number} y
   */
  createHitEffect(x, y) {
    // Create blood-like particles
    const particles = this.scene.add.particles('particle');
    const emitter = particles.createEmitter({
      x: x,
      y: y,
      speed: { min: 100, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      blendMode: 'ADD',
      lifespan: 500,
      quantity: { min: 5, max: 10 },
      gravityY: 200,
      alpha: { start: 1, end: 0 }
    });
    
    // Screen shake effect
    this.scene.cameras.main.shake(100, 0.005);
    
    // Clean up after effect
    this.scene.time.delayedCall(500, () => {
      particles.destroy();
    });
  }

  /**
   * Take damage from enemy
   * @param {number} amount - Damage amount
   */
  takeDamage(amount) {
    if (this.isInvincible || this.state === 'dead') return;
    
    const actualDamage = this.stateManager.takeDamage(amount);
    
    if (actualDamage > 0) {
      this.isInvincible = true;
      this.invincibilityTimer = GAME_CONFIG.PLAYER.invincibilityDuration;
      this.state = 'hurt';
      
      // Play hurt animation
      this.sprite.anims.play('calvin-hurt', true);
      
      // Screen shake effect
      this.scene.cameras.main.shake(200, 0.01);
      
      // Play hurt sound
      if (this.scene.sound.exists('hurt')) {
        this.scene.sound.play('hurt', { volume: this.stateManager.settings.effectsVolume });
      }
      
      // Check for death
      if (this.stateManager.health <= 0) {
        this.die();
      }
    }
  }

  /**
   * Heal the player
   * @param {number} amount - Amount to heal
   */
  heal(amount) {
    const actualHealed = this.stateManager.heal(amount);
    
    if (actualHealed > 0) {
      // Create healing effect
      this.createHealingEffect(this.sprite.x, this.sprite.y);
      
      // Play heal sound
      if (this.scene.sound.exists('heal')) {
        this.scene.sound.play('heal', { volume: this.stateManager.settings.effectsVolume });
      }
    }
  }

  /**
   * Create healing visual effect
   * @param {number} x
   * @param {number} y
   */
  createHealingEffect(x, y) {
    const particles = this.scene.add.particles('particle');
    const emitter = particles.createEmitter({
      x: x,
      y: y,
      speed: { min: 50, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.3, end: 0 },
      tint: 0x4caf50,
      blendMode: 'ADD',
      lifespan: 800,
      quantity: 15,
      gravityY: -50,
      alpha: { start: 0.8, end: 0 }
    });
    
    // Clean up after effect
    this.scene.time.delayedCall(800, () => {
      particles.destroy();
    });
  }

  /**
   * Handle character death
   */
  die() {
    this.state = 'dead';
    
    // Stop movement
    this.sprite.setVelocity(0, 0);
    
    // Play death animation
    this.sprite.setTint(0x666666);
    this.sprite.anims.play('calvin-die', true);
    
    // Screen shake
    this.scene.cameras.main.shake(500, 0.03);
    
    // Notify scene
    this.scene.events.emit('playerDied');
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Remove event listeners
    this.scene.events.off('gameOver');
    
    // Destroy sprite
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }
}

// Export for module systems
if (typeof module !== 'undefined') {
  module.exports = Calvin;
}
