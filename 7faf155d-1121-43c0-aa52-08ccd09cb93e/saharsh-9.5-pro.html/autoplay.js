/**
 * autoplay.js
 * Handles Auto, Relax, and Autopilot mod automation
 * Dependencies: utils.js (must be loaded first)
 * Exports: AutoplayController class
 */

import { lerp, distance, clamp } from './utils.js';

/**
 * AutoplayController handles automated cursor movement and/or clicking
 * Modes:
 *   - 'none': No automation
 *   - 'auto': Full automation (cursor + clicks)
 *   - 'relax': Auto-clicking only (player moves cursor)
 *   - 'autopilot': Auto-cursor only (player clicks)
 */
export class AutoplayController {
    constructor() {
        this.mode = 'none';
        
        // Current automated cursor position
        this.cursorX = 256;
        this.cursorY = 192;
        
        // Target position for interpolation
        this.targetX = 256;
        this.targetY = 192;
        
        // Movement state
        this.moveStartTime = 0;
        this.moveDuration = 0;
        this.moveStartX = 256;
        this.moveStartY = 192;
        
        // Click state
        this.isClicking = false;
        this.lastClickTime = 0;
        
        // Spinner state
        this.spinnerAngle = 0;
        this.spinnerSpeed = 0.05; // Radians per ms
        
        // Current object being tracked
        this.currentObjectIndex = -1;
        
        // Timing constants
        this.clickLeadTime = 2; // ms before hit time to click
        this.moveLeadTime = 50; // ms before hit time to arrive
    }
    
    /**
     * Set the autoplay mode
     */
    setMode(mode) {
        this.mode = mode;
        this.reset();
    }
    
    /**
     * Reset state
     */
    reset() {
        this.cursorX = 256;
        this.cursorY = 192;
        this.targetX = 256;
        this.targetY = 192;
        this.isClicking = false;
        this.currentObjectIndex = -1;
        this.spinnerAngle = 0;
    }
    
    /**
     * Check if autoplay is active
     */
    isActive() {
        return this.mode !== 'none';
    }
    
    /**
     * Check if cursor automation is active
     */
    isCursorAutomated() {
        return this.mode === 'auto' || this.mode === 'autopilot';
    }
    
    /**
     * Check if clicking is automated
     */
    isClickAutomated() {
        return this.mode === 'auto' || this.mode === 'relax';
    }
    
    /**
     * Main update function - call each frame
     * @param {number} currentTime - Current song time in ms
     * @param {Array} hitObjects - Array of hit objects
     * @param {number} circleRadius - Current circle radius
     * @returns {Object} - { x, y, click: 'none'|'press'|'hold'|'release' }
     */
    update(currentTime, hitObjects, circleRadius) {
        if (this.mode === 'none') {
            return { x: null, y: null, click: 'none' };
        }
        
        // Find the next relevant object
        const nextObj = this.findNextObject(currentTime, hitObjects);
        const activeObj = this.findActiveObject(currentTime, hitObjects);
        
        let cursorResult = { x: null, y: null };
        let clickResult = 'none';
        
        // Handle cursor automation
        if (this.isCursorAutomated()) {
            cursorResult = this.updateCursor(currentTime, nextObj, activeObj, hitObjects, circleRadius);
        }
        
        // Handle click automation
        if (this.isClickAutomated()) {
            clickResult = this.updateClick(currentTime, nextObj, activeObj, hitObjects, circleRadius);
        }
        
        return {
            x: cursorResult.x,
            y: cursorResult.y,
            click: clickResult
        };
    }
    
    /**
     * Find the next unfinished object
     */
    findNextObject(currentTime, hitObjects) {
        for (let i = 0; i < hitObjects.length; i++) {
            const obj = hitObjects[i];
            if (obj.state !== 'finished' && obj.state !== 'hit') {
                return obj;
            }
        }
        return null;
    }
    
    /**
     * Find an object that is currently active (being interacted with)
     */
    findActiveObject(currentTime, hitObjects) {
        for (let i = 0; i < hitObjects.length; i++) {
            const obj = hitObjects[i];
            if (obj.state === 'active') {
                return obj;
            }
            // Check if we're within a slider or spinner duration
            if (obj.type === 'slider' && obj.state !== 'finished') {
                const endTime = obj.time + (obj.duration || 0);
                if (currentTime >= obj.time && currentTime <= endTime) {
                    return obj;
                }
            }
            if (obj.type === 'spinner' && obj.state !== 'finished') {
                if (currentTime >= obj.time && currentTime <= obj.endTime) {
                    return obj;
                }
            }
        }
        return null;
    }
    
    /**
     * Update cursor position for auto/autopilot
     */
    updateCursor(currentTime, nextObj, activeObj, hitObjects, circleRadius) {
        // Handle active spinner - spin around center
        if (activeObj && activeObj.type === 'spinner') {
            return this.updateSpinnerCursor(currentTime, activeObj);
        }
        
        // Handle active slider - follow the ball
        if (activeObj && activeObj.type === 'slider' && activeObj.ballX !== undefined) {
            this.cursorX = activeObj.ballX;
            this.cursorY = activeObj.ballY;
            return { x: this.cursorX, y: this.cursorY };
        }
        
        // Move to next object
        if (nextObj) {
            const targetTime = nextObj.time - this.moveLeadTime;
            
            // Calculate where we need to be
            let targetX = nextObj.x;
            let targetY = nextObj.y;
            
            // For spinners, target the center
            if (nextObj.type === 'spinner') {
                targetX = 256;
                targetY = 192;
            }
            
            // Check if we need to start a new movement
            if (targetX !== this.targetX || targetY !== this.targetY) {
                this.startMovement(currentTime, targetX, targetY, targetTime);
            }
            
            // Interpolate position
            this.interpolateMovement(currentTime);
        }
        
        return { x: this.cursorX, y: this.cursorY };
    }
    
    /**
     * Start a movement to a target position
     */
    startMovement(currentTime, targetX, targetY, arrivalTime) {
        this.moveStartX = this.cursorX;
        this.moveStartY = this.cursorY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.moveStartTime = currentTime;
        this.moveDuration = Math.max(arrivalTime - currentTime, 1);
    }
    
    /**
     * Interpolate cursor movement with easing
     */
    interpolateMovement(currentTime) {
        if (this.moveDuration <= 0) {
            this.cursorX = this.targetX;
            this.cursorY = this.targetY;
            return;
        }
        
        const elapsed = currentTime - this.moveStartTime;
        const progress = clamp(elapsed / this.moveDuration, 0, 1);
        
        // Use easing function for smooth movement
        const easedProgress = this.easeOutQuad(progress);
        
        this.cursorX = lerp(this.moveStartX, this.targetX, easedProgress);
        this.cursorY = lerp(this.moveStartY, this.targetY, easedProgress);
    }
    
    /**
     * Quadratic ease-out function
     */
    easeOutQuad(t) {
        return t * (2 - t);
    }
    
    /**
     * Cubic ease-in-out function
     */
    easeInOutCubic(t) {
        return t < 0.5 
            ? 4 * t * t * t 
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    /**
     * Update cursor for spinner rotation
     * @param {number} currentTime - Current song time in ms
     * @param {Object} spinner - Spinner object
     * @param {number} deltaTime - Time since last frame (optional)
     */
    updateSpinnerCursor(currentTime, spinner, deltaTime = 16.67) {
        // Spin around the center
        const centerX = 256;
        const centerY = 192;
        const spinRadius = 80;
        
        // Update angle based on delta time for consistent speed
        // spinnerSpeed is radians per ms, high speed for auto
        this.spinnerAngle += this.spinnerSpeed * deltaTime;
        
        // Keep angle in reasonable range to prevent overflow
        if (this.spinnerAngle > Math.PI * 100) {
            this.spinnerAngle -= Math.PI * 100;
        }
        
        this.cursorX = centerX + Math.cos(this.spinnerAngle) * spinRadius;
        this.cursorY = centerY + Math.sin(this.spinnerAngle) * spinRadius;
        
        return { x: this.cursorX, y: this.cursorY };
    }
    
    /**
     * Update click state for auto/relax
     */
    updateClick(currentTime, nextObj, activeObj, hitObjects, circleRadius) {
        // Check if we should be holding for a slider or spinner
        if (activeObj) {
            if (activeObj.type === 'slider') {
                // Hold during slider
                const endTime = activeObj.time + (activeObj.duration || 0);
                if (currentTime >= activeObj.time && currentTime <= endTime) {
                    if (!this.isClicking) {
                        this.isClicking = true;
                        return 'press';
                    }
                    return 'hold';
                }
            }
            
            if (activeObj.type === 'spinner') {
                // Hold during spinner
                if (currentTime >= activeObj.time && currentTime <= activeObj.endTime) {
                    if (!this.isClicking) {
                        this.isClicking = true;
                        return 'press';
                    }
                    return 'hold';
                }
            }
        }
        
        // Check if we should click for a circle or slider start
        if (nextObj && nextObj.state !== 'finished' && nextObj.state !== 'hit') {
            const hitTime = nextObj.time;
            const timeDiff = hitTime - currentTime;
            
            // Click just before the hit time
            if (timeDiff <= this.clickLeadTime && timeDiff > -50) {
                if (nextObj.type === 'circle') {
                    if (!this.isClicking) {
                        this.isClicking = true;
                        this.lastClickTime = currentTime;
                        return 'press';
                    }
                    // Release after a short duration for circles
                    if (currentTime - this.lastClickTime > 30) {
                        this.isClicking = false;
                        return 'release';
                    }
                    return 'hold';
                }
                
                if (nextObj.type === 'slider' && !nextObj.sliderStartHit) {
                    if (!this.isClicking) {
                        this.isClicking = true;
                        return 'press';
                    }
                    return 'hold';
                }
            }
        }
        
        // Release if we were clicking but shouldn't be anymore
        if (this.isClicking) {
            this.isClicking = false;
            return 'release';
        }
        
        return 'none';
    }
    
    /**
     * Get current cursor position (for external use)
     */
    getCursorPosition() {
        return { x: this.cursorX, y: this.cursorY };
    }
    
    /**
     * Set cursor position (for initialization or external control)
     */
    setCursorPosition(x, y) {
        this.cursorX = x;
        this.cursorY = y;
        this.targetX = x;
        this.targetY = y;
    }
    
    /**
     * Force move to a position immediately
     */
    snapToPosition(x, y) {
        this.cursorX = x;
        this.cursorY = y;
        this.targetX = x;
        this.targetY = y;
        this.moveStartX = x;
        this.moveStartY = y;
        this.moveDuration = 0;
    }
    
    /**
     * Check if cursor is within a circle
     */
    isCursorOnObject(obj, radius) {
        const dx = this.cursorX - obj.x;
        const dy = this.cursorY - obj.y;
        return (dx * dx + dy * dy) <= radius * radius;
    }
    
    /**
     * Get the current mode
     */
    getMode() {
        return this.mode;
    }
    
    /**
     * Get mode display name
     */
    getModeName() {
        switch (this.mode) {
            case 'auto': return 'Auto';
            case 'relax': return 'Relax';
            case 'autopilot': return 'Autopilot';
            default: return '';
        }
    }
}

export default AutoplayController;
