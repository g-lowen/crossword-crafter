import type { GridSize } from '../model/page'
import type { CellRef, Puzzle } from '../model/puzzle'
import type { Layout } from './layout'

/** The cells of the anagram bar: one per anagram letter, side by side. Defaults to the middle of the bottom row. */
export function anagramBarCells(puzzle: Puzzle, layout: Layout, grid: GridSize): CellRef[] {
  const count = layout.anagramCells.length
  const start = puzzle.anagram.barStart ?? { row: grid.rows - 1, col: Math.floor((grid.columns - count) / 2) }
  return Array.from({ length: count }, (_, i) => ({ row: start.row, col: start.col + i }))
}

/** The anagram cells as Sammy usually numbers them: column by column from the left, top to bottom. */
export function leftToRightOrder(layout: Layout): { answerId: string; letterIndex: number }[] {
  return [...layout.anagramCells]
    .sort((a, b) => a.cell.col - b.cell.col || a.cell.row - b.cell.row)
    .map(({ answerId, letterIndex }) => ({ answerId, letterIndex }))
}
