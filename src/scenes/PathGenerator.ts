import Phaser from 'phaser'

export class PathGenerator {

	static margin = 50 // Keep turningpoints away from edges
	static minLineLength = 0.05 // Minimum length of a straight line, given in percentage of the map width
	static maxLineLength = 0.25 // Maximum length of a straight line, given in percentage of the map width
	static numberOfTurningPoints = Phaser.Math.Between(7, 10)

	/**
	 * Generates a randomized path for enemies to follow across the map
	 * @param mapWidth - Width of the game map
	 * @param mapHeight - Height of the game map
	 * @returns Array of Vector2 waypoints defining the path
	 */
	static generateRandomPath(mapWidth: number, mapHeight: number): Phaser.Math.Vector2[] {
		const waypoints: Phaser.Math.Vector2[] = []
		
		// Start point - always at the left edge of the map
		const startX = 0
		const startY = Phaser.Math.Between(this.margin, mapHeight - this.margin)
		waypoints.push(new Phaser.Math.Vector2(startX, startY))
		
		let currentX = startX
		let currentY = startY
		
		// Generate turning points
		for (let i = 0; i < this.numberOfTurningPoints; i++) {
			let nextX: number
			let nextY: number
			
			// Determine direction for this segment
			const isHorizontal = i % 2 === 0 // Alternate between horizontal and vertical movement
			
			if (isHorizontal) {
				// Horizontal movement
				const lineLength = Phaser.Math.Between(
					this.minLineLength * mapWidth,
					this.maxLineLength * mapWidth
				)
				
				// Choose direction (left to right, or right to left if we're near the right edge)
				const shouldGoRight = currentX < mapWidth * 0.7
				nextX = shouldGoRight 
					? Math.min(currentX + lineLength, mapWidth - this.margin)
					: Math.max(currentX - lineLength, this.margin)
				nextY = currentY
			} else {
				// Vertical movement
				const lineLength = Phaser.Math.Between(
					this.minLineLength * mapHeight,
					this.maxLineLength * mapHeight
				)
				
				// Choose direction (up or down)
				const shouldGoDown = Phaser.Math.Between(0, 1) === 1
				nextY = shouldGoDown
					? Math.min(currentY + lineLength, mapHeight - this.margin)
					: Math.max(currentY - lineLength, this.margin)
				nextX = currentX
			}
			
			// Ensure we don't go backwards too much (keep general left-to-right progression)
			if (isHorizontal && nextX < currentX - this.minLineLength * mapWidth) {
				nextX = currentX + this.minLineLength * mapWidth
			}
			
			waypoints.push(new Phaser.Math.Vector2(nextX, nextY))
			currentX = nextX
			currentY = nextY
		}
		
		// End point - always at the right edge of the map, aligned with last waypoint
		const endX = mapWidth
		const endY = currentY // Keep the same Y as the last waypoint for perfect alignment
		waypoints.push(new Phaser.Math.Vector2(endX, endY))
		
		return waypoints
	}
}
