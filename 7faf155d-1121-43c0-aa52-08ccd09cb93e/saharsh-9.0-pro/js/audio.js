/**
 * js/audio.js
 * 
 * Manages Web Audio API context.
 * Handles loading, playback, pitch shifting (playbackRate), and precise timing.
 */

window.AudioManager = (function() {
    let audioCtx = null;
    let audioBuffer = null;
    let sourceNode = null;
    let gainNode = null;
    
    // Playback state
    let startTime = 0;
    let pauseTime = 0;
    let isPlaying = false;
    let playbackRate = 1.0; // 1.0 = Normal, 1.5 = DT, 0.75 = HT

    function init() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    async function load(url) {
        if (!audioCtx) init();

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Audio fetch failed');
            const arrayBuffer = await response.arrayBuffer();
            audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            return true;
        } catch (e) {
            console.error("Audio Load Error:", e);
            return false;
        }
    }

    function play(offsetMs = 0) {
        if (!audioCtx || !audioBuffer) return;
        if (isPlaying) stop();

        sourceNode = audioCtx.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.playbackRate.value = playbackRate;

        gainNode = audioCtx.createGain();
        gainNode.gain.value = 0.5; // Default volume 50%

        sourceNode.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // Calculate start time
        // If offsetMs is positive, we start 'offsetMs' into the track
        // If negative, we schedule start in future (not handled here, logic usually handles pre-time)
        const startOffset = Math.max(0, offsetMs / 1000);
        
        startTime = audioCtx.currentTime - (startOffset / playbackRate);
        sourceNode.start(0, startOffset);
        
        isPlaying = true;
    }

    function stop() {
        if (sourceNode) {
            try {
                sourceNode.stop();
            } catch (e) { /* ignore if already stopped */ }
            sourceNode.disconnect();
            sourceNode = null;
        }
        isPlaying = false;
    }

    function pause() {
        if (!isPlaying) return;
        pauseTime = getPosition();
        stop();
    }

    function setRate(rate) {
        playbackRate = rate;
        if (isPlaying && sourceNode) {
            sourceNode.playbackRate.value = rate;
            // Re-sync start time so current position remains continuous
            const currentPos = getPosition();
            startTime = audioCtx.currentTime - (currentPos / 1000 / rate);
        }
    }

    /**
     * Get current track time in milliseconds.
     * Returns 0 if not playing.
     */
    function getPosition() {
        if (!audioCtx || !isPlaying) return pauseTime; // Return last paused time if stopped
        
        // Calculate based on hardware clock
        const elapsed = (audioCtx.currentTime - startTime) * playbackRate * 1000;
        return elapsed;
    }
    
    function getDuration() {
        return audioBuffer ? (audioBuffer.duration * 1000) : 0;
    }

    return {
        init,
        load,
        play,
        stop,
        pause,
        setRate,
        getPosition,
        getDuration,
        getContext: () => audioCtx
    };
})();
