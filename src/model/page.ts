import type { Puzzle } from './puzzle'

/** The paper the puzzle is made for, in millimetres. */
export const A4_LANDSCAPE_MM = { width: 297, height: 210 }

/** Cell sizes to choose from, in millimetres. Smaller cells fit more answers on the page. */
export const CELL_SIZES_MM = [10, 9, 8, 7]

export const DEFAULT_CELL_SIZE_MM = 10

export type GridSize = { rows: number; columns: number }

/** As many whole cells of this size as fit on an A4 landscape page. */
export function gridForCellSize(cellSizeMm: number): GridSize {
  return {
    rows: Math.floor(A4_LANDSCAPE_MM.height / cellSizeMm),
    columns: Math.floor(A4_LANDSCAPE_MM.width / cellSizeMm),
  }
}

export const puzzleGrid = (puzzle: Puzzle): GridSize => gridForCellSize(puzzle.cellSizeMm)

/** The default page: 29 × 21 cells of 1 cm. */
export const A4_LANDSCAPE_GRID: GridSize = gridForCellSize(DEFAULT_CELL_SIZE_MM)
