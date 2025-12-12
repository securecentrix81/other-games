// Enhanced Audio Management System
class Audio {
    constructor() {
        this.sounds = {};
        this.music = {};
        this.isMuted = false;
        this.masterVolume = 0.5;
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        
        this.currentMusic = null;
        this.audioContext = null;
        
        this.initAudioContext();
        this.createSounds();
    }

    initAudioContext() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }

    createSounds() {
        // Create simple sound effects using Web Audio API
        this.sounds = {
            eatPellet: () => this.playTone(800, 50, 'square'),
            eatPowerPellet: () => this.playTone(1200, 100, 'square'),
            eatGhost: () => this.playTone(400, 200, 'sawtooth'),
            loseLife: () => this.playTone(200, 500, 'sawtooth'),
            winLevel: () => this.playMelody([523, 659, 784, 1047], 100),
            gameOver: () => this.playMelody([523, 494, 440, 392], 200),
            loveIncrease: () => this.playMelody([523, 659, 784], 150),
            loveDecrease: () => this.playMelody([392, 349, 330], 150),
            dialogueAppear: () => this.playTone(600, 30, 'sine'),
            selectChoice: () => this.playTone(440, 50, 'sine'),
            betrayal: () => this.playMelody([220, 207, 196, 185], 300),
            heartBeat: () => this.playHeartbeat(),
            achievement: () => this.playMelody([523, 659, 784, 1047, 1319], 100),
            purchase: () => this.playTone(880, 100, 'sine'),
            powerUp: () => this.playMelody([440, 554, 659], 80),
            combo: () => this.playTone(660, 50, 'triangle')
        };

        // Create background music patterns
        this.musicPatterns = {
            menu: [
                {note: 261, duration: 500}, // C
                {note: 293, duration: 500}, // D
                {note: 329, duration: 500}, // E
                {note: 261, duration: 1000} // C
            ],
            restaurant: [
                {note: 392, duration: 750}, // G
                {note: 349, duration: 750}, // F
                {note: 330, duration: 750}, // E
                {note: 349, duration: 750}, // F
                {note: 392, duration: 1000}, // G
            ],
            pacman: [
                {note: 392, duration: 125}, // G
                {note: 392, duration: 125}, // G
                {note: 392, duration: 125}, // G
                {note: 349, duration: 250}, // F
                {note: 523, duration: 250}, // C
            ],
            endless: [
                {note: 440, duration: 100}, // A
                {note: 494, duration: 100}, // B
                {note: 523, duration: 100}, // C
                {note: 587, duration: 100}, // D
                {note: 659, duration: 200}, // E
            ],
            ending: [
                {note: 220, duration: 1000}, // A
                {note: 207, duration: 1000}, // G#
                {note: 196, duration: 1000}, // G
                {note: 185, duration: 2000}  // F#
            ],
            upgrades: [
                {note: 523, duration: 200}, // C
                {note: 659, duration: 200}, // E
                {note: 784, duration: 200}, // G
                {note: 1047, duration: 400} // High C
            ]
        };
    }

    playTone(frequency, duration, type = 'sine') {
        if (!this.audioContext || this.isMuted) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration / 1000);
    }

    playMelody(notes, noteDuration) {
        notes.forEach((note, index) => {
            setTimeout(() => {
                this.playTone(note, noteDuration, 'sine');
            }, index * noteDuration);
        });
    }

    playHeartbeat() {
        if (!this.audioContext || this.isMuted) return;

        const playBeat = () => {
            this.playTone(60, 100, 'sine');
            setTimeout(() => this.playTone(60, 100, 'sine'), 150);
        };

        playBeat();
        setTimeout(playBeat, 800);
    }

    playBackgroundMusic(musicType) {
        if (this.currentMusic) {
            this.stopBackgroundMusic();
        }

        const pattern = this.musicPatterns[musicType];
        if (!pattern) return;

        this.currentMusic = {
            type: musicType,
            isPlaying: true,
            currentNote: 0
        };

        this.playMusicLoop(pattern);
    }

    playMusicLoop(pattern) {
        if (!this.currentMusic || !this.currentMusic.isPlaying) return;

        const note = pattern[this.currentMusic.currentNote % pattern.length];
        this.playTone(note.note, note.duration * 0.8, 'triangle');

        this.currentMusic.currentNote++;

        setTimeout(() => {
            this.playMusicLoop(pattern);
        }, note.duration);
    }

    stopBackgroundMusic() {
        if (this.currentMusic) {
            this.currentMusic.isPlaying = false;
            this.currentMusic = null;
        }
    }

    playSound(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }

    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
    }

    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            this.stopBackgroundMusic();
        } else {
            // Resume music if it was playing
            const currentScene = game.state.currentScene;
            if (currentScene === 'menu') {
                this.playBackgroundMusic('menu');
            } else if (currentScene === 'restaurant') {
                this.playBackgroundMusic('restaurant');
            } else if (currentScene === 'pacman') {
                if (pacman && pacman.isEndless) {
                    this.playBackgroundMusic('endless');
                } else {
                    this.playBackgroundMusic('pacman');
                }
            } else if (currentScene === 'upgrades') {
                this.playBackgroundMusic('upgrades');
            }
        }
        
        return this.isMuted;
    }

    // Scene-specific audio management
    playSceneAudio(sceneName) {
        this.stopBackgroundMusic();

        switch(sceneName) {
            case 'menu':
                this.playBackgroundMusic('menu');
                break;
            case 'restaurant':
                this.playBackgroundMusic('restaurant');
                break;
            case 'pacman':
                if (pacman && pacman.isEndless) {
                    this.playBackgroundMusic('endless');
                } else {
                    this.playBackgroundMusic('pacman');
                }
                break;
            case 'ending':
                this.playBackgroundMusic('ending');
                break;
            case 'upgrades':
                this.playBackgroundMusic('upgrades');
                break;
            case 'achievements':
                this.playBackgroundMusic('menu');
                break;
        }
    }

    // Event-based audio triggers
    onDialogueStart() {
        this.playSound('dialogueAppear');
    }

    onChoiceSelect() {
        this.playSound('selectChoice');
    }

    onLoveChange(amount) {
        if (amount > 0) {
            this.playSound('loveIncrease');
        } else {
            this.playSound('loveDecrease');
        }
    }

    onPacmanEatPellet() {
        this.playSound('eatPellet');
    }

    onPacmanEatPowerPellet() {
        this.playSound('eatPowerPellet');
    }

    onPacmanEatGhost() {
        this.playSound('eatGhost');
    }

    onPacmanLoseLife() {
        this.playSound('loseLife');
    }

    onPacmanWin() {
        this.playSound('winLevel');
    }

    onPacmanGameOver() {
        this.playSound('gameOver');
    }

    onBetrayalReveal() {
        this.playSound('betrayal');
        // Add heartbeat effect for dramatic tension
        setTimeout(() => this.playHeartbeat(), 500);
    }

    onAchievementUnlock() {
        this.playSound('achievement');
    }

    onUpgradePurchase() {
        this.playSound('purchase');
    }

    onPowerUpCollect() {
        this.playSound('powerUp');
    }

    onComboIncrease() {
        this.playSound('combo');
    }

    // Initialize audio on first user interaction
    initAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}

// Initialize audio system
const audio = new Audio();

// Add audio initialization on first user interaction
document.addEventListener('click', () => {
    audio.initAudio();
}, { once: true });

// Add keyboard shortcut for mute
document.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
        const isMuted = audio.toggleMute();
        console.log(isMuted ? 'Audio muted' : 'Audio unmuted');
    }
});
