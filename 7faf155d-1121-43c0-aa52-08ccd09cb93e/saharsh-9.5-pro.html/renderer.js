/**
 * renderer.js
 * Handles all canvas rendering for the osu! game including playfield, hit objects, cursor, and HUD
 * Dependencies: utils.js, constants.js (must be loaded first)
 * Exports: Renderer class
 */

import { lerp, distance, clamp } from './utils.js';
import { OSU_PLAYFIELD } from './constants.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Playfield dimensions (will be calculated)
        this.playfieldRect = { x: 0, y: 0, width: 0, height: 0 };
        this.scaleX = 1;
        this.scaleY = 1;
        this.padding = 50;
        
        // Cache for performance
        this.comboFont = 'bold 24px "Segoe UI", Arial, sans-serif';
        this.hudFont = '20px "Segoe UI", Arial, sans-serif';
        this.scoreFont = 'bold 48px "Segoe UI", Arial, sans-serif';
        
        this.calculatePlayfield();
    }
    
    /**
     * Calculate playfield dimensions to fit canvas while maintaining aspect ratio
     */
    calculatePlayfield() {
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        const availableWidth = canvasWidth - this.padding * 2;
        const availableHeight = canvasHeight - this.padding * 2;
        
        const osuAspect = OSU_PLAYFIELD.WIDTH / OSU_PLAYFIELD.HEIGHT;
        const canvasAspect = availableWidth / availableHeight;
        
        let width, height;
        
        if (canvasAspect > osuAspect) {
            // Canvas is wider - fit to height
            height = availableHeight;
            width = height * osuAspect;
        } else {
            // Canvas is taller - fit to width
            width = availableWidth;
            height = width / osuAspect;
        }
        
        this.playfieldRect = {
            x: (canvasWidth - width) / 2,
            y: (canvasHeight - height) / 2,
            width: width,
            height: height
        };
        
        this.scaleX = width / OSU_PLAYFIELD.WIDTH;
        this.scaleY = height / OSU_PLAYFIELD.HEIGHT;
    }
    
    /**
     * Convert osu! coordinates to canvas coordinates
     */
    osuToCanvas(x, y, flipY = false) {
        const adjustedY = flipY ? (OSU_PLAYFIELD.HEIGHT - y) : y;
        return {
            x: this.playfieldRect.x + x * this.scaleX,
            y: this.playfieldRect.y + adjustedY * this.scaleY
        };
    }
    
    /**
     * Convert canvas coordinates to osu! coordinates
     */
    canvasToOsu(x, y, flipY = false) {
        const osuX = (x - this.playfieldRect.x) / this.scaleX;
        let osuY = (y - this.playfieldRect.y) / this.scaleY;
        if (flipY) {
            osuY = OSU_PLAYFIELD.HEIGHT - osuY;
        }
        return { x: osuX, y: osuY };
    }
    
    /**
     * Scale a radius from osu! units to canvas units
     */
    scaleRadius(radius) {
        return radius * ((this.scaleX + this.scaleY) / 2);
    }
    
    /**
     * Clear the entire canvas
     */
    clear() {
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Draw playfield border
     */
    drawPlayfieldBorder() {
        const ctx = this.ctx;
        const rect = this.playfieldRect;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
    
    /**
     * Draw a hit circle
     */
    drawCircle(circle, radius, color, isHidden = false, flipY = false) {
        if (circle.state === 'finished' || circle.state === 'hit') return;
        
        const ctx = this.ctx;
        const pos = this.osuToCanvas(circle.x, circle.y, flipY);
        const scaledRadius = this.scaleRadius(radius);
        
        let opacity = circle.opacity || 1;
        
        // Hidden mod fade
        if (isHidden && circle.approachScale !== undefined) {
            if (circle.approachScale < 2) {
                opacity *= clamp((circle.approachScale - 1), 0, 1);
            }
        }
        
        if (opacity <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = opacity;
        
        // Draw outer glow
        const gradient = ctx.createRadialGradient(
            pos.x, pos.y, scaledRadius * 0.8,
            pos.x, pos.y, scaledRadius * 1.3
        );
        gradient.addColorStop(0, `rgba(${this.hexToRgb(color)}, 0.3)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, scaledRadius * 1.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw circle fill
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, scaledRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw white border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = scaledRadius * 0.12;
        ctx.stroke();
        
        // Draw inner darker circle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, scaledRadius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw combo number
        if (circle.comboNumber !== undefined) {
            ctx.fillStyle = 'white';
            ctx.font = `bold ${Math.floor(scaledRadius * 0.8)}px "Segoe UI", Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(circle.comboNumber.toString(), pos.x, pos.y);
        }
        
        // Draw approach circle
        if (circle.approachScale !== undefined && circle.approachScale > 1 && !isHidden) {
            const approachRadius = scaledRadius * circle.approachScale;
            ctx.strokeStyle = color;
            ctx.lineWidth = scaledRadius * 0.08;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, approachRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    /**
     * Draw a slider
     */
    drawSlider(slider, radius, color, isHidden = false, flipY = false) {
        if (slider.state === 'finished') return;
        
        const ctx = this.ctx;
        const scaledRadius = this.scaleRadius(radius);
        
        let opacity = slider.opacity || 1;
        
        // Hidden mod fade
        if (isHidden && slider.approachScale !== undefined) {
            if (slider.approachScale < 2) {
                opacity *= clamp((slider.approachScale - 1), 0, 1);
            }
        }
        
        if (opacity <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = opacity;
        
        // Draw slider body
        if (slider.curvePoints && slider.curvePoints.length > 1) {
            // Draw slider track (dark background)
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.lineWidth = scaledRadius * 2.2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            
            const firstPoint = this.osuToCanvas(slider.curvePoints[0].x, slider.curvePoints[0].y, flipY);
            ctx.moveTo(firstPoint.x, firstPoint.y);
            
            for (let i = 1; i < slider.curvePoints.length; i++) {
                const point = this.osuToCanvas(slider.curvePoints[i].x, slider.curvePoints[i].y, flipY);
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
            
            // Draw colored border
            ctx.strokeStyle = color;
            ctx.lineWidth = scaledRadius * 2;
            ctx.stroke();
            
            // Draw inner track
            ctx.strokeStyle = 'rgba(50, 50, 50, 0.9)';
            ctx.lineWidth = scaledRadius * 1.6;
            ctx.stroke();
        }
        
        // Draw reverse arrows if slides > 1
        if (slider.slides > 1 && slider.curvePoints && slider.curvePoints.length > 1) {
            const currentSlide = Math.floor(slider.progress || 0);
            const isReversing = currentSlide % 2 === 1;
            
            // Draw arrow at end or start depending on direction
            if (currentSlide < slider.slides - 1) {
                const arrowPoints = isReversing ? 
                    [slider.curvePoints[0], slider.curvePoints[1]] :
                    [slider.curvePoints[slider.curvePoints.length - 1], slider.curvePoints[slider.curvePoints.length - 2]];
                
                const arrowPos = this.osuToCanvas(arrowPoints[0].x, arrowPoints[0].y, flipY);
                const dirPos = this.osuToCanvas(arrowPoints[1].x, arrowPoints[1].y, flipY);
                
                const angle = Math.atan2(dirPos.y - arrowPos.y, dirPos.x - arrowPos.x);
                
                ctx.save();
                ctx.translate(arrowPos.x, arrowPos.y);
                ctx.rotate(angle);
                
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.moveTo(scaledRadius * 0.5, 0);
                ctx.lineTo(-scaledRadius * 0.3, -scaledRadius * 0.4);
                ctx.lineTo(-scaledRadius * 0.3, scaledRadius * 0.4);
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
            }
        }
        
        // Draw start circle
        const startPos = this.osuToCanvas(slider.x, slider.y, flipY);
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, scaledRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = scaledRadius * 0.12;
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, scaledRadius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw combo number on start
        if (slider.comboNumber !== undefined) {
            ctx.fillStyle = 'white';
            ctx.font = `bold ${Math.floor(scaledRadius * 0.8)}px "Segoe UI", Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(slider.comboNumber.toString(), startPos.x, startPos.y);
        }
        
        // Draw approach circle on start
        if (slider.approachScale !== undefined && slider.approachScale > 1 && !isHidden) {
            ctx.strokeStyle = color;
            ctx.lineWidth = scaledRadius * 0.08;
            ctx.beginPath();
            ctx.arc(startPos.x, startPos.y, scaledRadius * slider.approachScale, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw slider ball if active
        if (slider.state === 'active' && slider.ballX !== undefined && slider.ballY !== undefined) {
            const ballPos = this.osuToCanvas(slider.ballX, slider.ballY, flipY);
            
            // Ball glow
            const ballGradient = ctx.createRadialGradient(
                ballPos.x, ballPos.y, 0,
                ballPos.x, ballPos.y, scaledRadius * 1.5
            );
            ballGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            ballGradient.addColorStop(0.5, `rgba(${this.hexToRgb(color)}, 0.5)`);
            ballGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = ballGradient;
            ctx.beginPath();
            ctx.arc(ballPos.x, ballPos.y, scaledRadius * 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Ball core
            ctx.fillStyle = slider.sliderFollowing ? 'white' : 'rgba(200, 200, 200, 0.8)';
            ctx.beginPath();
            ctx.arc(ballPos.x, ballPos.y, scaledRadius * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    /**
     * Draw a spinner
     */
    drawSpinner(spinner, flipY = false) {
        if (spinner.state === 'finished') return;
        
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const maxRadius = Math.min(this.playfieldRect.width, this.playfieldRect.height) * 0.4;
        
        const opacity = spinner.opacity || 1;
        
        ctx.save();
        ctx.globalAlpha = opacity;
        
        // Draw outer ring
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw progress arc
        const progress = spinner.progress || 0;
        if (progress > 0) {
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 12;
            ctx.beginPath();
            ctx.arc(centerX, centerY, maxRadius - 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(progress, 1));
            ctx.stroke();
        }
        
        // Draw shrinking inner circle (time remaining indicator)
        if (spinner.timeRemaining !== undefined && spinner.totalDuration !== undefined) {
            const timeProgress = 1 - (spinner.timeRemaining / spinner.totalDuration);
            const innerRadius = maxRadius * 0.3 * (1 - timeProgress * 0.5);
            
            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + timeProgress * 0.4})`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw center dot
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw rotation count
        const rotations = Math.floor(spinner.rotations || 0);
        if (rotations > 0) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(rotations.toString(), centerX, centerY - maxRadius - 40);
        }
        
        // Draw RPM
        if (spinner.rpm !== undefined && spinner.rpm > 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '20px "Segoe UI", Arial, sans-serif';
            ctx.fillText(`${Math.floor(spinner.rpm)} RPM`, centerX, centerY + maxRadius + 40);
        }
        
        // Draw "SPIN!" text if not complete
        if (progress < 1) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
            ctx.fillText('SPIN!', centerX, centerY);
        } else {
            // Bonus spins indicator
            const bonusSpins = Math.floor((spinner.rotations || 0) - (spinner.requiredRotations || 0));
            if (bonusSpins > 0) {
                ctx.fillStyle = '#ffcc00';
                ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
                ctx.fillText(`+${bonusSpins * 1000}`, centerX, centerY);
            }
        }
        
        ctx.restore();
    }
    
    /**
     * Draw the cursor
     */
    drawCursor(x, y, pressed, flipY = false) {
        const ctx = this.ctx;
        const pos = this.osuToCanvas(x, y, flipY);
        const radius = pressed ? 18 : 15;
        
        ctx.save();
        
        // Outer glow when pressed
        if (pressed) {
            const glowGradient = ctx.createRadialGradient(
                pos.x, pos.y, 0,
                pos.x, pos.y, radius * 3
            );
            glowGradient.addColorStop(0, 'rgba(255, 200, 100, 0.6)');
            glowGradient.addColorStop(0.5, 'rgba(255, 150, 50, 0.3)');
            glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Cursor body
        const cursorGradient = ctx.createRadialGradient(
            pos.x - radius * 0.3, pos.y - radius * 0.3, 0,
            pos.x, pos.y, radius
        );
        cursorGradient.addColorStop(0, pressed ? '#ffcc00' : '#ffffff');
        cursorGradient.addColorStop(1, pressed ? '#ff8800' : '#aaaaaa');
        
        ctx.fillStyle = cursorGradient;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * Draw cursor trail
     */
    drawCursorTrail(trail, flipY = false) {
        if (!trail || trail.length < 2) return;
        
        const ctx = this.ctx;
        
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        for (let i = 1; i < trail.length; i++) {
            const point = trail[i];
            const prevPoint = trail[i - 1];
            const pos = this.osuToCanvas(point.x, point.y, flipY);
            const prevPos = this.osuToCanvas(prevPoint.x, prevPoint.y, flipY);
            
            const alpha = (i / trail.length) * 0.5;
            const width = (i / trail.length) * 8;
            
            ctx.strokeStyle = `rgba(255, 200, 100, ${alpha})`;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(prevPos.x, prevPos.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    /**
     * Draw a hit burst effect
     */
    drawHitBurst(burst, flipY = false) {
        const ctx = this.ctx;
        const pos = this.osuToCanvas(burst.x, burst.y, flipY);
        const age = burst.age || 0;
        const duration = burst.duration || 600;
        const progress = age / duration;
        
        if (progress >= 1) return;
        
        const scale = 1 + progress * 0.5;
        const alpha = 1 - progress;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(pos.x, pos.y);
        ctx.scale(scale, scale);
        
        let text, color;
        switch (burst.result) {
            case 300:
                text = '300';
                color = '#88ccff';
                break;
            case 100:
                text = '100';
                color = '#88ff88';
                break;
            case 50:
                text = '50';
                color = '#ffcc88';
                break;
            default:
                text = '✗';
                color = '#ff4444';
        }
        
        ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText(text, 2, 2);
        
        // Text
        ctx.fillStyle = color;
        ctx.fillText(text, 0, 0);
        
        ctx.restore();
    }
    
    /**
     * Draw particles
     */
    drawParticles(particles, flipY = false) {
        const ctx = this.ctx;
        
        for (const particle of particles) {
            const pos = this.osuToCanvas(particle.x, particle.y, flipY);
            const alpha = particle.life / particle.maxLife;
            
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = particle.color || '#ffffff';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    /**
     * Draw HUD elements
     */
    drawHUD(data) {
        const ctx = this.ctx;
        const { score, combo, accuracy, health } = data;
        
        ctx.save();
        
        // Score (top right)
        ctx.fillStyle = 'white';
        ctx.font = this.scoreFont;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        const scoreText = String(score || 0).padStart(8, '0');
        ctx.fillText(scoreText, this.canvas.width - 20, 20);
        
        // Accuracy (below score)
        ctx.font = this.hudFont;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(`${(accuracy || 100).toFixed(2)}%`, this.canvas.width - 20, 75);
        
        // Combo (bottom left)
        if (combo > 0) {
            ctx.font = 'bold 48px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = 'white';
            ctx.fillText(`${combo}x`, 20, this.canvas.height - 20);
        }
        
        // Health bar (top center)
        const healthBarWidth = 300;
        const healthBarHeight = 15;
        const healthBarX = (this.canvas.width - healthBarWidth) / 2;
        const healthBarY = 15;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        
        // Health fill
        const healthPercent = clamp((health || 100) / 100, 0, 1);
        let healthColor;
        if (healthPercent > 0.5) {
            healthColor = '#44ff44';
        } else if (healthPercent > 0.25) {
            healthColor = '#ffaa00';
        } else {
            healthColor = '#ff4444';
        }
        
        ctx.fillStyle = healthColor;
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
        
        // Border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        
        ctx.restore();
    }
    
    /**
     * Draw paused overlay
     */
    drawPausedOverlay() {
        const ctx = this.ctx;
        
        ctx.save();
        
        // Dim background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Paused text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 64px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        
        // Instructions
        ctx.font = '24px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText('Press ESC to resume', this.canvas.width / 2, this.canvas.height / 2 + 60);
        
        ctx.restore();
    }
    
    /**
     * Draw flashlight effect (circular hole in darkness)
     */
    drawFlashlight(x, y, flipY = false) {
        const ctx = this.ctx;
        const pos = this.osuToCanvas(x, y, flipY);
        const radius = 150;
        
        ctx.save();
        
        // Create flashlight mask
        ctx.globalCompositeOperation = 'source-over';
        
        // Draw dark overlay with hole
        ctx.beginPath();
        ctx.rect(0, 0, this.canvas.width, this.canvas.height);
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2, true);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.fill();
        
        // Soft edge gradient
        const gradient = ctx.createRadialGradient(
            pos.x, pos.y, radius * 0.7,
            pos.x, pos.y, radius
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
        
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.restore();
    }
    
    /**
     * Draw countdown number
     */
    drawCountdown(number) {
        const ctx = this.ctx;
        
        ctx.save();
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 120px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const text = number > 0 ? number.toString() : 'GO!';
        ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
        
        ctx.restore();
    }
    
    /**
     * Draw failed screen overlay
     */
    drawFailedOverlay() {
        const ctx = this.ctx;
        
        ctx.save();
        
        // Dark red overlay
        ctx.fillStyle = 'rgba(50, 0, 0, 0.85)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Failed text
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 72px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FAILED', this.canvas.width / 2, this.canvas.height / 2 - 30);
        
        // Instructions
        ctx.font = '24px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText('Press R to retry or ESC to quit', this.canvas.width / 2, this.canvas.height / 2 + 40);
        
        ctx.restore();
    }
    
    /**
     * Draw loading indicator
     */
    drawLoading(progress = 0, message = 'Loading...') {
        const ctx = this.ctx;
        
        ctx.save();
        
        this.clear();
        
        // Loading text
        ctx.fillStyle = 'white';
        ctx.font = '28px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2 - 30);
        
        // Progress bar background
        const barWidth = 300;
        const barHeight = 10;
        const barX = (this.canvas.width - barWidth) / 2;
        const barY = this.canvas.height / 2 + 10;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Progress bar fill
        ctx.fillStyle = '#88ccff';
        ctx.fillRect(barX, barY, barWidth * clamp(progress, 0, 1), barHeight);
        
        ctx.restore();
    }
    
    /**
     * Draw combo popups
     */
    drawComboPopups(popups, flipY = false) {
        const ctx = this.ctx;
        
        for (const popup of popups) {
            const pos = this.osuToCanvas(popup.x, popup.y, flipY);
            const progress = popup.age / popup.duration;
            const alpha = 1 - progress;
            const scale = 1 + progress * 0.3;
            
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(pos.x, pos.y);
            ctx.scale(scale, scale);
            
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${popup.combo}x`, 0, 0);
            
            ctx.restore();
        }
    }
    
    /**
     * Draw mod indicators on screen
     */
    drawModIndicators(modString) {
        if (!modString || modString === 'None') return;
        
        const ctx = this.ctx;
        
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '16px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`Mods: ${modString}`, this.canvas.width - 20, 100);
        ctx.restore();
    }
    
    /**
     * Helper: Convert hex color to RGB string
     */
    hexToRgb(hex) {
        if (!hex) return '255, 255, 255';
        
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
        }
        return '255, 255, 255';
    }
    
    /**
     * Get playfield rectangle for input calculations
     */
    getPlayfieldRect() {
        return { ...this.playfieldRect };
    }
    
    /**
     * Resize handler
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.calculatePlayfield();
    }
    
    /**
     * Draw end circle for slider (at slider end position)
     */
    drawSliderEndCircle(slider, radius, color, flipY = false) {
        if (!slider.curvePoints || slider.curvePoints.length === 0) return;
        
        const ctx = this.ctx;
        const endPoint = slider.curvePoints[slider.curvePoints.length - 1];
        const pos = this.osuToCanvas(endPoint.x, endPoint.y, flipY);
        const scaledRadius = this.scaleRadius(radius);
        
        ctx.save();
        ctx.globalAlpha = 0.5;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, scaledRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * Draw slider ticks
     */
    drawSliderTicks(slider, radius, flipY = false) {
        if (!slider.tickPositions || slider.tickPositions.length === 0) return;
        
        const ctx = this.ctx;
        const scaledRadius = this.scaleRadius(radius);
        
        ctx.save();
        
        for (const tick of slider.tickPositions) {
            if (tick.hit) continue; // Don't draw hit ticks
            
            const pos = this.osuToCanvas(tick.x, tick.y, flipY);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, scaledRadius * 0.15, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    /**
     * Draw a follow circle around the slider ball
     */
    drawFollowCircle(x, y, radius, isFollowing, flipY = false) {
        const ctx = this.ctx;
        const pos = this.osuToCanvas(x, y, flipY);
        const followRadius = this.scaleRadius(radius * 2.4);
        
        ctx.save();
        
        const alpha = isFollowing ? 0.4 : 0.2;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, followRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * Get the scale values for external calculations
     */
    getScale() {
        return {
            x: this.scaleX,
            y: this.scaleY,
            average: (this.scaleX + this.scaleY) / 2
        };
    }
    
    /**
     * Check if a point (in canvas coords) is within the playfield
     */
    isPointInPlayfield(canvasX, canvasY) {
        const rect = this.playfieldRect;
        return (
            canvasX >= rect.x &&
            canvasX <= rect.x + rect.width &&
            canvasY >= rect.y &&
            canvasY <= rect.y + rect.height
        );
    }
}

export default Renderer;
