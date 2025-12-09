// game.js
// Main game loop and state management

/**
 * Get initial game state
 */
function getInitialGameState() {
  return {
    currentScene: 'menu',
    currentChapter: 0,
    currentStoryNodeId: 'ch1_start',
    relationshipStats: {
      saharshToAnbu: 5,
      anbuToSaharsh: 5
    },
    inventory: [],
    flags: {},
    unlockedCGs: [],
    unlockedEndings: [],
    miniGameState: null,
    saveSlots: [],
    isPaused: false,
    audioSettings: {
      musicVolume: 0.7,
      sfxVolume: 1.0,
      mute: false
    }
  };
}

window.gameState = getInitialGameState();

/**
 * Start a new game
 */
function startNewGame() {
  window.characters.resetCharacters();
  window.levels.resetCGs();
  window.story.resetStoryState();
  window.gameState = getInitialGameState();
  window.audio.playMusic('main');
  showStory();
}

/**
 * Load game from storage
 */
function loadGame() {
  const loaded = window.utils.loadGameState();
  if (loaded) {
    window.gameState = loaded;
    showStory();
  } else {
    alert("No saved game found.");
    showMenu();
  }
}

/**
 * Save game to storage
 */
function saveGame() {
  window.utils.saveGameState(window.gameState);
}

/**
 * Show main menu
 */
function showMenu() {
  window.gameState.currentScene = 'menu';
  window.ui.renderMenu();
}

/**
 * Show story scene
 */
function showStory() {
  window.gameState.currentScene = 'story';
  const node = window.story.getNode(window.gameState.currentStoryNodeId);
  if (!node) {
    showMenu();
    return;
  }
  window.ui.renderDialogue(node, window.gameState);
}

/**
 * Handle choice selection
 */
function handleChoice(choice) {
  if (choice.effects) choice.effects(window.gameState);
  window.audio.playUI();
  window.gameState.currentStoryNodeId = choice.nextNodeId;
  const node = window.story.getNode(window.gameState.currentStoryNodeId);
  if (!node) {
    showMenu();
    return;
  }
  if (node.minigame) {
    startMiniGame(node.minigame);
  } else if (node.next) {
    window.gameState.currentStoryNodeId = node.next;
    showStory();
  } else {
    showStory();
  }
  saveGame();
}

/**
 * Start a mini-game
 */
function startMiniGame(type) {
  if (type === 'memoryMatch') {
    window.gameState.currentScene = 'minigame';
    window.gameState.miniGameState = window.minigames.initMemoryMatch();
    window.audio.playMusic('minigame');
    window.ui.renderMiniGame(window.gameState.miniGameState);
  }
}

/**
 * Handle mini-game action
 */
function handleMiniGameAction(action) {
  if (window.gameState.miniGameState.type === 'memoryMatch') {
    window.minigames.updateMemoryMatch(window.gameState.miniGameState, action);
    window.ui.renderMiniGame(window.gameState.miniGameState);
    if (window.gameState.miniGameState.isComplete) {
      setTimeout(() => {
        window.audio.playMusic('main');
        if (window.gameState.miniGameState.result === 'win') {
          window.gameState.relationshipStats.saharshToAnbu += 3;
        } else {
          window.gameState.relationshipStats.saharshToAnbu -= 2;
        }
        window.gameState.currentScene = 'story';
        showStory();
        saveGame();
      }, 1000);
    }
  }
}

/**
 * Exit mini-game
 */
function exitMiniGame() {
  window.audio.playMusic('main');
  window.gameState.currentScene = 'story';
  showStory();
}

/**
 * Determine ending based on relationship stats
 */
function determineEnding() {
  const rel = window.gameState.relationshipStats.saharshToAnbu;
  if (rel >= 12) return 'TrueLove';
  if (rel >= 8) return 'FriendsForever';
  if (rel >= 4) return 'AwkwardAcquaintances';
  return 'Rivals';
}

/**
 * Show ending screen
 */
function showEnding(endingId) {
  if (!endingId) endingId = determineEnding();
  window.gameState.currentScene = 'ending';
  if (!window.gameState.unlockedEndings.includes(endingId)) {
    window.gameState.unlockedEndings.push(endingId);
  }
  window.ui.renderEnding(endingId, window.gameState);
  saveGame();
}

/**
 * Show gallery
 */
function showGallery() {
  window.gameState.currentScene = 'gallery';
  window.ui.renderGallery(window.gameState);
}

/**
 * Show settings
 */
function showSettings() {
  window.gameState.currentScene = 'settings';
  window.ui.renderSettings(window.gameState);
}

/**
 * Set music volume
 */
function setMusicVolume(val) {
  window.gameState.audioSettings.musicVolume = parseFloat(val);
  window.audio.setVolume(window.gameState.audioSettings.musicVolume, window.gameState.audioSettings.sfxVolume);
}

/**
 * Set SFX volume
 */
function setSFXVolume(val) {
  window.gameState.audioSettings.sfxVolume = parseFloat(val);
  window.audio.setVolume(window.gameState.audioSettings.musicVolume, window.gameState.audioSettings.sfxVolume);
}

/**
 * Set mute
 */
function setMute(val) {
  window.gameState.audioSettings.mute = val;
  window.audio.mute(val);
}

/**
 * Main game loop (for future expansion)
 */
function mainGameLoop() {
  // For animation, timers, etc.
  requestAnimationFrame(mainGameLoop);
}

window.game = {
  startNewGame,
  loadGame,
  saveGame,
  showMenu,
  showStory,
  handleChoice,
  startMiniGame,
  handleMiniGameAction,
  exitMiniGame,
  showEnding,
  showGallery,
  showSettings,
  setMusicVolume,
  setSFXVolume,
  setMute
};

// Start game
window.addEventListener('DOMContentLoaded', () => {
  showMenu();
  mainGameLoop();
});
