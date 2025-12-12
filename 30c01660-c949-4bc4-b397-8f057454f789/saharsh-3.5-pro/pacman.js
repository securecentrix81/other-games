// Enhanced Pac-Man Mini-Game Engine
class PacMan {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;
        this.isPaused = false;
        this.isEndless = false;
        
        // Game state
        this.player = {
            x: 1,
            y: 1,
            direction: 'right',
            nextDirection: 'right',
            speed: 2,
            isPowered: false,
            powerTimer: 0,
            animationFrame: 0,
            speedBoost: false,
            speedBoostTimer: 0,
            invincible: false,
            invincibleTimer: 0,
            coinMagnet: false,
            coinMagnetTimer: 0,
            doublePoints: false,
            doublePointsTimer: 0
        };
        
        this.ghosts = [];
        this.maze = [];
        this.pellets = [];
        this.powerPellets = [];
        this.powerUps = [];
        
        // Game stats
        this.score = 0;
        this.lives = 3;
        this.timeLeft = 60;
        this.pelletsCollected = 0;
        this.totalPellets = 0;
        this.wave = 1;
        this.combo = 0;
        this.maxCombo = 0;
        
        // Maze dimensions
        this.cellSize = 20;
        this.mazeWidth = 19;
        this.mazeHeight = 21;
        
        // Timing
        this.lastTime = 0;
        this.accumulator = 0;
        this.stepTime = 100; // MS per movement step
        
        this.setupEventListeners();
    }

    init() {
        this.canvas = document.getElementById('pacmanCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        this.canvas.width = this.mazeWidth * this.cellSize;
        this.canvas.height = this.mazeHeight * this.cellSize;
        
        // Center the canvas
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '50%';
        this.canvas.style.top = '50%';
        this.canvas.style.transform = 'translate(-50%, -50%)';
        
        this.generateMaze();
        this.resetGame();
    }

    generateMaze() {
        // Create a more complex maze layout
        // 0 = wall, 1 = pellet, 2 = power pellet, 3 = empty, 4 = power-up
        const mazeTemplate = [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
            [0,2,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,2,0],
            [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
            [0,1,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0],
            [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0],
            [0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,0],
            [3,3,3,0,1,0,1,1,1,1,1,1,1,0,1,0,3,3,3],
            [0,0,0,0,1,0,1,0,0,3,0,0,1,0,1,0,0,0,0],
            [1,1,1,1,1,1,1,0,3,3,3,0,1,1,1,1,1,1,1],
            [0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,0],
            [3,3,3,0,1,0,1,1,1,1,1,1,1,0,1,0,3,3,3],
            [0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,0],
            [0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
            [0,1,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0],
            [0,2,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,2,0],
            [0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,0],
            [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0],
            [0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0],
            [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        ];
        
        this.maze = JSON.parse(JSON.stringify(mazeTemplate));
        
        // Extract pellets and power pellets
        this.pellets = [];
        this.powerPellets = [];
        this.powerUps = [];
        this.totalPellets = 0;
        
        for (let y = 0; y < this.mazeHeight; y++) {
            for (let x = 0; x < this.mazeWidth; x++) {
                if (this.maze[y][x] === 1) {
                    this.pellets.push({x, y});
                    this.totalPellets++;
                } else if (this.maze[y][x] === 2) {
                    this.powerPellets.push({x, y});
                    this.totalPellets++;
                }
            }
        }
        
        // Add random power-ups
        this.generatePowerUps();
    }

    generatePowerUps() {
        const powerUpTypes = ['speed', 'invincible', 'magnet', 'double'];
        const numPowerUps = this.isEndless ? 3 : 1;
        
        for (let i = 0; i < numPowerUps; i++) {
            let placed = false;
            while (!placed) {
                const x = Math.floor(Math.random() * this.mazeWidth);
                const y = Math.floor(Math.random() * this.mazeHeight);
                
                if (this.maze[y][x] === 3) { // Empty space
                    const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
                    this.powerUps.push({x, y, type, collected: false});
                    placed = true;
                }
            }
        }
    }

    resetGame() {
        // Reset player position
        this.player.x = 9;
        this.player.y = 15;
        this.player.direction = 'right';
        this.player.nextDirection = 'right';
        this.player.isPowered = false;
        this.player.powerTimer = 0;
        
        // Reset power-up states
        this.player.speedBoost = false;
        this.player.speedBoostTimer = 0;
        this.player.invincible = false;
        this.player.invincibleTimer = 0;
        this.player.coinMagnet = false;
        this.player.coinMagnetTimer = 0;
        this.player.doublePoints = false;
        this.player.doublePointsTimer = 0;
        
        // Reset ghosts
        this.ghosts = [
            {
                x: 9,
                y: 9,
                direction: 'up',
                color: '#FF0000',
                ai: 'chase',
                speed: 1.5,
                isScared: false,
                targetX: 9,
                targetY: 9
            },
            {
                x: 8,
                y: 9,
                direction: 'left',
                color: '#00FFFF',
                ai: 'random',
                speed: 1.3,
                isScared: false,
                targetX: 8,
                targetY: 9
            },
            {
                x: 10,
                y: 9,
                direction: 'right',
                color: '#FFB8FF',
                ai: 'ambush',
                speed: 1.4,
                isScared: false,
                targetX: 10,
                targetY: 9
            }
        ];
        
        // Add extra ghost for endless mode
        if (this.isEndless && this.wave > 3) {
            this.ghosts.push({
                x: 9,
                y: 8,
                direction: 'down',
                color: '#FFB851',
                ai: 'patrol',
                speed: 1.6,
                isScared: false,
                targetX: 9,
                targetY: 8
            });
        }
        
        // Reset game stats
        if (!this.isEndless) {
            this.score = 0;
            this.lives = 3 + upgrades.getUpgradeEffect('extra_life');
            this.timeLeft = 60 + upgrades.getUpgradeEffect('time_bonus');
            this.pelletsCollected = 0;
            this.combo = 0;
            this.maxCombo = 0;
        }
        
        // Reset maze
        this.generateMaze();
    }

    startLevel(difficulty) {
        this.isEndless = false;
        this.wave = 1;
        this.resetGame();
        this.isRunning = true;
        this.isPaused = false;
        
        // Adjust difficulty
        this.timeLeft = Math.max(30, 60 - difficulty * 5) + upgrades.getUpgradeEffect('time_bonus');
        this.ghosts.forEach(ghost => {
            ghost.speed = 1 + difficulty * 0.3;
        });
        
        // Start timer
        this.startTimer();
        
        // Start game loop
        this.lastTime = performance.now();
        this.gameLoop();
    }

    startEndlessMode() {
        this.isEndless = true;
        this.wave = 1;
        this.score = 0;
        this.lives = 3;
        this.timeLeft = 999999; // No time limit
        this.resetGame();
        this.isRunning = true;
        this.isPaused = false;
        
        // Start game loop
        this.lastTime = performance.now();
        this.gameLoop();
    }

    nextWave() {
        this.wave++;
        this.lives = Math.min(this.lives + 1, 5); // Bonus life
        
        // Increase difficulty
        this.ghosts.forEach(ghost => {
            ghost.speed = Math.min(ghost.speed + 0.2, 3);
        });
        
        // Reset positions
        this.player.x = 9;
        this.player.y = 15;
        this.ghosts.forEach((ghost, index) => {
            ghost.x = 9;
            ghost.y = 9;
            ghost.isScared = false;
        });
        
        // Generate new maze
        this.generateMaze();
        
        ui.showPacmanMessage(`Wave ${this.wave}!`, false);
        setTimeout(() => ui.hidePacmanMessage(), 2000);
    }

    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.accumulator += deltaTime;
        
        // Update game at fixed intervals
        while (this.accumulator >= this.stepTime) {
            this.update();
            this.accumulator -= this.stepTime;
        }
        
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        if (this.isPaused) return;
        
        // Update player
        this.updatePlayer();
        
        // Update ghosts
        this.updateGhosts();
        
        // Update power-ups
        this.updatePowerUps();
        
        // Check collisions
        this.checkCollisions();
        
        // Update power timers
        this.updatePowerTimers();
        
        // Update animation
        this.player.animationFrame = (this.player.animationFrame + 1) % 2;
        
        // Check win condition
        if (this.pelletsCollected >= this.totalPellets) {
            if (this.isEndless) {
                this.nextWave();
            } else {
                this.winLevel();
            }
        }
    }

    updatePowerTimers() {
        // Update all power-up timers
        if (this.player.speedBoostTimer > 0) {
            this.player.speedBoostTimer--;
            if (this.player.speedBoostTimer === 0) {
                this.player.speedBoost = false;
            }
        }
        
        if (this.player.invincibleTimer > 0) {
            this.player.invincibleTimer--;
            if (this.player.invincibleTimer === 0) {
                this.player.invincible = false;
            }
        }
        
        if (this.player.coinMagnetTimer > 0) {
            this.player.coinMagnetTimer--;
            if (this.player.coinMagnetTimer === 0) {
                this.player.coinMagnet = false;
            }
        }
        
        if (this.player.doublePointsTimer > 0) {
            this.player.doublePointsTimer--;
            if (this.player.doublePointsTimer === 0) {
                this.player.doublePoints = false;
            }
        }
        
        if (this.player.powerTimer > 0) {
            this.player.powerTimer--;
            if (this.player.powerTimer === 0) {
                this.player.isPowered = false;
                this.ghosts.forEach(ghost => ghost.isScared = false);
            }
        }
    }

    updatePowerUps() {
        this.powerUps.forEach(powerUp => {
            if (!powerUp.collected) {
                // Check collection
                const distance = Math.abs(powerUp.x - this.player.x) + Math.abs(powerUp.y - this.player.y);
                if (distance < 0.5 || (this.player.coinMagnet && distance < 3)) {
                    this.collectPowerUp(powerUp);
                }
            }
        });
    }

    collectPowerUp(powerUp) {
        powerUp.collected = true;
        
        // Apply power-up effect
        switch(powerUp.type) {
            case 'speed':
                this.player.speedBoost = true;
                this.player.speedBoostTimer = 150;
                ui.showPowerUp('speed', 5000);
                break;
            case 'invincible':
                this.player.invincible = true;
                this.player.invincibleTimer = 100;
                ui.showPowerUp('invincible', 3000);
                break;
            case 'magnet':
                this.player.coinMagnet = true;
                this.player.coinMagnetTimer = 200;
                ui.showPowerUp('magnet', 4000);
                break;
            case 'double':
                this.player.doublePoints = true;
                this.player.doublePointsTimer = 150;
                ui.showPowerUp('double', 5000);
                break;
        }
        
        // Bonus score
        this.addScore(100);
    }

    updatePlayer() {
        // Try to change direction
        const directions = {
            'up': {x: 0, y: -1},
            'down': {x: 0, y: 1},
            'left': {x: -1, y: 0},
            'right': {x: 1, y: 0}
        };
        
        const nextDir = directions[this.player.nextDirection];
        const nextX = this.player.x + nextDir.x;
        const nextY = this.player.y + nextDir.y;
        
        if (this.isValidMove(nextX, nextY)) {
            this.player.direction = this.player.nextDirection;
        }
        
        // Move in current direction
        const dir = directions[this.player.direction];
        const newX = this.player.x + dir.x;
        const newY = this.player.y + dir.y;
        
        if (this.isValidMove(newX, newY)) {
            this.player.x = newX;
            this.player.y = newY;
            
            // Collect pellets
            this.collectPellet();
        }
        
        // Handle screen wrapping (tunnel)
        if (this.player.x < 0) this.player.x = this.mazeWidth - 1;
        if (this.player.x >= this.mazeWidth) this.player.x = 0;
    }

    updateGhosts() {
        this.ghosts.forEach(ghost => {
            // AI decision making
            if (Math.random() < 0.1) { // 10% chance to change direction each update
                this.updateGhostAI(ghost);
            }
            
            // Move ghost
            const directions = {
                'up': {x: 0, y: -1},
                'down': {x: 0, y: 1},
                'left': {x: -1, y: 0},
                'right': {x: 1, y: 0}
            };
            
            const dir = directions[ghost.direction];
            const newX = ghost.x + dir.x * ghost.speed / this.player.speed;
            const newY = ghost.y + dir.y * ghost.speed / this.player.speed;
            
            if (this.isValidMove(Math.floor(newX), Math.floor(newY))) {
                ghost.x = newX;
                ghost.y = newY;
            } else {
                // Hit wall, choose new direction
                this.updateGhostAI(ghost);
            }
        });
    }

    updateGhostAI(ghost) {
        const directions = ['up', 'down', 'left', 'right'];
        const validDirections = [];
        
        directions.forEach(dir => {
            const vectors = {
                'up': {x: 0, y: -1},
                'down': {x: 0, y: 1},
                'left': {x: -1, y: 0},
                'right': {x: 1, y: 0}
            };
            
            const newX = Math.floor(ghost.x + vectors[dir].x);
            const newY = Math.floor(ghost.y + vectors[dir].y);
            
            if (this.isValidMove(newX, newY)) {
                validDirections.push(dir);
            }
        });
        
        if (validDirections.length > 0) {
            if (ghost.isScared) {
                // Run away from player
                let bestDir = validDirections[0];
                let maxDistance = 0;
                
                validDirections.forEach(dir => {
                    const vectors = {
                        'up': {x: 0, y: -1},
                        'down': {x: 0, y: 1},
                        'left': {x: -1, y: 0},
                        'right': {x: 1, y: 0}
                    };
                    
                    const newX = ghost.x + vectors[dir].x;
                    const newY = ghost.y + vectors[dir].y;
                    const distance = Math.abs(newX - this.player.x) + Math.abs(newY - this.player.y);
                    
                    if (distance > maxDistance) {
                        maxDistance = distance;
                        bestDir = dir;
                    }
                });
                
                ghost.direction = bestDir;
            } else {
                switch(ghost.ai) {
                    case 'chase':
                        // Move towards player
                        let bestDir = validDirections[0];
                        let minDistance = Infinity;
                        
                        validDirections.forEach(dir => {
                            const vectors = {
                                'up': {x: 0, y: -1},
                                'down': {x: 0, y: 1},
                                'left': {x: -1, y: 0},
                                'right': {x: 1, y: 0}
                            };
                            
                            const newX = ghost.x + vectors[dir].x;
                            const newY = ghost.y + vectors[dir].y;
                            const distance = Math.abs(newX - this.player.x) + Math.abs(newY - this.player.y);
                            
                            if (distance < minDistance) {
                                minDistance = distance;
                                bestDir = dir;
                            }
                        });
                        
                        ghost.direction = bestDir;
                        break;
                        
                    case 'ambush':
                        // Try to cut off player
                        const targetX = this.player.x + (this.player.direction === 'right' ? 4 : this.player.direction === 'left' ? -4 : 0);
                        const targetY = this.player.y + (this.player.direction === 'down' ? 4 : this.player.direction === 'up' ? -4 : 0);
                        
                        let ambushDir = validDirections[0];
                        let ambushDistance = Infinity;
                        
                        validDirections.forEach(dir => {
                            const vectors = {
                                'up': {x: 0, y: -1},
                                'down': {x: 0, y: 1},
                                'left': {x: -1, y: 0},
                                'right': {x: 1, y: 0}
                            };
                            
                            const newX = ghost.x + vectors[dir].x;
                            const newY = ghost.y + vectors[dir].y;
                            const distance = Math.abs(newX - targetX) + Math.abs(newY - targetY);
                            
                            if (distance < ambushDistance) {
                                ambushDistance = distance;
                                ambushDir = dir;
                            }
                        });
                        
                        ghost.direction = ambushDir;
                        break;
                        
                    case 'patrol':
                        // Patrol specific areas
                        ghost.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
                        break;
                        
                    case 'random':
                    default:
                        ghost.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
                        break;
                }
            }
        }
    }

    collectPellet() {
        const x = Math.floor(this.player.x);
        const y = Math.floor(this.player.y);
        
        // Check for regular pellet
        if (this.maze[y][x] === 1) {
            this.maze[y][x] = 3;
            this.addScore(10);
            this.pelletsCollected++;
            this.combo++;
            
            if (this.combo > this.maxCombo) {
                this.maxCombo = this.combo;
            }
        }
        
        // Check for power pellet
        if (this.maze[y][x] === 2) {
            this.maze[y][x] = 3;
            this.addScore(50);
            this.pelletsCollected++;
            
            // Activate power mode
            this.player.isPowered = true;
            this.player.powerTimer = 100;
            this.ghosts.forEach(ghost => ghost.isScared = true);
        }
    }

    addScore(points) {
        let multiplier = 1;
        
        if (this.player.doublePoints) multiplier *= 2;
        if (game.state.comboMultiplier > 1) multiplier *= game.state.comboMultiplier;
        
        this.score += Math.floor(points * multiplier);
    }

    checkCollisions() {
        this.ghosts.forEach((ghost, index) => {
            const distance = Math.abs(ghost.x - this.player.x) + Math.abs(ghost.y - this.player.y);
            
            if (distance < 0.5) {
                if (ghost.isScared || this.player.invincible) {
                    // Eat ghost
                    this.addScore(200);
                    ghost.x = 9;
                    ghost.y = 9;
                    ghost.isScared = false;
                    ui.createFloatingText('+200', ghost.x * this.cellSize, ghost.y * this.cellSize, '#FFD700');
                    this.combo += 5;
                } else if (!this.player.invincible) {
                    // Player caught
                    this.loseLife();
                }
            }
        });
    }

    loseLife() {
        this.lives--;
        this.combo = 0;
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Reset positions
            this.player.x = 9;
            this.player.y = 15;
            this.player.direction = 'right';
            
            this.ghosts.forEach((ghost, index) => {
                ghost.x = 9;
                ghost.y = 9;
                ghost.direction = ['up', 'left', 'right'][index];
                ghost.isScared = false;
            });
            
            ui.addScreenEffect('shake');
        }
    }

    isValidMove(x, y) {
        if (x < 0 || x >= this.mazeWidth || y < 0 || y >= this.mazeHeight) {
            return false;
        }
        
        return this.maze[y][x] !== 0;
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw maze
        for (let y = 0; y < this.mazeHeight; y++) {
            for (let x = 0; x < this.mazeWidth; x++) {
                const cell = this.maze[y][x];
                
                if (cell === 0) {
                    // Wall
                    this.ctx.fillStyle = '#0066CC';
                    this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                } else if (cell === 1) {
                    // Pellet
                    this.ctx.fillStyle = '#FFF';
                    this.ctx.beginPath();
                    this.ctx.arc(x * this.cellSize + this.cellSize/2, y * this.cellSize + this.cellSize/2, 2, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (cell === 2) {
                    // Power pellet
                    this.ctx.fillStyle = '#FFF';
                    this.ctx.beginPath();
                    this.ctx.arc(x * this.cellSize + this.cellSize/2, y * this.cellSize + this.cellSize/2, 4, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
        
        // Draw power-ups
        this.powerUps.forEach(powerUp => {
            if (!powerUp.collected) {
                this.ctx.fillStyle = this.getPowerUpColor(powerUp.type);
                this.ctx.fillRect(
                    powerUp.x * this.cellSize + 2,
                    powerUp.y * this.cellSize + 2,
                    this.cellSize - 4,
                    this.cellSize - 4
                );
            }
        });
        
        // Draw ghosts
        this.ghosts.forEach(ghost => {
            this.ctx.fillStyle = ghost.isScared ? '#0000FF' : ghost.color;
            this.ctx.beginPath();
            this.ctx.arc(ghost.x * this.cellSize + this.cellSize/2, ghost.y * this.cellSize + this.cellSize/2, this.cellSize/2 - 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Ghost eyes
            this.ctx.fillStyle = '#FFF';
            this.ctx.beginPath();
            this.ctx.arc(ghost.x * this.cellSize + this.cellSize/3, ghost.y * this.cellSize + this.cellSize/3, 2, 0, Math.PI * 2);
            this.ctx.arc(ghost.x * this.cellSize + 2*this.cellSize/3, ghost.y * this.cellSize + this.cellSize/3, 2, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Draw Pac-Man
        this.ctx.fillStyle = this.player.invincible ? '#FFD700' : '#FFFF00';
        this.ctx.beginPath();
        
        let startAngle = 0;
        let endAngle = Math.PI * 2;
        
        if (this.player.animationFrame === 0) {
            // Mouth closed
            this.ctx.arc(this.player.x * this.cellSize + this.cellSize/2, this.player.y * this.cellSize + this.cellSize/2, this.cellSize/2 - 2, startAngle, endAngle);
        } else {
            // Mouth open
            const mouthAngle = Math.PI / 4;
            const directionAngles = {
                'right': 0,
                'down': Math.PI / 2,
                'left': Math.PI,
                'up': 3 * Math.PI / 2
            };
            
            const baseAngle = directionAngles[this.player.direction] || 0;
            startAngle = baseAngle - mouthAngle;
            endAngle = baseAngle + mouthAngle;
            
            this.ctx.arc(this.player.x * this.cellSize + this.cellSize/2, this.player.y * this.cellSize + this.cellSize/2, this.cellSize/2 - 2, startAngle, endAngle);
            this.ctx.lineTo(this.player.x * this.cellSize + this.cellSize/2, this.player.y * this.cellSize + this.cellSize/2);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
        
        // Update UI
        ui.updatePacmanUI(this.score, this.lives, this.isEndless ? '∞' : this.timeLeft, this.wave);
    }

    getPowerUpColor(type) {
        switch(type) {
            case 'speed': return '#00FF00';
            case 'invincible': return '#FFD700';
            case 'magnet': return '#FF00FF';
            case 'double': return '#00FFFF';
            default: return '#FFFFFF';
        }
    }

    startTimer() {
        const timerInterval = setInterval(() => {
            if (!this.isRunning || this.isEndless) {
                clearInterval(timerInterval);
                return;
            }
            
            if (!this.isPaused) {
                this.timeLeft--;
                
                if (this.timeLeft <= 0) {
                    clearInterval(timerInterval);
                    this.gameOver();
                }
            }
        }, 1000);
    }

    winLevel() {
        this.isRunning = false;
        
        // Calculate bonus
        const timeBonus = this.timeLeft * 10;
        const lifeBonus = this.lives * 100;
        const comboBonus = this.maxCombo * 50;
        const totalBonus = timeBonus + lifeBonus + comboBonus;
        
        this.addScore(totalBonus);
        
        ui.showPacmanMessage(`Level Complete! Score: ${this.score}`, true);
        
        document.getElementById('pacmanContinue').onclick = () => {
            ui.hidePacmanMessage();
            game.switchScene('restaurant');
            game.completeMiniGame(this.score, true);
        };
    }

    gameOver() {
        this.isRunning = false;
        
        if (this.isEndless && this.score > game.state.endlessHighScore) {
            game.state.endlessHighScore = this.score;
            game.saveProgress();
            ui.showPacmanMessage(`New High Score: ${this.score}!`, true);
        } else {
            ui.showPacmanMessage(`Game Over! Score: ${this.score}`, true);
        }
        
        document.getElementById('pacmanContinue').onclick = () => {
            ui.hidePacmanMessage();
            if (this.isEndless) {
                game.switchScene('menu');
            } else {
                game.switchScene('restaurant');
                game.completeMiniGame(this.score, false);
            }
        };
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.isRunning || this.isPaused) return;
            
            switch(e.key) {
                case 'ArrowUp':
                    this.player.nextDirection = 'up';
                    break;
                case 'ArrowDown':
                    this.player.nextDirection = 'down';
                    break;
                case 'ArrowLeft':
                    this.player.nextDirection = 'left';
                    break;
                case 'ArrowRight':
                    this.player.nextDirection = 'right';
                    break;
                case ' ':
                    this.isPaused = !this.isPaused;
                    break;
            }
        });
    }
}

// Initialize Pac-Man game
const pacman = new PacMan();
