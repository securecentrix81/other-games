/**
 * beatmapLoader.js
 * Handles fetching and caching of .osu beatmap files
 * Dependencies: parser.js (parseOsuFile)
 * Exports: BEATMAP_SETS, beatmapCache, loadBeatmapDifficulty, preloadAllBeatmaps
 */

import { parseOsuFile } from './parser.js';

// Beatmap URLs from the specified GitHub repository
const BEATMAP_URLS = {
    easy: 'https://raw.githubusercontent.com/TamamoNoMae13/osu-map-files/6c569aac641d892bd90cc2f59b954b648073785d/Songs/1107950/Kano%20-%20Stella-rium%20(Kowari)%20%5BEasy%5D.osu',
    normal: 'https://raw.githubusercontent.com/TamamoNoMae13/osu-map-files/6c569aac641d892bd90cc2f59b954b648073785d/Songs/1107950/Kano%20-%20Stella-rium%20(Kowari)%20%5BNormal%5D.osu',
    hard: 'https://raw.githubusercontent.com/TamamoNoMae13/osu-map-files/6c569aac641d892bd90cc2f59b954b648073785d/Songs/1107950/Kano%20-%20Stella-rium%20(Kowari)%20%5BHard%5D.osu',
    insane: 'https://raw.githubusercontent.com/TamamoNoMae13/osu-map-files/6c569aac641d892bd90cc2f59b954b648073785d/Songs/1107950/Kano%20-%20Stella-rium%20(Kowari)%20%5BInsane%5D.osu',
    extra: 'https://raw.githubusercontent.com/TamamoNoMae13/osu-map-files/6c569aac641d892bd90cc2f59b954b648073785d/Songs/1107950/Kano%20-%20Stella-rium%20(Kowari)%20%5BExtra%5D.osu',
    celestial: 'https://raw.githubusercontent.com/TamamoNoMae13/osu-map-files/6c569aac641d892bd90cc2f59b954b648073785d/Songs/1107950/Kano%20-%20Stella-rium%20(Kowari)%20%5BCelestial%5D.osu'
};

// Audio URL for the beatmap set (same folder structure)
export const AUDIO_URL = 'https://raw.githubusercontent.com/TamamoNoMae13/osu-map-files/6c569aac641d892bd90cc2f59b954b648073785d/Songs/1107950/audio.mp3';

// Beatmap set structure for song select
export const BEATMAP_SETS = [
    {
        id: 1107950,
        title: 'Stella-rium',
        artist: 'Kano',
        creator: 'Kowari',
        audioUrl: AUDIO_URL,
        previewTime: 0,
        difficulties: [
            { name: 'Easy', url: BEATMAP_URLS.easy, starRating: 1.5, beatmap: null },
            { name: 'Normal', url: BEATMAP_URLS.normal, starRating: 2.2, beatmap: null },
            { name: 'Hard', url: BEATMAP_URLS.hard, starRating: 3.3, beatmap: null },
            { name: 'Insane', url: BEATMAP_URLS.insane, starRating: 4.5, beatmap: null },
            { name: 'Extra', url: BEATMAP_URLS.extra, starRating: 5.5, beatmap: null },
            { name: 'Celestial', url: BEATMAP_URLS.celestial, starRating: 6.2, beatmap: null }
        ]
    }
];

// Cache for parsed beatmaps to avoid re-fetching
export const beatmapCache = new Map();

/**
 * Load and parse a single beatmap difficulty
 * @param {string} url - URL to the .osu file
 * @returns {Promise<Object>} Parsed beatmap object
 */
export async function loadBeatmapDifficulty(url) {
    // Check cache first
    if (beatmapCache.has(url)) {
        return beatmapCache.get(url);
    }

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch beatmap: ${response.status} ${response.statusText}`);
        }

        const content = await response.text();
        
        if (!content || content.trim().length === 0) {
            throw new Error('Beatmap file is empty');
        }

        // Parse the .osu file content
        const beatmap = parseOsuFile(content);
        
        // Store audio URL reference
        beatmap.audioUrl = AUDIO_URL;
        
        // Cache the parsed beatmap
        beatmapCache.set(url, beatmap);
        
        return beatmap;
    } catch (error) {
        console.error(`Error loading beatmap from ${url}:`, error);
        throw error;
    }
}

/**
 * Preload all beatmaps from all sets
 * Dispatches progress events for UI updates
 * @returns {Promise<void>}
 */
export async function preloadAllBeatmaps() {
    const allDifficulties = [];
    
    // Collect all difficulties from all sets
    for (const set of BEATMAP_SETS) {
        for (const diff of set.difficulties) {
            allDifficulties.push({ set, diff });
        }
    }

    const total = allDifficulties.length;
    let loaded = 0;

    // Dispatch initial progress
    dispatchLoadProgress(0, total, 'Starting beatmap load...');

    for (const { set, diff } of allDifficulties) {
        try {
            dispatchLoadProgress(loaded, total, `Loading ${set.title} [${diff.name}]...`);
            
            const beatmap = await loadBeatmapDifficulty(diff.url);
            
            // Store reference in difficulty object
            diff.beatmap = beatmap;
            
            loaded++;
            dispatchLoadProgress(loaded, total, `Loaded ${set.title} [${diff.name}]`);
        } catch (error) {
            console.error(`Failed to load ${diff.name}:`, error);
            loaded++;
            // Continue loading other beatmaps even if one fails
            dispatchLoadProgress(loaded, total, `Failed to load ${diff.name}`);
        }
    }

    dispatchLoadProgress(total, total, 'All beatmaps loaded!');
}

/**
 * Dispatch a custom event for loading progress
 * @param {number} loaded - Number of beatmaps loaded
 * @param {number} total - Total number of beatmaps
 * @param {string} message - Status message
 */
function dispatchLoadProgress(loaded, total, message) {
    const progress = total > 0 ? loaded / total : 0;
    
    const event = new CustomEvent('beatmapLoadProgress', {
        detail: {
            loaded,
            total,
            progress,
            message
        }
    });
    
    document.dispatchEvent(event);
}

/**
 * Get beatmap set by ID
 * @param {number} id - Beatmap set ID
 * @returns {Object|null} Beatmap set or null if not found
 */
export function getBeatmapSetById(id) {
    return BEATMAP_SETS.find(set => set.id === id) || null;
}

/**
 * Get star rating color based on difficulty
 * @param {number} stars - Star rating
 * @returns {string} CSS color string
 */
export function getStarRatingColor(stars) {
    if (stars < 2) return '#88b300'; // Green - Easy
    if (stars < 3) return '#66ccff'; // Cyan - Normal
    if (stars < 4) return '#ffcc22'; // Yellow - Hard
    if (stars < 5) return '#ff7722'; // Orange - Insane
    if (stars < 6) return '#ff66aa'; // Pink - Expert
    return '#cc22ff'; // Purple - Expert+
}

/**
 * Format star rating for display
 * @param {number} stars - Star rating
 * @returns {string} Formatted star string (e.g., "★★★☆☆")
 */
export function formatStarRating(stars) {
    const fullStars = Math.floor(stars);
    const maxStars = 10;
    let result = '';
    
    for (let i = 0; i < maxStars; i++) {
        if (i < fullStars) {
            result += '★';
        } else if (i === fullStars && stars % 1 >= 0.5) {
            result += '★'; // Round up half stars
        } else {
            result += '☆';
        }
    }
    
    return result.substring(0, Math.min(Math.ceil(stars) + 1, maxStars));
}

/**
 * Clear the beatmap cache
 */
export function clearCache() {
    beatmapCache.clear();
    
    // Also clear beatmap references in difficulty objects
    for (const set of BEATMAP_SETS) {
        for (const diff of set.difficulties) {
            diff.beatmap = null;
        }
    }
}

export default {
    BEATMAP_SETS,
    AUDIO_URL,
    beatmapCache,
    loadBeatmapDifficulty,
    preloadAllBeatmaps,
    getBeatmapSetById,
    getStarRatingColor,
    formatStarRating,
    clearCache
};
