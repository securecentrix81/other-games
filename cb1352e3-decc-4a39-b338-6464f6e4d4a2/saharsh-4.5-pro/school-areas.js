/**
 * School Areas System - Navigation and Location Management
 * 
 * Purpose: Manages all school locations, navigation, area-specific content, and encounters
 * Dependencies: This file requires game-engine.js and character-system.js to be loaded first
 * Exports: window.SchoolSystem - School navigation and area management class
 */

class SchoolSystem {
    constructor(engine) {
        this.engine = engine;
        this.currentArea = 'hallway1';
        this.previousArea = null;
        this.areas = this.initializeAreas();
        this.randomEncounterChance = 0.15;
        this.encounterCooldown = 0;
        this.lastEncounterTime = 0;
        this.areaVisited = new Set(['hallway1']);
        this.teacherPursuit = {
            active: false,
            strength: 1,
            speed: 2,
            detectionRange: 8,
            lastSeen: null,
            pursuitTimer: 0
        };
        
        // Player position within areas
        this.playerPosition = { x: 0, y: 0 };
        this.areaBounds = {};
        
        this.initializeAreaBounds();
    }

    /**
     * Initialize all school areas with complete data
     */
    initializeAreas() {
        return {
            'hallway1': {
                name: 'Main Hallway',
                type: 'neutral',
                description: 'The main artery of the school, constantly bustling with students',
                icon: '🏫',
                color: '#95a5a6',
                enemies: ['stress_monster', 'anxiety_wisp'],
                items: ['pencil', 'energy_drink'],
                npcs: [],
                safe: false,
                bossArea: false,
                minEnemies: 1,
                maxEnemies: 2,
                timeLimit: null,
                backgroundMusic: 'hallway',
                ambientSounds: ['lockers', 'footsteps'],
                lighting: 'fluorescent',
                difficulty: 1,
                connections: ['classroom1', 'classroom2', 'library', 'cafeteria'],
                hazards: ['wet_floor'],
                interactiveObjects: ['drinking_fountain', 'bulletin_board', 'lockers']
            },
            
            'classroom1': {
                name: 'Math Class',
                type: 'battle',
                description: 'Room 101 - Ms. Johnson\'s mathematics classroom filled with numerical nightmares',
                icon: '📐',
                color: '#3498db',
                enemies: ['homework_creature', 'test_anxiety', 'calculator_ghost'],
                items: ['calculator', 'mechanical_pencil', 'study_guide'],
                npcs: ['math_tutor'],
                safe: false,
                bossArea: false,
                minEnemies: 2,
                maxEnemies: 4,
                timeLimit: 180, // 3 minutes
                backgroundMusic: 'tension',
                ambientSounds: ['chalkboard', 'clock_ticking'],
                lighting: 'classroom',
                difficulty: 2,
                connections: ['hallway1', 'hallway2'],
                hazards: ['math_problems', 'pop_quiz'],
                interactiveObjects: ['chalkboard', 'desk', 'textbook']
            },
            
            'classroom2': {
                name: 'Science Lab',
                type: 'battle',
                description: 'Lab 205 - Mr. Chen\'s chemistry laboratory with bubbling concoctions',
                icon: '🧪',
                color: '#2ecc71',
                enemies: ['cauldron_monster', 'lab_accident', 'periodic_table_beast'],
                items: ['health_potion', 'focus_cookie', 'smart_pill'],
                npcs: ['lab_partner'],
                safe: false,
                bossArea: false,
                minEnemies: 1,
                maxEnemies: 3,
                timeLimit: 150,
                backgroundMusic: 'mysterious',
                ambientSounds: ['bubbling', 'gas_hiss'],
                lighting: 'lab_uv',
                difficulty: 3,
                connections: ['hallway1', 'hallway2'],
                hazards: ['chemical_spill', 'broken_equipment'],
                interactiveObjects: ['periodic_table', 'safety_shower', 'eyewash_station']
            },
            
            'library': {
                name: 'Library',
                type: 'safe',
                description: 'Central Library - A peaceful sanctuary filled with knowledge and wisdom',
                icon: '📚',
                color: '#f39c12',
                enemies: [],
                items: ['study_guide', 'flashcards', 'highlighters', 'notebook'],
                npcs: ['librarian', 'study_group'],
                safe: true,
                bossArea: false,
                minEnemies: 0,
                maxEnemies: 0,
                timeLimit: null,
                backgroundMusic: 'peaceful',
                ambientSounds: ['pages_turning', 'whispering'],
                lighting: 'warm',
                difficulty: 0,
                connections: ['hallway1', 'hallway2'],
                hazards: [],
                interactiveObjects: ['catalog', 'reading_area', 'computer_lab']
            },
            
            'cafeteria': {
                name: 'Cafeteria',
                type: 'danger',
                description: 'School Cafeteria - A chaotic battleground of food fights and lunch ladies',
                icon: '🍕',
                color: '#e74c3c',
                enemies: ['lunch_monster', 'cafeteria_lady', 'food_fight_chaos', 'mystery_meat_beast'],
                items: ['pizza_slice', 'energy_bar', 'mystery_meat'],
                npcs: ['lunch_monitor'],
                safe: false,
                bossArea: false,
                minEnemies: 2,
                maxEnemies: 5,
                timeLimit: 120,
                backgroundMusic: 'chaotic',
                ambientSounds: ['conversation', 'clattering', 'cash_register'],
                lighting: 'bright',
                difficulty: 3,
                connections: ['hallway1', 'gym'],
                hazards: ['spilled_milk', 'slippery_floor', 'food_allergies'],
                interactiveObjects: ['vending_machine', 'microwave', 'nutrition_chart']
            },
            
            'gym': {
                name: 'Gymnasium',
                type: 'boss',
                description: 'Main Gym - The arena where physical education nightmares come to life',
                icon: '🏀',
                color: '#9b59b6',
                enemies: ['sports_stress', 'team_captain_ghost', 'gym_teacher_shadow'],
                items: ['lucky_charm', 'stress_pill', 'energy_drink'],
                npcs: ['team_captain'],
                safe: false,
                bossArea: true,
                minEnemies: 1,
                maxEnemies: 1,
                timeLimit: 300,
                backgroundMusic: 'epic_boss',
                ambientSounds: ['bouncing_ball', 'whistle', 'cheering'],
                lighting: 'stadium',
                difficulty: 5,
                connections: ['cafeteria', 'hallway2'],
                hazards: ['slippery_floor', 'sports_equipment'],
                interactiveObjects: ['basketball_hoop', 'bleachers', 'scoreboard']
            },
            
            'hallway2': {
                name: 'East Wing',
                type: 'neutral',
                description: 'East Wing Corridor - Quieter hallway leading to specialized classrooms',
                icon: '🚪',
                color: '#34495e',
                enemies: ['locker_monster', 'fire_drill_chaos'],
                items: ['pencil', 'notebook', 'hall_pass'],
                npcs: [],
                safe: false,
                bossArea: false,
                minEnemies: 1,
                maxEnemies: 2,
                timeLimit: null,
                backgroundMusic: 'mysterious',
                ambientSounds: ['air_conditioning', 'distant_voices'],
                lighting: 'dim',
                difficulty: 2,
                connections: ['classroom1', 'classroom2', 'principal_office', 'gym'],
                hazards: ['fire_drill', 'principal_patrol'],
                interactiveObjects: ['exit_signs', 'water_fountain', 'security_camera']
            },
            
            'principal_office': {
                name: 'Principal\'s Office',
                type: 'boss',
                description: 'Principal\'s Office - The final boss area where academic authority reigns supreme',
                icon: '👔',
                color: '#8e44ad',
                enemies: ['principal_shadow', 'disciplinary_committee', 'final_exam_terror'],
                items: ['teacher_approval', 'hall_pass', 'smart_pill'],
                npcs: ['principal'],
                safe: false,
                bossArea: true,
                minEncounters: 1,
                maxEncounters: 1,
                timeLimit: 600,
                backgroundMusic: 'final_boss',
                ambientSounds: ['phone_ringing', 'typing', 'filing_cabinet'],
                lighting: 'office',
                difficulty: 8,
                connections: ['hallway2'],
                hazards: ['detention_trap', 'parent_call'],
                interactiveObjects: ['desk', 'file_cabinet', 'intercom']
            },
            
            'detention': {
                name: 'Detention Room',
                type: 'punishment',
                description: 'Detention - A dark room where time stands still and regret grows',
                icon: '⏰',
                color: '#2c3e50',
                enemies: ['boredom_demon', 'regret_shadow', 'time_waster'],
                items: [],
                npcs: ['detention_monitor'],
                safe: false,
                bossArea: false,
                minEnemies: 1,
                maxEnemies: 3,
                timeLimit: 300,
                backgroundMusic: 'ominous',
                ambientSounds: ['clock_ticking', 'sighing'],
                lighting: 'fluorescent_flicker',
                difficulty: 4,
                connections: [],
                hazards: ['boredom', 'isolation'],
                interactiveObjects: ['desk', 'clock', 'poster']
            }
        };
    }

    /**
     * Initialize area bounds for player positioning
     */
    initializeAreaBounds() {
        this.areaBounds = {
            'hallway1': { width: 800, height: 200 },
            'classroom1': { width: 400, height: 300 },
            'classroom2': { width: 400, height: 300 },
            'library': { width: 600, height: 400 },
            'cafeteria': { width: 500, height: 350 },
            'gym': { width: 600, height: 400 },
            'hallway2': { width: 600, height: 150 },
            'principal_office': { width: 350, height: 250 },
            'detention': { width: 300, height: 200 }
        };
    }

    /**
     * Check if current area is safe
     */
    isSafeArea() {
        const area = this.areas[this.currentArea];
        return area && area.safe;
    }

    /**
     * Get current area data
     */
    getCurrentArea() {
        return this.areas[this.currentArea];
    }

    /**
     * Travel to a new area
     */
    travelToArea(areaId) {
        if (!this.areas[areaId]) {
            console.warn(`Area ${areaId} does not exist`);
            return false;
        }

        // Check if area is unlocked
        const player = this.engine.character.data;
        if (!this.isAreaUnlocked(areaId)) {
            // Special unlock condition for level 67
            if (player.level >= 67 && areaId === 'level_67_secret') {
                this.unlockArea(areaId);
                this.addMessage('A secret passage opens at level 67 mastery!');
            } else {
                this.addMessage(`Area ${areaId} is locked. Need to unlock first.`);
                return false;
            }
        }

        // Handle teacher pursuit
        if (this.teacherPursuit.active && !this.areas[areaId].safe) {
            // Teacher continues pursuit
            this.teacherPursuit.pursuitTimer += 10;
        }

        const oldArea = this.currentArea;
        this.previousArea = oldArea;
        this.currentArea = areaId;
        this.areaVisited.add(areaId);
        
        // Reset player position in new area
        this.resetPlayerPosition();
        
        // Check for random encounters
        this.checkForEncounters();
        
        // Update game state
        this.engine.gameData.school.currentArea = areaId;
        this.engine.gameData.school.visitedAreas.push(areaId);
        
        console.log(`Traveled from ${oldArea} to ${areaId}`);
        return true;
    }

    /**
     * Reset player position when entering new area
     */
    resetPlayerPosition() {
        const bounds = this.areaBounds[this.currentArea] || { width: 400, height: 300 };
        this.playerPosition.x = bounds.width / 2;
        this.playerPosition.y = bounds.height / 2;
    }

    /**
     * Check if area is unlocked
     */
    isAreaUnlocked(areaId) {
        const player = this.engine.character.data;
        return player.unlockedAreas && player.unlockedAreas.includes(areaId);
    }

    /**
     * Unlock new area
     */
    unlockArea(areaId) {
        const player = this.engine.character.data;
        if (!player.unlockedAreas) {
            player.unlockedAreas = ['hallway1'];
        }
        
        if (!player.unlockedAreas.includes(areaId)) {
            player.unlockedAreas.push(areaId);
            this.addMessage(`Unlocked new area: ${this.areas[areaId].name}!`);
            return true;
        }
        return false;
    }

    /**
     * Handle player movement within area
     */
    handleInput(e) {
        const player = this.engine.character.data;
        const bounds = this.areaBounds[this.currentArea] || { width: 400, height: 300 };
        const speed = player.stats.speed * 0.1;
        
        let moved = false;
        
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.playerPosition.y = Math.max(20, this.playerPosition.y - speed);
                moved = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.playerPosition.y = Math.min(bounds.height - 20, this.playerPosition.y + speed);
                moved = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.playerPosition.x = Math.max(20, this.playerPosition.x - speed);
                moved = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.playerPosition.x = Math.min(bounds.width - 20, this.playerPosition.x + speed);
                moved = true;
                break;
        }
        
        if (moved) {
            this.checkTeacherDetection();
            this.updateInteractiveObjects();
        }
    }

    /**
     * Check if teacher can detect player
     */
    checkTeacherDetection() {
        if (!this.teacherPursuit.active) return;
        
        const distance = this.calculateDistanceToTeacher();
        
        if (distance <= this.teacherPursuit.detectionRange) {
            this.teacherPursuit.lastSeen = Date.now();
            this.startTeacherPursuit();
        }
    }

    /**
     * Calculate distance to teacher (simplified)
     */
    calculateDistanceToTeacher() {
        // Simplified distance calculation
        return Math.random() * 10; // Placeholder
    }

    /**
     * Start teacher pursuit
     */
    startTeacherPursuit() {
        this.teacherPursuit.active = true;
        this.teacherPursuit.pursuitTimer = 0;
        this.addMessage('Teacher is chasing you!');
        
        // Start pursuit timer
        this.pursuitInterval = setInterval(() => {
            this.updateTeacherPursuit();
        }, 1000);
    }

    /**
     * Update teacher pursuit mechanics
     */
    updateTeacherPursuit() {
        if (!this.teacherPursuit.active) return;
        
        this.teacherPursuit.pursuitTimer++;
        this.teacherPursuit.strength += 0.1;
        
        // Increase difficulty over time
        if (this.teacherPursuit.pursuitTimer > 30) {
            this.triggerTeacherEncounter();
        }
    }

    /**
     * Trigger teacher encounter
     */
    triggerTeacherEncounter() {
        clearInterval(this.pursuitInterval);
        this.teacherPursuit.active = false;
        
        this.addMessage('Teacher caught you! Detention time...');
        this.sendToDetention();
    }

    /**
     * Send player to detention
     */
    sendToDetention() {
        const player = this.engine.character.data;
        
        // Lose progress
        player.exp = Math.max(0, player.exp - 25);
        player.health = Math.max(10, player.health - 20);
        player.stress = Math.min(player.maxStress, player.stress + 30);
        
        // Temporary area lock
        this.currentArea = 'detention';
        
        // Time penalty
        setTimeout(() => {
            this.escapeDetention();
        }, 10000); // 10 seconds in detention
    }

    /**
     * Escape from detention
     */
    escapeDetention() {
        this.currentArea = this.previousArea || 'hallway1';
        this.addMessage('Detention over. Back to class!');
        
        // Update UI
        this.engine.updateUI();
    }

    /**
     * Check for random encounters
     */
    checkForEncounters() {
        const area = this.areas[this.currentArea];
        
        // Safe areas have no encounters
        if (area.safe) {
            return;
        }
        
        // Check cooldown
        if (this.encounterCooldown > 0) {
            this.encounterCooldown--;
            return;
        }
        
        // Random encounter chance
        if (Math.random() < this.randomEncounterChance) {
            this.startRandomEncounter();
        }
    }

    /**
     * Start random encounter
     */
    startRandomEncounter() {
        const area = this.areas[this.currentArea];
        
        if (area.enemies.length === 0) return;
        
        const enemyType = area.enemies[Math.floor(Math.random() * area.enemies.length)];
        const enemy = this.createAreaEnemy(enemyType, area.difficulty);
        
        this.addMessage(`A ${enemy.name} appears!`);
        this.encounterCooldown = 10; // 10 turns cooldown
        
        // Start battle
        setTimeout(() => {
            this.engine.startBattle(enemy);
        }, 1000);
    }

    /**
     * Create enemy for area encounter
     */
    createAreaEnemy(enemyType, difficulty) {
        const enemyTemplates = {
            'stress_monster': { 
                name: 'Stress Monster', 
                health: 30 + difficulty * 10, 
                attack: 12 + difficulty * 2, 
                defense: 8 + difficulty,
                intelligence: 5,
                speed: 10 + difficulty
            },
            'anxiety_wisp': { 
                name: 'Anxiety Wisp', 
                health: 25 + difficulty * 8, 
                attack: 15 + difficulty * 3, 
                defense: 5 + difficulty,
                intelligence: 8,
                speed: 15 + difficulty * 2
            },
            'homework_creature': { 
                name: 'Homework Creature', 
                health: 35 + difficulty * 12, 
                attack: 10 + difficulty * 2, 
                defense: 12 + difficulty * 2,
                intelligence: 15 + difficulty * 3,
                speed: 8 + difficulty
            },
            'test_anxiety': { 
                name: 'Test Anxiety', 
                health: 40 + difficulty * 15, 
                attack: 18 + difficulty * 4, 
                defense: 10 + difficulty,
                intelligence: 12 + difficulty * 2,
                speed: 12 + difficulty
            },
            'calculator_ghost': { 
                name: 'Calculator Ghost', 
                health: 50 + difficulty * 20, 
                attack: 20 + difficulty * 5, 
                defense: 15 + difficulty * 3,
                intelligence: 20 + difficulty * 4,
                speed: 14 + difficulty * 2
            },
            'cauldron_monster': { 
                name: 'Cauldron Monster', 
                health: 45 + difficulty * 18, 
                attack: 16 + difficulty * 3, 
                defense: 18 + difficulty * 4,
                intelligence: 10 + difficulty * 2,
                speed: 6 + difficulty
            },
            'lab_accident': { 
                name: 'Lab Accident', 
                health: 60 + difficulty * 25, 
                attack: 22 + difficulty * 6, 
                defense: 12 + difficulty * 2,
                intelligence: 8 + difficulty,
                speed: 10 + difficulty * 2
            },
            'periodic_table_beast': { 
                name: 'Periodic Table Beast', 
                health: 70 + difficulty * 30, 
                attack: 25 + difficulty * 7, 
                defense: 20 + difficulty * 5,
                intelligence: 25 + difficulty * 6,
                speed: 8 + difficulty
            },
            'lunch_monster': { 
                name: 'Lunch Monster', 
                health: 55 + difficulty * 22, 
                attack: 19 + difficulty * 4, 
                defense: 14 + difficulty * 3,
                intelligence: 6,
                speed: 12 + difficulty * 2
            },
            'cafeteria_lady': { 
                name: 'Cafeteria Lady', 
                health: 80 + difficulty * 35, 
                attack: 30 + difficulty * 8, 
                defense: 25 + difficulty * 6,
                intelligence: 15 + difficulty * 3,
                speed: 5 + difficulty
            },
            'food_fight_chaos': { 
                name: 'Food Fight Chaos', 
                health: 65 + difficulty * 28, 
                attack: 24 + difficulty * 6, 
                defense: 16 + difficulty * 4,
                intelligence: 4,
                speed: 16 + difficulty * 3
            },
            'mystery_meat_beast': { 
                name: 'Mystery Meat Beast', 
                health: 90 + difficulty * 40, 
                attack: 35 + difficulty * 10, 
                defense: 30 + difficulty * 8,
                intelligence: 2,
                speed: 4 + difficulty
            },
            'sports_stress': { 
                name: 'Sports Stress', 
                health: 100 + difficulty * 45, 
                attack: 40 + difficulty * 12, 
                defense: 35 + difficulty * 10,
                intelligence: 8 + difficulty * 2,
                speed: 18 + difficulty * 4
            },
            'team_captain_ghost': { 
                name: 'Team Captain Ghost', 
                health: 120 + difficulty * 50, 
                attack: 45 + difficulty * 15, 
                defense: 40 + difficulty * 12,
                intelligence: 12 + difficulty * 3,
                speed: 20 + difficulty * 5
            },
            'gym_teacher_shadow': { 
                name: 'Gym Teacher Shadow', 
                health: 150 + difficulty * 60, 
                attack: 50 + difficulty * 18, 
                defense: 45 + difficulty * 15,
                intelligence: 15 + difficulty * 4,
                speed: 15 + difficulty * 3
            },
            'locker_monster': { 
                name: 'Locker Monster', 
                health: 40 + difficulty * 15, 
                attack: 14 + difficulty * 3, 
                defense: 20 + difficulty * 5,
                intelligence: 3,
                speed: 7 + difficulty
            },
            'fire_drill_chaos': { 
                name: 'Fire Drill Chaos', 
                health: 35 + difficulty * 12, 
                attack: 16 + difficulty * 4, 
                defense: 8 + difficulty,
                intelligence: 5,
                speed: 25 + difficulty * 6
            }
        };
        
        const template = enemyTemplates[enemyType];
        if (!template) {
            return this.createAreaEnemy('stress_monster', difficulty);
        }
        
        return {
            ...template,
            level: this.engine.character.data.level + Math.floor(difficulty / 2),
            expReward: Math.floor(template.health / 3) + difficulty * 5,
            moneyReward: difficulty * 2,
            drops: this.generateLootForArea(this.currentArea, difficulty),
            ai: this.getAIForEnemyType(enemyType),
            isBoss: area.bossArea
        };
    }

    /**
     * Generate loot for specific area
     */
    generateLootForArea(areaId, difficulty) {
        const area = this.areas[areaId];
        if (!area || !area.items) return [];
        
        const lootTable = [];
        area.items.forEach(itemId => {
            lootTable.push({
                item: itemId,
                chance: Math.max(0.1, 0.5 - difficulty * 0.05)
            });
        });
        
        return lootTable;
    }

    /**
     * Get AI behavior for enemy type
     */
    getAIForEnemyType(enemyType) {
        const aiTypes = {
            'stress_monster': { type: 'aggressive', preferAttack: 0.8, preferDefend: 0.1, preferItem: 0.1 },
            'anxiety_wisp': { type: 'cunning', preferAttack: 0.6, preferDefend: 0.2, preferItem: 0.2 },
            'homework_creature': { type: 'balanced', preferAttack: 0.5, preferDefend: 0.3, preferItem: 0.2 },
            'test_anxiety': { type: 'defensive', preferAttack: 0.4, preferDefend: 0.4, preferItem: 0.2 },
            'lunch_monster': { type: 'aggressive', preferAttack: 0.9, preferDefend: 0.05, preferItem: 0.05 },
            'sports_stress': { type: 'aggressive', preferAttack: 0.85, preferDefend: 0.1, preferItem: 0.05 }
        };
        
        return aiTypes[enemyType] || aiTypes['stress_monster'];
    }

    /**
     * Update interactive objects in current area
     */
    updateInteractiveObjects() {
        const area = this.areas[this.currentArea];
        if (!area || !area.interactiveObjects) return;
        
        // Check for interactions with nearby objects
        // This is simplified - could be expanded with actual object positioning
        area.interactiveObjects.forEach(object => {
            // Placeholder for object interaction logic
        });
    }

    /**
     * Get available exits from current area
     */
    getAvailableExits() {
        const area = this.areas[this.currentArea];
        if (!area || !area.connections) return [];
        
        return area.connections.filter(connectionId => {
            return this.isAreaUnlocked(connectionId);
        });
    }

    /**
     * Update school system
     */
    update(deltaTime) {
        // Update teacher pursuit
        if (this.teacherPursuit.active) {
            this.updateTeacherPursuit();
        }
        
        // Update encounter cooldown
        if (this.encounterCooldown > 0) {
            this.encounterCooldown--;
        }
        
        // Handle area-specific updates
        this.updateAreaSpecific(deltaTime);
    }

    /**
     * Update area-specific mechanics
     */
    updateAreaSpecific(deltaTime) {
        const area = this.areas[this.currentArea];
        if (!area) return;
        
        switch (area.type) {
            case 'battle':
                this.handleBattleArea(deltaTime);
                break;
            case 'danger':
                this.handleDangerArea(deltaTime);
                break;
            case 'boss':
                this.handleBossArea(deltaTime);
                break;
            case 'punishment':
                this.handlePunishmentArea(deltaTime);
                break;
        }
    }

    /**
     * Handle battle area mechanics
     */
    handleBattleArea(deltaTime) {
        // Increase stress in battle areas
        const stressIncrease = deltaTime * 0.01;
        this.engine.character.increaseStress(stressIncrease);
        
        // Check for time limits
        if (this.areas[this.currentArea].timeLimit) {
            // Handle time limit logic here
        }
    }

    /**
     * Handle danger area mechanics
     */
    handleDangerArea(deltaTime) {
        // Random events in dangerous areas
        if (Math.random() < 0.001 * deltaTime) {
            this.triggerRandomDangerEvent();
        }
    }

    /**
     * Handle boss area mechanics
     */
    handleBossArea(deltaTime) {
        // Boss areas have special mechanics
        if (this.currentArea === 'principal_office') {
            this.handlePrincipalOfficeMechanics(deltaTime);
        }
    }

    /**
     * Handle principal office special mechanics
     */
    handlePrincipalOfficeMechanics(deltaTime) {
        // Periodic phone calls that increase stress
        if (Math.random() < 0.0005 * deltaTime) {
            this.engine.character.increaseStress(5);
            this.addMessage('Phone rings in the distance...');
        }
    }

    /**
     * Handle punishment area mechanics
     */
    handlePunishmentArea(deltaTime) {
        // Boredom effects in detention
        this.engine.character.increaseStress(deltaTime * 0.005);
    }

    /**
     * Trigger random danger event
     */
    triggerRandomDangerEvent() {
        const events = [
            { message: 'Fire alarm sounds!', effect: () => this.startFireDrill() },
            { message: 'Principal spotted!', effect: () => this.startPrincipalChase() },
            { message: 'Unexpected pop quiz!', effect: () => this.triggerPopQuiz() }
        ];
        
        const event = events[Math.floor(Math.random() * events.length)];
        this.addMessage(event.message);
        event.effect();
    }

    /**
     * Start fire drill event
     */
    startFireDrill() {
        // Temporary area change or special mechanics
        this.addMessage('Everyone must evacuate! Find safety!');
    }

    /**
     * Start principal chase event
     */
    startPrincipalChase() {
        this.teacherPursuit.active = true;
        this.teacherPursuit.strength = 2;
        this.addMessage('Principal is after you!');
    }

    /**
     * Trigger pop quiz event
     */
    triggerPopQuiz() {
        const player = this.engine.character.data;
        const damage = Math.max(5, 20 - player.stats.intelligence);
        player.health -= damage;
        this.addMessage(`Pop quiz stress causes ${damage} damage!`);
    }

    /**
     * Add message to game log
     */
    addMessage(message) {
        if (this.engine.ui.battleLog) {
            this.engine.ui.battleLog.innerHTML += `<div>${message}</div>`;
            this.engine.ui.battleLog.scrollTop = this.engine.ui.battleLog.scrollHeight;
        }
        console.log(message);
    }

    /**
     * Render current area
     */
    render(ctx) {
        if (!ctx || !this.engine.canvas) return;
        
        const canvas = this.engine.canvas;
        const area = this.areas[this.currentArea];
        
        if (!area) return;
        
        // Render area background
        this.renderAreaBackground(ctx, area);
        
        // Render interactive objects
        this.renderInteractiveObjects(ctx, area);
        
        // Render player
        this.renderPlayer(ctx);
        
        // Render area info
        this.renderAreaInfo(ctx, area);
    }

    /**
     * Render area background
     */
    renderAreaBackground(ctx, area) {
        const canvas = this.engine.canvas;
        
        // Area background color
        ctx.fillStyle = area.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Area pattern or texture
        this.renderAreaPattern(ctx, area);
        
        // Lighting effects
        this.renderLighting(ctx, area);
    }

    /**
     * Render area pattern
     */
    renderAreaPattern(ctx, area) {
        // Simple patterns for different area types
        switch (area.type) {
            case 'library':
                this.renderLibraryPattern(ctx);
                break;
            case 'cafeteria':
                this.renderCafeteriaPattern(ctx);
                break;
            case 'gym':
                this.renderGymPattern(ctx);
                break;
        }
    }

    /**
     * Render library-specific pattern
     */
    renderLibraryPattern(ctx) {
        ctx.fillStyle = 'rgba(243, 156, 18, 0.1)';
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(50 + i * 100, 50, 20, 200);
        }
    }

    /**
     * Render cafeteria-specific pattern
     */
    renderCafeteriaPattern(ctx) {
        ctx.fillStyle = 'rgba(231, 76, 60, 0.1)';
        ctx.beginPath();
        ctx.arc(100, 100, 30, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Render gym-specific pattern
     */
    renderGymPattern(ctx) {
        ctx.strokeStyle = 'rgba(155, 89, 182, 0.3)';
        ctx.lineWidth = 3;
        ctx.strokeRect(50, 50, 300, 150);
    }

    /**
     * Render lighting effects
     */
    renderLighting(ctx, area) {
        const canvas = this.engine.canvas;
        
        switch (area.lighting) {
            case 'fluorescent':
                this.renderFluorescentLighting(ctx, canvas);
                break;
            case 'warm':
                this.renderWarmLighting(ctx, canvas);
                break;
            case 'dim':
                this.renderDimLighting(ctx, canvas);
                break;
        }
    }

    /**
     * Render fluorescent lighting
     */
    renderFluorescentLighting(ctx, canvas) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    /**
     * Render warm lighting
     */
    renderWarmLighting(ctx, canvas) {
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width / 2
        );
        gradient.addColorStop(0, 'rgba(243, 156, 18, 0.1)');
        gradient.addColorStop(1, 'rgba(243, 156, 18, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    /**
     * Render dim lighting
     */
    renderDimLighting(ctx, canvas) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    /**
     * Render interactive objects
     */
    renderInteractiveObjects(ctx, area) {
        if (!area.interactiveObjects) return;
        
        ctx.fillStyle = '#95a5a6';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        
        area.interactiveObjects.forEach((object, index) => {
            const x = 100 + index * 120;
            const y = 100;
            ctx.fillText(this.getObjectIcon(object), x, y);
        });
    }

    /**
     * Get icon for interactive object
     */
    getObjectIcon(object) {
        const icons = {
            'drinking_fountain': '🚰',
            'bulletin_board': '📋',
            'lockers': '🔒',
            'chalkboard': '⬛',
            'desk': '🪑',
            'textbook': '📚',
            'periodic_table': '⚗️',
            'safety_shower': '🚿',
            'eyewash_station': '👁️',
            'catalog': '📇',
            'reading_area': '📖',
            'computer_lab': '💻',
            'vending_machine': '🥤',
            'microwave': '📱',
            'nutrition_chart': '📊',
            'basketball_hoop': '🏀',
            'bleachers': '🪑',
            'scoreboard': '📺',
            'exit_signs': '🚪',
            'water_fountain': '🚰',
            'security_camera': '📹',
            'desk': '🪑',
            'file_cabinet': '🗄️',
            'intercom': '📢',
            'clock': '🕐',
            'poster': '🖼️'
        };
        
        return icons[object] || '❓';
    }

    /**
     * Render player in current area
     */
    renderPlayer(ctx) {
        if (!ctx || !this.engine.canvas) return;
        
        const canvas = this.engine.canvas;
        const x = this.playerPosition.x * (canvas.width / 800);
        const y = this.playerPosition.y * (canvas.height / 600);
        
        // Player sprite
        ctx.fillStyle = '#3498db';
        ctx.fillRect(x - 15, y - 15, 30, 30);
        
        // Player name
        ctx.fillStyle = '#ecf0f1';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Eric', x, y - 20);
    }

    /**
     * Render area information
     */
    renderAreaInfo(ctx, area) {
        const canvas = this.engine.canvas;
        
        // Area name
        ctx.fillStyle = '#ecf0f1';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${area.icon} ${area.name}`, canvas.width / 2, 30);
        
        // Area description
        ctx.font = '14px Arial';
        ctx.fillText(area.description, canvas.width / 2, 55);
        
        // Teacher pursuit indicator
        if (this.teacherPursuit.active) {
            ctx.fillStyle = '#e74c3c';
            ctx.font = '16px Arial';
            ctx.fillText('⚠️ TEACHER PURSUIT!', canvas.width / 2, 80);
        }
    }

    /**
     * Update map display with current status
     */
    updateMapDisplay() {
        const areas = document.querySelectorAll('.map-area');
        areas.forEach(area => {
            const areaId = area.dataset.area;
            const areaData = this.areas[areaId];
            
            if (areaData) {
                // Remove locked class if area is unlocked
                if (this.isAreaUnlocked(areaId)) {
                    area.classList.remove('locked');
                } else {
                    area.classList.add('locked');
                }
                
                // Update status indicator
                const statusElement = area.querySelector('.area-status');
                if (areaData.safe) {
                    statusElement.className = 'area-status safe';
                } else if (areaData.type === 'danger') {
                    statusElement.className = 'area-status danger';
                } else if (areaData.bossArea) {
                    statusElement.className = 'area-status boss';
                } else {
                    statusElement.className = 'area-status';
                }
                
                // Highlight current area
                if (areaId === this.currentArea) {
                    area.style.borderColor = '#f39c12';
                    area.style.boxShadow = '0 0 10px rgba(243, 156, 18, 0.5)';
                } else {
                    area.style.borderColor = '';
                    area.style.boxShadow = '';
                }
            }
        });
    }

    /**
     * Get area completion status
     */
    getAreaStatus(areaId) {
        const area = this.areas[areaId];
        if (!area) return 'unknown';
        
        if (this.areaVisited.has(areaId)) return 'visited';
        if (this.isAreaUnlocked(areaId)) return 'unlocked';
        return 'locked';
    }

    /**
     * Calculate area difficulty rating
     */
    getAreaDifficulty(areaId) {
        const area = this.areas[areaId];
        return area ? area.difficulty : 1;
    }

    /**
     * Get total areas in game
     */
    getTotalAreas() {
        return Object.keys(this.areas).length;
    }

    /**
     * Get completed areas count
     */
    getCompletedAreasCount() {
        return this.areaVisited.size;
    }

    /**
     * Check if player has completed all areas
     */
    hasCompletedAllAreas() {
        return this.areaVisited.size >= this.getTotalAreas();
    }

    /**
     * Save school data
     */
    save() {
        const storageKey = location.pathname + "school_data";
        try {
            const schoolData = {
                currentArea: this.currentArea,
                previousArea: this.previousArea,
                areaVisited: Array.from(this.areaVisited),
                teacherPursuit: this.teacherPursuit,
                playerPosition: this.playerPosition,
                encounterCooldown: this.encounterCooldown
            };
            localStorage.setItem(storageKey, JSON.stringify(schoolData));
        } catch (error) {
            console.error('Failed to save school data:', error);
        }
    }

    /**
     * Load school data
     */
    load() {
        const storageKey = location.pathname + "school_data";
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const schoolData = JSON.parse(saved);
                this.currentArea = schoolData.currentArea || 'hallway1';
                this.previousArea = schoolData.previousArea;
                this.areaVisited = new Set(schoolData.areaVisited || ['hallway1']);
                this.teacherPursuit = schoolData.teacherPursuit || this.teacherPursuit;
                this.playerPosition = schoolData.playerPosition || { x: 0, y: 0 };
                this.encounterCooldown = schoolData.encounterCooldown || 0;
                return true;
            }
        } catch (error) {
            console.error('Failed to load school data:', error);
        }
        return false;
    }
}
