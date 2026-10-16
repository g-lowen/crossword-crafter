import type { GridSize } from '../model/page'
import type { CellRef } from '../model/puzzle'

type Rect = { left: number; top: number; width: number; height: number }
type Point = { x: number; y: number }

/** The grid cell under a screen point, or null when the point is outside the grid. */
export function cellAtPoint(rect: Rect, grid: GridSize, point: Point): CellRef | null {
  const col = Math.floor(((point.x - rect.left) / rect.width) * grid.columns)
  const row = Math.floor(((point.y - rect.top) / rect.height) * grid.rows)
  if (row < 0 || row >= grid.rows || col < 0 || col >= grid.columns) return null
  return { row, col }
}

/** Moves a cell by a screen distance, snapping to whole cells. */
export function moveByPixels(start: CellRef, delta: Point, cellSize: number): CellRef {
  return {
    row: start.row + Math.round(delta.y / cellSize),
    col: start.col + Math.round(delta.x / cellSize),
  }
}
