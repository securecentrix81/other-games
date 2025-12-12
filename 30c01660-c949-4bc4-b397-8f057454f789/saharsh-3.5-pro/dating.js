// Dating and Restaurant System
class Dating {
    constructor() {
        this.currentRestaurant = null;
        this.isInDate = false;
        this.dateProgress = 0;
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
    }

    positionCharacters() {
        const yussef = game.characters.yussef.element;
        const saharsh = game.characters.saharsh.element;

        // Position based on screen size
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        yussef.style.left = (screenWidth * 0.25) + 'px';
        yussef.style.bottom = '100px';
        yussef.style.position = 'absolute';

        saharsh.style.left = (screenWidth * 0.65) + 'px';
        saharsh.style.bottom = '100px';
        saharsh.style.position = 'absolute';
    }

    completeDate() {
        this.isInDate = false;
        this.dateProgress = 0;

        // Check if ready for next restaurant
        if (game.state.loveMeter >= 20 * (game.state.currentRestaurant + 1)) {
            this.nextRestaurant();
        } else {
            // Need more love points
            ui.showMiniGameButton(true);
        }
    }

    nextRestaurant() {
        game.state.currentRestaurant++;
        game.state.currentDate = 0;

        if (game.state.currentRestaurant >= game.restaurants.length) {
            // All restaurants completed, trigger final chapter
            game.triggerFinalChapter();
        } else {
            // Start next restaurant date
            this.startDate(game.state.currentRestaurant);
        }
    }

    handleMiniGameResult(won, score) {
        if (won) {
            // Success in mini-game increases love
            const loveGain = Math.min(15, this.currentRestaurant.difficulty * 3);
            game.updateLoveMeter(loveGain);
            
            ui.createFloatingText(`+${loveGain} Love Points!`, window.innerWidth / 2, 200, '#FF69B4');
            
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
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const heart = document.createElement('div');
                heart.innerHTML = '❤️';
                heart.style.cssText = `
                    position: absolute;
                    font-size: 20px;
                    left: ${Math.random() * window.innerWidth}px;
                    bottom: 0;
                    animation: floatHeart 3s ease-out forwards;
                    pointer-events: none;
                `;
                restaurantScene.appendChild(heart);
                
                setTimeout(() => heart.remove(), 3000);
            }, i * 500);
        }
    }

    triggerSpecialMoment() {
        // Create a special romantic moment
        this.createRomanticAtmosphere();
        
        // Add screen effect
        ui.addScreenEffect('fade-to-black');
        
        setTimeout(() => {
            ui.addScreenEffect('fade-to-black');
        }, 1000);
    }

    updateCharacterPositionsBasedOnEmotion() {
        const yussef = game.characters.yussef.element;
        const saharsh = game.characters.saharsh.element;
        
        // Move characters closer if love is high
        if (game.state.loveMeter > 70) {
            const distance = (100 - game.state.loveMeter) * 2;
            yussef.style.left = `calc(25vw - ${distance}px)`;
            saharsh.style.left = `calc(65vw + ${distance}px)`;
        }
    }
}

// Add floating heart animation
const style = document.createElement('style');
style.textContent = `
    @keyframes floatHeart {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(-500px) rotate(360deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize dating system
const dating = new Dating();
