// utils.js
// Utility functions for Saharsh and Anbu Dating Sim

const STORAGE_PREFIX = location.pathname + "_saharshAnbuDS_";

/**
 * Save game state to localStorage
 * @param {Object} state
 * @param {number} slot
 */
function saveGameState(state, slot = 0) {
  try {
    localStorage.setItem(STORAGE_PREFIX + "save" + slot, JSON.stringify(state));
  } catch (e) {
    alert("Failed to save game: " + e.message);
  }
}

/**
 * Load game state from localStorage
 * @param {number} slot
 * @returns {Object|null}
 */
function loadGameState(slot = 0) {
  try {
    const data = localStorage.getItem(STORAGE_PREFIX + "save" + slot);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    alert("Failed to load game: " + e.message);
    return null;
  }
}

/**
 * Remove all game saves for this game
 */
function clearGameSaves() {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(STORAGE_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Debounce function
 */
function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle function
 */
function throttle(fn, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Clamp value between min and max
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Random integer in [min, max]
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffle(arr) {
  let a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Deep clone (safe for serializable objects)
 */
function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return null;
  }
}

/**
 * Get current timestamp (ms)
 */
function now() {
  return Date.now();
}

/**
 * Format time as mm:ss
 */
function formatTime(ms) {
  const sec = Math.floor(ms / 1000);
  return `${Math.floor(sec / 60)}:${('0' + (sec % 60)).slice(-2)}`;
}

// Prevent scrolling on arrow/space/enter keys
window.addEventListener('keydown', function(e) {
  const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar', 'Enter'];
  if (keys.includes(e.key)) {
    e.preventDefault();
  }
}, { passive: false });

window.utils = {
  saveGameState,
  loadGameState,
  clearGameSaves,
  debounce,
  throttle,
  clamp,
  randInt,
  shuffle,
  deepClone,
  now,
  formatTime,
  STORAGE_PREFIX
};
