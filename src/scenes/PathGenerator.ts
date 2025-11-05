import Phaser from 'phaser';

export class PathGenerator {
    static margin = 50; // Keep turningpoints away from edges
    static minLineLength = 0.05; // Minimum length of a straight line, given in percentage of the map width
    static maxLineLength = 0.25; // Maximum length of a straight line, given in percentage of the map width

    // UI areas that must be avoided (top and bottom)
    static topUIHeight = 70; // Height of top UI (statistics panel + padding)
    static bottomUIHeight = 90; // Height of bottom UI (tower cards + padding)

    /**
     * Generates 1-2 randomized paths for enemies to follow across the map
     * Paths can cross each other up to 3 times and all lead towards the castle
     * @param mapWidth - Width of the game map
     * @param mapHeight - Height of the game map
     * @returns Array of path arrays, where each path is an array of Vector2 waypoints
     */
    static generateRandomPaths(
        mapWidth: number,
        mapHeight: number
    ): Phaser.Math.Vector2[][] {
        // Randomly choose 1 or 2 paths (max 2)
        const numberOfPaths = Phaser.Math.Between(1, 2);
        const paths: Phaser.Math.Vector2[][] = [];

        // Define safe area (excluding UI zones at top and bottom)
        const minY = this.topUIHeight + this.margin;
        const maxY = mapHeight - this.bottomUIHeight - this.margin;

        // Place castle at the right edge in a safe position (shared end point for all paths)
        const castleTopOffset = 43;
        const castleBottomOffset = 30;
        const safeMinYForCastle = Math.max(minY + castleTopOffset, minY);
        const safeMaxYForCastle = Math.min(maxY - castleBottomOffset, maxY);

        const castleEndX = mapWidth;
        const castleEndY = Phaser.Math.Clamp(
            Phaser.Math.Between(safeMinYForCastle, safeMaxYForCastle),
            safeMinYForCastle,
            safeMaxYForCastle
        );

        // Pre-determine crossing zones if we have 2 paths (max 3 crossings)
        const crossingZones: { x: number; width: number }[] = [];
        if (numberOfPaths === 2) {
            // Create 0-3 crossing zones where paths are allowed to be close
            const numCrossings = Phaser.Math.Between(0, 3);
            const segmentWidth = mapWidth / (numCrossings + 2); // Distribute crossings
            
            for (let i = 0; i < numCrossings; i++) {
                const crossingX = segmentWidth * (i + 1) + Phaser.Math.Between(-50, 50);
                crossingZones.push({
                    x: crossingX,
                    width: 100 // Width of the crossing zone
                });
            }
        }

        // Generate each path
        for (let pathIndex = 0; pathIndex < numberOfPaths; pathIndex++) {
            const numberOfTurningPoints = Phaser.Math.Between(7, 10);
            const path = this.generateSinglePath(
                mapWidth,
                mapHeight,
                minY,
                maxY,
                castleEndX,
                castleEndY,
                numberOfTurningPoints,
                pathIndex,
                numberOfPaths,
                crossingZones
            );
            paths.push(path);
        }

        return paths;
    }

    /**
     * Generates a randomized path for enemies to follow across the map
     * First places the castle (end point) in a safe area, then plans the path horizontally/vertically
     * The path always ends horizontally from the left into the castle
     * @param mapWidth - Width of the game map
     * @param mapHeight - Height of the game map
     * @returns Array of Vector2 waypoints defining the path
     */
    static generateRandomPath(
        mapWidth: number,
        mapHeight: number
    ): Phaser.Math.Vector2[] {
        // For backward compatibility, return the first path from the multi-path generator
        const paths = this.generateRandomPaths(mapWidth, mapHeight);
        return paths[0] || [];
    }

    /**
     * Determines which edge a path should start from
     * @param pathIndex - Index of this path (0 or 1)
     * @param totalPaths - Total number of paths being generated
     * @returns 'left', 'top', or 'bottom'
     */
    private static determineStartEdge(
        pathIndex: number,
        totalPaths: number
    ): 'left' | 'top' | 'bottom' {
        if (totalPaths === 1) {
            // Single path: 50% left, 25% top, 25% bottom
            const rand = Phaser.Math.Between(0, 3);
            if (rand === 0) return 'top';
            if (rand === 1) return 'bottom';
            return 'left';
        } else {
            // Two paths: ensure good separation - one from top, one from bottom
            if (pathIndex === 0) {
                return 'top';
            } else {
                return 'bottom';
            }
        }
    }

    /**
     * Generates a single path from left to right
     * @param mapWidth - Width of the game map
     * @param mapHeight - Height of the game map
     * @param minY - Minimum Y coordinate for safe area
     * @param maxY - Maximum Y coordinate for safe area
     * @param endX - X coordinate of the castle
     * @param endY - Y coordinate of the castle
     * @param numberOfTurningPoints - Number of turns in the path
     * @param pathIndex - Index of this path (0 or 1)
     * @param totalPaths - Total number of paths being generated
     * @param crossingZones - Array of zones where paths are allowed to cross
     * @returns Array of Vector2 waypoints defining the path
     */
    private static generateSinglePath(
        mapWidth: number,
        mapHeight: number,
        minY: number,
        maxY: number,
        endX: number,
        endY: number,
        numberOfTurningPoints: number,
        pathIndex: number,
        totalPaths: number,
        crossingZones: { x: number; width: number }[] = []
    ): Phaser.Math.Vector2[] {
        // Now build path from left to right, ensuring all segments are horizontal or vertical
        const waypoints: Phaser.Math.Vector2[] = [];

        // Start point - always from the left edge of the map
        let startX: number;
        let startY: number;
        
        // Determine starting edge based on path index
        const startEdge = this.determineStartEdge(pathIndex, totalPaths);
        
        // Always start from the left edge (x = 0)
        startX = 0;
        
        if (startEdge === 'top') {
            // Start from left edge at top of safe area
            startY = minY;
        } else if (startEdge === 'bottom') {
            // Start from left edge at bottom of safe area
            startY = maxY;
        } else {
            // Start from left edge with varied Y position
            if (totalPaths === 1) {
                // Single path: random starting Y
                startY = Phaser.Math.Between(minY, maxY);
            } else {
                // Two paths: strong separation - top third and bottom third
                if (pathIndex === 0) {
                    startY = Phaser.Math.Between(minY, minY + (maxY - minY) / 4);
                } else {
                    startY = Phaser.Math.Between(minY + 3 * (maxY - minY) / 4, maxY);
                }
            }
        }

        // Plan path from start to end
        let currentX = startX;
        let currentY = startY;
        waypoints.push(new Phaser.Math.Vector2(currentX, currentY));

        // Alternate between horizontal and vertical movements
        // Since all paths now start from left edge, first movement should always be horizontal
        let isHorizontal = true; // Always start with horizontal movement from left edge
        let turnsRemaining = numberOfTurningPoints;

        // Define strict separated zones for each path
        // For 2 paths: one stays in top half, one in bottom half, except in crossing zones
        const separationBuffer = 80; // Minimum distance to keep paths apart
        let strictLaneMin: number;
        let strictLaneMax: number;
        
        if (totalPaths === 1) {
            // Single path can use full height
            strictLaneMin = minY;
            strictLaneMax = maxY;
        } else {
            // Two paths: divide space with clear separation
            const midPoint = (minY + maxY) / 2;
            if (pathIndex === 0) {
                // Top path
                strictLaneMin = minY;
                strictLaneMax = midPoint - separationBuffer / 2;
            } else {
                // Bottom path
                strictLaneMin = midPoint + separationBuffer / 2;
                strictLaneMax = maxY;
            }
        }
        
        /**
         * Helper function to check if current X position is in a crossing zone
         */
        const isInCrossingZone = (x: number): boolean => {
            return crossingZones.some(zone => 
                x >= zone.x - zone.width / 2 && x <= zone.x + zone.width / 2
            );
        };

        // Criterion 3 & 4: Plan path efficiently, ensuring final segment is horizontal from left
        // Keep generating waypoints until we reach near the end
        while (
            currentX < endX - this.margin ||
            Math.abs(currentY - endY) > 10
        ) {
            // If we're close to the right edge, align vertically first, then finish horizontally
            if (currentX >= endX - this.margin) {
                if (Math.abs(currentY - endY) > 10) {
                    // Align vertically with end point
                    currentY = endY;
                    waypoints.push(new Phaser.Math.Vector2(currentX, currentY));
                } else {
                    // Criterion 4: Move to end horizontally (final segment from left into castle)
                    currentX = endX;
                    waypoints.push(new Phaser.Math.Vector2(currentX, currentY));
                    break;
                }
            } else if (isHorizontal) {
                // Criterion 2: Move horizontally towards the end
                let targetX = currentX;

                if (turnsRemaining > 0 && currentX < endX - this.margin) {
                    // Move forward by a random distance, but don't get too close to end
                    const lineLength = Phaser.Math.Between(
                        this.minLineLength * mapWidth,
                        this.maxLineLength * mapWidth
                    );
                    targetX = Math.min(
                        currentX + lineLength,
                        endX - this.margin
                    );
                } else {
                    // Move towards end (but not all the way yet, wait for vertical alignment)
                    targetX = Math.min(
                        currentX + this.minLineLength * mapWidth,
                        endX - this.margin
                    );
                }

                // Only add point if we actually moved (Criterion 3: no unnecessary turns)
                if (targetX > currentX) {
                    currentX = targetX;
                    waypoints.push(new Phaser.Math.Vector2(currentX, currentY));
                }
                isHorizontal = false;
                if (turnsRemaining > 0) {
                    turnsRemaining--;
                }
            } else {
                // Criterion 2: Move vertically with strict lane enforcement
                let targetY = currentY;

                if (turnsRemaining > 0 && currentX < endX - this.margin) {
                    const lineLength = Phaser.Math.Between(
                        this.minLineLength * mapHeight,
                        this.maxLineLength * mapHeight
                    );
                    const directionToEnd = endY > currentY ? 1 : -1;
                    
                    // Check if we're in a crossing zone
                    const inCrossingZone = isInCrossingZone(currentX);
                    
                    if (inCrossingZone && totalPaths > 1) {
                        // In crossing zone: allow more freedom to cross into other path's area
                        // Move towards end or add variation
                        if (
                            Phaser.Math.Between(0, 1) === 1 &&
                            Math.abs(endY - currentY) > lineLength
                        ) {
                            targetY = currentY + directionToEnd * lineLength;
                        } else {
                            const randomDirection =
                                Phaser.Math.Between(0, 1) === 1 ? 1 : -1;
                            targetY = currentY + randomDirection * (lineLength * 0.6);
                        }
                        // In crossing zone, allow full map height but still respect safe bounds
                        targetY = Phaser.Math.Clamp(targetY, minY, maxY);
                    } else {
                        // Outside crossing zone: enforce strict lane separation
                        if (currentY < strictLaneMin) {
                            // Move back into lane
                            targetY = Math.min(currentY + lineLength, strictLaneMax);
                        } else if (currentY > strictLaneMax) {
                            // Move back into lane
                            targetY = Math.max(currentY - lineLength, strictLaneMin);
                        } else {
                            // Stay in lane, move with variation
                            targetY = currentY + directionToEnd * (lineLength * 0.4);
                        }
                        // Clamp to strict lane bounds (not crossing zones)
                        targetY = Phaser.Math.Clamp(targetY, strictLaneMin, strictLaneMax);
                    }
                } else {
                    // Align with end for final approach
                    targetY = endY;
                }
                // Only add point if we actually moved (Criterion 3: no unnecessary turns)
                if (Math.abs(targetY - currentY) > 5) {
                    currentY = targetY;
                    waypoints.push(new Phaser.Math.Vector2(currentX, currentY));
                }
                isHorizontal = true;
                if (turnsRemaining > 0) {
                    turnsRemaining--;
                }
            }
        }

        // Criterion 4: Ensure we end at the exact end point with a final horizontal segment from left
        const lastPoint = waypoints[waypoints.length - 1]!;
        if (lastPoint.x !== endX || lastPoint.y !== endY) {
            // Add final points if not already there
            if (lastPoint.x < endX) {
                // Add vertical alignment if needed (only if significant difference)
                if (Math.abs(lastPoint.y - endY) > 5) {
                    waypoints.push(new Phaser.Math.Vector2(lastPoint.x, endY));
                }
                // Criterion 4: Add final horizontal segment from left into castle
                waypoints.push(new Phaser.Math.Vector2(endX, endY));
            } else if (lastPoint.x === endX && lastPoint.y !== endY) {
                // If we're at endX but wrong Y, add alignment point
                waypoints.push(new Phaser.Math.Vector2(endX, endY));
            }
        }

        // Criterion 3: Optimize waypoints to remove unnecessary direction changes
        return this.optimizeWaypoints(waypoints);
    }

    /**
     * Removes redundant waypoints that create unnecessary visual turns
     * Removes points that are collinear or create very short segments
     * Criterion 3: Ensures no unnecessary direction changes
     */
    private static optimizeWaypoints(
        waypoints: Phaser.Math.Vector2[]
    ): Phaser.Math.Vector2[] {
        if (waypoints.length <= 2) {
            return waypoints;
        }

        const optimized: Phaser.Math.Vector2[] = [];
        const minSegmentLength = 20; // Minimum length for a segment to be kept

        // Always keep the first point
        optimized.push(waypoints[0]!);

        for (let i = 1; i < waypoints.length - 1; i++) {
            const prev = optimized[optimized.length - 1]!;
            const curr = waypoints[i]!;
            const next = waypoints[i + 1]!;

            // Calculate segment lengths
            const segmentLength1 = Phaser.Math.Distance.Between(
                prev.x,
                prev.y,
                curr.x,
                curr.y
            );
            const segmentLength2 = Phaser.Math.Distance.Between(
                curr.x,
                curr.y,
                next.x,
                next.y
            );

            // Check if current point is collinear (same direction)
            const dx1 = curr.x - prev.x;
            const dy1 = curr.y - prev.y;
            const dx2 = next.x - curr.x;
            const dy2 = next.y - curr.y;

            // Check if segments are in the same direction (horizontal or vertical)
            const isHorizontal1 = Math.abs(dy1) < 5;
            const isHorizontal2 = Math.abs(dy2) < 5;
            const isVertical1 = Math.abs(dx1) < 5;
            const isVertical2 = Math.abs(dx2) < 5;

            // Skip point if:
            // 1. Both segments are horizontal and in same X direction (can be merged)
            // 2. Both segments are vertical and in same Y direction (can be merged)
            // 3. One segment is very short (less than minSegmentLength)
            const sameHorizontalDir =
                isHorizontal1 &&
                isHorizontal2 &&
                ((dx1 > 0 && dx2 > 0) || (dx1 < 0 && dx2 < 0));
            const sameVerticalDir =
                isVertical1 &&
                isVertical2 &&
                ((dy1 > 0 && dy2 > 0) || (dy1 < 0 && dy2 < 0));

            if (
                sameHorizontalDir ||
                sameVerticalDir ||
                segmentLength1 < minSegmentLength ||
                segmentLength2 < minSegmentLength
            ) {
                // Skip this point, it's redundant (Criterion 3)
                continue;
            }

            optimized.push(curr);
        }

        // Always keep the last point (end of path at castle)
        optimized.push(waypoints[waypoints.length - 1]!);

        return optimized;
    }
}
