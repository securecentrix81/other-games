/**
 * scoring.js
 * Handles score calculation, combo tracking, health management, and accuracy
 * Dependencies: constants.js (SCORE_VALUES, GRADES, MOD_MULTIPLIERS)
 * Exports: ScoreManager class
 */

import { SCORE_VALUES, GRADES, HIT_RESULTS, MOD_FLAGS, MOD_MULTIPLIERS } from './constants.js';

/**
 * ScoreManager - Manages all scoring aspects of gameplay
 */
export class ScoreManager {
    constructor() {
        // Core scoring values
        /** @type {number} Current score */
        this.score = 0;
        
        /** @type {number} Current combo */
        this.combo = 0;
        
        /** @type {number} Maximum combo achieved */
        this.maxCombo = 0;
        
        // Health (0-100)
        /** @type {number} Current health percentage */
        this.health = 100;
        
        /** @type {number} Minimum health to not fail */
        this.minHealth = 0;
        
        /** @type {boolean} Whether player has failed */
        this.failed = false;
        
        // Hit counts
        /** @type {number} Perfect (300) hit count */
        this.count300 = 0;
        
        /** @type {number} Great (100) hit count */
        this.count100 = 0;
        
        /** @type {number} Good (50) hit count */
        this.count50 = 0;
        
        /** @type {number} Miss count */
        this.countMiss = 0;
        
        // Slider-specific counts
        /** @type {number} Slider ticks hit */
        this.sliderTicksHit = 0;
        
        /** @type {number} Slider ends hit */
        this.sliderEndsHit = 0;
        
        // Spinner bonus score
        /** @type {number} Bonus score from spinners */
        this.spinnerBonus = 0;
        
        // Accuracy (0-100)
        /** @type {number} Current accuracy percentage */
        this.accuracy = 100;
        
        // Mod multiplier
        /** @type {number} Score multiplier from mods */
        this.modMultiplier = 1.0;
        
        // Difficulty multiplier (based on map difficulty)
        /** @type {number} Difficulty multiplier */
        this.difficultyMultiplier = 1.0;
        
        // Total objects for grade calculation
        /** @type {number} Total hit objects in map */
        this.totalObjects = 0;
        
        // HP drain rate
        /** @type {number} HP drain per second */
        this.hpDrainRate = 0;
        
        // Track last update time for HP drain
        /** @type {number} Last health update timestamp */
        this.lastHealthUpdate = 0;
        
        // No-fail mode
        /** @type {boolean} No-fail mod active */
        this.noFailActive = false;
    }

    /**
     * Reset all scoring values for a new game
     */
    reset() {
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.health = 100;
        this.failed = false;
        
        this.count300 = 0;
        this.count100 = 0;
        this.count50 = 0;
        this.countMiss = 0;
        
        this.sliderTicksHit = 0;
        this.sliderEndsHit = 0;
        this.spinnerBonus = 0;
        
        this.accuracy = 100;
        this.lastHealthUpdate = 0;
    }

    /**
     * Set mod multiplier based on active mods
     * @param {number} activeMods - Bitfield of active mods
     */
    setModMultiplier(activeMods) {
        this.modMultiplier = 1.0;
        
        // Apply mod multipliers
        for (const [modName, modFlag] of Object.entries(MOD_FLAGS)) {
            if (activeMods & modFlag) {
                const multiplier = MOD_MULTIPLIERS[modName];
                if (multiplier !== undefined) {
                    this.modMultiplier *= multiplier;
                }
            }
        }
        
        // Check for no-fail
        this.noFailActive = (activeMods & MOD_FLAGS.NO_FAIL) !== 0;
    }

    /**
     * Set difficulty multiplier based on beatmap difficulty
     * @param {Object} beatmap - Parsed beatmap
     */
    setDifficultyMultiplier(beatmap) {
        const cs = beatmap.circleSize || 4;
        const od = beatmap.overallDifficulty || 5;
        const hp = beatmap.hpDrainRate || 5;
        
        // osu! difficulty multiplier formula (simplified)
        // Ensure minimum multiplier of 1 to prevent division issues
        this.difficultyMultiplier = Math.max(1, Math.round(
            (hp + cs + od + Math.max(0, cs - 5) * 2) / 6
        ));
        
        // Calculate HP drain rate (scaled for playability)
        this.hpDrainRate = Math.max(0, hp * 0.5); // HP lost per second during active play
    }

    /**
     * Set total objects for the map
     * @param {number} count 
     */
    setTotalObjects(count) {
        this.totalObjects = count;
    }

    /**
     * Process a hit result
     * @param {string} result - HIT_RESULTS value (PERFECT, GREAT, GOOD, MISS)
     * @param {boolean} isSlider - Whether this is a slider result
     * @param {boolean} isSpinner - Whether this is a spinner result
     * @param {number} spinnerBonus - Bonus score from spinner (if applicable)
     */
    processHit(result, isSlider = false, isSpinner = false, spinnerBonus = 0) {
        // Get base score for this result
        const baseScore = SCORE_VALUES[result] || 0;
        
        // Calculate combo bonus (similar to osu! formula)
        // Score = Base * (1 + (Combo * Difficulty * Mod) / 25)
        const comboBonus = 1 + (this.combo * this.difficultyMultiplier * this.modMultiplier) / 25;
        
        // Calculate final score for this hit
        const hitScore = Math.floor(baseScore * comboBonus * this.modMultiplier);
        this.score += hitScore;
        
        // Update combo
        if (result === HIT_RESULTS.MISS) {
            this.combo = 0;
        } else {
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
        }
        
        // Update hit counts
        switch (result) {
            case HIT_RESULTS.PERFECT:
                this.count300++;
                break;
            case HIT_RESULTS.GREAT:
                this.count100++;
                break;
            case HIT_RESULTS.GOOD:
                this.count50++;
                break;
            case HIT_RESULTS.MISS:
                this.countMiss++;
                break;
        }
        
        // Update health
        this.updateHealth(result);
        
        // Add spinner bonus if applicable
        if (isSpinner && spinnerBonus > 0) {
            this.spinnerBonus += spinnerBonus;
            this.score += spinnerBonus;
        }
        
        // Recalculate accuracy
        this.calculateAccuracy();
        
        // Check for failure
        if (this.health <= 0 && !this.noFailActive) {
            this.failed = true;
        }
    }

    /**
     * Process slider tick hit
     */
    processSliderTick() {
        this.sliderTicksHit++;
        this.score += 10 * this.modMultiplier;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        
        // Small health gain
        this.health = Math.min(100, this.health + 1);
    }

    /**
     * Process slider tick miss
     */
    processSliderTickMiss() {
        this.combo = 0;
        this.health = Math.max(0, this.health - 2);
        
        if (this.health <= 0 && !this.noFailActive) {
            this.failed = true;
        }
    }

    /**
     * Process slider end hit
     */
    processSliderEnd() {
        this.sliderEndsHit++;
        this.score += 30 * this.modMultiplier;
        
        // Small health gain
        this.health = Math.min(100, this.health + 2);
    }

    /**
     * Update health based on hit result
     * @param {string} result 
     */
    updateHealth(result) {
        let healthChange = 0;
        
        switch (result) {
            case HIT_RESULTS.PERFECT:
                healthChange = 5;
                break;
            case HIT_RESULTS.GREAT:
                healthChange = 2;
                break;
            case HIT_RESULTS.GOOD:
                healthChange = 1;
                break;
            case HIT_RESULTS.MISS:
                healthChange = -8;
                break;
        }
        
        this.health = Math.max(0, Math.min(100, this.health + healthChange));
    }

    /**
     * Apply passive HP drain over time
     * @param {number} deltaTime - Time since last update in ms
     * @param {number} hpDrainRate - HP drain rate from beatmap
     */
    applyHealthDrain(deltaTime, hpDrainRate = null) {
        const drain = hpDrainRate !== null ? hpDrainRate : this.hpDrainRate;
        
        // Convert deltaTime to seconds
        const deltaSeconds = deltaTime / 1000;
        
        // Apply drain (scaled down for playability)
        const healthLoss = drain * deltaSeconds * 0.5;
        
        this.health = Math.max(0, this.health - healthLoss);
        
        // Check for failure
        if (this.health <= 0 && !this.noFailActive) {
            this.failed = true;
        }
    }

    /**
     * Calculate current accuracy
     */
    calculateAccuracy() {
        const totalHits = this.count300 + this.count100 + this.count50 + this.countMiss;
        
        if (totalHits === 0) {
            this.accuracy = 100;
            return;
        }
        
        // Weighted accuracy formula (osu! standard)
        // 300 = 100%, 100 = 33.33%, 50 = 16.67%, miss = 0%
        const weightedScore = (this.count300 * 300 + this.count100 * 100 + this.count50 * 50) / (totalHits * 300);
        
        this.accuracy = weightedScore * 100;
    }

    /**
     * Calculate the final grade
     * @returns {string} Grade letter (SS, S, A, B, C, D)
     */
    calculateGrade() {
        const totalHits = this.count300 + this.count100 + this.count50 + this.countMiss;
        
        if (totalHits === 0) {
            return GRADES.D;
        }
        
        const percent300 = this.count300 / totalHits;
        const percent50 = this.count50 / totalHits;
        
        // SS: 100% 300s
        if (this.count300 === totalHits) {
            return GRADES.SS;
        }
        
        // S: >90% 300s, <1% 50s, no misses
        if (percent300 > 0.9 && percent50 < 0.01 && this.countMiss === 0) {
            return GRADES.S;
        }
        
        // A: >80% 300s and no misses, OR >90% 300s
        if ((percent300 > 0.8 && this.countMiss === 0) || percent300 > 0.9) {
            return GRADES.A;
        }
        
        // B: >70% 300s and no misses, OR >80% 300s
        if ((percent300 > 0.7 && this.countMiss === 0) || percent300 > 0.8) {
            return GRADES.B;
        }
        
        // C: >60% 300s
        if (percent300 > 0.6) {
            return GRADES.C;
        }
        
        // D: Everything else
        return GRADES.D;
    }

    /**
     * Check if player has failed
     * @returns {boolean}
     */
    isFailed() {
        return this.failed && !this.noFailActive;
    }

    /**
     * Get complete result data for display
     * @returns {Object}
     */
    getResultData() {
        return {
            score: this.score,
            combo: this.combo,
            maxCombo: this.maxCombo,
            accuracy: this.accuracy,
            grade: this.calculateGrade(),
            count300: this.count300,
            count100: this.count100,
            count50: this.count50,
            countMiss: this.countMiss,
            sliderTicksHit: this.sliderTicksHit,
            sliderEndsHit: this.sliderEndsHit,
            spinnerBonus: this.spinnerBonus,
            totalScore: this.score,
            modMultiplier: this.modMultiplier,
            failed: this.failed
        };
    }

    /**
     * Get formatted score string (with leading zeros)
     * @returns {string}
     */
    getFormattedScore() {
        return String(this.score).padStart(8, '0');
    }

    /**
     * Get formatted accuracy string
     * @returns {string}
     */
    getFormattedAccuracy() {
        return `${this.accuracy.toFixed(2)}%`;
    }

    /**
     * Get formatted combo string
     * @returns {string}
     */
    getFormattedCombo() {
        return this.combo > 0 ? `${this.combo}x` : '';
    }

    /**
     * Get health bar color based on current health
     * @returns {string} CSS color
     */
    getHealthColor() {
        if (this.health > 50) {
            return '#88ff88'; // Green
        } else if (this.health > 25) {
            return '#ffaa00'; // Orange
        } else {
            return '#ff4444'; // Red
        }
    }

    /**
     * Get grade color
     * @param {string} grade 
     * @returns {string} CSS color
     */
    static getGradeColor(grade) {
        switch (grade) {
            case GRADES.SS:
                return '#ffcc22'; // Gold
            case GRADES.S:
                return '#ffdd55'; // Yellow
            case GRADES.A:
                return '#88ff88'; // Green
            case GRADES.B:
                return '#66aaff'; // Blue
            case GRADES.C:
                return '#aa66ff'; // Purple
            case GRADES.D:
                return '#ff6666'; // Red
            default:
                return '#ffffff';
        }
    }

    /**
     * Save high score to localStorage
     * @param {string} beatmapId 
     * @param {number} mods 
     */
    saveHighScore(beatmapId, mods) {
        const storagePrefix = location.pathname;
        const key = `${storagePrefix}highScores`;
        
        try {
            const existingData = JSON.parse(localStorage.getItem(key) || '{}');
            const scoreKey = `${beatmapId}_${mods}`;
            
            const currentData = {
                score: this.score,
                accuracy: this.accuracy,
                grade: this.calculateGrade(),
                maxCombo: this.maxCombo,
                mods: mods,
                date: Date.now()
            };
            
            // Only save if better score
            if (!existingData[scoreKey] || this.score > existingData[scoreKey].score) {
                existingData[scoreKey] = currentData;
                localStorage.setItem(key, JSON.stringify(existingData));
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error saving high score:', error);
            return false;
        }
    }

    /**
     * Load high score from localStorage
     * @param {string} beatmapId 
     * @param {number} mods 
     * @returns {Object|null}
     */
    static loadHighScore(beatmapId, mods) {
        const storagePrefix = location.pathname;
        const key = `${storagePrefix}highScores`;
        
        try {
            const existingData = JSON.parse(localStorage.getItem(key) || '{}');
            const scoreKey = `${beatmapId}_${mods}`;
            
            return existingData[scoreKey] || null;
        } catch (error) {
            console.error('Error loading high score:', error);
            return null;
        }
    }

    /**
     * Get all high scores
     * @returns {Object}
     */
    static getAllHighScores() {
        const storagePrefix = location.pathname;
        const key = `${storagePrefix}highScores`;
        
        try {
            return JSON.parse(localStorage.getItem(key) || '{}');
        } catch (error) {
            console.error('Error loading high scores:', error);
            return {};
        }
    }

    /**
     * Clear all high scores
     */
    static clearHighScores() {
        const storagePrefix = location.pathname;
        const key = `${storagePrefix}highScores`;
        
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error clearing high scores:', error);
        }
    }
}

// Create singleton instance
export const scoreManager = new ScoreManager();

export default ScoreManager;
