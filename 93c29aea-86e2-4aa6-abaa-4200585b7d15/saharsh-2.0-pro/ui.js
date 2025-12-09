// ui.js
// UI rendering and updates

const root = document.getElementById('game-root');

/**
 * Render main menu
 */
function renderMenu() {
  root.innerHTML = `
    <div class="game-menu" role="region" aria-label="Main Menu">
      <h1>Saharsh and Anbu Dating Sim</h1>
      <button class="choice-btn" id="start-btn">Start New Game</button>
      <button class="choice-btn" id="load-btn">Load Game</button>
      <button class="choice-btn" id="gallery-btn">Gallery</button>
      <button class="choice-btn" id="settings-btn">Settings</button>
    </div>
  `;
  document.getElementById('start-btn').onclick = () => window.game.startNewGame();
  document.getElementById('load-btn').onclick = () => window.game.loadGame();
  document.getElementById('gallery-btn').onclick = () => window.game.showGallery();
  document.getElementById('settings-btn').onclick = () => window.game.showSettings();
  focusFirstButton();
  document.dispatchEvent(new CustomEvent('gameTitleChange', { detail: "Menu - Saharsh and Anbu Dating Sim" }));
}

/**
 * Render dialogue scene
 */
function renderDialogue(node, gameState) {
  const char = node.speaker ? window.characters.getCharacter(node.speaker) : null;
  const portrait = char ? window.characters.getCurrentPortrait(node.speaker) : '';
  root.innerHTML = `
    <img class="background-image" src="${node.background || ''}" alt="">
    <div class="game-dialogue" role="dialog" aria-live="polite">
      ${portrait ? `<img class="character-portrait" src="${portrait}" alt="${char.name}">` : ''}
      <div class="dialogue-text">${node.text}</div>
      <div class="relationship-bar" aria-label="Relationship">
        <div class="relationship-bar-inner" style="width:${gameState.relationshipStats.saharshToAnbu * 10}%"></div>
      </div>
      <div class="choices"></div>
    </div>
  `;
  if (node.choices) {
    const choicesDiv = root.querySelector('.choices');
    window.story.getAvailableChoices(node, gameState).forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.text;
      btn.onclick = () => window.game.handleChoice(choice);
      choicesDiv.appendChild(btn);
    });
  }
  focusFirstButton();
  document.dispatchEvent(new CustomEvent('gameTitleChange', { detail: "Story - Saharsh and Anbu Dating Sim" }));
}

/**
 * Render mini-game
 */
function renderMiniGame(state) {
  if (state.type === 'memoryMatch') {
    root.innerHTML = `
      <div class="game-minigame" role="region" aria-label="Memory Match">
        <h2>Memory Match</h2>
        <div class="minigame-board"></div>
        <div>Moves Left: ${state.movesLeft}</div>
        <button class="choice-btn" id="exit-minigame-btn">Exit</button>
      </div>
    `;
    const boardDiv = root.querySelector('.minigame-board');
    state.board.forEach((card, i) => {
      const cardBtn = document.createElement('button');
      cardBtn.className = 'choice-btn';
      cardBtn.style.width = '48px';
      cardBtn.style.height = '48px';
      cardBtn.textContent = card.revealed || card.matched ? card.emoji : '❓';
      cardBtn.disabled = card.revealed || card.matched || state.selectedCards.length === 2;
      cardBtn.onclick = () => window.game.handleMiniGameAction({ type: 'select', index: i });
      boardDiv.appendChild(cardBtn);
    });
    document.getElementById('exit-minigame-btn').onclick = () => window.game.exitMiniGame();
    focusFirstButton();
    document.dispatchEvent(new CustomEvent('gameTitleChange', { detail: "Mini-game - Saharsh and Anbu Dating Sim" }));
  }
}

/**
 * Render ending
 */
function renderEnding(endingId, gameState) {
  root.innerHTML = `
    <div class="game-ending" role="region" aria-label="Ending">
      <h2>Ending: ${endingId}</h2>
      <img class="cg-image" src="assets/cgs/${endingId}.png" alt="Ending CG">
      <div>
        <button class="choice-btn" id="to-menu-btn">Return to Menu</button>
        <button class="choice-btn" id="gallery-btn">Gallery</button>
      </div>
    </div>
  `;
  document.getElementById('to-menu-btn').onclick = () => window.game.showMenu();
  document.getElementById('gallery-btn').onclick = () => window.game.showGallery();
  focusFirstButton();
  document.dispatchEvent(new CustomEvent('gameTitleChange', { detail: "Ending - Saharsh and Anbu Dating Sim" }));
}

/**
 * Render gallery
 */
function renderGallery(gameState) {
  root.innerHTML = `
    <div class="game-gallery" role="region" aria-label="Gallery">
      <h2>Gallery</h2>
      <div class="gallery-cgs"></div>
      <button class="choice-btn" id="back-btn">Back</button>
    </div>
  `;
  const galleryDiv = root.querySelector('.gallery-cgs');
  if (gameState.unlockedCGs.length === 0) {
    galleryDiv.innerHTML = "<p>No CGs unlocked yet!</p>";
  } else {
    gameState.unlockedCGs.forEach(cgId => {
      const img = document.createElement('img');
      img.className = 'cg-image';
      img.src = `assets/cgs/${cgId}.png`;
      img.alt = `CG ${cgId}`;
      galleryDiv.appendChild(img);
    });
  }
  document.getElementById('back-btn').onclick = () => window.game.showMenu();
  focusFirstButton();
  document.dispatchEvent(new CustomEvent('gameTitleChange', { detail: "Gallery - Saharsh and Anbu Dating Sim" }));
}

/**
 * Render settings
 */
function renderSettings(gameState) {
  root.innerHTML = `
    <div class="game-settings" role="region" aria-label="Settings">
      <h2>Settings</h2>
      <label>
        Music Volume:
        <input type="range" min="0" max="1" step="0.01" value="${gameState.audioSettings.musicVolume}" id="music-vol">
      </label>
      <label>
        SFX Volume:
        <input type="range" min="0" max="1" step="0.01" value="${gameState.audioSettings.sfxVolume}" id="sfx-vol">
      </label>
      <label>
        <input type="checkbox" id="mute" ${gameState.audioSettings.mute ? 'checked' : ''}> Mute
      </label>
      <button class="choice-btn" id="back-btn">Back</button>
    </div>
  `;
  document.getElementById('music-vol').oninput = (e) => window.game.setMusicVolume(e.target.value);
  document.getElementById('sfx-vol').oninput = (e) => window.game.setSFXVolume(e.target.value);
  document.getElementById('mute').onchange = (e) => window.game.setMute(e.target.checked);
  document.getElementById('back-btn').onclick = () => window.game.showMenu();
  focusFirstButton();
  document.dispatchEvent(new CustomEvent('gameTitleChange', { detail: "Settings - Saharsh and Anbu Dating Sim" }));
}

/**
 * Focus first button for accessibility
 */
function focusFirstButton() {
  const btn = root.querySelector('button.choice-btn');
  if (btn) btn.focus();
}

window.ui = {
  renderMenu,
  renderDialogue,
  renderMiniGame,
  renderEnding,
  renderGallery,
  renderSettings
};
