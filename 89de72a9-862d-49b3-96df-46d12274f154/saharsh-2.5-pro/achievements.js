// ============================================
// ACHIEVEMENT SYSTEM
// Tracks and awards player achievements
// ============================================

import { ACHIEVEMENT_DATA } from './constants.js';

export class AchievementSystem {
    constructor(progressionSystem) {
        this.progression = progressionSystem;
        this.achievements = new Map();
        this.completedAchievements = new Set();
        
        // Initialize achievements
        Object.values(ACHIEVEMENT_DATA).forEach(achievement => {
            this.achievements.set(achievement.id, {
                ...achievement,
                progress: 0,
                completed: false,
                unlockedAt: null
            });
        });
    }
    
    loadFromSave(saveData) {
        if (saveData.achievements) {
            saveData.achievements.forEach(achievement => {
                if (this.achievements.has(achievement.id)) {
                    const existing = this.achievements.get(achievement.id);
                    Object.assign(existing, achievement);
                    
                    if (achievement.completed) {
                        this.completedAchievements.add(achievement.id);
                    }
                }
            });
        }
    }
    
    saveToState() {
        return Array.from(this.achievements.values()).map(achievement => ({
            id: achievement.id,
            progress: achievement.progress,
            completed: achievement.completed,
            unlockedAt: achievement.unlockedAt
        }));
    }
    
    // Update achievements based on player actions
    updateAchievement(type, value = 1, targetId = null) {
        let updatedAchievements = [];
        
        this.achievements.forEach(achievement => {
            if (achievement.completed) return;
            
            const requirement = achievement.requirement;
            if (requirement.type === type) {
                // Check if this achievement should be updated
                let shouldUpdate = true;
                
                // Additional targeting if needed
                if (targetId && requirement.targetId && requirement.targetId !== targetId) {
                    shouldUpdate = false;
                }
                
                if (shouldUpdate) {
                    achievement.progress += value;
                    
                    // Check if achievement is completed
                    if (achievement.progress >= requirement.target) {
                        achievement.completed = true;
                        achievement.unlockedAt = Date.now();
                        this.completedAchievements.add(achievement.id);
                        this.grantAchievementReward(achievement);
                        updatedAchievements.push(achievement);
                    }
                }
            }
        });
        
        return updatedAchievements;
    }
    
    // Special achievement updates
    updateKillCount(isHeadshot = false) {
        const updated = [];
        
        updated.push(...this.updateAchievement('kill_count', 1));
        if (isHeadshot) {
            updated.push(...this.updateAchievement('headshot_count', 1));
        }
        
        return updated;
    }
    
    updateMissionComplete(withoutDamage = false) {
        const updated = [];
        
        updated.push(...this.updateAchievement('missions_completed', 1));
        if (withoutDamage) {
            updated.push(...this.updateAchievement('damageless_mission', 1));
        }
        
        return updated;
    }
    
    updateTreasureFound() {
        return this.updateAchievement('treasures_found', 1);
    }
    
    updateRegionDiscovered() {
        return this.updateAchievement('regions_discovered', 1);
    }
    
    updateWeaponCollected() {
        return this.updateAchievement('weapons_collected', 1);
    }
    
    updateHorseOwned() {
        return this.updateAchievement('horses_owned', 1);
    }
    
    updateDeadEyeKill() {
        return this.updateAchievement('dead_eye_kills', 1);
    }
    
    updateDuelWon() {
        return this.updateAchievement('duels_won', 1);
    }
    
    updatePlayerLevel() {
        return this.updateAchievement('player_level', 1);
    }
    
    grantAchievementReward(achievement) {
        const reward = achievement.reward;
        
        if (reward.xp) {
            this.progression.addXP(reward.xp, 'achievement');
        }
        
        // Show achievement notification
        this.showAchievementNotification(achievement);
        
        // Additional rewards would be granted here
        // (weapons, abilities, titles, etc.)
    }
    
    showAchievementNotification(achievement) {
        // This would trigger a UI notification
        const notification = {
            title: achievement.title,
            description: achievement.description,
            reward: achievement.reward,
            category: achievement.category
        };
        
        console.log('Achievement Unlocked:', notification);
        return notification;
    }
    
    // Get achievement progress
    getAchievementProgress(achievementId) {
        const achievement = this.achievements.get(achievementId);
        if (!achievement) return null;
        
        return {
            progress: achievement.progress,
            target: achievement.requirement.target,
            percentage: (achievement.progress / achievement.requirement.target) * 100,
            completed: achievement.completed,
            unlockedAt: achievement.unlockedAt
        };
    }
    
    // Get achievements by category
    getAchievementsByCategory(category) {
        return Array.from(this.achievements.values())
            .filter(a => a.category === category)
            .sort((a, b) => {
                if (a.completed && !b.completed) return -1;
                if (!a.completed && b.completed) return 1;
                return 0;
            });
    }
    
    // Get completion statistics
    getCompletionStats() {
        const total = this.achievements.size;
        const completed = this.completedAchievements.size;
        
        return {
            total,
            completed,
            percentage: (completed / total) * 100,
            xpEarned: Array.from(this.achievements.values())
                .filter(a => a.completed)
                .reduce((sum, a) => sum + (a.reward.xp || 0), 0),
            moneyEarned: Array.from(this.achievements.values())
                .filter(a => a.completed)
                .reduce((sum, a) => sum + (a.reward.money || 0), 0)
        };
    }
    
    // Get recent achievements
    getRecentAchievements(limit = 5) {
        return Array.from(this.achievements.values())
            .filter(a => a.completed)
            .sort((a, b) => b.unlockedAt - a.unlockedAt)
            .slice(0, limit);
    }
}
