/**
 * js/utils.js
 * 
 * Math and Geometry utilities for WebOSU.
 * Contains logic for Bezier curves, linear interpolation, and distance calculations.
 * Derived from the bot logic to ensure slider accuracy.
 */

window.Utils = (function() {

    // --- Basic Math ---

    /**
     * Calculate Euclidean distance between two points.
     * @param {Object} p1 - {x, y}
     * @param {Object} p2 - {x, y}
     * @returns {number} distance
     */
    function dist(p1, p2) {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }

    /**
     * Linear Interpolation between two points.
     * @param {Object} p1 - {x, y}
     * @param {Object} p2 - {x, y}
     * @param {number} t - factor from 0 to 1
     * @returns {Object} interpolated point {x, y}
     */
    function lerp(p1, p2, t) {
        return { 
            x: p1.x + (p2.x - p1.x) * t, 
            y: p1.y + (p2.y - p1.y) * t 
        };
    }

    /**
     * Clamp a value between min and max.
     */
    function clamp(val, min, max) {
        return Math.min(Math.max(val, min), max);
    }

    // --- Curve Generation ---

    /**
     * Calculate a point on a Bezier curve at t.
     * Recursive implementation for N-degree Bezier curves.
     * @param {Array} points - Array of {x, y} points
     * @param {number} t - factor from 0 to 1
     * @returns {Object} point {x, y}
     */
    function bezierAt(points, t) {
        if (points.length === 1) return points[0];
        const nextPoints = [];
        for (let i = 0; i < points.length - 1; i++) {
            nextPoints.push(lerp(points[i], points[i + 1], t));
        }
        return bezierAt(nextPoints, t);
    }

    /**
     * Calculate a point on a Circle arc defined by 3 points.
     * Used for 'Perfect' curve type sliders in osu!.
     * @param {Object} p1 - Start point
     * @param {Object} p2 - Middle point
     * @param {Object} p3 - End point
     * @param {number} t - factor from 0 to 1
     * @returns {Object} point {x, y}
     */
    function circleAt(p1, p2, p3, t) {
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        const x3 = p3.x, y3 = p3.y;

        const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
        
        // If determinant is approx 0, points are collinear -> straight line
        if (Math.abs(D) < 0.0001) return lerp(p1, p3, t);

        const centerX = ((x1*x1 + y1*y1) * (y2 - y3) + (x2*x2 + y2*y2) * (y3 - y1) + (x3*x3 + y3*y3) * (y1 - y2)) / D;
        const centerY = ((x1*x1 + y1*y1) * (x3 - x2) + (x2*x2 + y2*y2) * (x1 - x3) + (x3*x3 + y3*y3) * (x2 - x1)) / D;

        const radius = Math.hypot(centerX - x1, centerY - y1);
        const startAng = Math.atan2(y1 - centerY, x1 - centerX);
        let midAng = Math.atan2(y2 - centerY, x2 - centerX);
        let endAng = Math.atan2(y3 - centerY, x3 - centerX);

        // Normalize angles to ensure correct arc direction
        while (midAng < startAng) midAng += 2 * Math.PI;
        while (endAng < startAng) endAng += 2 * Math.PI;
        if (midAng > endAng) endAng -= 2 * Math.PI;

        const currentAng = startAng + (endAng - startAng) * t;
        return {
            x: centerX + Math.cos(currentAng) * radius,
            y: centerY + Math.sin(currentAng) * radius
        };
    }

    /**
     * Generates a full path of points for a slider, ensuring constant velocity.
     * @param {Object} obj - The slider object containing control points, length, and curveType.
     * @returns {Array} Array of points {x, y, dist} where dist is distance along curve.
     */
    function generateSliderCurve(obj) {
        let rawPoints = obj.points;
        let segments = [];
        
        // Split raw points into segments (osu! sliders can be multi-segment)
        // Segments are separated by repeating control points
        let currentSeg = [rawPoints[0]];
        for (let i = 1; i < rawPoints.length; i++) {
            currentSeg.push(rawPoints[i]);
            // If current point equals next point, it's a segment break
            if (i < rawPoints.length - 1 && rawPoints[i].x === rawPoints[i+1].x && rawPoints[i].y === rawPoints[i+1].y) {
                segments.push(currentSeg);
                currentSeg = [rawPoints[i+1]];
                i++; // Skip the duplicate
            }
        }
        segments.push(currentSeg);

        // Generate points for each segment
        let fullPath = [];
        segments.forEach(segPoints => {
            let segType = obj.curveType;
            
            // Perfect Circle (3 points)
            if (segPoints.length === 3 && segType === 'P') {
                // Resolution: 50 steps
                for (let t = 0; t <= 1; t += 0.02) {
                    fullPath.push(circleAt(segPoints[0], segPoints[1], segPoints[2], t));
                }
            } 
            // Linear (2 points)
            else if (segPoints.length === 2) {
                fullPath.push(segPoints[0]);
                fullPath.push(segPoints[1]);
            } 
            // Bezier (Any other count)
            else {
                // Resolution: 50 steps
                for (let t = 0; t <= 1; t += 0.02) {
                    fullPath.push(bezierAt(segPoints, t));
                }
            }
        });

        // Reparameterize by Arc Length to ensure constant speed
        let finalPoints = [];
        let accumulatedLength = 0;
        let targetLength = obj.pixelLength; // The 'length' property from parser
        
        if (fullPath.length === 0) return [{x: obj.x, y: obj.y, dist: 0}];

        finalPoints.push({ ...fullPath[0], dist: 0 });
        let prevPoint = fullPath[0];

        for (let i = 1; i < fullPath.length; i++) {
            let currPoint = fullPath[i];
            let d = dist(prevPoint, currPoint);

            if (accumulatedLength + d <= targetLength) {
                accumulatedLength += d;
                finalPoints.push({ ...currPoint, dist: accumulatedLength });
                prevPoint = currPoint;
            } else {
                // Extrapolate the exact end point
                let remaining = targetLength - accumulatedLength;
                // Avoid division by zero
                let t = d > 0 ? remaining / d : 0;
                let endP = lerp(prevPoint, currPoint, t);
                endP.dist = targetLength;
                finalPoints.push(endP);
                accumulatedLength = targetLength; // Cap it
                break;
            }
        }
        
        // If strictly linear and short, ensure at least start/end exist
        if (finalPoints.length < 2 && targetLength > 0) {
            // It might be that the calculated length was short, just push the last calculated point
             finalPoints.push({ ...prevPoint, dist: accumulatedLength });
        }

        return finalPoints;
    }

    /**
     * Get the position on a slider at a given time progress (0 to 1).
     * Handles slider repeats (reverse arrows).
     * @param {Object} slider - The slider object
     * @param {number} progress - 0.0 to 1.0 (relative to total duration including repeats)
     * @returns {Object} {x, y}
     */
    function getSliderPosition(slider, progress) {
        if (!slider.curvePoints || slider.curvePoints.length === 0) return { x: slider.x, y: slider.y };

        const slides = slider.slides;
        const totalSlidesProgress = progress * slides; 
        const currentSlideIndex = Math.floor(totalSlidesProgress);
        
        // Clamp for safety at exactly 1.0
        if (currentSlideIndex >= slides) {
             const lastP = slider.curvePoints[slider.curvePoints.length-1];
             // If odd slides, we end at end; if even, we end at start
             if (slides % 2 !== 0) return {x: lastP.x, y: lastP.y};
             return {x: slider.curvePoints[0].x, y: slider.curvePoints[0].y};
        }

        let slideProgress = totalSlidesProgress - currentSlideIndex;
        
        // If oscillating back (odd index: 1, 3, 5...), reverse the progress
        // 0->1 (forward), 1->0 (back), 0->1 (forward)
        if (currentSlideIndex % 2 !== 0) {
            slideProgress = 1 - slideProgress;
        }

        const targetDist = slideProgress * slider.pixelLength;
        const curvePts = slider.curvePoints;

        // Binary search or linear scan for the point segment
        // Linear is fine for small N (~100 points)
        for (let k = 0; k < curvePts.length - 1; k++) {
            if (targetDist >= curvePts[k].dist && targetDist <= curvePts[k + 1].dist) {
                const d1 = curvePts[k].dist;
                const d2 = curvePts[k + 1].dist;
                const distDiff = d2 - d1;
                const factor = distDiff > 0.0001 ? (targetDist - d1) / distDiff : 0;
                return lerp(curvePts[k], curvePts[k + 1], factor);
            }
        }

        // Fallback to last point
        return curvePts[curvePts.length - 1];
    }
    
    /**
     * Helper to map osu! coordinates (0-512, 0-384) to Canvas coordinates
     * including HardRock logic (flip Y).
     */
    function mapToCanvas(x, y, canvasWidth, canvasHeight, isHardRock) {
        // osu! playfield is 4:3 ratio inside the screen
        // We usually center it.
        // Base resolution: 512x384
        
        // Calculate scale to fit canvas while maintaining aspect ratio
        // We leave some padding usually, approx 80% of screen
        const fieldWidth = 512;
        const fieldHeight = 384;
        
        const scale = Math.min(canvasWidth / fieldWidth, canvasHeight / fieldHeight) * 0.8;
        
        const offsetX = (canvasWidth - fieldWidth * scale) / 2;
        const offsetY = (canvasHeight - fieldHeight * scale) / 2;

        let finalY = y;
        if (isHardRock) {
            finalY = 384 - y;
        }

        return {
            x: offsetX + x * scale,
            y: offsetY + finalY * scale,
            scale: scale,
            offsetX: offsetX,
            offsetY: offsetY
        };
    }

    return {
        dist,
        lerp,
        clamp,
        bezierAt,
        circleAt,
        generateSliderCurve,
        getSliderPosition,
        mapToCanvas
    };

})();
