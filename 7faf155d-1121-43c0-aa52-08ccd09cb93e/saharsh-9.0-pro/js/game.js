/**
 * js/game.js
 * 
 * Main Game Engine.
 * Handles Game Loop, Input Processing, Hit Logic, Scoring, and State Management.
 */

window.Game = (function() {
    
    // --- State ---
    const STATE = {
        isPlaying: false,
        isPaused: false,
        startTime: 0,
        time: 0,
        map: null,
        stats: null, // { ar, cs, od, hp, arMs, odMs }
        score: 0,
        combo: 0,
        maxCombo: 0,
        accuracy: 100,
        health: 100,
        hits: { 300: 0, 100: 0, 50: 0, miss: 0 },
        visibleObjects: [],
        nextObjIndex: 0,
        cursor: { x: 256, y: 192, down: false }, // osu! coords (0-512)
        cursorTrail: [],
        keys: { z: false, x: false },
        audioUrl: '',
        audioStarted: false
    };

    // --- Constants ---
    const HIT_WINDOWS = {
        300: 50,
        100: 100,
        50: 150
    };
    
    // --- Internal ---
    let rafId = null;
    let audioManager = window.AudioManager;
    let renderer = window.Renderer;
    let mods = window.ModSystem;
    
    // --- Initialization ---
    function init() {
        renderer.init();
        setupInput();
    }

    // --- Input Handling ---
    function setupInput() {
        // Mouse Move
        window.addEventListener('mousemove', e => {
            if (!STATE.isPlaying || mods.isActive('Autopilot') || mods.isActive('Autoplay')) return;
            updateCursorFromEvent(e);
        });

        // Keyboard Down
        window.addEventListener('keydown', e => {
            if (!STATE.isPlaying || e.repeat) return;
            
            if (e.key === 'z' || e.key === 'Z') {
                STATE.keys.z = true;
                handleHitInput();
                document.getElementById('k1').classList.add('key-pressed');
            }
            if (e.key === 'x' || e.key === 'X') {
                STATE.keys.x = true;
                handleHitInput();
                document.getElementById('k2').classList.add('key-pressed');
            }
            
            // Skip
            if (e.code === 'Space' && STATE.time < STATE.map.HitObjects[0].time - 2000) {
                 skipIntro();
            }
        });

        // Keyboard Up
        window.addEventListener('keyup', e => {
            if (e.key === 'z' || e.key === 'Z') {
                STATE.keys.z = false;
                document.getElementById('k1').classList.remove('key-pressed');
            }
            if (e.key === 'x' || e.key === 'X') {
                STATE.keys.x = false;
                document.getElementById('k2').classList.remove('key-pressed');
            }
        });
    }

    function updateCursorFromEvent(e) {
        // Convert screen pixels to osu! coordinate space
        // We need to inverse the mapToCanvas logic
        const canvas = document.getElementById('game-canvas');
        
        // This is tricky because renderer calculates offsets dynamically based on aspect ratio.
        // We will call the util function again to get current params
        const isHR = mods.isActive('HardRock');
        const params = window.Utils.mapToCanvas(0, 0, window.innerWidth, window.innerHeight, isHR);
        
        const rawX = (e.clientX - params.offsetX) / params.scale;
        const rawY = (e.clientY - params.offsetY) / params.scale;
        
        // Handle HR Flip for input mapping
        STATE.cursor.x = rawX;
        STATE.cursor.y = isHR ? (384 - rawY) : rawY;
    }

    // --- Game Control ---
    async function start(beatmap, audioFile) {
        if (STATE.isPlaying) stop();

        STATE.map = beatmap;
        STATE.audioUrl = audioFile;
        STATE.isPlaying = true;
        STATE.isPaused = false;
        STATE.score = 0;
        STATE.combo = 0;
        STATE.maxCombo = 0;
        STATE.health = 100;
        STATE.hits = { 300: 0, 100: 0, 50: 0, miss: 0 };
        STATE.nextObjIndex = 0;
        STATE.cursorTrail = [];
        STATE.time = -2000; // 2 sec intro

        // Calculate Difficulty Stats
        const baseStats = {
            ar: beatmap.Difficulty.ApproachRate,
            cs: beatmap.Difficulty.CircleSize,
            od: beatmap.Difficulty.OverallDifficulty,
            hp: beatmap.Difficulty.HPDrainRate
        };
        STATE.stats = mods.applyToStats(baseStats);
        
        // Calculate MS windows
        // AR: <5 = 1200 + 120*(5-AR), >5 = 1200 - 150*(AR-5)
        if (STATE.stats.ar < 5) STATE.stats.arMs = 1200 + 120 * (5 - STATE.stats.ar);
        else STATE.stats.arMs = 1200 - 150 * (STATE.stats.ar - 5);

        // OD: 300 = 80-6*OD, 100 = 140-8*OD, 50 = 200-10*OD (approx)
        STATE.stats.odMs300 = 80 - 6 * STATE.stats.od;
        STATE.stats.odMs100 = 140 - 8 * STATE.stats.od;
        STATE.stats.odMs50 = 200 - 10 * STATE.stats.od;

        // Load Audio
        document.getElementById('loading-screen').classList.remove('hidden');
        document.getElementById('song-select-screen').classList.add('hidden');
        
        const loaded = await audioManager.load(audioFile);
        if (!loaded) {
            alert("Failed to load audio!");
            stop();
            return;
        }
        
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('game-hud').classList.remove('hidden');

        // Prepare first frame
        updateUI();
        
        // Start Audio with Delay
        audioManager.setRate(mods.getSpeedMultiplier());
        
        // Calculate Intro Time
        // Ensure at least 2 seconds before first object
        const firstObjTime = beatmap.HitObjects[0].time;
        const leadIn = Math.max(2000, firstObjTime > 5000 ? 2000 : firstObjTime); // Cap intro for very long empty starts unless we skip
        
        // Set State
        STATE.startTime = performance.now() + 2000; 
        STATE.time = -2000;
        STATE.audioStarted = false;
        
        // Check if map starts way later, allow Skip
        if (firstObjTime > 5000) {
             // Logic handled in updateLogic for button visibility
        }

        rafId = requestAnimationFrame(loop);
    }

    function stop() {
        STATE.isPlaying = false;
        cancelAnimationFrame(rafId);
        audioManager.stop();
        document.getElementById('game-hud').classList.add('hidden');
        // If manually stopped (ESC?), go to menu or results? 
        // Usually back to menu.
        document.getElementById('song-select-screen').classList.remove('hidden');
        document.getElementById('custom-cursor').style.display = 'block';
    }
    
    function skipIntro() {
        const firstObjTime = STATE.map.HitObjects[0].time;
        // Only skip if we are well before the first object
        if (STATE.time < firstObjTime - 2000) {
            const target = firstObjTime - 2000;
            const diff = target - STATE.time;
            STATE.startTime -= diff; // Shift start time back (for RAF sync)
            audioManager.play(target); // Seek audio
            
            // Immediately hide button
            document.getElementById('skip-btn').classList.add('hidden');
        }
    }

    // --- Main Loop ---
    function loop(now) {
        if (!STATE.isPlaying) return;

        const speed = mods.getSpeedMultiplier();
        
        // Handle Audio Start Logic
        if (!STATE.audioStarted && STATE.time >= 0) {
            audioManager.play(0);
            STATE.audioStarted = true;
            // Re-sync start time reference to current performance.now() 
            // This ensures the transition from calculated time to audio time is smooth
            STATE.startTime = now; 
        }

        // Update Time
        if (STATE.audioStarted) {
            // Get precise time from audio context
            const audioPos = audioManager.getPosition();
            
            // If audio is playing, trust it. 
            // Note: getPosition returns 0 if audioCtx is suspended or not started. 
            // We check audioStarted flag to know we EXPECT it to be playing.
            if (audioPos > 0 || (audioPos === 0 && STATE.time < 100)) {
                 STATE.time = audioPos;
            } else {
                 // Fallback: Audio context might be lagging or stopped
                 // Use delta time from RAF
                 STATE.time += 16.67 * speed; 
            }
        } else {
            // Intro phase (negative time)
            // Just use elapsed real time since start, scaled by speed
            // STATE.startTime was set to (now + 2000) initially, so (now - startTime) starts at -2000
            STATE.time = (now - STATE.startTime) * speed;
        }

        // Logic
        updateLogic();
        updateAutoBot(); // AI Logic if active
        renderer.render(STATE);

        // Check End
        const lastObj = STATE.map.HitObjects[STATE.map.HitObjects.length - 1];
        if (STATE.time > lastObj.endTime + 1000) {
            finishMap();
            return;
        }
        
        // Check Fail
        if (STATE.health <= 0 && !mods.isActive('NoFail')) {
            failMap();
            return;
        }

        rafId = requestAnimationFrame(loop);
    }

    function updateLogic() {
        // Filter Visible Objects
        // Visible if: (obj.time - arMs) <= currentTime <= (obj.endTime + fadeOut)
        const arMs = STATE.stats.arMs;
        const visible = [];
        
        // Only look at future objects + slightly past ones
        for (let i = 0; i < STATE.map.HitObjects.length; i++) {
            const obj = STATE.map.HitObjects[i];
            
            // If object is way in past and hit/missed, skip
            if (obj.hit || obj.missed) continue;
            
            // Check visibility
            if (STATE.time >= obj.time - arMs && STATE.time <= obj.endTime + 500) {
                visible.push(obj);
            }
            
            // Optimization: Stop if we reach objects way in future
            if (obj.time > STATE.time + arMs) break;
        }
        
        // Sort visible: Oldest first (Painter's algo in renderer will reverse)
        // Actually renderer expects them sorted by time (oldest first).
        STATE.visibleObjects = visible;
        
        // Miss Logic for passed objects
        visible.forEach(obj => {
            if (!obj.hit && !obj.missed && STATE.time > obj.time + STATE.stats.odMs50 && obj.type === 'circle') {
                registerHit(obj, 0); // Miss
            }
            if (obj.type === 'slider' && !obj.hit && STATE.time > obj.endTime + STATE.stats.odMs50) {
                 if (!obj.headHit) {
                     registerHit(obj, 0); // Missed head completely
                 } else {
                     // If tracking was lost during slider?
                     // For this implementation, if head was hit and we reach the end, count as hit (partial logic).
                     // Ideally we check tracking ticks, but checking headHit + reach end is a fair baseline for web.
                     // The hit registration for sliders usually happens at the end or if they break.
                     // Here we just finalize it as a hit if it wasn't already registered.
                     registerHit(obj, 300); 
                 }
            }
        });

        // Slider Tracking Logic (Check every frame)
        // If sliding, check if cursor is in range and key is held
        visible.forEach(obj => {
            if (obj.type === 'slider' && obj.headHit && !obj.hit && !obj.missed) {
                if (STATE.time >= obj.time && STATE.time <= obj.endTime) {
                    const progress = (STATE.time - obj.time) / obj.duration;
                    const pos = window.Utils.getSliderPosition(obj, Math.min(1, Math.max(0, progress)));
                    
                    // Check cursor distance to ball
                    const dist = window.Utils.dist(STATE.cursor, pos);
                    const allowedDist = (54.4 - 4.48 * STATE.stats.cs) * 2.5; // Forgiving follow radius (approx 2.4x circle radius in osu!)
                    
                    const keyHeld = STATE.keys.z || STATE.keys.x || mods.isActive('Autoplay') || mods.isActive('Relax');
                    
                    if (dist <= allowedDist && keyHeld) {
                        // Good tracking
                        // In a full implementation, we would increment 'ticks' here.
                    } else {
                        // Lost tracking
                        // For this simple engine, we won't 'break' the slider immediately to be lenient,
                        // but strictly we should. 
                        // Let's break it if it's strictly a gameplay clone.
                        // obj.missed = true;
                        // registerHit(obj, 100); // Partial hit or miss?
                        // Keeping it simple: No slider breaking in this version, just hit head = good.
                    }
                }
            }
        });

        // Health Drain (Passive)
        if (STATE.time > STATE.map.HitObjects[0].time && STATE.health > 0) {
            const drainRate = STATE.stats.hp * 0.05 * (mods.getSpeedMultiplier());
            STATE.health -= drainRate * 0.016; // Per frame approx
        }
        
        // Update Cursor Trail
        STATE.cursorTrail.push({ x: STATE.cursor.x, y: STATE.cursor.y });
        if (STATE.cursorTrail.length > 20) STATE.cursorTrail.shift();

        // Update Skip Button Visibility
        const firstObjTime = STATE.map.HitObjects[0].time;
        const skipBtn = document.getElementById('skip-btn');
        if (STATE.time < firstObjTime - 2000 && !STATE.isPaused) {
            skipBtn.classList.remove('hidden');
        } else {
            skipBtn.classList.add('hidden');
        }
    }

    // --- Hit Logic ---
    function handleHitInput() {
        if (mods.isActive('Autoplay') || mods.isActive('Relax')) return;

        // Find the earliest hittable object
        // Must be within window
        const hitWindow = STATE.stats.odMs50;
        
        const obj = STATE.visibleObjects.find(o => 
            !o.hit && !o.missed && Math.abs(o.time - STATE.time) <= hitWindow
        );

        if (obj) {
            // Check Aim
            const csRadius = (54.4 - 4.48 * STATE.stats.cs); // OSU pixels
            const dist = window.Utils.dist(STATE.cursor, {x: obj.x, y: obj.y});
            
            if (dist <= csRadius) {
                // Hit!
                const diff = Math.abs(o => o.time - STATE.time);
                let scoreVal = 0;
                
                if (diff <= STATE.stats.odMs300) scoreVal = 300;
                else if (diff <= STATE.stats.odMs100) scoreVal = 100;
                else scoreVal = 50;

                registerHit(obj, scoreVal);
            }
        }
    }

    function registerHit(obj, value) {
        if (obj.hit || obj.missed) return;

        if (value === 0) {
            obj.missed = true;
            STATE.combo = 0;
            STATE.hits.miss++;
            STATE.health = Math.max(0, STATE.health - 15); // Big penalty
            showHitError(obj, 'miss');
        } else {
            obj.hit = true;
            if (obj.type === 'slider') obj.headHit = true; // Mark head as hit
            
            STATE.combo++;
            if (STATE.combo > STATE.maxCombo) STATE.maxCombo = STATE.combo;
            
            STATE.score += value * (1 + (STATE.combo * 0.01)) * mods.getScoreMultiplier();
            STATE.hits[value]++;
            
            // Health Bonus
            let hpBonus = (10 - STATE.stats.hp) * 2;
            if (value === 300) hpBonus *= 1;
            if (value === 100) hpBonus *= 0.5;
            if (value === 50) hpBonus *= 0.25;
            STATE.health = Math.min(100, STATE.health + hpBonus);
            
            showHitError(obj, value);
        }
        updateUI();
    }
    
    function showHitError(obj, type) {
        // Create DOM element for feedback (simpler than canvas text)
        // Position relative to screen
        const isHR = mods.isActive('HardRock');
        const params = window.Utils.mapToCanvas(0, 0, window.innerWidth, window.innerHeight, isHR);
        
        const x = params.offsetX + obj.x * params.scale;
        const y = params.offsetY + (isHR ? (384 - obj.y) : obj.y) * params.scale;
        
        const el = document.createElement('div');
        el.className = `hit-feedback hit-${type}`;
        el.innerText = type === 'miss' ? 'X' : type;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        
        document.getElementById('game-container').appendChild(el);
        setTimeout(() => el.remove(), 500);
    }

    // --- Auto Bot Logic ---
    function updateAutoBot() {
        const isAuto = mods.isActive('Autoplay');
        const isPilot = mods.isActive('Autopilot');
        const isRelax = mods.isActive('Relax');

        if (!isAuto && !isPilot && !isRelax) return;

        // 1. Aim Logic (Auto & Autopilot)
        if (isAuto || isPilot) {
            // Find current target
            // If sliding, follow slider
            // Else, aim at next object
            
            const activeSlider = STATE.visibleObjects.find(o => o.type === 'slider' && o.hit && !o.missed && STATE.time < o.endTime);
            
            if (activeSlider) {
                // Follow Slider
                const progress = (STATE.time - activeSlider.time) / activeSlider.duration;
                const pos = window.Utils.getSliderPosition(activeSlider, Math.min(1, Math.max(0, progress)));
                STATE.cursor.x = pos.x;
                STATE.cursor.y = pos.y;
            } else {
                // Aim Next
                const nextObj = STATE.visibleObjects.find(o => !o.hit && !o.missed);
                if (nextObj) {
                    // Linear interpolation for smooth cursor (Bot-like)
                    // Current pos -> Target pos
                    const dx = nextObj.x - STATE.cursor.x;
                    const dy = nextObj.y - STATE.cursor.y;
                    
                    // Instant snap if very close (Time wise) or lerp
                    const timeDiff = nextObj.time - STATE.time;
                    if (timeDiff < 50) {
                        STATE.cursor.x = nextObj.x;
                        STATE.cursor.y = nextObj.y;
                    } else {
                        STATE.cursor.x += dx * 0.2;
                        STATE.cursor.y += dy * 0.2;
                    }
                }
            }
        }

        // 2. Click Logic (Auto & Relax)
        if (isAuto || isRelax) {
            // Check for hits
            const hitWindow = 10; // Perfect hits for Auto
            const obj = STATE.visibleObjects.find(o => 
                !o.hit && !o.missed && Math.abs(o.time - STATE.time) <= hitWindow
            );
            
            if (obj) {
                // Auto Hit
                registerHit(obj, 300);
                
                // Visual key press
                const key = STATE.hits[300] % 2 === 0 ? 'k1' : 'k2';
                const el = document.getElementById(key);
                el.classList.add('key-pressed');
                setTimeout(() => el.classList.remove('key-pressed'), 100);
            }
        }
    }

    function updateUI() {
        document.getElementById('score-display').innerText = Math.floor(STATE.score).toString().padStart(6, '0');
        document.getElementById('combo-display').innerText = STATE.combo + 'x';
        document.getElementById('health-bar').style.width = STATE.health + '%';
        
        // Acc
        const totalHits = STATE.hits[300] + STATE.hits[100] + STATE.hits[50] + STATE.hits.miss;
        if (totalHits > 0) {
            const totalScore = (STATE.hits[300]*300 + STATE.hits[100]*100 + STATE.hits[50]*50);
            const maxScore = totalHits * 300;
            STATE.accuracy = (totalScore / maxScore) * 100;
        }
        document.getElementById('accuracy-display').innerText = STATE.accuracy.toFixed(2) + '%';
        
        // Progress Ring
        const duration = audioManager.getDuration();
        if (duration > 0) {
             const progress = STATE.time / duration;
             const offset = 176 - (176 * progress);
             document.getElementById('progress-ring').style.strokeDashoffset = offset;
        }
    }

    function finishMap() {
        if (!STATE.isPlaying) return;
        STATE.isPlaying = false;
        cancelAnimationFrame(rafId);
        audioManager.stop();
        document.getElementById('game-hud').classList.add('hidden');
        document.getElementById('results-screen').classList.remove('hidden');
        document.getElementById('custom-cursor').style.display = 'block'; // Show menu cursor
        showResults();
    }
    
    function failMap() {
        if (!STATE.isPlaying) return;
        STATE.isPlaying = false;
        cancelAnimationFrame(rafId);
        audioManager.stop();
        document.getElementById('game-hud').classList.add('hidden');
        document.getElementById('failed-screen').classList.remove('hidden');
        document.getElementById('custom-cursor').style.display = 'block'; // Show menu cursor
    }

    function showResults() {
        document.getElementById('result-score').innerText = Math.floor(STATE.score);
        document.getElementById('result-combo').innerText = STATE.maxCombo + 'x';
        document.getElementById('result-acc').innerText = STATE.accuracy.toFixed(2) + '%';
        
        document.getElementById('result-300').innerText = STATE.hits[300];
        document.getElementById('result-100').innerText = STATE.hits[100];
        document.getElementById('result-50').innerText = STATE.hits[50];
        document.getElementById('result-miss').innerText = STATE.hits.miss;
        
        // Calc Grade
        let grade = 'F';
        if (STATE.hits.miss === 0) {
            if (STATE.accuracy === 100) grade = 'SS';
            else if (STATE.accuracy > 90) grade = 'S';
            else if (STATE.accuracy > 80) grade = 'A';
            else grade = 'B';
        } else {
             if (STATE.accuracy > 90) grade = 'A';
             else if (STATE.accuracy > 80) grade = 'B';
             else if (STATE.accuracy > 70) grade = 'C';
             else grade = 'D';
        }
        if (STATE.health <= 0) grade = 'F'; // Should be handled by Fail screen, but just in case
        
        document.getElementById('result-grade').innerText = grade;
        
        // Save Local Highscore
        try {
            const key = `${window.location.pathname}_osu_${STATE.map.Metadata.Title}_${STATE.map.Metadata.Version}`;
            const existing = localStorage.getItem(key);
            let highScore = existing ? parseInt(existing) : 0;
            
            if (STATE.score > highScore) {
                localStorage.setItem(key, Math.floor(STATE.score));
            }
        } catch (e) {
            console.warn("LocalStorage failed:", e);
        }
    }

    return {
        init,
        start,
        stop,
        get isPlaying() { return STATE.isPlaying; }
    };

})();
