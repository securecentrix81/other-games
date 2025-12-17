/**
 * Visual Effects System - Animation and Particle Management
 * 
 * Purpose: Manages all visual effects including particles, animations, and screen effects
 * Dependencies: This file requires game-engine.js to be loaded first
 * Exports: window.VisualEffects - Visual effects management system
 */

class VisualEffects {
    constructor(engine) {
        this.engine = engine;
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animations = [];
        this.screenShake = { intensity: 0, duration: 0, x: 0, y: 0 };
        this.transitions = [];
        this.particlePool = [];
        this.maxParticles = GameData.ui.particleMaxCount;
        
        // Particle effect configurations
        this.particleConfigs = {
            combat_hit: {
                color: '#e74c3c',
                size: 3,
                lifespan: 500,
                velocity: { x: 50, y: -30 },
                gravity: 100,
                count: 8
            },
            
            healing: {
                color: '#2ecc71',
                size: 4,
                lifespan: 800,
                velocity: { x: 0, y: -40 },
                gravity: 0,
                count: 12,
                glow: true
            },
            
            stress_relief: {
                color: '#3498db',
                size: 2,
                lifespan: 600,
                velocity: { x: 0, y: -20 },
                gravity: 0,
                count: 6
            },
            
            level_up: {
                color: '#f39c12',
                size: 5,
                lifespan: 1500,
                velocity: { x: 0, y: -60 },
                gravity: 0,
                count: 20,
                glow: true
            },
            
            ability_cast: {
                color: '#9b59b6',
                size: 3,
                lifespan: 1000,
                velocity: { x: 30, y: -20 },
                gravity: 0,
                count: 15,
                spiral: true
            },
            
            damage_numbers: {
                color: '#e74c3c',
                size: 16,
                lifespan: 1200,
                velocity: { x: 0, y: -50 },
                gravity: 0,
                count: 1,
                floating: true,
                text: true
            },
            
            critical_hit: {
                color: '#f39c12',
                size: 6,
                lifespan: 800,
                velocity: { x: 40, y: -40 },
                gravity: 0,
                count: 12,
                glow: true
            },
            
            area_transition: {
                color: '#95a5a6',
                size: 8,
                lifespan: 2000,
                velocity: { x: 0, y: 0 },
                gravity: 0,
                count: 30,
                fade: true
            }
        };
        
        // Initialize when DOM is ready
        this.initialize();
    }

    /**
     * Initialize visual effects system
     */
    initialize() {
        this.canvas = this.engine.canvas;
        this.ctx = this.engine.ctx;
        
        // Initialize particle pool
        this.initializeParticlePool();
        
        console.log('Visual effects system initialized');
    }

    /**
     * Initialize particle object pool for performance
     */
    initializeParticlePool() {
        for (let i = 0; i < this.maxParticles; i++) {
            this.particlePool.push(this.createEmptyParticle());
        }
    }

    /**
     * Create empty particle object for pool
     */
    createEmptyParticle() {
        return {
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            ax: 0,
            ay: 0,
            size: 0,
            color: '#ffffff',
            alpha: 1,
            lifespan: 0,
            maxLifespan: 0,
            type: 'generic',
            gravity: 0,
            rotation: 0,
            rotationSpeed: 0,
            text: null,
            glow: false,
            spiral: false,
            fade: false,
            floating: false,
            active: false
        };
    }

    /**
     * Get particle from pool
     */
    getParticle() {
        if (this.particlePool.length > 0) {
            return this.particlePool.pop();
        }
        return this.createEmptyParticle();
    }

    /**
     * Return particle to pool
     */
    returnParticle(particle) {
        particle.active = false;
        if (this.particlePool.length < this.maxParticles) {
            this.particlePool.push(particle);
        }
    }

    /**
     * Create particle effect
     */
    createParticleEffect(type, x, y, options = {}) {
        const config = this.particleConfigs[type];
        if (!config) {
            console.warn('Unknown particle effect type:', type);
            return;
        }

        const effectCount = options.count || config.count || 5;
        
        for (let i = 0; i < effectCount; i++) {
            const particle = this.getParticle();
            
            // Set particle properties
            particle.x = x + (Math.random() - 0.5) * 20;
            particle.y = y + (Math.random() - 0.5) * 20;
            particle.vx = (config.velocity?.x || 0) + (Math.random() - 0.5) * 20;
            particle.vy = (config.velocity?.y || 0) + (Math.random() - 0.5) * 20;
            particle.size = config.size + (Math.random() - 0.5) * 2;
            particle.color = options.color || config.color;
            particle.alpha = 1;
            particle.lifespan = config.lifespan;
            particle.maxLifespan = config.lifespan;
            particle.type = type;
            particle.gravity = config.gravity || 0;
            particle.rotation = Math.random() * Math.PI * 2;
            particle.rotationSpeed = (Math.random() - 0.5) * 0.1;
            particle.text = options.text || config.text || null;
            particle.glow = config.glow || false;
            particle.spiral = config.spiral || false;
            particle.fade = config.fade || false;
            particle.floating = config.floating || false;
            particle.active = true;

            // Add spiral motion if enabled
            if (particle.spiral) {
                particle.spiralAngle = Math.random() * Math.PI * 2;
                particle.spiralRadius = Math.random() * 20;
            }

            this.particles.push(particle);
        }

        console.log(`Created ${effectCount} particles of type ${type}`);
    }

    /**
     * Create damage number effect
     */
    createDamageNumber(damage, x, y, isCritical = false, isHealing = false) {
        const particle = this.getParticle();
        
        particle.x = x;
        particle.y = y;
        particle.vx = (Math.random() - 0.5) * 20;
        particle.vy = -50 - Math.random() * 30;
        particle.size = isCritical ? 20 : 14;
        particle.color = isHealing ? '#2ecc71' : (isCritical ? '#f39c12' : '#e74c3c');
        particle.alpha = 1;
        particle.lifespan = 1200;
        particle.maxLifespan = 1200;
        particle.type = 'damage_number';
        particle.gravity = 0;
        particle.text = damage.toString();
        particle.glow = isCritical;
        particle.active = true;

        this.particles.push(particle);
    }

    /**
     * Create screen shake effect
     */
    createScreenShake(intensity = 5, duration = 300) {
        this.screenShake.intensity = intensity;
        this.screenShake.duration = duration;
        this.screenShake.x = 0;
        this.screenShake.y = 0;
        
        console.log(`Screen shake: intensity ${intensity}, duration ${duration}ms`);
    }

    /**
     * Create fade transition
     */
    createFadeTransition(duration = 1000, type = 'fade_out') {
        const transition = {
            type: type,
            duration: duration,
            startTime: Date.now(),
            alpha: type === 'fade_out' ? 0 : 1,
            targetAlpha: type === 'fade_out' ? 1 : 0,
            complete: false
        };
        
        this.transitions.push(transition);
        return transition;
    }

    /**
     * Create UI animation
     */
    createUIAnimation(element, animationType, duration = 300, callback = null) {
        const animation = {
            element: element,
            type: animationType,
            duration: duration,
            startTime: Date.now(),
            complete: false,
            callback: callback,
            initialValues: this.getElementCurrentValues(element, animationType)
        };
        
        this.animations.push(animation);
        return animation;
    }

    /**
     * Get element's current values for animation
     */
    getElementCurrentValues(element, animationType) {
        const styles = window.getComputedStyle(element);
        
        switch (animationType) {
            case 'slide_in':
                return {
                    transform: `translateX(${styles.transform.includes('translateX') ? '0' : '100%'})`,
                    opacity: styles.opacity
                };
            case 'fade_in':
                return { opacity: 0 };
            case 'scale_in':
                return { transform: 'scale(0.8)', opacity: 0 };
            case 'bounce':
                return { transform: 'translateY(0)' };
            default:
                return {};
        }
    }

    /**
     * Update all visual effects
     */
    update(deltaTime) {
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update animations
        this.updateAnimations(deltaTime);
        
        // Update transitions
        this.updateTransitions(deltaTime);
        
        // Update screen shake
        this.updateScreenShake(deltaTime);
    }

    /**
     * Update particle effects
     */
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            if (!particle.active) {
                this.particles.splice(i, 1);
                continue;
            }
            
            // Update position
            particle.x += particle.vx * deltaTime / 1000;
            particle.y += particle.vy * deltaTime / 1000;
            
            // Apply gravity
            if (particle.gravity > 0) {
                particle.vy += particle.gravity * deltaTime / 1000;
            }
            
            // Apply spiral motion
            if (particle.spiral) {
                particle.spiralAngle += 0.1;
                particle.x += Math.cos(particle.spiralAngle) * particle.spiralRadius * deltaTime / 1000;
                particle.y += Math.sin(particle.spiralAngle) * particle.spiralRadius * deltaTime / 1000;
            }
            
            // Update rotation
            particle.rotation += particle.rotationSpeed;
            
            // Update lifespan
            particle.lifespan -= deltaTime;
            
            // Update alpha
            if (particle.fade || particle.lifespan <= 0) {
                particle.alpha = Math.max(0, particle.lifespan / particle.maxLifespan);
            }
            
            // Remove dead particles
            if (particle.lifespan <= 0) {
                this.returnParticle(particle);
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * Update UI animations
     */
    updateAnimations(deltaTime) {
        for (let i = this.animations.length - 1; i >= 0; i--) {
            const animation = this.animations[i];
            const elapsed = Date.now() - animation.startTime;
            const progress = Math.min(elapsed / animation.duration, 1);
            
            // Easing function (ease-out)
            const eased = 1 - Math.pow(1 - progress, 3);
            
            // Apply animation based on type
            this.applyAnimationProgress(animation, eased);
            
            if (progress >= 1 && !animation.complete) {
                animation.complete = true;
                
                // Apply final values
                this.applyAnimationProgress(animation, 1);
                
                // Execute callback
                if (animation.callback) {
                    animation.callback();
                }
                
                // Remove completed animation
                this.animations.splice(i, 1);
            }
        }
    }

    /**
     * Apply animation progress to element
     */
    applyAnimationProgress(animation, progress) {
        const element = animation.element;
        const type = animation.type;
        const initial = animation.initialValues;
        
        switch (type) {
            case 'slide_in':
                const translateX = this.lerp(this.extractTranslateX(initial.transform), 0, progress);
                element.style.transform = `translateX(${translateX}px)`;
                element.style.opacity = progress.toString();
                break;
                
            case 'fade_in':
                element.style.opacity = progress.toString();
                break;
                
            case 'scale_in':
                const scale = this.lerp(0.8, 1, progress);
                element.style.transform = `scale(${scale})`;
                element.style.opacity = progress.toString();
                break;
                
            case 'bounce':
                const bounceY = this.bounce(progress) * -20;
                element.style.transform = `translateY(${bounceY}px)`;
                break;
                
            case 'pulse':
                const pulse = 1 + Math.sin(progress * Math.PI * 4) * 0.1;
                element.style.transform = `scale(${pulse})`;
                break;
        }
    }

    /**
     * Extract translateX value from transform string
     */
    extractTranslateX(transform) {
        const match = transform.match(/translateX\(([^)]+)px\)/);
        return match ? parseFloat(match[1]) : 100;
    }

    /**
     * Linear interpolation
     */
    lerp(start, end, progress) {
        return start + (end - start) * progress;
    }

    /**
     * Bounce easing function
     */
    bounce(progress) {
        if (progress < 1 / 2.75) {
            return 7.5625 * progress * progress;
        } else if (progress < 2 / 2.75) {
            return 7.5625 * (progress -= 1.5 / 2.75) * progress + 0.75;
        } else if (progress < 2.5 / 2.75) {
            return 7.5625 * (progress -= 2.25 / 2.75) * progress + 0.9375;
        } else {
            return 7.5625 * (progress -= 2.625 / 2.75) * progress + 0.984375;
        }
    }

    /**
     * Update transitions
     */
    updateTransitions(deltaTime) {
        for (let i = this.transitions.length - 1; i >= 0; i--) {
            const transition = this.transitions[i];
            const elapsed = Date.now() - transition.startTime;
            const progress = Math.min(elapsed / transition.duration, 1);
            
            // Easing function
            const eased = progress < 0.5 ? 
                2 * progress * progress : 
                1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            transition.alpha = this.lerp(transition.alpha, transition.targetAlpha, eased);
            
            if (progress >= 1) {
                transition.complete = true;
                this.transitions.splice(i, 1);
            }
        }
    }

    /**
     * Update screen shake
     */
    updateScreenShake(deltaTime) {
        if (this.screenShake.duration > 0) {
            this.screenShake.duration -= deltaTime;
            
            const intensity = this.screenShake.intensity * (this.screenShake.duration / 300);
            this.screenShake.x = (Math.random() - 0.5) * intensity;
            this.screenShake.y = (Math.random() - 0.5) * intensity;
        } else {
            this.screenShake.x = 0;
            this.screenShake.y = 0;
        }
    }

    /**
     * Render all visual effects
     */
    render() {
        this.ctx.save();
        
        // Apply screen shake
        if (this.screenShake.x !== 0 || this.screenShake.y !== 0) {
            this.ctx.translate(this.screenShake.x, this.screenShake.y);
        }
        
        // Render particles
        this.renderParticles();
        
        // Render transitions
        this.renderTransitions();
        
        this.ctx.restore();
    }

    /**
     * Render particles
     */
    renderParticles() {
        for (const particle of this.particles) {
            if (!particle.active) continue;
            
            this.ctx.save();
            this.ctx.globalAlpha = particle.alpha;
            
            if (particle.glow) {
                this.ctx.shadowColor = particle.color;
                this.ctx.shadowBlur = particle.size * 2;
            }
            
            if (particle.text) {
                // Render text particle
                this.ctx.fillStyle = particle.color;
                this.ctx.font = `${particle.size}px ${GameData.ui.fonts.primary}`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText(particle.text, particle.x, particle.y);
            } else {
                // Render geometric particle
                this.ctx.translate(particle.x, particle.y);
                this.ctx.rotate(particle.rotation);
                
                this.ctx.fillStyle = particle.color;
                
                if (particle.size <= 3) {
                    // Simple circle for small particles
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
                    this.ctx.fill();
                } else {
                    // Rectangle for larger particles
                    this.ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
                }
            }
            
            this.ctx.restore();
        }
    }

    /**
     * Render transitions
     */
    renderTransitions() {
        for (const transition of this.transitions) {
            if (transition.alpha > 0) {
                this.ctx.save();
                this.ctx.globalAlpha = transition.alpha;
                this.ctx.fillStyle = '#000000';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.restore();
            }
        }
    }

    /**
     * Clear all effects
     */
    clear() {
        this.particles = [];
        this.animations = [];
        this.transitions = [];
        this.screenShake = { intensity: 0, duration: 0, x: 0, y: 0 };
        
        // Return all particles to pool
        while (this.particlePool.length < this.maxParticles) {
            this.particlePool.push(this.createEmptyParticle());
        }
    }

    /**
     * Get current effect status
     */
    getEffectStatus() {
        return {
            activeParticles: this.particles.length,
            activeAnimations: this.animations.length,
            activeTransitions: this.transitions.length,
            particlePoolAvailable: this.particlePool.length,
            screenShakeActive: this.screenShake.duration > 0
        };
    }

    /**
     * Save visual effects state
     */
    save() {
        const storageKey = location.pathname + "visual_effects_data";
        try {
            const effectData = {
                screenShake: this.screenShake,
                activeEffects: this.particles.map(p => ({
                    type: p.type,
                    x: p.x,
                    y: p.y,
                    lifespan: p.lifespan,
                    maxLifespan: p.maxLifespan
                }))
            };
            localStorage.setItem(storageKey, JSON.stringify(effectData));
        } catch (error) {
            console.error('Failed to save visual effects data:', error);
        }
    }

    /**
     * Load visual effects state
     */
    load() {
        const storageKey = location.pathname + "visual_effects_data";
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const effectData = JSON.parse(saved);
                this.screenShake = effectData.screenShake || this.screenShake;
                return true;
            }
        } catch (error) {
            console.error('Failed to load visual effects data:', error);
        }
        return false;
    }
}

// Export for use by other systems
window.VisualEffects = VisualEffects;
