import type { Dispatch } from 'react'
import { cellKey, type Layout } from '../layout/layout'
import type { CellRef, Dir, Puzzle } from '../model/puzzle'
import type { PuzzleAction } from '../model/puzzle-reducer'
import type { Selection } from './selection'
import { IS_MAC } from './use-shortcuts'

type InspectorProps = {
  puzzle: Puzzle
  layout: Layout
  selection: Selection
  dispatch: Dispatch<PuzzleAction>
  onClose: () => void
}

const ARROW: Record<Dir, string> = { right: '→', down: '↓', left: '←', up: '↑' }

/** How Ctrl+arrow is written on this computer. */
const shortcut = (dir: Dir) => `${IS_MAC ? '⌘' : 'Ctrl+'}${ARROW[dir]}`

const SIDES: { label: string; offset: CellRef }[] = [
  { label: 'Top', offset: { row: -1, col: 0 } },
  { label: 'Right', offset: { row: 0, col: 1 } },
  { label: 'Bottom', offset: { row: 1, col: 0 } },
  { label: 'Left', offset: { row: 0, col: -1 } },
]

function perpendicular(dir: Dir): Dir[] {
  return dir === 'right' || dir === 'left' ? ['up', 'down'] : ['left', 'right']
}

/** Settings for the selected answer and the selected cell. */
export function Inspector({ puzzle, layout, selection, dispatch, onClose }: InspectorProps) {
  const answer = puzzle.answers.find((a) => a.id === selection.answerId)
  const piece = layout.cells
    .get(cellKey(selection.cell))
    ?.find((p) => p.answerId === selection.answerId && p.index === selection.index)
  if (!answer || !piece) return null

  const { id } = answer
  const { index } = selection
  const chars = Array.from(answer.text)
  const isSpace = piece.kind === 'space'
  const isWide = answer.wideSpaces.includes(index)
  const isVisible = answer.visibleLetters.includes(index)
  const isLast = index === chars.length - 1
  const turn = answer.turns.find((t) => t.atIndex === index)
  const anagramCell = puzzle.anagram.cells.find((c) => c.answerId === id && c.letterIndex === index)
  const hasSeparator = (offset: CellRef) => {
    const other = { row: selection.cell.row + offset.row, col: selection.cell.col + offset.col }
    return puzzle.separators.some(
      ({ a, b }) =>
        (cellKey(a) === cellKey(selection.cell) && cellKey(b) === cellKey(other)) ||
        (cellKey(b) === cellKey(selection.cell) && cellKey(a) === cellKey(other)),
    )
  }

  return (
    <section className="inspector" aria-label="Selected cell">
      <div className="inspector-title">
        <strong>{answer.text}</strong>
        <span>
          {' '}
          · character {index + 1} ({isSpace ? 'space' : piece.char})
        </span>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close" title="Close (Esc)">
          ✕
        </button>
      </div>

      <div className="inspector-groups">
        <fieldset>
          <legend>Whole answer</legend>
          <button
            type="button"
            title={`Switch between across and down.\nShortcut: ${shortcut('right')} or ${shortcut('down')} on the first letter of the answer.`}
            onClick={() => dispatch({ type: 'toggle-direction', id })}
          >
            Direction {ARROW[answer.dir]}
          </button>
          <button
            type="button"
            title={'Take the answer off the grid.\nShortcut: Delete'}
            onClick={() => dispatch({ type: 'unplace', id })}
          >
            Take off grid
          </button>
        </fieldset>

        <fieldset>
          <legend>Turn here</legend>
          <div className="segmented" role="group" aria-label="Turn here">
            {perpendicular(piece.dir).map((dir) => (
              <button
                key={dir}
                type="button"
                aria-pressed={turn?.dir === dir}
                aria-label={`Turn ${dir}`}
                title={
                  turn?.dir === dir
                    ? `Remove the turn.\nShortcut: ${shortcut(dir)}`
                    : `Turn ${dir} at this letter.\nShortcut: ${shortcut(dir)}`
                }
                disabled={isLast || isWide}
                onClick={() =>
                  dispatch({ type: 'set-turn', id, atIndex: index, dir: turn?.dir === dir ? null : dir })
                }
              >
                {ARROW[dir]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Cell</legend>
          {isSpace ? (
            <label>
              <input
                type="checkbox"
                checked={isWide}
                disabled={Boolean(turn)}
                onChange={() => dispatch({ type: 'toggle-wide-space', id, index })}
              />{' '}
              Wide space (2 cells)
            </label>
          ) : (
            <>
              <label title="Show this letter in every image, even the empty grid, as a hint.">
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => dispatch({ type: 'toggle-visible-letter', id, index })}
                />{' '}
                Always visible
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(anagramCell)}
                  onChange={() => dispatch({ type: 'toggle-anagram-cell', answerId: id, letterIndex: index })}
                />{' '}
                Anagram letter
              </label>
              {anagramCell && (
                <label>
                  Number{' '}
                  <input
                    type="number"
                    min={1}
                    className="number-input"
                    value={anagramCell.number ?? ''}
                    onChange={(e) =>
                      dispatch({
                        type: 'set-anagram-number',
                        answerId: id,
                        letterIndex: index,
                        number: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </label>
              )}
            </>
          )}
        </fieldset>

        <fieldset>
          <legend>Thick border</legend>
          <div className="segmented" role="group" aria-label="Thick border">
            {SIDES.map(({ label, offset }) => (
              <button
                key={label}
                type="button"
                aria-pressed={hasSeparator(offset)}
                onClick={() =>
                  dispatch({
                    type: 'toggle-separator',
                    separator: {
                      a: selection.cell,
                      b: { row: selection.cell.row + offset.row, col: selection.cell.col + offset.col },
                    },
                  })
                }
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </section>
  )
}
