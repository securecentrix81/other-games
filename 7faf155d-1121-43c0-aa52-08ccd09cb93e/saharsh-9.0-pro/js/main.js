/**
 * js/main.js
 * 
 * Entry point. Handles UI interaction, Song Selection, and Setup.
 */

window.onload = function() {
    
    // --- Data ---
    const BEATMAPS = [
        { title: "Stella-rium (Kowari) [Easy]", file: "Kano - Stella-rium (Kowari) [Easy].osu", diff: "Easy", stars: 1.5 },
        { title: "Stella-rium (Kowari) [Normal]", file: "Kano - Stella-rium (Kowari) [Normal].osu", diff: "Normal", stars: 2.3 },
        { title: "Stella-rium (Kowari) [Hard]", file: "Kano - Stella-rium (Kowari) [Hard].osu", diff: "Hard", stars: 3.2 },
        { title: "Stella-rium (Kowari) [Insane]", file: "Kano - Stella-rium (Kowari) [Insane].osu", diff: "Insane", stars: 4.5 },
        { title: "Stella-rium (Kowari) [Extra]", file: "Kano - Stella-rium (Kowari) [Extra].osu", diff: "Extra", stars: 5.4 },
        { title: "Stella-rium (Kowari) [Celestial]", file: "Kano - Stella-rium (Kowari) [Celestial].osu", diff: "Celestial", stars: 6.2 }
    ];

    const REPO_BASE = "https://raw.githubusercontent.com/TamamoNoMae13/osu-map-files/6c569aac641d892bd90cc2f59b954b648073785d/Songs/1107950/";
    
    // Mods List for UI
    const MOD_LIST = [
        { id: 'Easy', label: 'EZ', type: 'easy' },
        { id: 'NoFail', label: 'NF', type: 'easy' },
        { id: 'HalfTime', label: 'HT', type: 'easy' },
        { id: 'HardRock', label: 'HR', type: 'hard' },
        { id: 'DoubleTime', label: 'DT', type: 'hard' },
        { id: 'Hidden', label: 'HD', type: 'hard' },
        { id: 'Autoplay', label: 'AT', type: 'auto' },
        { id: 'Relax', label: 'RX', type: 'auto' },
        { id: 'Autopilot', label: 'AP', type: 'auto' }
    ];

    let selectedMap = BEATMAPS[1]; // Default Normal

    // --- Init ---
    window.Game.init();
    initSongSelect();
    initMods();
    initEventListeners();

    // Hide initial loading screen
    document.getElementById('loading-screen').classList.add('hidden');

    // Show Song Select
    document.getElementById('song-select-screen').classList.remove('hidden');

    // --- Functions ---

    function initSongSelect() {
        const listContainer = document.getElementById('beatmap-list');
        listContainer.innerHTML = '';

        BEATMAPS.forEach((map, index) => {
            const el = document.createElement('div');
            el.className = 'beatmap-card w-full p-4 bg-gray-800 bg-opacity-80 mb-2 cursor-pointer flex justify-between items-center';
            el.innerHTML = `
                <div>
                    <div class="text-xl font-bold">${map.title}</div>
                    <div class="text-sm text-gray-400">Difficulty: ${map.diff}</div>
                </div>
                <div class="text-2xl font-black text-pink-500">${map.stars}★</div>
            `;
            
            el.onclick = () => selectMap(map, el);
            if (map === selectedMap) el.classList.add('selected');
            
            listContainer.appendChild(el);
        });
    }

    function selectMap(map, el) {
        selectedMap = map;
        document.querySelectorAll('.beatmap-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        
        // Play click sound?
    }

    function initMods() {
        const grid = document.getElementById('mod-grid');
        grid.innerHTML = '';
        
        MOD_LIST.forEach(mod => {
            const btn = document.createElement('div');
            btn.className = `mod-icon mod-${mod.type.toLowerCase()}`;
            if (mod.type === 'easy') btn.classList.add('bg-green-600');
            else if (mod.type === 'hard') btn.classList.add('bg-red-600');
            else btn.classList.add('bg-blue-600');
            
            btn.innerText = mod.label;
            btn.title = mod.id;
            
            btn.onclick = () => {
                window.ModSystem.toggle(mod.id);
                updateModUI();
            };
            
            // Mark active
            if (window.ModSystem.isActive(mod.id)) btn.classList.add('active');
            
            grid.appendChild(btn);
        });
        
        updateModUI();
    }

    function updateModUI() {
        // Update Icons
        const btns = document.getElementById('mod-grid').children;
        for (let i = 0; i < btns.length; i++) {
            const modId = btns[i].title;
            if (window.ModSystem.isActive(modId)) btns[i].classList.add('active', 'border-2', 'border-white');
            else btns[i].classList.remove('active', 'border-2', 'border-white');
        }
        
        // Update Text
        const mult = window.ModSystem.getScoreMultiplier();
        document.getElementById('mod-multiplier').innerText = `Score Multiplier: ${mult.toFixed(2)}x`;
        
        // Update HUD display
        const activeNames = [];
        MOD_LIST.forEach(m => {
            if (window.ModSystem.isActive(m.id)) activeNames.push(m.label);
        });
        document.getElementById('active-mods-display').innerText = activeNames.join(' + ');
    }

    function initEventListeners() {
        // Global Custom Cursor Movement (Always active)
        const cursor = document.getElementById('custom-cursor');
        document.addEventListener('mousemove', e => {
            cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
        });
        
        // Enter to play
        document.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !window.Game.isPlaying && !document.getElementById('song-select-screen').classList.contains('hidden')) {
                startSelectedMap();
            }
            // Escape to quit
            if (e.key === 'Escape' && window.Game.isPlaying) {
                 window.Game.stop();
            }
            // F1 for mods
            if (e.key === 'F1' && !window.Game.isPlaying) {
                 // Toggle mod menu visibility if we had a separate menu, but here we can just focus it?
                 // Currently mods are always visible in song select.
            }
        });
        
        // Buttons
        document.getElementById('back-btn').onclick = backToMenu;
        document.getElementById('fail-back-btn').onclick = backToMenu;
        
        document.getElementById('retry-btn').onclick = () => {
             // Ensure we are fully reset before restarting
             // Game.start handles state reset, but we need to ensure the startSelectedMap call works
             startSelectedMap();
        };
        
        document.getElementById('skip-btn').onclick = () => {
            // Trigger skip
            const e = new KeyboardEvent('keydown', { code: 'Space' });
            window.dispatchEvent(e);
        };
        document.getElementById('reset-mods').onclick = () => {
            window.ModSystem.reset();
            updateModUI();
        };
    }
    
    function backToMenu() {
        document.getElementById('results-screen').classList.add('hidden');
        document.getElementById('failed-screen').classList.add('hidden');
        document.getElementById('song-select-screen').classList.remove('hidden');
        document.getElementById('custom-cursor').style.display = 'block'; // Show cursor in menu
    }

    async function startSelectedMap() {
        if (!selectedMap) return;
        
        try {
            document.getElementById('loading-screen').classList.remove('hidden');
            document.getElementById('loading-text').innerText = "Fetching Map...";
            
            // 1. Fetch .osu file
            const mapUrl = REPO_BASE + encodeURIComponent(selectedMap.file);
            const mapRes = await fetch(mapUrl);
            if (!mapRes.ok) throw new Error("Failed to download map");
            const mapText = await mapRes.text();
            
            document.getElementById('loading-text').innerText = "Parsing Map...";
            const beatmap = window.OsuParser.parse(mapText);
            
            // 2. Fetch Audio (Assume standard filename from General section or fallback)
            let audioFile = beatmap.General.AudioFilename || "audio.mp3";
            const audioUrl = REPO_BASE + encodeURIComponent(audioFile);
            
            // 3. Fetch Background (from Events)
            let bgUrl = null;
            if (beatmap.Events) {
                const bgEvent = beatmap.Events.find(e => e.type === 'background');
                if (bgEvent && bgEvent.filename) {
                    bgUrl = REPO_BASE + encodeURIComponent(bgEvent.filename);
                }
            }

            document.getElementById('loading-text').innerText = "Loading Assets...";
            
            // 4. Start Game
            window.Game.start(beatmap, audioUrl, bgUrl);
            
        } catch (e) {
            console.error(e);
            alert("Error loading map: " + e.message);
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('song-select-screen').classList.remove('hidden');
        }
    }

};
