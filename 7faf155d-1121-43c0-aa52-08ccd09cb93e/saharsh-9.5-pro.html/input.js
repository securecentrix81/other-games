/**
 * input.js
 * Handles mouse and keyboard input for the osu! game
 * Dependencies: None
 * Exports: InputManager class
 */

/**
 * InputManager - Manages all player input including mouse position,
 * keyboard keys, and mouse buttons
 */
export class InputManager {
    constructor() {
        // Mouse state
        /** @type {number} Current mouse X position (screen coordinates) */
        this.mouseX = 0;
        
        /** @type {number} Current mouse Y position (screen coordinates) */
        this.mouseY = 0;
        
        /** @type {boolean} Left mouse button pressed */
        this.mouseLeftPressed = false;
        
        /** @type {boolean} Right mouse button pressed */
        this.mouseRightPressed = false;
        
        // Keyboard state - Z and X are the default osu! keys
        /** @type {boolean} Key 1 (Z) currently pressed */
        this.key1Pressed = false;
        
        /** @type {boolean} Key 2 (X) currently pressed */
        this.key2Pressed = false;
        
        // Previous frame state (for detecting "just pressed")
        /** @type {boolean} Previous frame key 1 state */
        this.prevKey1Pressed = false;
        
        /** @type {boolean} Previous frame key 2 state */
        this.prevKey2Pressed = false;
        
        /** @type {boolean} Previous frame mouse left state */
        this.prevMouseLeftPressed = false;
        
        /** @type {boolean} Previous frame mouse right state */
        this.prevMouseRightPressed = false;
        
        // Just pressed flags (true for one frame when key goes from up to down)
        /** @type {boolean} Key 1 was just pressed this frame */
        this.key1JustPressed = false;
        
        /** @type {boolean} Key 2 was just pressed this frame */
        this.key2JustPressed = false;
        
        /** @type {boolean} Mouse left was just pressed this frame */
        this.mouseLeftJustPressed = false;
        
        /** @type {boolean} Mouse right was just pressed this frame */
        this.mouseRightJustPressed = false;
        
        // Special keys
        /** @type {boolean} Escape key pressed */
        this.escapePressed = false;
        
        /** @type {boolean} Escape key just pressed */
        this.escapeJustPressed = false;
        
        /** @type {boolean} Previous escape state */
        this.prevEscapePressed = false;
        
        /** @type {boolean} Space key pressed */
        this.spacePressed = false;
        
        /** @type {boolean} Space key just pressed */
        this.spaceJustPressed = false;
        
        /** @type {boolean} Previous space state */
        this.prevSpacePressed = false;
        
        // Bound event handlers (for removal)
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleKeyUp = this.handleKeyUp.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleMouseDown = this.handleMouseDown.bind(this);
        this.boundHandleMouseUp = this.handleMouseUp.bind(this);
        this.boundHandleContextMenu = this.handleContextMenu.bind(this);
        this.boundHandleMouseLeave = this.handleMouseLeave.bind(this);
        this.boundHandleBlur = this.handleBlur.bind(this);
        
        /** @type {boolean} Whether input is attached */
        this.isAttached = false;
        
        /** @type {HTMLElement|null} Canvas element for relative positioning */
        this.canvas = null;
        
        // Simulated input (for autoplay)
        /** @type {boolean} Simulated action press */
        this.simulatedPress = false;
        
        /** @type {boolean} Simulated action hold */
        this.simulatedHold = false;
        
        /** @type {{x: number, y: number}|null} Simulated cursor position */
        this.simulatedCursor = null;
    }

    /**
     * Attach event listeners to the document/canvas
     * @param {HTMLCanvasElement} canvas - Canvas element for mouse position calculations
     */
    attach(canvas = null) {
        if (this.isAttached) {
            this.detach();
        }
        
        this.canvas = canvas;
        
        // Keyboard events on document
        document.addEventListener('keydown', this.boundHandleKeyDown);
        document.addEventListener('keyup', this.boundHandleKeyUp);
        
        // Mouse events on document (to capture even outside canvas)
        document.addEventListener('mousemove', this.boundHandleMouseMove);
        document.addEventListener('mousedown', this.boundHandleMouseDown);
        document.addEventListener('mouseup', this.boundHandleMouseUp);
        
        // Prevent context menu on right-click
        document.addEventListener('contextmenu', this.boundHandleContextMenu);
        
        // Handle mouse leaving window
        document.addEventListener('mouseleave', this.boundHandleMouseLeave);
        
        // Handle window losing focus
        window.addEventListener('blur', this.boundHandleBlur);
        
        this.isAttached = true;
    }

    /**
     * Detach all event listeners
     */
    detach() {
        document.removeEventListener('keydown', this.boundHandleKeyDown);
        document.removeEventListener('keyup', this.boundHandleKeyUp);
        document.removeEventListener('mousemove', this.boundHandleMouseMove);
        document.removeEventListener('mousedown', this.boundHandleMouseDown);
        document.removeEventListener('mouseup', this.boundHandleMouseUp);
        document.removeEventListener('contextmenu', this.boundHandleContextMenu);
        document.removeEventListener('mouseleave', this.boundHandleMouseLeave);
        window.removeEventListener('blur', this.boundHandleBlur);
        
        this.isAttached = false;
    }

    /**
     * Handle keydown events
     * @param {KeyboardEvent} e 
     */
    handleKeyDown(e) {
        // Prevent key repeat from triggering multiple presses
        if (e.repeat) return;
        
        const key = e.key.toLowerCase();
        
        switch (key) {
            case 'z':
                this.key1Pressed = true;
                e.preventDefault();
                break;
            case 'x':
                this.key2Pressed = true;
                e.preventDefault();
                break;
            case 'escape':
                this.escapePressed = true;
                e.preventDefault();
                break;
            case ' ':
                this.spacePressed = true;
                e.preventDefault();
                break;
        }
        
        // Prevent arrow keys and space from scrolling
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
            e.preventDefault();
        }
    }

    /**
     * Handle keyup events
     * @param {KeyboardEvent} e 
     */
    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        
        switch (key) {
            case 'z':
                this.key1Pressed = false;
                break;
            case 'x':
                this.key2Pressed = false;
                break;
            case 'escape':
                this.escapePressed = false;
                break;
            case ' ':
                this.spacePressed = false;
                break;
        }
    }

    /**
     * Handle mouse move events
     * @param {MouseEvent} e 
     */
    handleMouseMove(e) {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    }

    /**
     * Handle mouse down events
     * @param {MouseEvent} e 
     */
    handleMouseDown(e) {
        if (e.button === 0) {
            this.mouseLeftPressed = true;
        } else if (e.button === 2) {
            this.mouseRightPressed = true;
        }
    }

    /**
     * Handle mouse up events
     * @param {MouseEvent} e 
     */
    handleMouseUp(e) {
        if (e.button === 0) {
            this.mouseLeftPressed = false;
        } else if (e.button === 2) {
            this.mouseRightPressed = false;
        }
    }

    /**
     * Prevent context menu on right-click
     * @param {MouseEvent} e 
     */
    handleContextMenu(e) {
        e.preventDefault();
    }

    /**
     * Handle mouse leaving the document
     * @param {MouseEvent} e 
     */
    handleMouseLeave(e) {
        // Keep last known position, don't reset
        // This allows smooth gameplay when mouse briefly leaves
    }

    /**
     * Handle window losing focus - release all keys
     * @param {FocusEvent} e 
     */
    handleBlur(e) {
        this.key1Pressed = false;
        this.key2Pressed = false;
        this.mouseLeftPressed = false;
        this.mouseRightPressed = false;
        this.escapePressed = false;
        this.spacePressed = false;
    }

    /**
     * Update input state - call once per frame at the start
     * Updates "just pressed" states
     */
    update() {
        // Calculate "just pressed" states
        this.key1JustPressed = this.key1Pressed && !this.prevKey1Pressed;
        this.key2JustPressed = this.key2Pressed && !this.prevKey2Pressed;
        this.mouseLeftJustPressed = this.mouseLeftPressed && !this.prevMouseLeftPressed;
        this.mouseRightJustPressed = this.mouseRightPressed && !this.prevMouseRightPressed;
        this.escapeJustPressed = this.escapePressed && !this.prevEscapePressed;
        this.spaceJustPressed = this.spacePressed && !this.prevSpacePressed;
        
        // Store current state for next frame
        this.prevKey1Pressed = this.key1Pressed;
        this.prevKey2Pressed = this.key2Pressed;
        this.prevMouseLeftPressed = this.mouseLeftPressed;
        this.prevMouseRightPressed = this.mouseRightPressed;
        this.prevEscapePressed = this.escapePressed;
        this.prevSpacePressed = this.spacePressed;
        
        // Clear simulated press after one frame (hold continues)
        this.simulatedPress = false;
    }

    /**
     * Check if any action key/button is currently pressed
     * @returns {boolean}
     */
    isActionPressed() {
        return this.key1Pressed || this.key2Pressed || 
               this.mouseLeftPressed || this.mouseRightPressed ||
               this.simulatedHold;
    }

    /**
     * Check if any action key/button was just pressed this frame
     * @returns {boolean}
     */
    isActionJustPressed() {
        return this.key1JustPressed || this.key2JustPressed || 
               this.mouseLeftJustPressed || this.mouseRightJustPressed ||
               this.simulatedPress;
    }

    /**
     * Get cursor position in osu! playfield coordinates (0-512, 0-384)
     * @param {Object} playfieldRect - Playfield rectangle {x, y, width, height, scaleX, scaleY}
     * @returns {{x: number, y: number}} Position in osu! coordinates
     */
    getOsuPosition(playfieldRect) {
        // If simulated cursor is active, use it
        if (this.simulatedCursor) {
            return { x: this.simulatedCursor.x, y: this.simulatedCursor.y };
        }
        
        if (!playfieldRect) {
            return { x: 256, y: 192 }; // Center of playfield
        }
        
        // Convert screen coordinates to osu! playfield coordinates
        const relX = this.mouseX - playfieldRect.x;
        const relY = this.mouseY - playfieldRect.y;
        
        const osuX = relX / playfieldRect.scaleX;
        const osuY = relY / playfieldRect.scaleY;
        
        return { x: osuX, y: osuY };
    }

    /**
     * Get raw mouse position (screen coordinates)
     * @returns {{x: number, y: number}}
     */
    getMousePosition() {
        return { x: this.mouseX, y: this.mouseY };
    }

    /**
     * Simulate a click (for autoplay)
     */
    simulateClick() {
        this.simulatedPress = true;
    }

    /**
     * Set simulated hold state (for autoplay)
     * @param {boolean} holding 
     */
    setSimulatedHold(holding) {
        this.simulatedHold = holding;
    }

    /**
     * Set simulated cursor position (for autoplay/autopilot)
     * @param {number|null} x - X position in osu! coordinates, or null to disable
     * @param {number|null} y - Y position in osu! coordinates
     */
    setSimulatedCursor(x, y) {
        if (x === null || y === null) {
            this.simulatedCursor = null;
        } else {
            this.simulatedCursor = { x, y };
        }
    }

    /**
     * Clear simulated inputs
     */
    clearSimulated() {
        this.simulatedPress = false;
        this.simulatedHold = false;
        this.simulatedCursor = null;
    }

    /**
     * Reset all input state
     */
    reset() {
        this.key1Pressed = false;
        this.key2Pressed = false;
        this.mouseLeftPressed = false;
        this.mouseRightPressed = false;
        this.escapePressed = false;
        this.spacePressed = false;
        
        this.prevKey1Pressed = false;
        this.prevKey2Pressed = false;
        this.prevMouseLeftPressed = false;
        this.prevMouseRightPressed = false;
        this.prevEscapePressed = false;
        this.prevSpacePressed = false;
        
        this.key1JustPressed = false;
        this.key2JustPressed = false;
        this.mouseLeftJustPressed = false;
        this.mouseRightJustPressed = false;
        this.escapeJustPressed = false;
        this.spaceJustPressed = false;
        
        this.clearSimulated();
    }
}

// Create singleton instance
export const inputManager = new InputManager();

export default InputManager;
