import { CELL_SIZES_MM, gridForCellSize } from '../model/page'
import type { Puzzle } from '../model/puzzle'
import type { PuzzleAction } from '../model/puzzle-reducer'

type PageMenuProps = {
  puzzle: Puzzle
  dispatch: (action: PuzzleAction) => void
  showLetters: boolean
  onShowLettersChange: (value: boolean) => void
}

/** How the page looks: the cell size and anagram bar, which go into the exports, and the editor's letters. */
export function PageMenu({ puzzle, dispatch, showLetters, onShowLettersChange }: PageMenuProps) {
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
      <label className="page-menu-row">
        <input
          type="checkbox"
          checked={puzzle.anagram.showNumbersAndBar}
          onChange={(e) => dispatch({ type: 'set-show-anagram-numbers', value: e.target.checked })}
        />
        Show anagram numbers and bar
      </label>
      <label className="page-menu-row">
        <input type="checkbox" checked={showLetters} onChange={(e) => onShowLettersChange(e.target.checked)} />
        Show letters in the editor
      </label>
    </div>
  )
}
