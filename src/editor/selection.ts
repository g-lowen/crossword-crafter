import { cellKey, type Layout } from '../layout/layout'
import type { GridSize } from '../model/page'
import type { CellRef, Dir, Puzzle, Separator } from '../model/puzzle'
import type { PuzzleAction } from '../model/puzzle-reducer'

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

const isAcross = (dir: Dir) => dir === 'right' || dir === 'left'

/**
 * What Ctrl+arrow does on the selected cell, the same as the arrow buttons in the cell panel. On
 * the first letter, right and down set the answer's direction. Otherwise an arrow across the
 * reading direction adds a turn there, or removes it if it's already that turn. Null when the
 * arrow does nothing here.
 */
export function arrowShortcut(puzzle: Puzzle, layout: Layout, selection: Selection, dir: Dir): PuzzleAction | null {
  const answer = puzzle.answers.find((a) => a.id === selection.answerId)
  const piece = layout.cells
    .get(cellKey(selection.cell))
    ?.find((p) => p.answerId === selection.answerId && p.index === selection.index)
  if (!answer || !piece) return null
  const { id } = answer
  const { index } = selection

  if (index === 0 && (dir === 'right' || dir === 'down')) {
    return dir === answer.dir ? null : { type: 'toggle-direction', id }
  }
  const isLast = index === Array.from(answer.text).length - 1
  if (isAcross(dir) === isAcross(piece.dir) || isLast || answer.wideSpaces.includes(index)) return null
  const turn = answer.turns.find((t) => t.atIndex === index)
  return { type: 'set-turn', id, atIndex: index, dir: turn?.dir === dir ? null : dir }
}

const STEP: Record<Dir, CellRef> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
}

/**
 * Where an arrow key moves the selection: the nearest filled cell that way, skipping empty cells.
 * In a crossing it stays on the same answer if it can, and otherwise picks the answer that reads
 * along the arrow. Null when there is no filled cell that way.
 */
export function stepSelection(layout: Layout, selection: Selection, dir: Dir, grid: GridSize): Selection | null {
  const step = STEP[dir]
  let { row, col } = selection.cell
  for (;;) {
    row += step.row
    col += step.col
    if (row < 0 || row >= grid.rows || col < 0 || col >= grid.columns) return null
    const pieces = layout.cells.get(cellKey({ row, col }))
    if (!pieces || pieces.length === 0) continue
    const piece =
      pieces.find((p) => p.answerId === selection.answerId) ??
      pieces.find((p) => isAcross(p.dir) === isAcross(dir)) ??
      pieces[0]
    return { answerId: piece.answerId, index: piece.index, cell: { row, col } }
  }
}

/** What an arrow key selects when nothing is: the first letter of the first placed answer. */
export function firstSelection(puzzle: Puzzle, layout: Layout): Selection | null {
  for (const answer of puzzle.answers) {
    if (!answer.start) continue
    const pieces = layout.cells.get(cellKey(answer.start))
    if (pieces?.some((p) => p.answerId === answer.id && p.index === 0)) {
      return { answerId: answer.id, index: 0, cell: answer.start }
    }
  }
  return null
}
