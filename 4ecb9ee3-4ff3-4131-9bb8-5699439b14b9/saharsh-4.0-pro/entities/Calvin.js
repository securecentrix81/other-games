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
    
    // Animation states
    this.state = 'idle'; // 'idle', 'running', 'jumping', 'attacking', 'hurt'
    this.isAttacking = false;
    this.attackCooldown = 0;
    this.isInvincible = false;
    this.invincibilityTimer = 0;
    
    // Movement properties
    this.lastDirection = 'right'; // 'left' or 'right'
    this.jumpCount = 0;
    this.maxJumps = 2; // Double jump capability
    
    // Initialize animations
    this.createAnimations();
    
    // Start with idle animation
    this.sprite.anims.play('calvin-idle', true);
  }

  /**
   * Create character animations
   */
  createAnimations() {
    // Idle animation
    this.scene.anims.create({
      key: 'calvin-idle',
      frames: this.scene.anims.generateFrameNumbers('calvin', { start: 0, end: 3 }),
      frameRate: 5,
      repeat: -1
    });
    
    // Running animation
    this.scene.anims.create({
      key: 'calvin-run',
      frames: this.scene.anims.generateFrameNumbers('calvin', { start: 4, end: 7 }),
      frameRate: 10,
      repeat: -1
    });
    
    // Jumping animation
    this.scene.anims.create({
      key: 'calvin-jump',
      frames: [{ key: 'calvin', frame: 8 }],
      frameRate: 1,
      repeat: 0
    });
    
    // Attacking animation
    this.scene.anims.create({
      key: 'calvin-attack',
      frames: this.scene.anims.generateFrameNumbers('calvin', { start: 9, end: 11 }),
      frameRate: 15,
      repeat: 0
    });
    
    // Hurt animation
    this.scene.anims.create({
      key: 'calvin-hurt',
      frames: [{ key: 'calvin', frame: 12 }],
      frameRate: 1,
      repeat: 0
    });
  }

  /**
   * Update method called each frame
   * @param {Object} input - Movement input from InputHandler
   * @param {string} relationshipTier - Current relationship tier
   */
  update(input, relationshipTier) {
    // Skip update if invincible (flashing)
    if (this.isInvincible) {
      this.invincibilityTimer -= this.scene.game.loop.delta / 1000;
      if (this.invincibilityTimer <= 0) {
        this.isInvincible = false;
      }
      
      // Make sprite flash while invincible
      this.sprite.alpha = Math.sin(Date.now() / 100) > 0 ? 1 : 0.5;
      return;
    } else {
      this.sprite.alpha = 1;
    }
    
    // Reset animation state
    let playAnimation = null;
    
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
    if (input.up) {
      // Allow double jump
      if ((this.sprite.body.onFloor() || this.jumpCount < this.maxJumps) && 
          this.jumpCount < 2) {
        this.sprite.setVelocityY(GAME_CONFIG.PLAYER.jumpForce);
        this.jumpCount++;
        playAnimation = 'calvin-jump';
        
        // Play jump sound
        if (this.scene.sound.exists('jump')) {
          this.scene.sound.play('jump');
        }
      }
    } else if (this.sprite.body.onFloor()) {
      // Reset jump count when on ground
      this.jumpCount = 0;
    }
    
    // Attack logic
    if (input.space && !this.isAttacking && this.attackCooldown <= 0) {
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
   * Perform attack action
   * @param {string} relationshipTier - Current relationship tier
   */
  attack(relationshipTier) {
    this.isAttacking = true;
    this.attackCooldown = 0.5; // 500ms cooldown
    this.state = 'attacking';
    
    // Play attack animation
    this.sprite.anims.play('calvin-attack', true);
    
    // Create attack hitbox
    const attackRange = GAME_CONFIG.PLAYER.attackRange;
    const offsetX = this.lastDirection === 'right' ? attackRange : -attackRange;
    
    // Calculate base damage
    let damage = GAME_CONFIG.PLAYER.attackDamage;
    
    // Apply relationship-based damage boost
    if (relationshipTier === 'strong' || relationshipTier === 'unbreakable') {
      damage += Math.floor(damage * GAME_CONFIG.getCombatBonuses(relationshipTier).damageBoost);
    }
    
    // Create hitbox
    const hitbox = this.scene.add.rectangle(
      this.sprite.x + offsetX,
      this.sprite.y,
      attackRange,
      attackRange * 0.8,
      0xff0000,
      0
    );
    
    hitbox.alpha = 0; // Invisible hitbox
    this.scene.physics.world.enable(hitbox);
    hitbox.body.setAllowGravity(false);
    hitbox.body.setImmovable(true);
    
    // Check for collisions with monsters
    this.scene.physics.add.overlap(hitbox, this.scene.monsters, (hitbox, monster) => {
      monster.takeDamage(damage);
      
      // Create hit effect
      this.createHitEffect(monster.x, monster.y);
      
      // Play hit sound
      if (this.scene.sound.exists('hit')) {
        this.scene.sound.play('hit');
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
    const particles = this.scene.add.particles('particle');
    const emitter = particles.createEmitter({
      x: x,
      y: y,
      speed: { min: 100, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      blendMode: 'ADD',
      lifespan: 500,
      quantity: 10,
      gravityY: 200
    });
    
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
    if (this.isInvincible) return;
    
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
        this.scene.sound.play('hurt');
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
        this.scene.sound.play('heal');
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
      gravityY: -50
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
    this.sprite.anims.stop();
    
    // Notify scene
    this.scene.events.emit('playerDied');
  }

  /**
   * Cleanup resources
   */
  destroy() {
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
