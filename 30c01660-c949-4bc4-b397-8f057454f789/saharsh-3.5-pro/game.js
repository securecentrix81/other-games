// Enhanced Main Game Controller with Pause and Polish
class Game {
    constructor() {
        this.state = {
            currentScene: 'menu',
            currentChapter: 1,
            currentRestaurant: 0,
            currentDate: 0,
            loveMeter: 20,
            score: 0,
            isPaused: false,
            dialogueActive: false,
            miniGameActive: false,
            storyProgress: {},
            currency: 0,
            totalDates: 0,
            betrayalsUnlocked: 0,
            endingsUnlocked: [],
            upgrades: {
                charm: 0,
                luck: 0,
                charisma: 0
            },
            achievements: [],
            endlessHighScore: 0,
            playTime: 0,
            comboMultiplier: 1,
            lastMiniGameScore: 0,
            currentEnding: null
        };

        this.characters = {
            yussef: {
                id: 'yussef',
                name: 'Yussef',
                emotion: 'neutral',
                element: null
            },
            saharsh: {
                id: 'saharsh',
                name: 'Saharsh',
                emotion: 'neutral',
                element: null
            }
        };

        this.restaurants = [
            {
                id: 0,
                name: 'Romantic Italian Bistro',
                theme: 'italian',
                difficulty: 1,
                backgroundClass: 'italian-bg',
                minLoveRequired: 20
            },
            {
                id: 1,
                name: 'Elegant Japanese Sushi Bar',
                theme: 'japanese',
                difficulty: 2,
                backgroundClass: 'japanese-bg',
                minLoveRequired: 35
            },
            {
                id: 2,
                name: 'Classic American Diner',
                theme: 'american',
                difficulty: 3,
                backgroundClass: 'american-bg',
                minLoveRequired: 50
            },
            {
                id: 3,
                name: 'Charming French Café',
                theme: 'french',
                difficulty: 4,
                backgroundClass: 'french-bg',
                minLoveRequired: 65
            },
            {
                id: 4,
                name: 'Rooftop Fine Dining',
                theme: 'rooftop',
                difficulty: 5,
                backgroundClass: 'rooftop-bg',
                minLoveRequired: 80
            },
            {
                id: 5,
                name: 'Mexican Fiesta Restaurant',
                theme: 'mexican',
                difficulty: 3,
                backgroundClass: 'mexican-bg',
                minLoveRequired: 40
            },
            {
                id: 6,
                name: 'Chinese Dim Sum Palace',
                theme: 'chinese',
                difficulty: 3,
                backgroundClass: 'chinese-bg',
                minLoveRequired: 45
            },
            {
                id: 7,
                name: 'Indian Spice Garden',
                theme: 'indian',
                difficulty: 4,
                backgroundClass: 'indian-bg',
                minLoveRequired: 55
            },
            {
                id: 8,
                name: 'Greek Taverna by the Sea',
                theme: 'greek',
                difficulty: 3,
                backgroundClass: 'greek-bg',
                minLoveRequired: 42
            },
            {
                id: 9,
                name: 'Secret Garden Restaurant',
                theme: 'secret',
                difficulty: 5,
                backgroundClass: 'secret-bg',
                minLoveRequired: 90
            }
        ];

        this.lastTime = 0;
        this.isRunning = false;
        this.startTime = Date.now();
        this.particles = [];
        this.isPaused = false;
        
        this.loadProgress();
    }

    init() {
        this.setupEventListeners();
        this.cacheElements();
        this.isRunning = true;
        this.gameLoop();
        this.updatePlayTime();
        
        // Show instructions on first play
        if (this.state.totalDates === 0) {
            setTimeout(() => {
                document.getElementById('gameInstructions').classList.remove('hidden');
            }, 3000);
        }
    }

    cacheElements() {
        this.elements = {
            mainMenu: document.getElementById('mainMenu'),
            upgradesMenu: document.getElementById('upgradesMenu'),
            achievementsMenu: document.getElementById('achievementsMenu'),
            restaurantScene: document.getElementById('restaurantScene'),
            pacmanScene: document.getElementById('pacmanScene'),
            endingScene: document.getElementById('endingScene'),
            dialogueBox: document.getElementById('dialogueBox'),
            loveMeter: document.getElementById('loveMeter'),
            lovePercentage: document.getElementById('lovePercentage'),
            yussef: document.getElementById('yussef'),
            saharsh: document.getElementById('saharsh'),
            currencyDisplay: document.getElementById('currencyDisplay'),
            sceneCurrency: document.getElementById('sceneCurrency'),
            dateNumber: document.getElementById('dateNumber'),
            comboDisplay: document.getElementById('comboDisplay'),
            comboText: document.getElementById('comboText'),
            highScore: document.getElementById('highScore'),
            endingsCount: document.getElementById('endingsCount'),
            totalPlaytime: document.getElementById('totalPlaytime'),
            romanticOverlay: document.getElementById('romanticOverlay')
        };

        this.characters.yussef.element = this.elements.yussef;
        this.characters.saharsh.element = this.elements.saharsh;
    }

    setupEventListeners() {
        // Menu buttons
        document.getElementById('startBtn').addEventListener('click', () => {
            audio.playSound('selectChoice');
            this.startNewGame();
        });

        document.getElementById('endlessBtn').addEventListener('click', () => {
            audio.playSound('selectChoice');
            this.startEndlessMode();
        });

        document.getElementById('upgradesBtn').addEventListener('click', () => {
            audio.playSound('selectChoice');
            ui.showUpgradesMenu();
        });

        document.getElementById('achievementsBtn').addEventListener('click', () => {
            audio.playSound('selectChoice');
            ui.showAchievementsMenu();
        });

        document.getElementById('closeUpgrades').addEventListener('click', () => {
            audio.playSound('selectChoice');
            ui.hideUpgradesMenu();
        });

        document.getElementById('resetUpgradesBtn').addEventListener('click', () => {
            if (confirm('Refund all upgrades? You will get all your coins back!')) {
                upgrades.resetUpgrades();
            }
        });

        document.getElementById('closeAchievements').addEventListener('click', () => {
            audio.playSound('selectChoice');
            ui.hideAchievementsMenu();
        });

        // Restart button
        document.getElementById('restartBtn').addEventListener('click', () => {
            audio.playSound('selectChoice');
            this.restartGame();
        });

        // Menu button
        document.getElementById('menuBtn').addEventListener('click', () => {
            audio.playSound('selectChoice');
            this.returnToMenu();
        });

        // Mini game button
        document.getElementById('playMiniGame').addEventListener('click', () => {
            audio.playSound('selectChoice');
            this.startMiniGame();
        });
    }

    pause() {
        if (this.state.currentScene === 'menu') return;
        
        this.isPaused = true;
        this.state.isPaused = true;
        
        // Create pause menu
        const pauseMenu = document.createElement('div');
        pauseMenu.id = 'pauseMenu';
        pauseMenu.className = 'pause-menu';
        pauseMenu.innerHTML = `
            <h2 class="text-2xl font-bold mb-6">Game Paused</h2>
            <div class="space-y-3">
                <button id="resumeBtn" class="w-full px-6 py-3 bg-green-600 hover:bg-green-700 rounded-full font-bold transition-all">
                    Resume
                </button>
                <button id="restartFromPauseBtn" class="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-full font-bold transition-all">
                    Restart Game
                </button>
                <button id="menuFromPauseBtn" class="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-full font-bold transition-all">
                    Main Menu
                </button>
            </div>
        `;
        
        document.body.appendChild(pauseMenu);
        
        // Pause music
        audio.stopBackgroundMusic();
        
        // Setup pause menu events
        document.getElementById('resumeBtn').addEventListener('click', () => {
            audio.playSound('selectChoice');
            this.resume();
        });
        
        document.getElementById('restartFromPauseBtn').addEventListener('click', () => {
            audio.playSound('selectChoice');
            this.removePauseMenu();
            this.restartGame();
        });
        
        document.getElementById('menuFromPauseBtn').addEventListener('click', () => {
            audio.playSound('selectChoice');
            this.removePauseMenu();
            this.returnToMenu();
        });
    }

    resume() {
        this.isPaused = false;
        this.state.isPaused = false;
        this.removePauseMenu();
        
        // Resume music
        audio.playSceneAudio(this.state.currentScene);
        
        ui.createFloatingText('Game Resumed', window.innerWidth / 2, 100, '#00FF00');
    }

    removePauseMenu() {
        const pauseMenu = document.getElementById('pauseMenu');
        if (pauseMenu) {
            pauseMenu.remove();
        }
    }

    createParticle(x, y, type = 'spark') {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const particleTypes = {
            spark: { emoji: '✨', size: '20px' },
            heart: { emoji: '❤️', size: '24px' },
            coin: { emoji: '💰', size: '20px' },
            star: { emoji: '⭐', size: '18px' }
        };
        
        const config = particleTypes[type] || particleTypes.spark;
        particle.textContent = config.emoji;
        particle.style.cssText = `
            left: ${x}px;
            top: ${y}px;
            font-size: ${config.size};
            --x-drift: ${(Math.random() - 0.5) * 100}px;
        `;
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 3000);
    }

    startNewGame() {
        this.state.currentScene = 'restaurant';
        this.state.currentChapter = 1;
        this.state.currentRestaurant = 0;
        this.state.currentDate = 0;
        this.state.loveMeter = 20;
        this.state.score = 0;
        this.state.comboMultiplier = 1;
        
        this.switchScene('restaurant');
        this.updateLoveMeter(0);
        this.updateUI();
        
        story.displayChapterTitle();
        audio.playSceneAudio('restaurant');
        
        setTimeout(() => {
            dating.startDate(0);
            story.advanceStory();
        }, 3500);
    }

    startEndlessMode() {
        this.switchScene('pacman');
        pacman.startEndlessMode();
    }

    restartGame() {
        this.saveProgress();
        
        this.state.currentScene = 'restaurant';
        this.state.currentChapter = 1;
        this.state.currentRestaurant = 0;
        this.state.currentDate = 0;
        this.state.loveMeter = 20;
        this.state.score = 0;
        this.state.comboMultiplier = 1;
        
        this.switchScene('restaurant');
        this.updateLoveMeter(0);
        this.updateUI();
        
        story.displayChapterTitle();
        audio.playSceneAudio('restaurant');
        
        setTimeout(() => {
            dating.startDate(0);
            story.advanceStory();
        }, 3500);
    }

    returnToMenu() {
        this.saveProgress();
        this.switchScene('menu');
        this.updateUI();
    }

    switchScene(sceneName) {
        // Hide all scenes
        this.elements.mainMenu.classList.add('hidden');
        this.elements.upgradesMenu.classList.add('hidden');
        this.elements.achievementsMenu.classList.add('hidden');
        this.elements.restaurantScene.classList.add('hidden');
        this.elements.pacmanScene.classList.add('hidden');
        this.elements.endingScene.classList.add('hidden');

        // Show target scene
        switch(sceneName) {
            case 'menu':
                this.elements.mainMenu.classList.remove('hidden');
                audio.playSceneAudio('menu');
                break;
            case 'upgrades':
                this.elements.upgradesMenu.classList.remove('hidden');
                break;
            case 'achievements':
                this.elements.achievementsMenu.classList.remove('hidden');
                break;
            case 'restaurant':
                this.elements.restaurantScene.classList.remove('hidden');
                audio.playSceneAudio('restaurant');
                break;
            case 'pacman':
                this.elements.pacmanScene.classList.remove('hidden');
                audio.playSceneAudio('pacman');
                if (!pacman.isRunning) {
                    pacman.init();
                }
                break;
            case 'ending':
                this.elements.endingScene.classList.remove('hidden');
                audio.playSceneAudio('ending');
                break;
        }

        this.state.currentScene = sceneName;
        
        // Create transition effect
        this.createTransitionParticles();
    }

    createTransitionParticles() {
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                this.createParticle(
                    Math.random() * window.innerWidth,
                    Math.random() * window.innerHeight,
                    ['spark', 'star', 'heart'][Math.floor(Math.random() * 3)]
                );
            }, i * 50);
        }
    }

    updateLoveMeter(amount) {
        // Apply upgrades to love gain
        const charmBonus = this.state.upgrades.charm * 0.1;
        const adjustedAmount = amount > 0 ? amount * (1 + charmBonus) : amount;
        
        const previousLove = this.state.loveMeter;
        this.state.loveMeter = Math.max(0, Math.min(100, this.state.loveMeter + adjustedAmount));
        
        this.elements.loveMeter.style.width = this.state.loveMeter + '%';
        this.elements.lovePercentage.textContent = Math.floor(this.state.loveMeter) + '%';
        
        // Add animation
        if (amount > 0) {
            this.elements.loveMeter.classList.add('love-increase');
            setTimeout(() => {
                this.elements.loveMeter.classList.remove('love-increase');
            }, 600);
            
            // Create heart particles
            if (amount > 10) {
                for (let i = 0; i < 5; i++) {
                    this.createParticle(
                        window.innerWidth / 2 + (Math.random() - 0.5) * 100,
                        window.innerHeight / 2 + (Math.random() - 0.5) * 100,
                        'heart'
                    );
                }
            }
        }

        // Update romantic overlay
        if (this.state.loveMeter > 50) {
            this.elements.romanticOverlay.classList.add('active');
        } else {
            this.elements.romanticOverlay.classList.remove('active');
        }
        
        // Check achievements
        achievements.checkLoveAchievements(this.state.loveMeter);

        // Check win/lose conditions
        if (this.state.loveMeter >= 100) {
            this.triggerFinalChapter();
        } else if (this.state.loveMeter <= 0) {
            this.triggerBadEnding();
        }
    }

    addCurrency(amount) {
        // Apply luck upgrade
        const luckBonus = this.state.upgrades.luck * 0.2;
        const adjustedAmount = Math.floor(amount * (1 + luckBonus));
        
        this.state.currency += adjustedAmount;
        this.updateUI();
        
        // Check achievements
        achievements.checkCurrencyAchievements(this.state.currency);
        
        // Show floating text with particles
        if (adjustedAmount > 0) {
            ui.createFloatingText(`+${adjustedAmount} 💰`, window.innerWidth / 2, 200, '#FFD700');
            
            // Create coin particles for large amounts
            if (adjustedAmount > 50) {
                for (let i = 0; i < 3; i++) {
                    this.createParticle(
                        window.innerWidth / 2 + (Math.random() - 0.5) * 100,
                        200 + (Math.random() - 0.5) * 50,
                        'coin'
                    );
                }
            }
        }
    }

    updateCombo(multiplier) {
        this.state.comboMultiplier = multiplier;
        
        if (multiplier > 1) {
            this.elements.comboDisplay.classList.remove('hidden');
            this.elements.comboText.textContent = `${multiplier}x Combo!`;
            
            // Add visual feedback
            if (multiplier >= 5) {
                ui.addScreenEffect('flash-green');
                this.createParticle(window.innerWidth / 2, 100, 'star');
            }
            
            // Hide after 3 seconds
            setTimeout(() => {
                this.elements.comboDisplay.classList.add('hidden');
            }, 3000);
        }
    }

    triggerFinalChapter() {
        this.state.currentChapter = 5;
        
        // Check which ending based on choices and stats
        if (this.state.loveMeter >= 95 && this.state.upgrades.charm >= 3) {
            this.state.currentEnding = 'perfect';
        } else if (this.state.loveMeter >= 80) {
            this.state.currentEnding = 'good';
        } else if (this.state.loveMeter >= 60) {
            this.state.currentEnding = 'neutral';
        } else {
            this.state.currentEnding = 'betrayal';
        }
        
        story.playBetrayalScene();
    }

    triggerBadEnding() {
        this.state.currentEnding = 'bad';
        story.showBadEnding();
    }

    startMiniGame() {
        if (this.state.currentScene === 'restaurant') {
            this.switchScene('pacman');
            const restaurant = this.restaurants[this.state.currentRestaurant];
            pacman.startLevel(restaurant.difficulty);
        }
    }

    completeMiniGame(score, won) {
        this.state.lastMiniGameScore = score;
        
        if (won) {
            // Calculate rewards
            const baseLoveGain = 10 + this.restaurants[this.state.currentRestaurant].difficulty * 5;
            const loveGain = Math.floor(baseLoveGain * this.state.comboMultiplier);
            const currencyGain = Math.floor(score / 10) * this.state.comboMultiplier;
            
            this.updateLoveMeter(loveGain);
            this.addCurrency(currencyGain);
            
            // Update combo for next round
            if (this.state.comboMultiplier < 5) {
                this.updateCombo(this.state.comboMultiplier + 1);
            }
            
            // Check achievements
            achievements.checkMiniGameAchievements(score, won);
            
            // Celebration particles
            for (let i = 0; i < 10; i++) {
                this.createParticle(
                    Math.random() * window.innerWidth,
                    Math.random() * window.innerHeight,
                    ['spark', 'star'][Math.floor(Math.random() * 2)]
                );
            }
        } else {
            // Reset combo on failure
            this.updateCombo(1);
        }
        
        this.state.totalDates++;
        this.saveProgress();
    }

    unlockEnding(endingType) {
        if (!this.state.endingsUnlocked.includes(endingType)) {
            this.state.endingsUnlocked.push(endingType);
            
            // Add achievement for new ending
            achievements.unlock(`ending_${endingType}`);
            
            // Give bonus currency for new ending
            this.addCurrency(100);
        }
    }

    saveProgress() {
        const saveData = {
            currency: this.state.currency,
            upgrades: this.state.upgrades,
            achievements: this.state.achievements,
            endlessHighScore: this.state.endlessHighScore,
            endingsUnlocked: this.state.endingsUnlocked,
            playTime: this.state.playTime,
            totalDates: this.state.totalDates
        };
        
        localStorage.setItem('yussefSaharshSave', JSON.stringify(saveData));
    }

    loadProgress() {
        const saveData = localStorage.getItem('yussefSaharshSave');
        
        if (saveData) {
            const data = JSON.parse(saveData);
            this.state.currency = data.currency || 0;
            this.state.upgrades = data.upgrades || { charm: 0, luck: 0, charisma: 0 };
            this.state.achievements = data.achievements || [];
            this.state.endlessHighScore = data.endlessHighScore || 0;
            this.state.endingsUnlocked = data.endingsUnlocked || [];
            this.state.playTime = data.playTime || 0;
            this.state.totalDates = data.totalDates || 0;
        }
    }

    updateUI() {
        this.elements.currencyDisplay.textContent = this.state.currency;
        this.elements.sceneCurrency.textContent = this.state.currency;
        this.elements.dateNumber.textContent = this.state.currentDate + 1;
        this.elements.highScore.textContent = this.state.endlessHighScore;
        this.elements.endingsCount.textContent = this.state.endingsUnlocked.length;
    }

    updatePlayTime() {
        setInterval(() => {
            if (!this.isPaused && this.state.currentScene !== 'menu') {
                this.state.playTime++;
                const minutes = Math.floor(this.state.playTime / 60);
                const seconds = this.state.playTime % 60;
                this.elements.totalPlaytime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    handleResize() {
        // Reposition characters based on new screen size
        if (this.state.currentScene === 'restaurant') {
            dating.positionCharacters();
        }
    }

    gameLoop(currentTime = 0) {
        if (!this.isRunning) return;

        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        if (!this.isPaused && !this.state.isPaused) {
            this.update(deltaTime);
        }

        this.render();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(deltaTime) {
        // Update based on current scene
        switch(this.state.currentScene) {
            case 'pacman':
                if (pacman && pacman.isRunning) {
                    pacman.update(deltaTime);
                }
                break;
        }
    }

    render() {
        // Rendering handled by individual modules
    }
}

// Initialize game
const game = new Game();

// Start when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    game.init();
});
