/**
 * effects.js
 * Handles visual effects including cursor trail, hit bursts, particles, and combo popups
 * Dependencies: utils.js (must be loaded first)
 * Exports: EffectsManager class
 */

import { distance, clamp } from './utils.js';

/**
 * EffectsManager handles all visual effects in the game
 */
export class EffectsManager {
    constructor() {
        // Cursor trail points
        this.cursorTrail = [];
        this.maxTrailLength = 20;
        this.trailLifetime = 200; // ms
        this.minTrailDistance = 5; // minimum distance between trail points
        
        // Hit burst effects (300, 100, 50, miss text)
        this.hitBursts = [];
        this.hitBurstDuration = 600; // ms
        
        // Combo popups
        this.comboPopups = [];
        this.comboPopupDuration = 800; // ms
        
        // Particles (for hit explosions)
        this.particles = [];
        this.maxParticles = 200;
        this.gravity = 400; // pixels per second squared
        
        // Last cursor position for trail
        this.lastCursorX = 0;
        this.lastCursorY = 0;
        
        // Timestamp tracking
        this.lastUpdateTime = 0;
    }
    
    /**
     * Update all effects
     * @param {number} deltaTime - Time since last update in ms
     * @param {number} currentTime - Current timestamp
     */
    update(deltaTime, currentTime) {
        this.lastUpdateTime = currentTime;
        const deltaSec = deltaTime / 1000;
        
        // Update cursor trail
        this.updateCursorTrail(deltaTime, currentTime);
        
        // Update hit bursts
        this.updateHitBursts(deltaTime);
        
        // Update combo popups
        this.updateComboPopups(deltaTime);
        
        // Update particles
        this.updateParticles(deltaSec);
    }
    
    /**
     * Update cursor trail - age and remove old points
     */
    updateCursorTrail(deltaTime, currentTime) {
        // Age all trail points
        for (const point of this.cursorTrail) {
            point.age += deltaTime;
        }
        
        // Remove expired points
        this.cursorTrail = this.cursorTrail.filter(
            point => point.age < this.trailLifetime
        );
    }
    
    /**
     * Update hit bursts
     */
    updateHitBursts(deltaTime) {
        for (const burst of this.hitBursts) {
            burst.age += deltaTime;
        }
        
        this.hitBursts = this.hitBursts.filter(
            burst => burst.age < burst.duration
        );
    }
    
    /**
     * Update combo popups
     */
    updateComboPopups(deltaTime) {
        for (const popup of this.comboPopups) {
            popup.age += deltaTime;
            // Float upward
            popup.y -= deltaTime * 0.05;
        }
        
        this.comboPopups = this.comboPopups.filter(
            popup => popup.age < popup.duration
        );
    }
    
    /**
     * Update particles with physics
     */
    updateParticles(deltaSec) {
        for (const particle of this.particles) {
            // Apply velocity
            particle.x += particle.vx * deltaSec;
            particle.y += particle.vy * deltaSec;
            
            // Apply gravity
            particle.vy += this.gravity * deltaSec;
            
            // Apply friction
            particle.vx *= 0.99;
            particle.vy *= 0.99;
            
            // Reduce life
            particle.life -= deltaSec * 1000;
            
            // Shrink over time
            const lifeRatio = particle.life / particle.maxLife;
            particle.currentSize = particle.size * lifeRatio;
        }
        
        // Remove dead particles
        this.particles = this.particles.filter(
            particle => particle.life > 0
        );
    }
    
    /**
     * Add a cursor trail point
     */
    addCursorPoint(x, y, time) {
        // Check minimum distance from last point
        const dist = distance(
            { x: this.lastCursorX, y: this.lastCursorY },
            { x, y }
        );
        
        if (dist < this.minTrailDistance && this.cursorTrail.length > 0) {
            return;
        }
        
        this.cursorTrail.push({
            x,
            y,
            time,
            age: 0
        });
        
        // Limit trail length
        while (this.cursorTrail.length > this.maxTrailLength) {
            this.cursorTrail.shift();
        }
        
        this.lastCursorX = x;
        this.lastCursorY = y;
    }
    
    /**
     * Add a hit burst effect
     * @param {number} x - X position in osu! coordinates
     * @param {number} y - Y position in osu! coordinates
     * @param {number|string} result - Hit result (300, 100, 50, 'miss')
     * @param {number} time - Current time
     */
    addHitBurst(x, y, result, time) {
        this.hitBursts.push({
            x,
            y,
            result,
            time,
            age: 0,
            duration: this.hitBurstDuration
        });
    }
    
    /**
     * Add a combo popup
     * @param {number} combo - Current combo number
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    addComboPopup(combo, x, y) {
        this.comboPopups.push({
            combo,
            x,
            y,
            age: 0,
            duration: this.comboPopupDuration
        });
    }
    
    /**
     * Add hit particles (explosion effect)
     * @param {number} x - X position in osu! coordinates
     * @param {number} y - Y position in osu! coordinates
     * @param {string} color - Particle color (hex)
     * @param {number} count - Number of particles
     */
    addHitParticles(x, y, color, count = 8) {
        // Limit total particles
        const availableSlots = this.maxParticles - this.particles.length;
        const actualCount = Math.min(count, availableSlots);
        
        for (let i = 0; i < actualCount; i++) {
            const angle = (Math.PI * 2 * i) / actualCount + (Math.random() - 0.5) * 0.5;
            const speed = 100 + Math.random() * 200;
            const life = 400 + Math.random() * 400;
            
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50, // Initial upward bias
                color: color || '#ffffff',
                size: 3 + Math.random() * 4,
                currentSize: 3 + Math.random() * 4,
                life,
                maxLife: life
            });
        }
    }
    
    /**
     * Add slider tick particles (smaller, less intense)
     */
    addSliderTickParticles(x, y, color) {
        this.addHitParticles(x, y, color, 4);
    }
    
    /**
     * Add slider end particles
     */
    addSliderEndParticles(x, y, color) {
        this.addHitParticles(x, y, color, 12);
    }
    
    /**
     * Add miss particles (red, dispersing downward)
     */
    addMissParticles(x, y) {
        const count = 6;
        for (let i = 0; i < count; i++) {
            const angle = Math.PI / 2 + (Math.random() - 0.5) * 1.5; // Mostly downward
            const speed = 50 + Math.random() * 100;
            const life = 300 + Math.random() * 300;
            
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: '#ff4444',
                size: 2 + Math.random() * 3,
                currentSize: 2 + Math.random() * 3,
                life,
                maxLife: life
            });
        }
    }
    
    /**
     * Add spinner complete particles (burst from center)
     */
    addSpinnerCompleteParticles() {
        const centerX = 256;
        const centerY = 192;
        const count = 20;
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 200 + Math.random() * 150;
            const life = 500 + Math.random() * 500;
            
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: i % 2 === 0 ? '#88ccff' : '#ffffff',
                size: 4 + Math.random() * 4,
                currentSize: 4 + Math.random() * 4,
                life,
                maxLife: life
            });
        }
    }
    
    /**
     * Add bonus score particles (golden)
     */
    addBonusParticles(x, y, count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 120;
            const life = 400 + Math.random() * 400;
            
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 80,
                color: '#ffcc00',
                size: 3 + Math.random() * 3,
                currentSize: 3 + Math.random() * 3,
                life,
                maxLife: life
            });
        }
    }
    
    /**
     * Get all hit bursts for rendering
     */
    getHitBursts() {
        return this.hitBursts;
    }
    
    /**
     * Get cursor trail for rendering
     */
    getCursorTrail() {
        return this.cursorTrail;
    }
    
    /**
     * Get combo popups for rendering
     */
    getComboPopups() {
        return this.comboPopups;
    }
    
    /**
     * Get particles for rendering
     */
    getParticles() {
        return this.particles;
    }
    
    /**
     * Clear all effects
     */
    clear() {
        this.cursorTrail = [];
        this.hitBursts = [];
        this.comboPopups = [];
        this.particles = [];
        this.lastCursorX = 0;
        this.lastCursorY = 0;
    }
    
    /**
     * Clear only gameplay effects (keep cursor trail)
     */
    clearGameplayEffects() {
        this.hitBursts = [];
        this.comboPopups = [];
        this.particles = [];
    }
    
    /**
     * Get effect counts for debugging
     */
    getStats() {
        return {
            trailPoints: this.cursorTrail.length,
            hitBursts: this.hitBursts.length,
            comboPopups: this.comboPopups.length,
            particles: this.particles.length
        };
    }
    
    /**
     * Check if there are any active effects
     */
    hasActiveEffects() {
        return (
            this.hitBursts.length > 0 ||
            this.comboPopups.length > 0 ||
            this.particles.length > 0
        );
    }
    
    /**
     * Create a screen flash effect (for combos, etc.)
     */
    createScreenFlash(color = '#ffffff', duration = 100) {
        // This would need to be handled by the renderer
        // Return flash info for external handling
        return {
            type: 'screenFlash',
            color,
            duration,
            startTime: this.lastUpdateTime
        };
    }
    
    /**
     * Get interpolated trail opacity based on age
     */
    getTrailOpacity(point) {
        return 1 - (point.age / this.trailLifetime);
    }
    
    /**
     * Get interpolated burst scale and opacity
     */
    getBurstAnimation(burst) {
        const progress = burst.age / burst.duration;
        return {
            scale: 1 + progress * 0.5,
            opacity: 1 - progress
        };
    }
    
    /**
     * Get particle render data
     */
    getParticleRenderData(particle) {
        return {
            x: particle.x,
            y: particle.y,
            size: particle.currentSize,
            color: particle.color,
            alpha: particle.life / particle.maxLife
        };
    }
    
    /**
     * Add perfect hit particles (extra sparkly for 300s)
     */
    addPerfectHitParticles(x, y, color) {
        // Main explosion
        this.addHitParticles(x, y, color, 10);
        
        // Extra sparkles
        const sparkleCount = 5;
        for (let i = 0; i < sparkleCount; i++) {
            const angle = (Math.PI * 2 * i) / sparkleCount;
            const speed = 150 + Math.random() * 100;
            const life = 300 + Math.random() * 200;
            
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 30,
                color: '#ffffff',
                size: 2 + Math.random() * 2,
                currentSize: 2 + Math.random() * 2,
                life,
                maxLife: life
            });
        }
    }
    
    /**
     * Add combo break effect
     */
    addComboBreakEffect(x, y) {
        // Red dispersing particles
        this.addMissParticles(x, y);
        
        // Add a larger burst
        const count = 8;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 80 + Math.random() * 80;
            const life = 400 + Math.random() * 200;
            
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: '#ff6666',
                size: 4 + Math.random() * 3,
                currentSize: 4 + Math.random() * 3,
                life,
                maxLife: life
            });
        }
    }
    
    /**
     * Pause all effects (freeze ages)
     */
    pause() {
        this.isPaused = true;
    }
    
    /**
     * Resume effects
     */
    resume() {
        this.isPaused = false;
    }
    
    /**
     * Update with pause support
     */
    updateWithPauseSupport(deltaTime, currentTime) {
        if (this.isPaused) return;
        this.update(deltaTime, currentTime);
    }
    
    /**
     * Get active effect count (for performance monitoring)
     */
    getActiveEffectCount() {
        return (
            this.cursorTrail.length +
            this.hitBursts.length +
            this.comboPopups.length +
            this.particles.length
        );
    }
    
    /**
     * Limit particles if too many (performance safeguard)
     */
    enforceParticleLimit() {
        if (this.particles.length > this.maxParticles) {
            // Remove oldest particles
            this.particles = this.particles.slice(-this.maxParticles);
        }
    }
}

export default EffectsManager;
