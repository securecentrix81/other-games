/**
 * utils.js
 * Math utilities and helper functions for osu! clone
 * No dependencies - load first in the module chain
 * Used by: parser.js, hitObjects.js, autoplay.js, renderer.js, effects.js
 */

/**
 * Linear interpolation between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} - Interpolated value
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Linear interpolation between two points
 * @param {Object} p1 - Start point {x, y}
 * @param {Object} p2 - End point {x, y}
 * @param {number} t - Interpolation factor (0-1)
 * @returns {Object} - Interpolated point {x, y}
 */
export function lerpPoint(p1, p2, t) {
    return {
        x: lerp(p1.x, p2.x, t),
        y: lerp(p1.y, p2.y, t)
    };
}

/**
 * Calculate distance between two points
 * @param {Object} p1 - First point {x, y}
 * @param {Object} p2 - Second point {x, y}
 * @returns {number} - Distance between points
 */
export function distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate squared distance between two points (faster, avoids sqrt)
 * @param {Object} p1 - First point {x, y}
 * @param {Object} p2 - Second point {x, y}
 * @returns {number} - Squared distance
 */
export function distanceSquared(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return dx * dx + dy * dy;
}

/**
 * Clamp a value between min and max
 * @param {number} val - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Clamped value
 */
export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

/**
 * De Casteljau's algorithm - calculate point on bezier curve at parameter t
 * Recursive implementation for arbitrary degree bezier curves
 * @param {Array} points - Array of control points [{x, y}, ...]
 * @param {number} t - Parameter (0-1)
 * @returns {Object} - Point on curve {x, y}
 */
export function bezierPoint(points, t) {
    if (points.length === 0) {
        return { x: 0, y: 0 };
    }
    
    if (points.length === 1) {
        return { x: points[0].x, y: points[0].y };
    }
    
    // De Casteljau's algorithm: recursively reduce control points
    const newPoints = [];
    for (let i = 0; i < points.length - 1; i++) {
        newPoints.push(lerpPoint(points[i], points[i + 1], t));
    }
    
    return bezierPoint(newPoints, t);
}

/**
 * Non-recursive bezier point calculation (more efficient for high-order curves)
 * Uses binomial coefficients
 * @param {Array} points - Array of control points [{x, y}, ...]
 * @param {number} t - Parameter (0-1)
 * @returns {Object} - Point on curve {x, y}
 */
export function bezierPointFast(points, t) {
    const n = points.length - 1;
    if (n < 0) return { x: 0, y: 0 };
    if (n === 0) return { x: points[0].x, y: points[0].y };
    
    let x = 0, y = 0;
    const mt = 1 - t;
    
    // Precompute binomial coefficients
    const coeffs = [];
    for (let i = 0; i <= n; i++) {
        coeffs[i] = binomial(n, i);
    }
    
    for (let i = 0; i <= n; i++) {
        const basis = coeffs[i] * Math.pow(mt, n - i) * Math.pow(t, i);
        x += basis * points[i].x;
        y += basis * points[i].y;
    }
    
    return { x, y };
}

/**
 * Calculate binomial coefficient (n choose k)
 * @param {number} n - Total items
 * @param {number} k - Items to choose
 * @returns {number} - Binomial coefficient
 */
function binomial(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    
    let result = 1;
    for (let i = 1; i <= k; i++) {
        result = result * (n - k + i) / i;
    }
    return Math.round(result);
}

/**
 * Generate array of points along a bezier curve
 * @param {Array} controlPoints - Array of control points [{x, y}, ...]
 * @param {number} segments - Number of segments to generate
 * @returns {Array} - Array of points on curve
 */
export function bezierCurve(controlPoints, segments = 50) {
    if (controlPoints.length < 2) {
        return controlPoints.map(p => ({ x: p.x, y: p.y }));
    }
    
    const points = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        points.push(bezierPoint(controlPoints, t));
    }
    
    return points;
}

/**
 * Calculate circumcenter of three points (center of circle through all three)
 * @param {Object} p1 - First point {x, y}
 * @param {Object} p2 - Second point {x, y}
 * @param {Object} p3 - Third point {x, y}
 * @returns {Object|null} - Circumcenter {x, y, radius} or null if collinear
 */
export function circumcenter(p1, p2, p3) {
    const ax = p1.x, ay = p1.y;
    const bx = p2.x, by = p2.y;
    const cx = p3.x, cy = p3.y;
    
    // Calculate denominator (2 * signed area of triangle)
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    
    // Check for collinear points (denominator near zero)
    if (Math.abs(d) < 0.0001) {
        return null;
    }
    
    // Calculate circumcenter coordinates
    const aSq = ax * ax + ay * ay;
    const bSq = bx * bx + by * by;
    const cSq = cx * cx + cy * cy;
    
    const ux = (aSq * (by - cy) + bSq * (cy - ay) + cSq * (ay - by)) / d;
    const uy = (aSq * (cx - bx) + bSq * (ax - cx) + cSq * (bx - ax)) / d;
    
    // Calculate radius
    const radius = distance({ x: ux, y: uy }, p1);
    
    return { x: ux, y: uy, radius };
}

/**
 * Generate a perfect circle arc through three points
 * @param {Object} p1 - Start point {x, y}
 * @param {Object} p2 - Middle point {x, y} (determines arc direction)
 * @param {Object} p3 - End point {x, y}
 * @param {number} segments - Number of segments
 * @returns {Array} - Array of points along the arc
 */
export function perfectCircleArc(p1, p2, p3, segments = 50) {
    // Calculate circumcenter
    const center = circumcenter(p1, p2, p3);
    
    // If points are collinear, fall back to linear interpolation
    if (!center) {
        return [
            { x: p1.x, y: p1.y },
            { x: p2.x, y: p2.y },
            { x: p3.x, y: p3.y }
        ];
    }
    
    const radius = center.radius;
    
    // Calculate angles for each point
    const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
    const midAngle = Math.atan2(p2.y - center.y, p2.x - center.x);
    const endAngle = Math.atan2(p3.y - center.y, p3.x - center.x);
    
    // Determine arc direction using cross product
    // Positive cross = counter-clockwise, negative = clockwise
    const cross = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
    const isClockwise = cross < 0;
    
    // Calculate total angle to traverse
    let totalAngle;
    if (isClockwise) {
        totalAngle = startAngle - endAngle;
        if (totalAngle < 0) totalAngle += 2 * Math.PI;
    } else {
        totalAngle = endAngle - startAngle;
        if (totalAngle < 0) totalAngle += 2 * Math.PI;
    }
    
    // Verify mid-point is on the arc (not the long way around)
    let midCheck;
    if (isClockwise) {
        midCheck = startAngle - midAngle;
        if (midCheck < 0) midCheck += 2 * Math.PI;
    } else {
        midCheck = midAngle - startAngle;
        if (midCheck < 0) midCheck += 2 * Math.PI;
    }
    
    // If mid-point check fails, we're going the wrong direction
    if (midCheck > totalAngle) {
        totalAngle = 2 * Math.PI - totalAngle;
    }
    
    // Generate arc points
    const points = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        let angle;
        
        if (isClockwise) {
            angle = startAngle - t * totalAngle;
        } else {
            angle = startAngle + t * totalAngle;
        }
        
        points.push({
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle)
        });
    }
    
    return points;
}

/**
 * Generate linear path between consecutive points
 * @param {Array} points - Array of control points [{x, y}, ...]
 * @param {number} segmentsPerUnit - Segments per osu! pixel (controls density)
 * @returns {Array} - Array of points along the line segments
 */
export function linearPath(points, segmentsPerUnit = 0.5) {
    if (points.length < 2) {
        return points.map(p => ({ x: p.x, y: p.y }));
    }
    
    const result = [];
    
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dist = distance(p1, p2);
        const segments = Math.max(1, Math.ceil(dist * segmentsPerUnit));
        
        for (let j = 0; j < segments; j++) {
            const t = j / segments;
            result.push(lerpPoint(p1, p2, t));
        }
    }
    
    // Add final point
    result.push({ x: points[points.length - 1].x, y: points[points.length - 1].y });
    
    return result;
}

/**
 * Check if a point is inside a circle
 * @param {Object} point - Point to check {x, y}
 * @param {Object} center - Circle center {x, y}
 * @param {number} radius - Circle radius
 * @returns {boolean} - True if point is inside circle
 */
export function isPointInCircle(point, center, radius) {
    return distanceSquared(point, center) <= radius * radius;
}

/**
 * Calculate angle from center point to target point
 * @param {Object} center - Center point {x, y}
 * @param {Object} point - Target point {x, y}
 * @returns {number} - Angle in radians (-PI to PI)
 */
export function angleFromPoints(center, point) {
    return Math.atan2(point.y - center.y, point.x - center.x);
}

/**
 * Normalize angle to range [-PI, PI]
 * @param {number} angle - Angle in radians
 * @returns {number} - Normalized angle
 */
export function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
}

/**
 * Calculate the difference between two angles (shortest path)
 * @param {number} angle1 - First angle in radians
 * @param {number} angle2 - Second angle in radians
 * @returns {number} - Angle difference in radians
 */
export function angleDifference(angle1, angle2) {
    let diff = angle2 - angle1;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return diff;
}

/**
 * Calculate the total length of a path (array of points)
 * @param {Array} points - Array of points [{x, y}, ...]
 * @returns {number} - Total path length
 */
export function pathLength(points) {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
        length += distance(points[i - 1], points[i]);
    }
    return length;
}

/**
 * Trim a path to a specific length
 * @param {Array} points - Array of points [{x, y}, ...]
 * @param {number} targetLength - Desired path length
 * @returns {Array} - Trimmed path
 */
export function trimPathToLength(points, targetLength) {
    if (points.length < 2 || targetLength <= 0) {
        return points.length > 0 ? [{ x: points[0].x, y: points[0].y }] : [];
    }
    
    const result = [{ x: points[0].x, y: points[0].y }];
    let currentLength = 0;
    
    for (let i = 1; i < points.length; i++) {
        const segmentLength = distance(points[i - 1], points[i]);
        
        if (currentLength + segmentLength >= targetLength) {
            // Interpolate to exact length
            const remaining = targetLength - currentLength;
            const t = remaining / segmentLength;
            result.push(lerpPoint(points[i - 1], points[i], t));
            break;
        }
        
        currentLength += segmentLength;
        result.push({ x: points[i].x, y: points[i].y });
    }
    
    return result;
}

/**
 * Get point at specific distance along path
 * @param {Array} points - Array of points [{x, y}, ...]
 * @param {number} targetDistance - Distance along path
 * @returns {Object} - Point at distance {x, y}
 */
export function getPointAtDistance(points, targetDistance) {
    if (points.length === 0) {
        return { x: 0, y: 0 };
    }
    
    if (points.length === 1 || targetDistance <= 0) {
        return { x: points[0].x, y: points[0].y };
    }
    
    let currentDistance = 0;
    
    for (let i = 1; i < points.length; i++) {
        const segmentLength = distance(points[i - 1], points[i]);
        
        if (currentDistance + segmentLength >= targetDistance) {
            const t = (targetDistance - currentDistance) / segmentLength;
            return lerpPoint(points[i - 1], points[i], t);
        }
        
        currentDistance += segmentLength;
    }
    
    // Return last point if distance exceeds path length
    return { x: points[points.length - 1].x, y: points[points.length - 1].y };
}

/**
 * Get point at progress (0-1) along path
 * @param {Array} points - Array of points [{x, y}, ...]
 * @param {number} progress - Progress along path (0-1)
 * @returns {Object} - Point at progress {x, y}
 */
export function getPointAtProgress(points, progress) {
    const totalLength = pathLength(points);
    return getPointAtDistance(points, progress * totalLength);
}

/**
 * Get cumulative distances array for path
 * Useful for efficient repeated lookups
 * @param {Array} points - Array of points [{x, y}, ...]
 * @returns {Array} - Array of cumulative distances
 */
export function getCumulativeDistances(points) {
    const distances = [0];
    for (let i = 1; i < points.length; i++) {
        distances.push(distances[i - 1] + distance(points[i - 1], points[i]));
    }
    return distances;
}

/**
 * Easing function - ease out quad
 * @param {number} t - Input (0-1)
 * @returns {number} - Eased output
 */
export function easeOutQuad(t) {
    return t * (2 - t);
}

/**
 * Easing function - ease in out quad
 * @param {number} t - Input (0-1)
 * @returns {number} - Eased output
 */
export function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Easing function - ease out cubic
 * @param {number} t - Input (0-1)
 * @returns {number} - Eased output
 */
export function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

/**
 * Easing function - ease in cubic
 * @param {number} t - Input (0-1)
 * @returns {number} - Eased output
 */
export function easeInCubic(t) {
    return t * t * t;
}

/**
 * Easing function - ease out elastic
 * @param {number} t - Input (0-1)
 * @returns {number} - Eased output
 */
export function easeOutElastic(t) {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
}

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} - Angle in radians
 */
export function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 * @param {number} radians - Angle in radians
 * @returns {number} - Angle in degrees
 */
export function radToDeg(radians) {
    return radians * (180 / Math.PI);
}

/**
 * Format a number with leading zeros
 * @param {number} num - Number to format
 * @param {number} digits - Minimum number of digits
 * @returns {string} - Formatted string
 */
export function padNumber(num, digits) {
    return String(Math.floor(num)).padStart(digits, '0');
}

/**
 * Format milliseconds as mm:ss
 * @param {number} ms - Time in milliseconds
 * @returns {string} - Formatted time string
 */
export function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${padNumber(seconds, 2)}`;
}

/**
 * Format score with commas
 * @param {number} score - Score value
 * @returns {string} - Formatted score
 */
export function formatScore(score) {
    return score.toLocaleString();
}

/**
 * Format accuracy as percentage
 * @param {number} accuracy - Accuracy (0-100)
 * @param {number} decimals - Decimal places
 * @returns {string} - Formatted percentage
 */
export function formatAccuracy(accuracy, decimals = 2) {
    return accuracy.toFixed(decimals) + '%';
}

/**
 * Parse RGB color string to components
 * @param {string} color - Color string (rgb(r,g,b) or #rrggbb)
 * @returns {Object} - {r, g, b} components (0-255)
 */
export function parseColor(color) {
    // Handle rgb(r,g,b) format
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
        return {
            r: parseInt(rgbMatch[1]),
            g: parseInt(rgbMatch[2]),
            b: parseInt(rgbMatch[3])
        };
    }
    
    // Handle #rrggbb format
    const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (hexMatch) {
        return {
            r: parseInt(hexMatch[1], 16),
            g: parseInt(hexMatch[2], 16),
            b: parseInt(hexMatch[3], 16)
        };
    }
    
    // Default to white
    return { r: 255, g: 255, b: 255 };
}

/**
 * Convert RGB to hex color string
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} - Hex color string
 */
export function rgbToHex(r, g, b) {
    const toHex = (v) => {
        const hex = Math.max(0, Math.min(255, Math.round(v))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * HSL to RGB color conversion
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {Object} - {r, g, b} components (0-255)
 */
export function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    
    let r, g, b;
    
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
    };
}

/**
 * HSL to hex color string
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} - Hex color string
 */
export function hslToHex(h, s, l) {
    const { r, g, b } = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
}

/**
 * Lighten a color
 * @param {string} color - Color string
 * @param {number} amount - Amount to lighten (0-1)
 * @returns {string} - Lightened color
 */
export function lightenColor(color, amount) {
    const { r, g, b } = parseColor(color);
    return rgbToHex(
        r + (255 - r) * amount,
        g + (255 - g) * amount,
        b + (255 - b) * amount
    );
}

/**
 * Darken a color
 * @param {string} color - Color string
 * @param {number} amount - Amount to darken (0-1)
 * @returns {string} - Darkened color
 */
export function darkenColor(color, amount) {
    const { r, g, b } = parseColor(color);
    return rgbToHex(
        r * (1 - amount),
        g * (1 - amount),
        b * (1 - amount)
    );
}

/**
 * Generate a random number in range [min, max]
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Random number
 */
export function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

/**
 * Generate a random integer in range [min, max]
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} - Random integer
 */
export function randomInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
}

/**
 * Shuffle an array in place (Fisher-Yates)
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Same array, shuffled
 */
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Debounce a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle a function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between calls in ms
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
