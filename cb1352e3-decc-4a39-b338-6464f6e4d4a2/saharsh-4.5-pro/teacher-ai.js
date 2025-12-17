/**
 * Teacher AI System - Advanced Pursuit and Authority Management
 * 
 * Purpose: Manages teacher AI behavior, pursuit mechanics, capture scenarios, and authority enforcement
 * Dependencies: This file requires game-engine.js and character-system.js to be loaded first
 * Exports: window.TeacherAI - Advanced teacher AI and pursuit management system
 */

class TeacherAI {
    constructor(engine) {
        this.engine = engine;
        this.active = false;
        this.state = 'patrol'; // patrol, suspicious, chase, capture
        this.position = { x: 0, y: 0 };
        this.targetPosition = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.detectionRange = 8;
        this.pursuitRange = 15;
        this.lastSeenPosition = null;
        this.lastSeenTime = 0;
        this.lostTimer = 0;
        this.captureTimer = 0;
        this.searchPattern = [];
        this.currentWaypoint = 0;
        this.patrolPoints = [];
        this.intelligence = 1; // Increases weekly
        this.speed = 2; // Increases weekly
        this.aggression = 1; // Increases weekly
        this.memoryDuration = 30; // Seconds
        this.searchDuration = 60; // Seconds
        this.captureCooldown = 0;
        
        // Teacher personality traits
        this.personality = {
            persistent: true,
            methodical: true,
            authoritative: true,
            unpredictable: false,
            patient: false
        };
        
        // Environmental awareness
        this.knownHidingSpots = [];
        this.knownShortcuts = [];
        this.forbiddenAreas = ['library']; // Teacher doesn't patrol library
        this.preferredAreas = ['hallway1', 'classroom1', 'cafeteria'];
        
        // Capture mechanics
        this.captureMethods = ['direct_chase', 'flank', 'trap', 'backup_call'];
        this.captureProbabilities = {
            direct_chase: 0.4,
            flank: 0.3,
            trap: 0.2,
            backup_call: 0.1
        };
        
        // Initialize patrol points
        this.initializePatrolPoints();
    }

    /**
     * Initialize teacher's patrol points throughout the school
     */
    initializePatrolPoints() {
        this.patrolPoints = [
            // Main hallway patrol
            { area: 'hallway1', x: 200, y: 100 },
            { area: 'hallway1', x: 400, y: 100 },
            { area: 'hallway1', x: 600, y: 100 },
            
            // Classroom patrol
            { area: 'classroom1', x: 200, y: 150 },
            { area: 'classroom1', x: 350, y: 150 },
            
            // Cafeteria patrol
            { area: 'cafeteria', x: 250, y: 175 },
            { area: 'cafeteria', x: 400, y: 175 },
            
            // East wing patrol
            { area: 'hallway2', x: 300, y: 75 },
            { area: 'hallway2', x: 500, y: 75 },
            
            // Principal office area
            { area: 'principal_office', x: 175, y: 125 }
        ];
        
        // Initialize known hiding spots
        this.knownHidingSpots = [
            { area: 'hallway1', x: 100, y: 50, name: 'Behind lockers' },
            { area: 'hallway1', x: 700, y: 150, name: 'Storage closet' },
            { area: 'classroom1', x: 50, y: 200, name: 'Under desk' },
            { area: 'cafeteria', x: 150, y: 250, name: 'Kitchen area' },
            { area: 'hallway2', x: 600, y: 25, name: 'Exit door' }
        ];
        
        // Initialize known shortcuts
        this.knownShortcuts = [
            { from: 'hallway1', to: 'classroom1', time: 3 },
            { from: 'hallway1', to: 'cafeteria', time: 5 },
            { from: 'hallway2', to: 'classroom2', time: 4 },
            { from: 'cafeteria', to: 'gym', time: 6 }
        ];
    }

    /**
     * Start teacher pursuit of player
     */
    startPursuit(playerPosition, reason = 'sighting') {
        this.active = true;
        this.state = 'chase';
        this.targetPosition = { ...playerPosition };
        this.lastSeenPosition = { ...playerPosition };
        this.lastSeenTime = Date.now();
        this.lostTimer = 0;
        this.captureTimer = 0;
        
        // Log pursuit start
        this.addTeacherLog(`Started pursuit: ${reason}`);
        
        // Increase aggression temporarily
        this.aggression += 0.2;
        
        // Notify player
        if (this.engine.dialogue) {
            this.engine.dialogue.triggerEvent('teacher_pursuit');
        }
        
        // Update school system
        if (this.engine.school) {
            this.engine.school.teacherPursuit.active = true;
            this.engine.school.teacherPursuit.lastSeen = Date.now();
        }
        
        console.log('Teacher started pursuit!');
    }

    /**
     * Stop teacher pursuit
     */
    stopPursuit(reason = 'timeout') {
        this.active = false;
        this.state = 'patrol';
        this.targetPosition = this.getCurrentPatrolPoint();
        this.lostTimer = 0;
        this.captureTimer = 0;
        this.aggression = Math.max(1, this.aggression - 0.1); // Reduce aggression
        
        this.addTeacherLog(`Stopped pursuit: ${reason}`);
        console.log('Teacher stopped pursuit');
        
        // Update school system
        if (this.engine.school) {
            this.engine.school.teacherPursuit.active = false;
        }
    }

    /**
     * Main AI update loop
     */
    update(deltaTime) {
        if (!this.active) {
            this.updatePatrol(deltaTime);
            return;
        }
        
        const player = this.engine.character.data;
        const playerPosition = this.getPlayerPosition();
        
        // Update teacher stats based on game progress
        this.updateTeacherStats();
        
        // State machine for AI behavior
        switch (this.state) {
            case 'chase':
                this.updateChase(playerPosition, deltaTime);
                break;
            case 'search':
                this.updateSearch(playerPosition, deltaTime);
                break;
            case 'capture':
                this.updateCapture(deltaTime);
                break;
        }
        
        // Check for line of sight
        this.checkLineOfSight(playerPosition);
        
        // Update capture timer
        if (this.captureTimer > 0) {
            this.captureTimer -= deltaTime;
            if (this.captureTimer <= 0) {
                this.attemptCapture();
            }
        }
    }

    /**
     * Update patrol behavior when not pursuing
     */
    updatePatrol(deltaTime) {
        // Move toward current waypoint
        const waypoint = this.getCurrentPatrolPoint();
        this.moveToward(waypoint, deltaTime * 0.3); // Slower patrol speed
        
        // Check if reached waypoint
        if (this.getDistance(this.position, waypoint) < 10) {
            this.advancePatrolWaypoint();
        }
        
        // Periodic suspicion checks
        if (Math.random() < 0.001 * deltaTime) {
            this.checkForSuspiciousActivity();
        }
    }

    /**
     * Update chase behavior
     */
    updateChase(playerPosition, deltaTime) {
        // Calculate optimal pursuit strategy
        const strategy = this.selectPursuitStrategy(playerPosition);
        
        switch (strategy) {
            case 'direct_chase':
                this.directChase(playerPosition, deltaTime);
                break;
            case 'flank':
                this.flankingManeuver(playerPosition, deltaTime);
                break;
            case 'cutoff':
                this.cutoffManeuver(playerPosition, deltaTime);
                break;
        }
        
        // Check if player is in capture range
        const captureRange = 3 + this.intelligence * 0.5;
        if (this.getDistance(this.position, playerPosition) <= captureRange) {
            this.state = 'capture';
            this.captureTimer = 2000; // 2 second capture window
        }
    }

    /**
     * Update search behavior when target is lost
     */
    updateSearch(playerPosition, deltaTime) {
        this.lostTimer += deltaTime;
        
        // Generate search pattern if not exists
        if (this.searchPattern.length === 0) {
            this.generateSearchPattern();
        }
        
        // Execute search pattern
        if (this.searchPattern.length > 0) {
            const searchPoint = this.searchPattern[0];
            this.moveToward(searchPoint, deltaTime * 0.6);
            
            if (this.getDistance(this.position, searchPoint) < 15) {
                this.searchPattern.shift();
            }
        }
        
        // Give up search after duration
        if (this.lostTimer >= this.searchDuration * 1000) {
            this.stopPursuit('search_timeout');
        }
    }

    /**
     * Update capture behavior
     */
    updateCapture(deltaTime) {
        // Capture logic handled in attemptCapture()
        // This state is brief and transitions quickly
        if (this.captureTimer <= 0) {
            this.attemptCapture();
        }
    }

    /**
     * Select optimal pursuit strategy based on situation
     */
    selectPursuitStrategy(playerPosition) {
        const distance = this.getDistance(this.position, playerPosition);
        const intelligence = this.intelligence;
        
        // High intelligence = more complex strategies
        if (intelligence >= 3 && distance > 10) {
            if (Math.random() < 0.6) return 'cutoff';
            if (Math.random() < 0.8) return 'flank';
        }
        
        if (intelligence >= 2 && distance > 8) {
            if (Math.random() < 0.4) return 'flank';
        }
        
        return 'direct_chase';
    }

    /**
     * Direct chase strategy
     */
    directChase(playerPosition, deltaTime) {
        this.targetPosition = { ...playerPosition };
        this.moveToward(this.targetPosition, deltaTime);
    }

    /**
     * Flanking maneuver - try to approach from the side
     */
    flankingManeuver(playerPosition, deltaTime) {
        // Calculate flanking position
        const dx = playerPosition.x - this.position.x;
        const dy = playerPosition.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const normalizedDx = dx / distance;
            const normalizedDy = dy / distance;
            
            // Try to approach from 90 degrees
            const flankX = playerPosition.x - normalizedDy * 5;
            const flankY = playerPosition.y + normalizedDx * 5;
            
            this.targetPosition = { x: flankX, y: flankY };
            this.moveToward(this.targetPosition, deltaTime * 0.8);
        }
    }

    /**
     * Cutoff maneuver - predict and intercept player movement
     */
    cutoffManeuver(playerPosition, deltaTime) {
        // Predict where player will be based on movement pattern
        const predictedPosition = this.predictPlayerMovement(playerPosition);
        this.targetPosition = predictedPosition;
        this.moveToward(this.targetPosition, deltaTime * 1.1); // Faster cutoff speed
    }

    /**
     * Predict player movement based on recent behavior
     */
    predictPlayerMovement(currentPosition) {
        // Simple prediction - player tends to move toward safe areas
        const player = this.engine.character.data;
        const currentArea = this.engine.school.currentArea;
        
        // If player is in dangerous area, predict movement toward library
        if (currentArea === 'cafeteria' || currentArea === 'classroom1') {
            return { x: 300, y: 200 }; // General library direction
        }
        
        // If player is in neutral area, predict random movement
        return {
            x: currentPosition.x + (Math.random() - 0.5) * 20,
            y: currentPosition.y + (Math.random() - 0.5) * 20
        };
    }

    /**
     * Generate search pattern when target is lost
     */
    generateSearchPattern() {
        if (!this.lastSeenPosition) return;
        
        this.searchPattern = [];
        
        // Spiral search pattern around last known position
        const centerX = this.lastSeenPosition.x;
        const centerY = this.lastSeenPosition.y;
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 20 + i * 5;
            this.searchPattern.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius
            });
        }
        
        // Add known hiding spots to search
        this.knownHidingSpots.forEach(spot => {
            if (spot.area === this.engine.school.currentArea) {
                this.searchPattern.push({ x: spot.x, y: spot.y });
            }
        });
    }

    /**
     * Check line of sight to player
     */
    checkLineOfSight(playerPosition) {
        const distance = this.getDistance(this.position, playerPosition);
        
        // Always detect if very close
        if (distance <= this.detectionRange) {
            this.lastSeenPosition = { ...playerPosition };
            this.lastSeenTime = Date.now();
            this.state = 'chase';
            this.active = true;
            return true;
        }
        
        // Check if we can see player within detection range
        if (distance <= this.pursuitRange && this.hasLineOfSight(playerPosition)) {
            this.startPursuit(playerPosition, 'line_of_sight');
            return true;
        }
        
        // Check if we've lost sight of player during chase
        if (this.state === 'chase' && distance > this.pursuitRange) {
            this.state = 'search';
            this.lostTimer = 0;
            this.addTeacherLog('Lost sight of target, starting search');
        }
        
        return false;
    }

    /**
     * Check if line of sight is clear (simplified)
     */
    hasLineOfSight(playerPosition) {
        // Simplified line of sight - in a real implementation, 
        // this would use ray casting to check for obstacles
        const distance = this.getDistance(this.position, playerPosition);
        
        // Reduced detection in certain areas
        const currentArea = this.engine.school.currentArea;
        if (currentArea === 'library') return false; // Teacher doesn't patrol library
        
        return distance < this.pursuitRange * 0.8;
    }

    /**
     * Attempt to capture player
     */
    attemptCapture() {
        const player = this.engine.character.data;
        const playerPosition = this.getPlayerPosition();
        const distance = this.getDistance(this.position, playerPosition);
        
        // Check if capture is still possible
        if (distance > 5) {
            this.state = 'search';
            this.lostTimer = 0;
            return false;
        }
        
        // Determine capture method
        const captureMethod = this.selectCaptureMethod();
        const success = this.executeCapture(captureMethod);
        
        if (success) {
            this.handleSuccessfulCapture(captureMethod);
        } else {
            this.handleFailedCapture(captureMethod);
        }
        
        this.state = 'patrol';
        this.active = false;
        return success;
    }

    /**
     * Select capture method based on situation
     */
    selectCaptureMethod() {
        const random = Math.random();
        let cumulative = 0;
        
        for (const [method, probability] of Object.entries(this.captureProbabilities)) {
            cumulative += probability;
            if (random <= cumulative) {
                return method;
            }
        }
        
        return 'direct_chase'; // Fallback
    }

    /**
     * Execute selected capture method
     */
    executeCapture(method) {
        const player = this.engine.character.data;
        
        // Calculate capture success based on method and situation
        let successChance = 0.7; // Base success rate
        
        switch (method) {
            case 'direct_chase':
                successChance = 0.8;
                break;
            case 'flank':
                successChance = 0.6;
                break;
            case 'trap':
                successChance = 0.9;
                break;
            case 'backup_call':
                successChance = 1.0; // Always succeeds but has cooldown
                break;
        }
        
        // Modify based on teacher stats
        successChance += (this.aggression - 1) * 0.1;
        successChance += (this.intelligence - 1) * 0.05;
        
        // Player can escape if they have certain abilities
        if (player.abilities.includes('Excuse Escape') && Math.random() < 0.3) {
            successChance -= 0.4;
        }
        
        if (player.abilities.includes('Detention Dodge') && Math.random() < 0.2) {
            successChance -= 0.3;
        }
        
        // Hall pass guarantees escape
        if (player.inventory && player.inventory.some(item => item.id === 'hall_pass')) {
            return false;
        }
        
        return Math.random() < successChance;
    }

    /**
     * Handle successful capture
     */
    handleSuccessfulCapture(method) {
        const player = this.engine.character.data;
        
        this.addTeacherLog(`Captured player using ${method}`);
        
        // Apply capture penalties
        player.exp = Math.max(0, player.exp - 25);
        player.health = Math.max(10, player.health - 20);
        player.stress = Math.min(player.maxStress, player.stress + 30);
        
        // Detention penalty increases with capture count
        const captureCount = this.getCaptureCount() + 1;
        const detentionTime = Math.min(30, 10 + captureCount * 5); // 10-30 seconds
        
        // Send to detention
        this.sendToDetention(detentionTime);
        
        // Trigger dialogue
        if (this.engine.dialogue) {
            this.engine.dialogue.triggerEvent('detention');
        }
        
        console.log(`Teacher captured player! Detention time: ${detentionTime}s`);
    }

    /**
     * Handle failed capture attempt
     */
    handleFailedCapture(method) {
        this.addTeacherLog(`Failed capture attempt using ${method}`);
        
        // Temporary aggression increase
        this.aggression += 0.1;
        
        // Brief pause before resuming pursuit
        this.captureTimer = 1000; // 1 second pause
    }

    /**
     * Send player to detention
     */
    sendToDetention(duration) {
        const player = this.engine.character.data;
        
        // Store current area to return to
        const currentArea = this.engine.school.currentArea;
        
        // Change to detention area
        this.engine.school.currentArea = 'detention';
        player.currentArea = 'detention';
        
        // Start detention timer
        this.detentionTimer = setTimeout(() => {
            // Return to previous area
            this.engine.school.currentArea = currentArea;
            player.currentArea = currentArea;
            
            this.addTeacherLog('Player released from detention');
        }, duration * 1000);
        
        // Track capture count
        this.incrementCaptureCount();
    }

    /**
     * Move teacher toward target position
     */
    moveToward(target, deltaTime) {
        const dx = target.x - this.position.x;
        const dy = target.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const speed = this.getCurrentSpeed();
            const normalizedDx = dx / distance;
            const normalizedDy = dy / distance;
            
            this.velocity.x = normalizedDx * speed;
            this.velocity.y = normalizedDy * speed;
            
            // Update position
            this.position.x += this.velocity.x * deltaTime * 0.1;
            this.position.y += this.velocity.y * deltaTime * 0.1;
        }
    }

    /**
     * Get current movement speed based on AI state
     */
    getCurrentSpeed() {
        let baseSpeed = this.speed;
        
        // Speed modifiers based on state
        switch (this.state) {
            case 'patrol':
                baseSpeed *= 0.3;
                break;
            case 'chase':
                baseSpeed *= 1.0;
                break;
            case 'search':
                baseSpeed *= 0.6;
                break;
            case 'capture':
                baseSpeed *= 0.8;
                break;
        }
        
        // Aggression increases speed slightly
        baseSpeed += (this.aggression - 1) * 0.2;
        
        return baseSpeed;
    }

    /**
     * Get current patrol waypoint
     */
    getCurrentPatrolPoint() {
        if (this.patrolPoints.length === 0) return { x: 0, y: 0 };
        return this.patrolPoints[this.currentWaypoint % this.patrolPoints.length];
    }

    /**
     * Advance to next patrol waypoint
     */
    advancePatrolWaypoint() {
        this.currentWaypoint = (this.currentWaypoint + 1) % this.patrolPoints.length;
        this.targetPosition = this.getCurrentPatrolPoint();
    }

    /**
     * Update teacher stats based on game progress
     */
    updateTeacherStats() {
        const week = this.engine.gameData.week;
        
        // Progressive difficulty scaling
        this.intelligence = 1 + (week * 0.2);
        this.speed = 2 + (week * 0.1);
        this.aggression = 1 + (week * 0.15);
        
        // Adjust detection ranges
        this.detectionRange = 8 + (week * 0.5);
        this.pursuitRange = 15 + (week * 1);
    }

    /**
     * Check for suspicious activity while patrolling
     */
    checkForSuspiciousActivity() {
        const player = this.engine.character.data;
        
        // Check if player is in wrong area
        const currentArea = this.engine.school.currentArea;
        if (currentArea === 'detention') {
            this.startPursuit(this.getPlayerPosition(), 'suspicious_activity');
            return;
        }
        
        // Check if player stress level is very high (indicates trouble)
        if (player.stress > 80) {
            if (Math.random() < 0.3) {
                this.startPursuit(this.getPlayerPosition(), 'high_stress_suspicion');
            }
        }
    }

    /**
     * Get player position
     */
    getPlayerPosition() {
        if (this.engine.school) {
            return { ...this.engine.school.playerPosition };
        }
        return { x: 0, y: 0 };
    }

    /**
     * Calculate distance between two points
     */
    getDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Add teacher action to log
     */
    addTeacherLog(message) {
        if (this.engine.ui && this.engine.ui.battleLog) {
            this.engine.ui.battleLog.innerHTML += `<div>[TEACHER] ${message}</div>`;
            this.engine.ui.battleLog.scrollTop = this.engine.ui.battleLog.scrollHeight;
        }
        console.log(`[TEACHER] ${message}`);
    }

    /**
     * Get capture count for progressive penalties
     */
    getCaptureCount() {
        const storageKey = location.pathname + "teacher_capture_count";
        return parseInt(localStorage.getItem(storageKey) || '0');
    }

    /**
     * Increment capture count
     */
    incrementCaptureCount() {
        const count = this.getCaptureCount() + 1;
        const storageKey = location.pathname + "teacher_capture_count";
        localStorage.setItem(storageKey, count.toString());
    }

    /**
     * Reset capture count
     */
    resetCaptureCount() {
        const storageKey = location.pathname + "teacher_capture_count";
        localStorage.setItem(storageKey, '0');
    }

    /**
     * Get teacher status for UI display
     */
    getTeacherStatus() {
        return {
            active: this.active,
            state: this.state,
            intelligence: this.intelligence,
            speed: this.speed,
            aggression: this.aggression,
            position: { ...this.position },
            targetPosition: { ...this.targetPosition },
            detectionRange: this.detectionRange,
            pursuitRange: this.pursuitRange,
            captureCount: this.getCaptureCount()
        };
    }

    /**
     * Render teacher to canvas
     */
    render(ctx) {
        if (!ctx || !this.engine.canvas) return;
        
        const canvas = this.engine.canvas;
        const x = this.position.x * (canvas.width / 800);
        const y = this.position.y * (canvas.height / 600);
        
        // Teacher sprite (threatening appearance)
        ctx.fillStyle = this.getTeacherColor();
        ctx.fillRect(x - 20, y - 20, 40, 40);
        
        // Teacher face
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(x - 15, y - 15, 30, 20);
        
        // Eyes (angry)
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(x - 10, y - 10, 4, 4);
        ctx.fillRect(x + 6, y - 10, 4, 4);
        
        // State indicator
        if (this.active) {
            ctx.fillStyle = '#e74c3c';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('TEACHER!', x, y - 30);
            
            // Detection range indicator
            if (this.state === 'chase') {
                ctx.strokeStyle = 'rgba(231, 76, 60, 0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, this.detectionRange * 8, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    /**
     * Get teacher color based on state
     */
    getTeacherColor() {
        switch (this.state) {
            case 'patrol': return '#7f8c8d';
            case 'suspicious': return '#f39c12';
            case 'chase': return '#e74c3c';
            case 'capture': return '#8e44ad';
            default: return '#7f8c8d';
        }
    }

    /**
     * Save teacher AI data
     */
    save() {
        const storageKey = location.pathname + "teacher_ai_data";
        try {
            const teacherData = {
                active: this.active,
                state: this.state,
                position: this.position,
                targetPosition: this.targetPosition,
                velocity: this.velocity,
                intelligence: this.intelligence,
                speed: this.speed,
                aggression: this.aggression,
                currentWaypoint: this.currentWaypoint,
                captureCount: this.getCaptureCount()
            };
            localStorage.setItem(storageKey, JSON.stringify(teacherData));
        } catch (error) {
            console.error('Failed to save teacher AI data:', error);
        }
    }

    /**
     * Load teacher AI data
     */
    load() {
        const storageKey = location.pathname + "teacher_ai_data";
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                this.active = data.active || false;
                this.state = data.state || 'patrol';
                this.position = data.position || { x: 0, y: 0 };
                this.targetPosition = data.targetPosition || { x: 0, y: 0 };
                this.velocity = data.velocity || { x: 0, y: 0 };
                this.intelligence = data.intelligence || 1;
                this.speed = data.speed || 2;
                this.aggression = data.aggression || 1;
                this.currentWaypoint = data.currentWaypoint || 0;
                return true;
            }
        } catch (error) {
            console.error('Failed to load teacher AI data:', error);
        }
        return false;
    }
}
