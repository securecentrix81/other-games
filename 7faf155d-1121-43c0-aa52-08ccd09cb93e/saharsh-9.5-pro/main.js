/**
 * main.js - Entry Point for osu! Web Clone
 * Initializes the game, sets up canvas, and handles window events
 * Dependencies: game.js (and transitively all other modules)
 */

import { Game } from './game.js';

// Global game instance
let game = null;

/**
 * Initialize the game when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get canvas element
        const canvas = document.getElementById('game-canvas');
        if (!canvas) {
            throw new Error('Game canvas not found');
        }

        // Set initial canvas size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Create game instance
        game = new Game(canvas);

        // Setup window resize handler
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            game.handleResize();
        });

        // Prevent default browser behaviors that interfere with gameplay
        setupInputPrevention();

        // Prevent context menu on canvas (right-click)
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Initialize and start the game
        await game.initialize();
        console.log('osu! Web Clone initialized successfully');

    } catch (error) {
        console.error('Failed to initialize game:', error);
        showErrorScreen(error.message);
    }
});

/**
 * Setup input prevention for gameplay keys
 */
function setupInputPrevention() {
    document.addEventListener('keydown', (e) => {
        // Prevent scrolling on arrow keys and space
        const preventKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'];
        if (preventKeys.includes(e.key) || preventKeys.includes(e.code)) {
            e.preventDefault();
        }
    });

    // Prevent drag on canvas
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        canvas.addEventListener('dragstart', (e) => e.preventDefault());
        canvas.addEventListener('drop', (e) => e.preventDefault());
    }

    // Prevent selection during gameplay
    document.addEventListener('selectstart', (e) => {
        if (game && (game.state === 'playing' || game.state === 'countdown')) {
            e.preventDefault();
        }
    });
}

/**
 * Show error screen when initialization fails
 */
function showErrorScreen(message) {
    // Hide loading screen if visible
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }

    // Create or show error screen
    let errorScreen = document.getElementById('error-screen');
    if (!errorScreen) {
        errorScreen = document.createElement('div');
        errorScreen.id = 'error-screen';
        errorScreen.className = 'screen active';
        errorScreen.innerHTML = `
            <div class="error-container">
                <h1>Failed to Load Game</h1>
                <p class="error-message">${escapeHtml(message)}</p>
                <p class="error-hint">Please check the console for more details.</p>
                <button onclick="location.reload()" class="btn btn-primary">Retry</button>
            </div>
        `;
        document.body.appendChild(errorScreen);
    } else {
        const msgEl = errorScreen.querySelector('.error-message');
        if (msgEl) {
            msgEl.textContent = message;
        }
        errorScreen.style.display = 'flex';
        errorScreen.classList.add('active');
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Handle visibility change (tab switching)
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden && game && game.state === 'playing') {
        // Auto-pause when tab loses focus
        game.pauseGame();
    }
});

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
    if (game) {
        game.stopGameLoop();
    }
});

// Export game instance for debugging
window.osuGame = () => game;
