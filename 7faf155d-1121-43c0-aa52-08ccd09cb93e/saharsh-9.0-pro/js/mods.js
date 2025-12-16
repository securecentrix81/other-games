/**
 * js/mods.js
 * 
 * Handles Modifiers (Easy, HardRock, DoubleTime, etc.)
 * and their impact on difficulty statistics (CS, AR, OD, HP).
 */

window.ModSystem = (function() {

    const MODS = {
        None: 0,
        NoFail: 1,
        Easy: 2,
        Hidden: 8,
        HardRock: 16,
        DoubleTime: 64,
        HalfTime: 256,
        Flashlight: 1024,
        Autoplay: 2048,
        SpunOut: 4096,
        Relax: 128,      // Custom bit for Relax
        Autopilot: 8192  // Custom bit for Autopilot
    };

    let activeMods = MODS.None;

    function toggle(modName) {
        const flag = MODS[modName];
        if (!flag) return;

        // Toggle logic
        if (activeMods & flag) {
            activeMods &= ~flag;
        } else {
            activeMods |= flag;
            
            // Exclusive mods check
            if (modName === 'HardRock') activeMods &= ~MODS.Easy;
            if (modName === 'Easy') activeMods &= ~MODS.HardRock;
            if (modName === 'DoubleTime') activeMods &= ~MODS.HalfTime;
            if (modName === 'HalfTime') activeMods &= ~MODS.DoubleTime;
        }
    }

    function isActive(modName) {
        return (activeMods & MODS[modName]) > 0;
    }

    function getActiveMods() {
        return activeMods;
    }

    function getSpeedMultiplier() {
        if (activeMods & MODS.DoubleTime) return 1.5;
        if (activeMods & MODS.HalfTime) return 0.75;
        return 1.0;
    }

    function getScoreMultiplier() {
        let mult = 1.0;
        if (activeMods & MODS.NoFail) mult *= 0.5;
        if (activeMods & MODS.Easy) mult *= 0.5;
        if (activeMods & MODS.HalfTime) mult *= 0.3;
        if (activeMods & MODS.HardRock) mult *= 1.06;
        if (activeMods & MODS.DoubleTime) mult *= 1.12;
        if (activeMods & MODS.Hidden) mult *= 1.06;
        if (activeMods & MODS.Flashlight) mult *= 1.12;
        if (activeMods & MODS.Relax) mult *= 0;
        if (activeMods & MODS.Autopilot) mult *= 0;
        if (activeMods & MODS.Autoplay) mult *= 1.0; // Auto usually unranked
        return mult;
    }

    /**
     * Apply mod effects to difficulty stats.
     * @param {Object} stats - { ar, cs, od, hp }
     * @returns {Object} Adjusted stats
     */
    function applyToStats(stats) {
        let { ar, cs, od, hp } = stats;

        // HR: CS x1.3, all others x1.4
        if (activeMods & MODS.HardRock) {
            cs = Math.min(10, cs * 1.3);
            ar = Math.min(10, ar * 1.4);
            od = Math.min(10, od * 1.4);
            hp = Math.min(10, hp * 1.4);
        }

        // EZ: All x0.5
        if (activeMods & MODS.Easy) {
            cs = cs * 0.5;
            ar = ar * 0.5;
            od = od * 0.5;
            hp = hp * 0.5;
        }

        // DT/HT affect AR/OD indirectly via time windows, but in osu! ms values change.
        // For simplicity in this engine, we handle Speed Mult separately in Game Loop
        // and only adjust AR visual speed if needed. 
        // Actually, strictly speaking, AR stays same value but ms window shrinks.
        // We will return standard stats and handle ms conversion in Game.js using SpeedMult.

        return { ar, cs, od, hp };
    }

    function reset() {
        activeMods = MODS.None;
    }

    return {
        MODS,
        toggle,
        isActive,
        getActiveMods,
        getSpeedMultiplier,
        getScoreMultiplier,
        applyToStats,
        reset
    };

})();
