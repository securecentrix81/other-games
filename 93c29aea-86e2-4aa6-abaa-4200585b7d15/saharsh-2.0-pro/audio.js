// audio.js
// Audio management for Saharsh and Anbu Dating Sim

const musicTracks = {
  main: 'assets/audio/main_theme.mp3',
  romance: 'assets/audio/romance_theme.mp3',
  minigame: 'assets/audio/minigame_theme.mp3',
  ending: 'assets/audio/ending_theme.mp3'
};

const sfx = {
  click: 'assets/audio/click.wav',
  success: 'assets/audio/success.wav',
  fail: 'assets/audio/fail.wav',
  heart: 'assets/audio/heart.wav',
  ui: 'assets/audio/ui.wav'
};

let currentMusic = null;
let musicVolume = 0.7;
let sfxVolume = 1.0;
let isMuted = false;

/**
 * Play background music
 */
function playMusic(trackId) {
  if (isMuted) return;
  if (currentMusic) currentMusic.stop();
  if (!musicTracks[trackId]) return;
  try {
    currentMusic = new Howl({
      src: [musicTracks[trackId]],
      loop: true,
      volume: musicVolume
    });
    currentMusic.play();
  } catch (e) {
    // Fallback: do nothing
  }
}

/**
 * Stop music
 */
function stopMusic() {
  if (currentMusic) currentMusic.stop();
  currentMusic = null;
}

/**
 * Play sound effect
 */
function playSFX(sfxId) {
  if (isMuted) return;
  if (!sfx[sfxId]) return;
  try {
    const sound = new Howl({
      src: [sfx[sfxId]],
      volume: sfxVolume
    });
    sound.play();
  } catch (e) {}
}

/**
 * Play UI feedback sound
 */
function playUI() {
  playSFX('ui');
}

/**
 * Set volumes
 */
function setVolume(music, sfxV) {
  musicVolume = music;
  sfxVolume = sfxV;
  if (currentMusic) currentMusic.volume(musicVolume);
}

/**
 * Mute/unmute all audio
 */
function mute(val = true) {
  isMuted = val;
  if (currentMusic) currentMusic.mute(isMuted);
}

/**
 * Fade out music
 */
function fadeMusicOut(duration = 1000) {
  if (currentMusic) {
    currentMusic.fade(musicVolume, 0, duration);
    setTimeout(() => stopMusic(), duration);
  }
}

/**
 * Fade in music
 */
function fadeMusicIn(trackId, duration = 1000) {
  if (isMuted) return;
  if (currentMusic) currentMusic.stop();
  if (!musicTracks[trackId]) return;
  try {
    currentMusic = new Howl({
      src: [musicTracks[trackId]],
      loop: true,
      volume: 0
    });
    currentMusic.play();
    currentMusic.fade(0, musicVolume, duration);
  } catch (e) {}
}

/**
 * Stop all sounds
 */
function stopAll() {
  stopMusic();
  // Howler global stop (if needed)
  if (window.Howler) window.Howler.stop();
}

window.audio = {
  playMusic,
  stopMusic,
  playSFX,
  playUI,
  setVolume,
  mute,
  fadeMusicOut,
  fadeMusicIn,
  stopAll,
  get isMuted() { return isMuted; }
};
