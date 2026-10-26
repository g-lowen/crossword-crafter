import { cellKey, type Layout } from '../layout/layout'
import type { GridSize } from '../model/page'
import type { CellRef, Separator } from '../model/puzzle'

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

/**
 * The thick borders that move along with these answers: ones touching their cells, except where
 * the other side belongs to an answer that stays.
 */
export function separatorsMovingWith(layout: Layout, separators: Separator[], ids: string[]): Separator[] {
  const owners = (cell: CellRef) => (layout.cells.get(cellKey(cell)) ?? []).map((piece) => piece.answerId)
  const moving = (cell: CellRef) => owners(cell).some((id) => ids.includes(id))
  const staying = (cell: CellRef) => owners(cell).some((id) => !ids.includes(id))
  return separators.filter(({ a, b }) => (moving(a) || moving(b)) && !staying(a) && !staying(b))
}

/** Whether these answers can move by `by` without any of their cells leaving the page. */
export function canMoveBy(layout: Layout, ids: string[], by: CellRef, grid: GridSize): boolean {
  for (const pieces of layout.cells.values()) {
    for (const piece of pieces) {
      if (!ids.includes(piece.answerId)) continue
      const row = piece.row + by.row
      const col = piece.col + by.col
      if (row < 0 || row >= grid.rows || col < 0 || col >= grid.columns) return false
    }
  }
  return true
}
