/**
 * songSelect.js - Song Selection Screen Manager for osu! Web Clone
 * Handles beatmap list display, difficulty selection, and preview
 * Dependencies: beatmapLoader.js, audio.js, ui.js
 * 
 * Note: This manager works with the beatmap set structure from beatmapLoader.js
 * Each set contains: { title, artist, creator, difficulties[] }
 * Each difficulty contains: { name, url, starRating, beatmap? }
 */

import { loadBeatmapDifficulty } from './beatmapLoader.js';

export class SongSelectManager {
    constructor(audioManager) {
        this.audio = audioManager;
        this.beatmapSets = [];
        this.selectedSetIndex = 0;
        this.selectedDiffIndex = 0;
        this.callbacks = {};
        
        // DOM elements
        this.songListContainer = null;
        this.difficultyContainer = null;
        this.previewPanel = null;
        
        this.isLoading = false;
        this.keyboardNavigationSetup = false;
    }

    /**
     * Initialize the song select screen
     */
    async initialize(beatmapSets) {
        this.beatmapSets = beatmapSets;
        
        // Cache DOM elements
        this.songListContainer = document.getElementById('song-list');
        this.difficultyContainer = document.getElementById('difficulty-list');
        this.previewPanel = document.getElementById('preview-panel');
        
        // Render song list
        this.renderSongList();
        
        // Setup keyboard navigation
        this.setupKeyboardNavigation();
        
        // Select first song by default
        if (this.beatmapSets.length > 0) {
            await this.selectSong(0);
        }
    }

    /**
     * Event emitter pattern
     */
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(cb => cb(data));
        }
    }

    /**
     * Render the song list
     */
    renderSongList() {
        if (!this.songListContainer) return;
        
        this.songListContainer.innerHTML = '';
        
        this.beatmapSets.forEach((set, index) => {
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            songItem.dataset.index = index;
            
            songItem.innerHTML = `
                <div class="song-title">${this.escapeHtml(set.title)}</div>
                <div class="song-artist">${this.escapeHtml(set.artist)}</div>
                <div class="song-mapper">Mapped by ${this.escapeHtml(set.creator)}</div>
            `;
            
            songItem.addEventListener('click', () => this.selectSong(index));
            
            this.songListContainer.appendChild(songItem);
        });
    }

    /**
     * Select a song and update UI
     */
    async selectSong(index) {
        if (index < 0 || index >= this.beatmapSets.length) return;
        
        this.selectedSetIndex = index;
        this.updateSongSelection();
        this.renderDifficultyList();
        
        // Select first difficulty
        if (this.getCurrentSet().difficulties.length > 0) {
            await this.selectDifficulty(0);
        }
    }

    /**
     * Update visual selection state for songs
     */
    updateSongSelection() {
        if (!this.songListContainer) return;
        
        const items = this.songListContainer.querySelectorAll('.song-item');
        items.forEach((item, i) => {
            if (i === this.selectedSetIndex) {
                item.classList.add('selected');
                // Scroll into view if needed
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    /**
     * Render difficulty list for selected song
     */
    renderDifficultyList() {
        if (!this.difficultyContainer) return;
        
        this.difficultyContainer.innerHTML = '';
        
        const currentSet = this.getCurrentSet();
        if (!currentSet) return;
        
        currentSet.difficulties.forEach((diff, index) => {
            const diffItem = document.createElement('div');
            diffItem.className = 'difficulty-item';
            diffItem.dataset.index = index;
            
            const starColor = this.getStarColor(diff.starRating);
            const stars = this.getStarDisplay(diff.starRating);
            
            diffItem.innerHTML = `
                <span class="diff-name">${this.escapeHtml(diff.name)}</span>
                <span class="diff-stars" style="color: ${starColor}">${stars}</span>
            `;
            
            diffItem.addEventListener('click', () => this.selectDifficulty(index));
            
            this.difficultyContainer.appendChild(diffItem);
        });
    }

    /**
     * Select a difficulty and load beatmap if needed
     */
    async selectDifficulty(index) {
        const currentSet = this.getCurrentSet();
        if (!currentSet || index < 0 || index >= currentSet.difficulties.length) return;
        
        this.selectedDiffIndex = index;
        this.updateDifficultySelection();
        
        const diff = currentSet.difficulties[index];
        
        // Load beatmap if not already loaded
        if (!diff.beatmap) {
            this.showLoading(true);
            try {
                diff.beatmap = await loadBeatmapDifficulty(diff.url);
            } catch (error) {
                console.error('Failed to load beatmap:', error);
                this.emit('error', 'Failed to load beatmap');
                this.showLoading(false);
                return;
            }
            this.showLoading(false);
        }
        
        this.updatePreview(diff.beatmap, diff);
        this.emit('difficultySelected', { beatmap: diff.beatmap, difficulty: diff });
    }

    /**
     * Update visual selection state for difficulties
     */
    updateDifficultySelection() {
        if (!this.difficultyContainer) return;
        
        const items = this.difficultyContainer.querySelectorAll('.difficulty-item');
        items.forEach((item, i) => {
            if (i === this.selectedDiffIndex) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    /**
     * Update preview panel with beatmap info
     */
    updatePreview(beatmap, difficulty) {
        const elements = {
            title: document.getElementById('preview-title'),
            artist: document.getElementById('preview-artist'),
            version: document.getElementById('preview-version'),
            mapper: document.getElementById('preview-mapper'),
            cs: document.getElementById('preview-cs'),
            ar: document.getElementById('preview-ar'),
            od: document.getElementById('preview-od'),
            hp: document.getElementById('preview-hp'),
            objects: document.getElementById('preview-objects'),
            length: document.getElementById('preview-length'),
            bpm: document.getElementById('preview-bpm')
        };

        if (elements.title) elements.title.textContent = beatmap.title || 'Unknown';
        if (elements.artist) elements.artist.textContent = beatmap.artist || 'Unknown Artist';
        if (elements.version) elements.version.textContent = beatmap.version || difficulty?.name || '';
        if (elements.mapper) elements.mapper.textContent = beatmap.creator || 'Unknown';
        
        if (elements.cs) {
            elements.cs.textContent = beatmap.circleSize?.toFixed(1) || '0';
            this.updateStatBar('cs', beatmap.circleSize);
        }
        if (elements.ar) {
            elements.ar.textContent = beatmap.approachRate?.toFixed(1) || '0';
            this.updateStatBar('ar', beatmap.approachRate);
        }
        if (elements.od) {
            elements.od.textContent = beatmap.overallDifficulty?.toFixed(1) || '0';
            this.updateStatBar('od', beatmap.overallDifficulty);
        }
        if (elements.hp) {
            elements.hp.textContent = beatmap.hpDrainRate?.toFixed(1) || '0';
            this.updateStatBar('hp', beatmap.hpDrainRate);
        }
        
        if (elements.objects) {
            elements.objects.textContent = beatmap.hitObjects?.length || 0;
        }
        
        if (elements.length && beatmap.hitObjects?.length > 0) {
            const lastObj = beatmap.hitObjects[beatmap.hitObjects.length - 1];
            const duration = lastObj.endTime || lastObj.time;
            const minutes = Math.floor(duration / 60000);
            const seconds = Math.floor((duration % 60000) / 1000);
            elements.length.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (elements.bpm && beatmap.timingPoints?.length > 0) {
            const firstTiming = beatmap.timingPoints.find(tp => tp.uninherited);
            if (firstTiming) {
                const bpm = Math.round(60000 / firstTiming.beatLength);
                elements.bpm.textContent = bpm;
            }
        }
    }

    /**
     * Update stat bar visual
     */
    updateStatBar(stat, value) {
        const bar = document.getElementById(`preview-${stat}-bar`);
        if (bar) {
            const percentage = Math.min((value || 0) * 10, 100);
            bar.style.width = `${percentage}%`;
            
            // Color based on value
            if (value >= 8) {
                bar.style.backgroundColor = '#ef4444';
            } else if (value >= 6) {
                bar.style.backgroundColor = '#f97316';
            } else if (value >= 4) {
                bar.style.backgroundColor = '#eab308';
            } else {
                bar.style.backgroundColor = '#22c55e';
            }
        }
    }

    /**
     * Get star rating color
     */
    getStarColor(stars) {
        if (stars < 2) return '#88b300';      // Green
        if (stars < 3) return '#66ccff';      // Cyan
        if (stars < 4) return '#ffcc22';      // Yellow
        if (stars < 5) return '#ff7700';      // Orange
        if (stars < 6) return '#ff66aa';      // Pink
        if (stars < 7) return '#cc5599';      // Purple
        return '#ff0000';                      // Red
    }

    /**
     * Get star display string
     */
    getStarDisplay(stars) {
        const fullStars = Math.floor(stars);
        const partial = stars - fullStars;
        
        let display = '★'.repeat(Math.min(fullStars, 10));
        
        if (partial >= 0.5 && fullStars < 10) {
            display += '☆';
        }
        
        return display + ` (${stars.toFixed(2)})`;
    }

    /**
     * Get currently selected beatmap set
     */
    getCurrentSet() {
        return this.beatmapSets[this.selectedSetIndex];
    }

    /**
     * Get currently selected difficulty
     */
    getCurrentDifficulty() {
        const set = this.getCurrentSet();
        return set?.difficulties[this.selectedDiffIndex];
    }

    /**
     * Get the selected beatmap data
     */
    getSelectedBeatmap() {
        const diff = this.getCurrentDifficulty();
        return diff?.beatmap || null;
    }

    /**
     * Get selected difficulty info
     */
    getSelectedDifficultyInfo() {
        return this.getCurrentDifficulty();
    }

    /**
     * Show/hide loading indicator
     */
    showLoading(show) {
        this.isLoading = show;
        const loadingEl = document.getElementById('diff-loading');
        if (loadingEl) {
            loadingEl.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        // Prevent duplicate listeners
        if (this.keyboardNavigationSetup) return;
        this.keyboardNavigationSetup = true;
        
        document.addEventListener('keydown', (e) => {
            // Only handle when song select is visible
            const songSelectScreen = document.getElementById('song-select-screen');
            if (!songSelectScreen || !songSelectScreen.classList.contains('active')) return;
            
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateSong(-1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateSong(1);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.navigateDifficulty(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.navigateDifficulty(1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    const beatmap = this.getSelectedBeatmap();
                    if (beatmap) {
                        this.emit('play', beatmap);
                    }
                    break;
            }
        });
    }

    /**
     * Navigate through songs
     */
    navigateSong(direction) {
        const newIndex = this.selectedSetIndex + direction;
        if (newIndex >= 0 && newIndex < this.beatmapSets.length) {
            this.selectSong(newIndex);
        }
    }

    /**
     * Navigate through difficulties
     */
    navigateDifficulty(direction) {
        const currentSet = this.getCurrentSet();
        if (!currentSet) return;
        
        const newIndex = this.selectedDiffIndex + direction;
        if (newIndex >= 0 && newIndex < currentSet.difficulties.length) {
            this.selectDifficulty(newIndex);
        }
    }

    /**
     * Escape HTML for safe rendering
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Refresh the display
     */
    refresh() {
        this.renderSongList();
        this.updateSongSelection();
        this.renderDifficultyList();
        this.updateDifficultySelection();
        
        const diff = this.getCurrentDifficulty();
        if (diff?.beatmap) {
            this.updatePreview(diff.beatmap, diff);
        }
    }
}

export default SongSelectManager;
