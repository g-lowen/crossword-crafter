import { useMemo } from 'react'
import { centerOffset } from '../layout/center'
import { layoutPuzzle } from '../layout/layout'
import { CELL_SIZES_MM, gridForCellSize, puzzleGrid } from '../model/page'
import type { Puzzle } from '../model/puzzle'
import type { PuzzleAction } from '../model/puzzle-reducer'
import { SHORTCUT_LABELS } from './use-shortcuts'

type PageMenuProps = {
  puzzle: Puzzle
  dispatch: (action: PuzzleAction) => void
  showLetters: boolean
  onShowLettersChange: (value: boolean) => void
}

/** How the page looks: the cell size, which goes into the exports, the editor's letters, and centring the puzzle on the page. */
export function PageMenu({ puzzle, dispatch, showLetters, onShowLettersChange }: PageMenuProps) {
  const layout = useMemo(() => layoutPuzzle(puzzle), [puzzle])
  const toCenter = centerOffset(layout, puzzleGrid(puzzle), puzzle.anagram.showNumbersAndBar)

  function center() {
    if (!toCenter) return
    // Everything moves, so every thick border goes along.
    dispatch({
      type: 'move-answers',
      ids: puzzle.answers.filter((answer) => answer.start).map((answer) => answer.id),
      by: toCenter,
      separators: puzzle.separators,
    })
  }

  return (
    <div className="menu-panel page-menu" role="dialog" aria-label="Page">
      <label className="page-menu-row">
        Cell size
        <select
          value={puzzle.cellSizeMm}
          onChange={(e) => dispatch({ type: 'set-cell-size', cellSizeMm: Number(e.target.value) })}
        >
          {CELL_SIZES_MM.map((size) => {
            const { columns, rows } = gridForCellSize(size)
            return (
              <option key={size} value={size}>
                {size === 10 ? '1 cm' : `${size} mm`} ({columns} × {rows})
              </option>
            )
          })}
        </select>
      </label>
      <label className="page-menu-row" title={`Shortcut: ${SHORTCUT_LABELS.showLetters}`}>
        <input
          type="checkbox"
          aria-label="Show letters in the editor"
          checked={showLetters}
          onChange={(e) => onShowLettersChange(e.target.checked)}
        />
        Show letters in the editor
        <kbd>{SHORTCUT_LABELS.showLetters}</kbd>
      </label>
      <button
        type="button"
        disabled={!toCenter}
        title="Move all answers so the puzzle sits in the middle of the page"
        onClick={center}
      >
        Center on page
      </button>
    </div>
  )
}
