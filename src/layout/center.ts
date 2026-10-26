import type { GridSize } from '../model/page'
import type { CellRef } from '../model/puzzle'
import type { Layout } from './layout'

/**
 * How far to move every placed answer so the puzzle sits in the middle of the page. When the
 * anagram bar is shown, its row and the row with its numbers are kept free. Null when nothing is
 * placed, the puzzle doesn't fit, or it is already centred.
 */
export function centerOffset(layout: Layout, grid: GridSize, showsAnagramBar: boolean): CellRef | null {
  const pieces = [...layout.cells.values()].flat()
  if (pieces.length === 0) return null

  const top = Math.min(...pieces.map((piece) => piece.row))
  const bottom = Math.max(...pieces.map((piece) => piece.row))
  const left = Math.min(...pieces.map((piece) => piece.col))
  const right = Math.max(...pieces.map((piece) => piece.col))

  const rows = showsAnagramBar && layout.anagramCells.length > 0 ? grid.rows - 2 : grid.rows
  const height = bottom - top + 1
  const width = right - left + 1
  if (height > rows || width > grid.columns) return null

  const by = {
    row: Math.floor((rows - height) / 2) - top,
    col: Math.floor((grid.columns - width) / 2) - left,
  }
  return by.row === 0 && by.col === 0 ? null : by
}
