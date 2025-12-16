/**
 * js/parser.js
 * 
 * Parses .osu file format v14.
 * Converts text data into structured JavaScript objects.
 * 
 * Dependencies: Utils (for generating slider curves immediately after parse)
 */

window.OsuParser = (function() {

    const SECTION_REGEX = /^\[([a-zA-Z0-9]+)\]$/;
    
    // Object Types (Bitmask)
    const TYPE_CIRCLE = 1;
    const TYPE_SLIDER = 2;
    const TYPE_NEW_COMBO = 4;
    const TYPE_SPINNER = 8;
    
    /**
     * Parse the entire .osu file content
     * @param {string} data - Raw text content of .osu file
     * @returns {Object} Parsed beatmap object
     */
    function parse(data) {
        if (!data) throw new Error("No data provided");

        const beatmap = {
            Metadata: {},
            General: {},
            Difficulty: {},
            Events: [],
            TimingPoints: [],
            HitObjects: [],
            Colors: []
        };

        const lines = data.split(/\r?\n/);
        let currentSection = null;

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('//')) continue;

            // Check for Section Header
            const sectionMatch = line.match(SECTION_REGEX);
            if (sectionMatch) {
                currentSection = sectionMatch[1];
                continue;
            }

            if (!currentSection) continue;

            // Parse based on section
            switch (currentSection) {
                case 'General':
                case 'Metadata':
                case 'Difficulty':
                    parseKeyValue(line, beatmap[currentSection]);
                    break;
                case 'Events':
                    // Basic event parsing (Backgrounds)
                    // Format: 0,0,"filename",0,0
                    if (line.startsWith('0,0,')) {
                        const parts = line.split(',');
                        if (parts.length >= 3) {
                            // remove quotes
                            beatmap.Events.push({
                                type: 'background',
                                filename: parts[2].replace(/"/g, '')
                            });
                        }
                    }
                    break;
                case 'TimingPoints':
                    const tp = parseTimingPoint(line);
                    if (tp) beatmap.TimingPoints.push(tp);
                    break;
                case 'HitObjects':
                    const obj = parseHitObject(line, beatmap.Difficulty);
                    if (obj) beatmap.HitObjects.push(obj);
                    break;
                case 'Colours':
                    // Parse combo colors: Combo1 : 255,255,255
                    if (line.startsWith('Combo')) {
                        const parts = line.split(':');
                        if (parts.length === 2) {
                            const rgb = parts[1].trim().split(',').map(Number);
                            beatmap.Colors.push(rgb);
                        }
                    }
                    break;
            }
        }

        // Post-processing: Sort objects by time
        beatmap.HitObjects.sort((a, b) => a.time - b.time);
        
        // Post-processing: Calculate slider durations
        calculateSliderDurations(beatmap);

        // Post-processing: Assign Combo Colors and Numbers
        assignCombos(beatmap);

        return beatmap;
    }

    function parseKeyValue(line, targetObj) {
        const parts = line.split(':');
        if (parts.length < 2) return;
        
        const key = parts[0].trim();
        const val = parts.slice(1).join(':').trim(); // Handle colons in value
        
        // Try parsing as number, else keep string
        const num = parseFloat(val);
        targetObj[key] = isNaN(num) ? val : num;
    }

    function parseTimingPoint(line) {
        // Format: time,beatLength,meter,sampleSet,sampleIndex,volume,uninherited,effects
        const p = line.split(',');
        if (p.length < 2) return null;

        return {
            time: parseFloat(p[0]),
            beatLength: parseFloat(p[1]),
            meter: parseInt(p[2]),
            uninherited: p[6] === '1', // 1 = true (Red Line), 0 = false (Green Line)
            kiai: (parseInt(p[7]) & 1) > 0
        };
    }

    function parseHitObject(line, difficulty) {
        // Format: x,y,time,type,hitSound,objectParams,hitSample
        const p = line.split(',');
        if (p.length < 4) return null;

        const x = parseInt(p[0]);
        const y = parseInt(p[1]);
        const time = parseInt(p[2]);
        const typeMask = parseInt(p[3]);
        const hitSound = parseInt(p[4]);

        let type = 'unknown';
        if (typeMask & TYPE_CIRCLE) type = 'circle';
        else if (typeMask & TYPE_SLIDER) type = 'slider';
        else if (typeMask & TYPE_SPINNER) type = 'spinner';

        const obj = {
            x, y, time, type, hitSound,
            newCombo: (typeMask & TYPE_NEW_COMBO) > 0
        };

        if (type === 'slider') {
            // Slider params: curveType|curvePoints,slides,length,edgeSounds,edgeSets
            const sliderParams = p[5].split('|');
            obj.curveType = sliderParams[0]; // B, L, P, C
            
            obj.points = [{x: obj.x, y: obj.y}]; // Start point is implicitly the first point
            for (let i = 1; i < sliderParams.length; i++) {
                const xy = sliderParams[i].split(':');
                obj.points.push({ x: parseInt(xy[0]), y: parseInt(xy[1]) });
            }

            obj.slides = parseInt(p[6]) || 1;
            obj.pixelLength = parseFloat(p[7]);
            
            // Generate the visual curve immediately
            if (window.Utils && window.Utils.generateSliderCurve) {
                obj.curvePoints = window.Utils.generateSliderCurve(obj);
                
                // Set end position based on last point
                if (obj.curvePoints.length > 0) {
                    const last = obj.curvePoints[obj.curvePoints.length - 1];
                    obj.endX = last.x;
                    obj.endY = last.y;
                }
            }
        } 
        else if (type === 'spinner') {
            // Spinner params: endTime
            obj.endTime = parseInt(p[5]);
        }

        return obj;
    }

    function calculateSliderDurations(beatmap) {
        const tPoints = beatmap.TimingPoints;
        if (!tPoints || tPoints.length === 0) return;
        
        // Default values
        const sliderMult = beatmap.Difficulty.SliderMultiplier || 1.4;
        const tickRate = beatmap.Difficulty.SliderTickRate || 1;

        beatmap.HitObjects.forEach(obj => {
            if (obj.type === 'slider') {
                // Find active timing point
                let currentTp = tPoints[0];
                let currentUninheritedTp = tPoints[0];

                for (let i = 0; i < tPoints.length; i++) {
                    if (tPoints[i].time > obj.time) break;
                    currentTp = tPoints[i];
                    if (tPoints[i].uninherited) currentUninheritedTp = tPoints[i];
                }

                // Calculate velocity
                let svMultiplier = 1.0;
                if (!currentTp.uninherited && currentTp.beatLength < 0) {
                    svMultiplier = 100.0 / -currentTp.beatLength;
                }
                
                // Clamp SV to reasonable limits if broken
                if (svMultiplier < 0.1) svMultiplier = 0.1;
                if (svMultiplier > 10) svMultiplier = 10;

                const pxPerBeat = sliderMult * 100 * svMultiplier;
                const beats = obj.pixelLength / pxPerBeat;
                
                obj.duration = beats * currentUninheritedTp.beatLength * obj.slides;
                obj.endTime = obj.time + obj.duration;
            } 
            else if (obj.type === 'circle') {
                obj.endTime = obj.time;
            }
        });
    }

    function assignCombos(beatmap) {
        let comboNumber = 1;
        let colorIndex = 0;
        // Default colors if none provided
        const colors = beatmap.Colors.length > 0 ? beatmap.Colors : [
            [255, 192, 0], [0, 202, 0], [18, 124, 255], [242, 24, 57]
        ];

        beatmap.HitObjects.forEach(obj => {
            if (obj.newCombo || obj === beatmap.HitObjects[0]) {
                comboNumber = 1;
                if (obj.newCombo) {
                    colorIndex = (colorIndex + 1) % colors.length;
                    // Note: 'color skip' logic exists in osu but keeping simple for now
                }
            }
            obj.comboNumber = comboNumber++;
            obj.color = colors[colorIndex];
        });
    }

    return {
        parse
    };

})();
