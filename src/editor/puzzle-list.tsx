import type { Dispatch } from 'react'
import { UNTITLED, entriesByRecent, type Library, type LibraryAction } from '../model/library'

type PuzzleListProps = {
  library: Library
  dispatch: Dispatch<LibraryAction>
  onClose: () => void
}

const formatter = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeStyle: 'short' })

const displayName = (name: string) => (name.trim() === '' ? UNTITLED : name)

/** Every puzzle saved in this browser, most recently changed first. */
export function PuzzleList({ library, dispatch, onClose }: PuzzleListProps) {
  const now = () => new Date().toISOString()

  return (
    <div className="menu-panel puzzle-list" role="dialog" aria-label="My puzzles">
      <div className="panel-title">
        <strong>My puzzles</strong>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <p className="hint">Saved in this browser only. Use Copy state to keep a puzzle somewhere else.</p>
      <ul>
        {entriesByRecent(library).map((entry) => {
          const isOpen = entry.id === library.currentId
          const name = displayName(entry.name)
          const count = entry.puzzle.answers.length
          return (
            <li key={entry.id} className={isOpen ? 'puzzle-entry puzzle-entry--open' : 'puzzle-entry'}>
              <div className="puzzle-entry-info">
                <span className="puzzle-entry-name">{name}</span>
                <span className="puzzle-entry-meta">
                  {count} {count === 1 ? 'answer' : 'answers'} · {formatter.format(new Date(entry.updatedAt))}
                </span>
              </div>
              {isOpen ? (
                <span className="puzzle-entry-open">Open</span>
              ) : (
                <button
                  type="button"
                  aria-label={`Open ${name}`}
                  onClick={() => {
                    dispatch({ type: 'open', id: entry.id })
                    onClose()
                  }}
                >
                  Open
                </button>
              )}
              <button
                type="button"
                aria-label={`Duplicate ${name}`}
                onClick={() => dispatch({ type: 'duplicate', id: entry.id, newId: crypto.randomUUID(), now: now() })}
              >
                Duplicate
              </button>
              <button
                type="button"
                aria-label={`Delete ${name}`}
                onClick={() => {
                  if (window.confirm(`Delete "${name}"? This can't be undone.`)) {
                    dispatch({ type: 'delete', id: entry.id, newId: crypto.randomUUID(), now: now() })
                  }
                }}
              >
                Delete
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
