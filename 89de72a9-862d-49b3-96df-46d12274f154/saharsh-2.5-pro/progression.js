// ============================================
// PROGRESSION SYSTEM
// Handles player leveling, skills, and unlocks
// ============================================

import { ENGAGEMENT_CONFIG, PROGRESSION_DATA } from './constants.js';

export class ProgressionSystem {
    constructor() {
        this.playerLevel = 1;
        this.playerXP = 0;
        this.xpToNextLevel = ENGAGEMENT_CONFIG.XP_PER_LEVEL;
        this.skillPoints = 0;
        this.unlockedSkills = new Set();
        this.learnedSkills = new Map(); // skillId -> level
        
        this.weaponsUnlocked = new Set(['colt_45']);
        this.horsesUnlocked = new Set(['morgan']);
        
        this.stats = {
            totalKills: 0,
            totalHeadshots: 0,
            totalMissions: 0,
            totalDamage: 0,
            totalMoneyEarned: 0,
            totalDistanceTraveled: 0,
            totalPlayTime: 0,
            maxCombo: 0,
            longestHeadshot: 0
        };
    }
    
    loadFromSave(saveData) {
        if (saveData.progression) {
            Object.assign(this, saveData.progression);
        }
    }
    
    saveToState() {
        return {
            playerLevel: this.playerLevel,
            playerXP: this.playerXP,
            xpToNextLevel: this.xpToNextLevel,
            skillPoints: this.skillPoints,
            unlockedSkills: Array.from(this.unlockedSkills),
            learnedSkills: Object.fromEntries(this.learnedSkills),
            weaponsUnlocked: Array.from(this.weaponsUnlocked),
            horsesUnlocked: Array.from(this.horsesUnlocked),
            stats: this.stats
        };
    }
    
    addXP(amount, source = 'mission') {
        const oldLevel = this.playerLevel;
        this.playerXP += amount;
        
        // Check for level up
        while (this.playerXP >= this.xpToNextLevel && this.playerLevel < ENGAGEMENT_CONFIG.MAX_PLAYER_LEVEL) {
            this.playerXP -= this.xpToNextLevel;
            this.levelUp();
        }
        
        // Check for level rewards
        if (this.playerLevel > oldLevel) {
            this.checkLevelRewards(oldLevel, this.playerLevel);
        }
        
        // Update stats
        this.stats.totalPlayTime += 0.1; // Approximate
        
        return { leveledUp: this.playerLevel > oldLevel, newLevel: this.playerLevel };
    }
    
    levelUp() {
        this.playerLevel++;
        this.skillPoints += 2; // 2 skill points per level
        this.xpToNextLevel = Math.floor(ENGAGEMENT_CONFIG.XP_PER_LEVEL * Math.pow(1.1, this.playerLevel - 1));
        
        // Unlock items based on level
        this.unlockLevelItems();
        
        return this.playerLevel;
    }
    
    checkLevelRewards(oldLevel, newLevel) {
        for (let level = oldLevel + 1; level <= newLevel; level++) {
            if (ENGAGEMENT_CONFIG.LEVEL_REWARDS[level]) {
                const reward = ENGAGEMENT_CONFIG.LEVEL_REWARDS[level];
                this.grantReward(reward);
                
                // Show reward notification
                this.showRewardNotification(level, reward);
            }
        }
    }
    
    unlockLevelItems() {
        // Unlock weapons
        PROGRESSION_DATA.WEAPON_UNLOCKS.forEach(weapon => {
            if (weapon.unlockLevel && weapon.unlockLevel <= this.playerLevel) {
                this.weaponsUnlocked.add(weapon.id);
            }
        });
        
        // Unlock horses
        PROGRESSION_DATA.HORSE_UNLOCKS.forEach(horse => {
            if (horse.unlockLevel && horse.unlockLevel <= this.playerLevel) {
                this.horsesUnlocked.add(horse.id);
            }
        });
    }
    
    grantReward(reward) {
        switch (reward.type) {
            case 'weapon':
                this.weaponsUnlocked.add(reward.id);
                break;
            case 'horse':
                this.horsesUnlocked.add(reward.id);
                break;
            case 'ability':
                this.unlockedSkills.add(reward.id);
                break;
            case 'title':
                // Store title
                break;
        }
    }
    
    showRewardNotification(level, reward) {
        // This would trigger a UI notification
        console.log(`Level ${level} Reward: ${JSON.stringify(reward)}`);
    }
    
    learnSkill(skillId, category) {
        const skill = PROGRESSION_DATA.SKILL_TREE[category]?.find(s => s.id === skillId);
        if (!skill) return false;
        
        const currentLevel = this.learnedSkills.get(skillId) || 0;
        if (currentLevel >= skill.maxLevel) return false;
        
        const cost = skill.cost * (currentLevel + 1);
        if (this.skillPoints >= cost) {
            this.skillPoints -= cost;
            this.learnedSkills.set(skillId, currentLevel + 1);
            return true;
        }
        
        return false;
    }
    
    getSkillLevel(skillId) {
        return this.learnedSkills.get(skillId) || 0;
    }
    
    hasSkill(skillId) {
        return this.learnedSkills.has(skillId);
    }
    
    // Stat tracking methods
    recordKill(isHeadshot = false) {
        this.stats.totalKills++;
        if (isHeadshot) this.stats.totalHeadshots++;
    }
    
    recordMissionComplete() {
        this.stats.totalMissions++;
    }
    
    recordDamage(amount) {
        this.stats.totalDamage += amount;
    }
    
    recordMoneyEarned(amount) {
        this.stats.totalMoneyEarned += amount;
    }
    
    // Calculate stat bonuses from progression
    getStatBonuses() {
        const bonuses = {
            health: 0,
            stamina: 0,
            damage: 1.0,
            accuracy: 0,
            reloadSpeed: 1.0,
            moveSpeed: 1.0,
            deadEyeDuration: 1.0,
            deadEyeRegen: 1.0
        };
        
        // Apply skill bonuses
        for (const [skillId, level] of this.learnedSkills) {
            this.applySkillBonus(skillId, level, bonuses);
        }
        
        // Apply level-based bonuses
        bonuses.health += (this.playerLevel - 1) * 2; // +2 HP per level
        bonuses.stamina += (this.playerLevel - 1) * 3; // +3 stamina per level
        
        return bonuses;
    }
    
    applySkillBonus(skillId, level, bonuses) {
        switch (skillId) {
            case 'max_health':
                bonuses.health += 20 * level;
                break;
            case 'max_stamina':
                bonuses.stamina += 25 * level;
                break;
            case 'fast_reload':
                bonuses.reloadSpeed *= 1 - (0.25 * level);
                break;
            case 'steady_aim':
                bonuses.accuracy += 0.2 * level;
                break;
            case 'dead_eye_duration':
                bonuses.deadEyeDuration *= 1 + (0.5 * level);
                break;
            case 'dead_eye_regen':
                bonuses.deadEyeRegen *= 1 + (0.3 * level);
                break;
            // Add more skill bonuses as needed
        }
    }
    
    // Get player's progression summary
    getProgressionSummary() {
        return {
            level: this.playerLevel,
            xp: this.playerXP,
            xpToNext: this.xpToNextLevel,
            xpProgress: (this.playerXP / this.xpToNextLevel) * 100,
            skillPoints: this.skillPoints,
            totalSkills: this.learnedSkills.size,
            weaponsUnlocked: this.weaponsUnlocked.size,
            horsesUnlocked: this.horsesUnlocked.size,
            stats: this.stats
        };
    }
}
