import { cellKey, type Layout } from '../layout/layout'
import type { CellRef } from '../model/puzzle'

/** One character of one answer, plus the cell that was clicked (a wide space has two). */
export type Selection = { answerId: string; index: number; cell: CellRef }

/**
 * What a click on a cell selects. Clicking the selected cell again moves on to the next answer
 * in that cell, so either answer of a crossing can be picked.
 */
export function selectAt(
  layout: Layout,
  cell: CellRef,
  clickedAnswerId: string,
  current: Selection | null,
): Selection | null {
  const pieces = layout.cells.get(cellKey(cell))
  if (!pieces || pieces.length === 0) return null

  let piece = pieces.find((p) => p.answerId === clickedAnswerId) ?? pieces[0]
  if (current && current.cell.row === cell.row && current.cell.col === cell.col) {
    const at = pieces.findIndex((p) => p.answerId === current.answerId && p.index === current.index)
    piece = pieces[(at + 1) % pieces.length]
  }
  return { answerId: piece.answerId, index: piece.index, cell }
}

/** Drops a selection whose answer is gone, off the grid, or shorter than before. */
export function validSelection(layout: Layout, selection: Selection | null): Selection | null {
  if (!selection) return null
  const pieces = layout.cells.get(cellKey(selection.cell))
  return pieces?.some((p) => p.answerId === selection.answerId && p.index === selection.index) ? selection : null
}
