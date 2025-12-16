/**
 * js/renderer.js
 * 
 * Handles all Canvas 2D rendering.
 * Draws HitObjects, Cursors, Trails, and Particles.
 */

window.Renderer = (function() {
    let canvas, ctx;
    let width, height;

    // Constants
    const OSU_BASE_WIDTH = 512;
    const OSU_BASE_HEIGHT = 384;
    
    // Assets (Generated programmatically to save file requests)
    const assets = {
        hitCircleOverlay: null,
        approachCircle: null,
        cursor: null
    };

    function init() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d', { alpha: false }); // Optimize
        resize();
        window.addEventListener('resize', resize);
        
        // Pre-render basic assets if needed (optional optimization)
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }

    /**
     * Main Render Function
     * @param {Object} gameState - Current state of the game
     */
    function render(gameState) {
        if (!ctx) return;

        // 1. Clear Screen
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        // 2. Draw Background (Dimmed)
        // (Handled by CSS for the image, but we can do overlay here if needed)
        // We'll rely on the CSS background-layer for the image.
        
        // 3. Setup Coordinate System
        // We need to map 0-512 osu! coords to screen coords.
        // HardRock flip is handled in mapping.
        const isHR = window.ModSystem.isActive('HardRock');
        const mapParams = window.Utils.mapToCanvas(0, 0, width, height, isHR);
        
        // Calculate Circle Radius in pixels
        // CS (Circle Size) formula: r = 54.4 - 4.48 * CS
        const cs = gameState.stats.cs;
        const osuRadius = 54.4 - 4.48 * cs;
        const pixelRadius = osuRadius * mapParams.scale;

        // 4. Draw Hit Objects
        // Iterate BACKWARDS to draw future objects behind current objects
        // However, in osu!, the objects appearing LATER should be BEHIND objects appearing SOONER.
        // Array is sorted by time.
        // We want index 0 (soonest) on TOP.
        // So we draw index N -> 0.
        
        const time = gameState.time;
        const visibleObjects = gameState.visibleObjects; // Pre-filtered list of active objs

        // Reverse loop for correct stacking
        for (let i = visibleObjects.length - 1; i >= 0; i--) {
            const obj = visibleObjects[i];
            drawHitObject(obj, time, pixelRadius, mapParams, gameState.stats.arMs);
        }
        
        // 5. Draw Cursor and Trail
        if (!window.ModSystem.isActive('Autopilot')) { // Don't draw input cursor if AP? Actually user moves cursor in AP usually? 
            // In Auto, we draw generated cursor.
            // In Play, we draw mouse pos.
            drawCursor(gameState.cursor, gameState.cursorTrail);
        }
    }

    function drawHitObject(obj, time, radius, mapParams, arMs) {
        const x = mapParams.offsetX + obj.x * mapParams.scale;
        const y = mapParams.offsetY + (window.ModSystem.isActive('HardRock') ? (384 - obj.y) : obj.y) * mapParams.scale;
        
        const opacity = Math.min(1, (time - (obj.time - arMs)) / (arMs / 4)); // Fade in

        if (time > obj.endTime + 200) return; // Fully gone

        ctx.globalAlpha = opacity;

        if (obj.type === 'slider') {
            drawSlider(obj, time, radius, mapParams);
        }

        // Draw Hit Circle (for Circles and Slider Heads)
        if (obj.type === 'circle' || obj.type === 'slider') {
            // If it's a slider, we only draw the head circle if it hasn't been hit/passed?
            // Actually slider head stays visible until hit.
            if (!obj.hit) {
                // Circle Body
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgb(${obj.color.join(',')})`;
                ctx.fill();
                
                // Circle Overlay (White border/shine)
                ctx.lineWidth = radius * 0.1;
                ctx.strokeStyle = 'rgba(255,255,255,0.9)';
                ctx.stroke();

                // Number
                ctx.fillStyle = '#fff';
                ctx.font = `bold ${radius}px "Exo 2", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(obj.comboNumber, x, y);

                // Approach Circle
                if (time < obj.time) {
                    const timeDiff = obj.time - time;
                    const progress = 1 - (timeDiff / arMs);
                    const approachScale = 1 + (2 * (1 - progress)); // Shrinks from 3x to 1x
                    
                    ctx.beginPath();
                    ctx.arc(x, y, radius * approachScale, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgb(${obj.color.join(',')})`;
                    ctx.lineWidth = radius * 0.1;
                    ctx.stroke();
                }
            }
        }
        
        if (obj.type === 'spinner') {
            drawSpinner(obj, time, mapParams);
        }

        ctx.globalAlpha = 1;
    }

    function drawSlider(obj, time, radius, mapParams) {
        const isHR = window.ModSystem.isActive('HardRock');
        
        // 1. Draw Slider Body
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Border
        ctx.lineWidth = radius * 2 * 0.95; // Slightly smaller to allow anti-aliasing
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; // Border color
        // ctx.stroke(getPath(obj, mapParams, isHR)); // Too expensive to regenerate path every frame?
        
        // We will iterate points manually for now
        if (obj.curvePoints.length > 0) {
            ctx.beginPath();
            const start = mapPos(obj.curvePoints[0], mapParams, isHR);
            ctx.moveTo(start.x, start.y);
            
            for (let i = 1; i < obj.curvePoints.length; i++) {
                const p = mapPos(obj.curvePoints[i], mapParams, isHR);
                ctx.lineTo(p.x, p.y);
            }
            
            // Draw Border
            ctx.lineWidth = radius * 2.1;
            ctx.strokeStyle = '#fff';
            ctx.stroke();

            // Draw Inner Body
            ctx.lineWidth = radius * 1.8;
            ctx.strokeStyle = `rgba(40,40,40, 0.7)`; // Dark center style
            ctx.stroke();
            
            // Draw Color Tint
            ctx.strokeStyle = `rgba(${obj.color.join(',')}, 0.7)`;
            ctx.stroke();
        }

        // 2. Draw Ball
        if (time >= obj.time && time <= obj.endTime) {
            // Calculate Ball Position
            const progress = (time - obj.time) / obj.duration;
            const pos = window.Utils.getSliderPosition(obj, progress);
            const screenPos = mapPos(pos, mapParams, isHR);
            
            // Draw Ball Outer Ring
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Follow Circle (Inner)
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, radius * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            
            // Follow Range Indicator (Faint Ring)
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, radius * 2.4, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    
    function drawSpinner(obj, time, mapParams) {
         const center = mapPos({x: 256, y: 192}, mapParams, false);
         const progress = Math.max(0, Math.min(1, (time - obj.time) / (obj.endTime - obj.time)));
         
         ctx.beginPath();
         ctx.arc(center.x, center.y, 200 * mapParams.scale, 0, Math.PI * 2);
         ctx.strokeStyle = 'rgba(255,255,255,0.3)';
         ctx.lineWidth = 5;
         ctx.stroke();
         
         // Fill based on progress (visual feedback)
         ctx.beginPath();
         ctx.arc(center.x, center.y, 10 + (progress * 190 * mapParams.scale), 0, Math.PI * 2);
         ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
         ctx.fill();
    }

    function drawCursor(cursor, trail) {
        if (!cursor) return;

        // Draw Trail
        if (trail && trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(trail[0].x, trail[0].y);
            for (let i = 1; i < trail.length; i++) {
                // Quadratic bezier for smoothness
                // ctx.lineTo(trail[i].x, trail[i].y);
                const p0 = trail[i-1];
                const p1 = trail[i];
                const mid = { x: (p0.x + p1.x)/2, y: (p0.y + p1.y)/2 };
                ctx.quadraticCurveTo(p0.x, p0.y, mid.x, mid.y);
            }
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 4; // Trail width
            ctx.strokeStyle = 'rgba(255, 105, 180, 0.4)'; // Pink trail
            ctx.stroke();
        }

        // Draw Cursor Head
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#ff69b4'; // Hot pink
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
    }

    // Helper: Map osu coord to canvas coord
    function mapPos(p, mapParams, isHR) {
        const y = isHR ? (384 - p.y) : p.y;
        return {
            x: mapParams.offsetX + p.x * mapParams.scale,
            y: mapParams.offsetY + y * mapParams.scale
        };
    }

    return {
        init,
        render
    };

})();
