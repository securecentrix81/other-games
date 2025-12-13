/**
 * mods.js
 * Handles game modifiers (Easy, Hard Rock, Double Time, Hidden, etc.)
 * Dependencies: constants.js (must be loaded first)
 * Exports: ModManager class, MOD_DEFINITIONS
 */

import { MOD_FLAGS, MOD_MULTIPLIERS } from './constants.js';

/**
 * Mod definitions with flags, multipliers, and incompatibility rules
 */
export const MOD_DEFINITIONS = [
    {
        id: 'EZ',
        name: 'Easy',
        flag: MOD_FLAGS.EASY,
        multiplier: MOD_MULTIPLIERS.EASY,
        description: 'Reduces overall difficulty - larger circles, more forgiving HP drain, less precision required.',
        incompatible: ['HR'],
        category: 'difficulty_reduction'
    },
    {
        id: 'NF',
        name: 'No Fail',
        flag: MOD_FLAGS.NO_FAIL,
        multiplier: MOD_MULTIPLIERS.NO_FAIL,
        description: 'You can\'t fail, no matter what.',
        incompatible: ['SD', 'PF', 'AT', 'CN'],
        category: 'difficulty_reduction'
    },
    {
        id: 'HT',
        name: 'Half Time',
        flag: MOD_FLAGS.HALF_TIME,
        multiplier: MOD_MULTIPLIERS.HALF_TIME,
        description: 'Slows down the song by 25%.',
        incompatible: ['DT', 'NC'],
        category: 'difficulty_reduction'
    },
    {
        id: 'HR',
        name: 'Hard Rock',
        flag: MOD_FLAGS.HARD_ROCK,
        multiplier: MOD_MULTIPLIERS.HARD_ROCK,
        description: 'Everything just got a bit harder... CS+30%, AR+40%, OD+40%, HP+40%, and vertical flip.',
        incompatible: ['EZ'],
        category: 'difficulty_increase'
    },
    {
        id: 'DT',
        name: 'Double Time',
        flag: MOD_FLAGS.DOUBLE_TIME,
        multiplier: MOD_MULTIPLIERS.DOUBLE_TIME,
        description: 'Speeds up the song by 50%.',
        incompatible: ['HT', 'NC'],
        category: 'difficulty_increase'
    },
    {
        id: 'HD',
        name: 'Hidden',
        flag: MOD_FLAGS.HIDDEN,
        multiplier: MOD_MULTIPLIERS.HIDDEN,
        description: 'Play with no approach circles and fading notes.',
        incompatible: [],
        category: 'difficulty_increase'
    },
    {
        id: 'FL',
        name: 'Flashlight',
        flag: MOD_FLAGS.FLASHLIGHT,
        multiplier: MOD_MULTIPLIERS.FLASHLIGHT,
        description: 'Restricted view area that follows your cursor.',
        incompatible: [],
        category: 'difficulty_increase'
    },
    {
        id: 'RX',
        name: 'Relax',
        flag: MOD_FLAGS.RELAX,
        multiplier: 0,
        description: 'You don\'t need to click. Give your clicking/tapping fingers a break.',
        incompatible: ['AP', 'AT', 'CN'],
        category: 'automation',
        unranked: true
    },
    {
        id: 'AP',
        name: 'Autopilot',
        flag: MOD_FLAGS.AUTOPILOT,
        multiplier: 0,
        description: 'Automatic cursor movement - just tap to the beat.',
        incompatible: ['RX', 'AT', 'CN'],
        category: 'automation',
        unranked: true
    },
    {
        id: 'AT',
        name: 'Auto',
        flag: MOD_FLAGS.AUTO,
        multiplier: 0,
        description: 'Watch a perfect automated play through the song.',
        incompatible: ['RX', 'AP', 'NF', 'CN'],
        category: 'automation',
        unranked: true
    }
];

/**
 * ModManager class handles enabling/disabling mods and applying their effects
 */
export class ModManager {
    constructor() {
        // Active mods as a bitfield
        this.activeMods = 0;
        
        // Create lookup map for quick access
        this.modMap = new Map();
        for (const mod of MOD_DEFINITIONS) {
            this.modMap.set(mod.id, mod);
            this.modMap.set(mod.flag, mod);
        }
    }
    
    /**
     * Toggle a mod on/off
     * @param {number|string} flagOrId - Mod flag or ID
     * @returns {boolean} - Whether the mod is now active
     */
    toggleMod(flagOrId) {
        const mod = this.modMap.get(flagOrId);
        if (!mod) return false;
        
        if (this.isModActive(mod.flag)) {
            // Remove mod
            this.activeMods &= ~mod.flag;
            return false;
        } else {
            // Remove incompatible mods first
            for (const incompatId of mod.incompatible) {
                const incompatMod = this.modMap.get(incompatId);
                if (incompatMod) {
                    this.activeMods &= ~incompatMod.flag;
                }
            }
            // Add mod
            this.activeMods |= mod.flag;
            return true;
        }
    }
    
    /**
     * Enable a specific mod
     */
    enableMod(flagOrId) {
        const mod = this.modMap.get(flagOrId);
        if (!mod) return;
        
        // Remove incompatible mods
        for (const incompatId of mod.incompatible) {
            const incompatMod = this.modMap.get(incompatId);
            if (incompatMod) {
                this.activeMods &= ~incompatMod.flag;
            }
        }
        
        this.activeMods |= mod.flag;
    }
    
    /**
     * Disable a specific mod
     */
    disableMod(flagOrId) {
        const mod = this.modMap.get(flagOrId);
        if (!mod) return;
        
        this.activeMods &= ~mod.flag;
    }
    
    /**
     * Check if a mod is currently active
     */
    isModActive(flagOrId) {
        const mod = this.modMap.get(flagOrId);
        if (!mod) return false;
        return (this.activeMods & mod.flag) !== 0;
    }
    
    /**
     * Get all currently active mods
     * @returns {Array} - Array of active mod definitions
     */
    getActiveMods() {
        return MOD_DEFINITIONS.filter(mod => this.isModActive(mod.flag));
    }
    
    /**
     * Get active mod IDs as array
     */
    getActiveModIds() {
        return this.getActiveMods().map(m => m.id);
    }
    
    /**
     * Clear all mods
     */
    clearMods() {
        this.activeMods = 0;
    }
    
    /**
     * Apply difficulty modifications based on active mods
     * @param {Object} beatmap - Beatmap with CS, AR, OD, HP values
     * @returns {Object} - Modified difficulty values
     */
    applyDifficultyMods(beatmap) {
        let cs = beatmap.circleSize || 4;
        let ar = beatmap.approachRate || beatmap.overallDifficulty || 5;
        let od = beatmap.overallDifficulty || 5;
        let hp = beatmap.hpDrainRate || 5;
        
        // Easy mod: reduce all stats
        if (this.isModActive(MOD_FLAGS.EASY)) {
            cs = Math.max(0, cs - 2);
            ar = Math.max(0, ar - 2);
            od = Math.max(0, od - 2);
            hp = Math.max(0, hp - 2);
        }
        
        // Hard Rock mod: increase all stats
        if (this.isModActive(MOD_FLAGS.HARD_ROCK)) {
            cs = Math.min(10, cs * 1.3);
            ar = Math.min(10, ar * 1.4);
            od = Math.min(10, od * 1.4);
            hp = Math.min(10, hp * 1.4);
        }
        
        // Speed mods affect AR and OD perception
        const speedMult = this.getSpeedMultiplier();
        if (speedMult !== 1.0) {
            // Adjust AR for speed change
            // AR affects approach time, which is inversely affected by speed
            ar = this.adjustARForSpeed(ar, speedMult);
            
            // OD timing windows are also affected by speed
            od = this.adjustODForSpeed(od, speedMult);
        }
        
        // Clamp all values
        cs = Math.max(0, Math.min(10, cs));
        ar = Math.max(0, Math.min(11, ar)); // AR can go slightly above 10 with DT
        od = Math.max(0, Math.min(11, od));
        hp = Math.max(0, Math.min(10, hp));
        
        return { cs, ar, od, hp };
    }
    
    /**
     * Adjust AR for speed multiplier
     */
    adjustARForSpeed(ar, speedMult) {
        // Calculate approach time in ms
        let approachTime;
        if (ar < 5) {
            approachTime = 1800 - 120 * ar;
        } else {
            approachTime = 1200 - 150 * (ar - 5);
        }
        
        // Apply speed multiplier
        approachTime /= speedMult;
        
        // Convert back to AR
        let newAR;
        if (approachTime > 1200) {
            newAR = (1800 - approachTime) / 120;
        } else {
            newAR = 5 + (1200 - approachTime) / 150;
        }
        
        return Math.max(0, Math.min(11, newAR));
    }
    
    /**
     * Adjust OD for speed multiplier
     */
    adjustODForSpeed(od, speedMult) {
        // 300 window = 80 - 6*OD ms
        let window300 = 80 - 6 * od;
        
        // Apply speed multiplier
        window300 /= speedMult;
        
        // Convert back to OD
        let newOD = (80 - window300) / 6;
        
        return Math.max(0, Math.min(11, newOD));
    }
    
    /**
     * Get the speed multiplier based on active mods
     * @returns {number} - Speed multiplier (1.0 = normal, 1.5 = DT, 0.75 = HT)
     */
    getSpeedMultiplier() {
        if (this.isModActive(MOD_FLAGS.DOUBLE_TIME)) {
            return 1.5;
        }
        if (this.isModActive(MOD_FLAGS.HALF_TIME)) {
            return 0.75;
        }
        return 1.0;
    }
    
    /**
     * Get the score multiplier based on active mods
     * @returns {number} - Combined score multiplier
     */
    getScoreMultiplier() {
        let multiplier = 1.0;
        
        for (const mod of this.getActiveMods()) {
            // Unranked mods give 0 multiplier
            if (mod.unranked) {
                return 0;
            }
            multiplier *= mod.multiplier;
        }
        
        return multiplier;
    }
    
    /**
     * Check if the play is ranked (no unranked mods active)
     */
    isRanked() {
        return !this.getActiveMods().some(mod => mod.unranked);
    }
    
    /**
     * Check specific mod states
     */
    isEasyActive() { return this.isModActive(MOD_FLAGS.EASY); }
    isHardRockActive() { return this.isModActive(MOD_FLAGS.HARD_ROCK); }
    isHiddenActive() { return this.isModActive(MOD_FLAGS.HIDDEN); }
    isFlashlightActive() { return this.isModActive(MOD_FLAGS.FLASHLIGHT); }
    isDoubleTimeActive() { return this.isModActive(MOD_FLAGS.DOUBLE_TIME); }
    isHalfTimeActive() { return this.isModActive(MOD_FLAGS.HALF_TIME); }
    isNoFailActive() { return this.isModActive(MOD_FLAGS.NO_FAIL); }
    isRelaxActive() { return this.isModActive(MOD_FLAGS.RELAX); }
    isAutopilotActive() { return this.isModActive(MOD_FLAGS.AUTOPILOT); }
    isAutoActive() { return this.isModActive(MOD_FLAGS.AUTO); }
    
    /**
     * Check if Hard Rock vertical flip should be applied
     */
    shouldFlipVertically() {
        return this.isModActive(MOD_FLAGS.HARD_ROCK);
    }
    
    /**
     * Get autoplay mode based on mods
     * @returns {string} - 'none', 'auto', 'relax', or 'autopilot'
     */
    getAutoplayMode() {
        if (this.isAutoActive()) return 'auto';
        if (this.isRelaxActive()) return 'relax';
        if (this.isAutopilotActive()) return 'autopilot';
        return 'none';
    }
    
    /**
     * Serialize active mods for storage
     */
    serialize() {
        return this.activeMods;
    }
    
    /**
     * Deserialize mods from storage
     */
    deserialize(value) {
        this.activeMods = value || 0;
    }
    
    /**
     * Get mod string for display (e.g., "HDDT")
     */
    getModString() {
        const ids = this.getActiveModIds();
        return ids.length > 0 ? ids.join('') : 'None';
    }
    
    /**
     * Get mod info by ID
     */
    getModInfo(id) {
        return this.modMap.get(id) || null;
    }
    
    /**
     * Get all mod definitions
     */
    getAllMods() {
        return MOD_DEFINITIONS;
    }
    
    /**
     * Get mods by category
     */
    getModsByCategory(category) {
        return MOD_DEFINITIONS.filter(mod => mod.category === category);
    }
    
    /**
     * Check if any automation mod is active
     */
    isAnyAutomationActive() {
        return this.isAutoActive() || this.isRelaxActive() || this.isAutopilotActive();
    }
    
    /**
     * Set mods from a bitfield (e.g., from saved data)
     */
    setMods(bitfield) {
        this.activeMods = bitfield || 0;
    }
    
    /**
     * Clone current mod state
     */
    clone() {
        const newManager = new ModManager();
        newManager.activeMods = this.activeMods;
        return newManager;
    }
    
    /**
     * Get effective HP drain multiplier based on mods
     */
    getHPDrainMultiplier() {
        if (this.isNoFailActive()) return 0;
        if (this.isEasyActive()) return 0.5;
        if (this.isHardRockActive()) return 1.4;
        return 1.0;
    }
}

export default ModManager;
