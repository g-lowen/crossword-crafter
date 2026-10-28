import { useMemo } from 'react'
import { generateSolution } from '../generate/generate'
import { centerOffset } from '../layout/center'
import { layoutPuzzle } from '../layout/layout'
import { CELL_SIZES_MM, gridForCellSize, puzzleGrid } from '../model/page'
import type { Puzzle } from '../model/puzzle'
import type { PuzzleAction } from '../model/puzzle-reducer'
import type { Status } from './puzzle-menu'
import { SHORTCUT_LABELS } from './use-shortcuts'

type PageMenuProps = {
  puzzle: Puzzle
  dispatch: (action: PuzzleAction) => void
  showLetters: boolean
  onShowLettersChange: (value: boolean) => void
  onStatus: (status: Status) => void
}

/**
 * How the page looks: the cell size, which goes into the exports, the editor's letters, centring
 * the puzzle on the page, and generating a layout.
 */
export function PageMenu({ puzzle, dispatch, showLetters, onShowLettersChange, onStatus }: PageMenuProps) {
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

  function generate() {
    const result = generateSolution(puzzle)
    if (!result.ok) {
      onStatus({
        kind: 'error',
        text: "Couldn't fit every answer on the page, even after dropping rules. Smaller cells give more room.",
      })
      return
    }
    dispatch({ type: 'place-all', placements: result.placements, separators: result.separators })
    const rules = result.dropped.map((rule) => `"${rule.text}"`)
    const without = rules.length === 0 ? '' : ` without the ${rules.length === 1 ? 'rule' : 'rules'} ${inWords(rules)}`
    onStatus({ kind: 'ok', text: `Answers placed${without}. ${SHORTCUT_LABELS.undo} undoes it.` })
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
          aria-label="Show letters"
          checked={showLetters}
          onChange={(e) => onShowLettersChange(e.target.checked)}
        />
        Show letters
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
      <button
        type="button"
        disabled={puzzle.answers.length === 0}
        title="Place every answer on the page at random, crossing each other. Each click gives a new layout."
        onClick={generate}
      >
        Generate solution
      </button>
    </div>
  )
}

/** "a", "a and b", "a, b and c". */
function inWords(items: string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
