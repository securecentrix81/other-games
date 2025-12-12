// Enhanced Dating and Restaurant System
class Dating {
    constructor() {
        this.currentRestaurant = null;
        this.isInDate = false;
        this.dateProgress = 0;
        this.specialMoments = 0;
    }

    startDate(restaurantId) {
        this.currentRestaurant = game.restaurants[restaurantId];
        this.isInDate = true;
        this.dateProgress = 0;

        // Set restaurant background
        ui.setRestaurantBackground(this.currentRestaurant);

        // Position characters
        this.positionCharacters();

        // Show characters entering
        ui.animateCharacterEntry(game.characters.yussef, 0);
        ui.animateCharacterEntry(game.characters.saharsh, 500);

        // Start dialogue after characters enter
        setTimeout(() => {
            const dialogueId = dialogue.getDialogueForRestaurant(restaurantId, 0);
            dialogue.showDialogue(dialogueId);
        }, 1500);

        // Add currency for starting a date
        game.addCurrency(10 + restaurantId * 5);
    }

    positionCharacters() {
        const yussef = game.characters.yussef.element;
        const saharsh = game.characters.saharsh.element;

        // Position based on screen size
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // Adjust positions based on love meter
        const loveProximity = (100 - game.state.loveMeter) / 2;
        
        yussef.style.left = (screenWidth * 0.25 - loveProximity) + 'px';
        yussef.style.bottom = '100px';
        yussef.style.position = 'absolute';

        saharsh.style.left = (screenWidth * 0.65 + loveProximity) + 'px';
        saharsh.style.bottom = '100px';
        saharsh.style.position = 'absolute';
    }

    completeDate() {
        this.isInDate = false;
        this.dateProgress = 0;
        game.state.currentDate++;

        // Check if ready for next restaurant
        const requiredLove = this.currentRestaurant.minLoveRequired;
        if (game.state.loveMeter >= requiredLove) {
            // Bonus for exceeding requirements
            const excessLove = game.state.loveMeter - requiredLove;
            if (excessLove > 20) {
                game.addCurrency(50);
                ui.createFloatingText('Perfect Date! +50 💰', window.innerWidth / 2, 200, '#FFD700');
            }
            
            this.nextRestaurant();
        } else {
            // Need more love points
            ui.showMiniGameButton(true);
            ui.createFloatingText(`Need ${requiredLove - game.state.loveMeter} more love points!`, window.innerWidth / 2, 200, '#FFA500');
        }
    }

    nextRestaurant() {
        // Randomly select next restaurant from available ones
        const availableRestaurants = game.restaurants.filter(r => {
            return game.state.loveMeter >= r.minLoveRequired - 10; // Allow some flexibility
        });
        
        if (availableRestaurants.length > 0) {
            const nextRestaurant = availableRestaurants[Math.floor(Math.random() * availableRestaurants.length)];
            game.state.currentRestaurant = nextRestaurant.id;
            
            // Check if all restaurants have been visited
            if (game.state.currentDate >= 10) {
                game.triggerFinalChapter();
            } else {
                // Start next restaurant date
                setTimeout(() => {
                    this.startDate(game.state.currentRestaurant);
                }, 2000);
            }
        } else {
            // No restaurants available, trigger mini-game
            ui.showMiniGameButton(true);
        }
    }

    handleMiniGameResult(won, score) {
        if (won) {
            // Success in mini-game increases love
            const baseLoveGain = 10 + this.currentRestaurant.difficulty * 3;
            const loveGain = Math.min(15, baseLoveGain + Math.floor(score / 100));
            const currencyBonus = Math.floor(score / 50);
            game.updateLoveMeter(loveGain);
            game.addCurrency(currencyBonus);
            
            ui.createFloatingText(`+${loveGain} Love Points! +${currencyBonus} 💰`, window.innerWidth / 2, 200, '#FF69B4');
            
            // Check for special moment
            if (loveGain > 12) {
                this.triggerSpecialMoment();
            }
            
            // Continue story
            setTimeout(() => {
                this.completeDate();
            }, 2000);
        } else {
            // Failed mini-game
            const loveLoss = Math.max(5, this.currentRestaurant.difficulty * 2);
            game.updateLoveMeter(-loveLoss);
            
            ui.createFloatingText(`-${loveLoss} Love Points`, window.innerWidth / 2, 200, '#FF0000');
            
            // Give another chance or end game
            if (game.state.loveMeter > 0) {
                setTimeout(() => {
                    ui.showMiniGameButton(true);
                }, 2000);
            }
        }
    }

    createRomanticAtmosphere() {
        // Add romantic effects to the scene
        const restaurantScene = document.getElementById('restaurantScene');
        
        // Create floating hearts
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const heart = document.createElement('div');
                heart.innerHTML = '❤️';
                heart.style.cssText = `
                    position: absolute;
                    font-size: ${20 + Math.random() * 20}px;
                    left: ${Math.random() * window.innerWidth}px;
                    bottom: 0;
                    animation: floatHeart ${3 + Math.random() * 2}s ease-out forwards;
                    pointer-events: none;
                    opacity: ${0.6 + Math.random() * 0.4};
                `;
                restaurantScene.appendChild(heart);
                
                setTimeout(() => heart.remove(), 5000);
            }, i * 300);
        }
        
        // Add sparkles
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.innerHTML = '✨';
                sparkle.style.cssText = `
                    position: absolute;
                    font-size: 16px;
                    left: ${Math.random() * window.innerWidth}px;
                    top: ${Math.random() * window.innerHeight}px;
                    animation: sparkle 2s ease-out forwards;
                    pointer-events: none;
                `;
                restaurantScene.appendChild(sparkle);
                
                setTimeout(() => sparkle.remove(), 2000);
            }, i * 200);
        }
    }

    triggerSpecialMoment() {
        this.specialMoments++;
        
        // Create a special romantic moment
        this.createRomanticAtmosphere();
        
        // Add screen effect
        ui.addScreenEffect('fade-to-black');
        
        // Bonus love for special moments
        game.updateLoveMeter(5);
        game.addCurrency(25);
        
        setTimeout(() => {
            ui.addScreenEffect('fade-to-black');
        }, 1000);
        
        // Check achievements
        if (this.specialMoments >= 3) {
            achievements.unlock('special_moments');
        }
    }

    updateCharacterPositionsBasedOnEmotion() {
        const yussef = game.characters.yussef.element;
        const saharsh = game.characters.saharsh.element;
        
        // Move characters closer if love is high
        if (game.state.loveMeter > 70) {
            const distance = (100 - game.state.loveMeter) * 3;
            yussef.style.left = `calc(25vw - ${distance}px)`;
            saharsh.style.left = `calc(65vw + ${distance}px)`;
            
            // Add floating effect
            yussef.style.animation = 'float 2s ease-in-out infinite';
            saharsh.style.animation = 'float 2s ease-in-out infinite reverse';
        }
    }

    calculateDateScore() {
        // Calculate overall date performance
        let score = 0;
        
        // Base score for completing date
        score += 100;
        
        // Love meter bonus
        score += game.state.loveMeter * 2;
        
        // Restaurant difficulty bonus
        score += this.currentRestaurant.difficulty * 50;
        
        // Special moments bonus
        score += this.specialMoments * 25;
        
        // Upgrade bonuses
        score += game.state.upgrades.charm * 30;
        score += game.state.upgrades.charisma * 40;
        
        return score;
    }
}

// Add floating animations
const style = document.createElement('style');
style.textContent = `
    @keyframes floatHeart {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(-600px) rotate(360deg);
            opacity: 0;
        }
    }
    
    @keyframes sparkle {
        0% {
            transform: scale(0) rotate(0deg);
            opacity: 1;
        }
        50% {
            transform: scale(1.5) rotate(180deg);
            opacity: 0.8;
        }
        100% {
            transform: scale(0) rotate(360deg);
            opacity: 0;
        }
    }
    
    @keyframes float {
        0%, 100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-10px);
        }
    }
`;
document.head.appendChild(style);

// Initialize dating system
const dating = new Dating();
