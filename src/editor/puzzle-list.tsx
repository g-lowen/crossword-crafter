import { useRef, useState, type Dispatch } from 'react'
import { UNTITLED, entriesByRecent, type Library, type LibraryAction, type LibraryEntry } from '../model/library'

type PuzzleListProps = {
  library: Library
  dispatch: Dispatch<LibraryAction>
  onClose: () => void
}

const formatter = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeStyle: 'short' })

const displayName = (name: string) => (name.trim() === '' ? UNTITLED : name)

const now = () => new Date().toISOString()

/** Every puzzle saved in this browser, most recently changed first. */
export function PuzzleList({ library, dispatch, onClose }: PuzzleListProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null)

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
                {renamingId === entry.id ? (
                  <RenameField
                    entry={entry}
                    onDone={(newName) => {
                      if (newName !== null) dispatch({ type: 'rename', id: entry.id, name: newName })
                      setRenamingId(null)
                    }}
                  />
                ) : (
                  <span className="puzzle-entry-title">
                    <span className="puzzle-entry-name">{name}</span>
                    <button
                      type="button"
                      className="icon-button pen-button"
                      aria-label={`Rename ${name}`}
                      title="Rename"
                      onClick={() => setRenamingId(entry.id)}
                    >
                      <PenIcon />
                    </button>
                  </span>
                )}
                <span className="puzzle-entry-meta">
                  {count} {count === 1 ? 'answer' : 'answers'} · {formatter.format(new Date(entry.updatedAt))}
                </span>
              </div>
              {!isOpen && (
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

function PenIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M11.3 1.7a1.5 1.5 0 0 1 2.1 0l.9.9a1.5 1.5 0 0 1 0 2.1L5.6 13.4 2 14l.6-3.6 8.7-8.7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M9.8 3.2l3 3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

/** Enter or leaving the field saves; Esc cancels without closing the list. */
function RenameField({ entry, onDone }: { entry: LibraryEntry; onDone: (name: string | null) => void }) {
  const [value, setValue] = useState(entry.name)
  // Enter or Esc removes the field, which can also fire blur. Only the first one counts.
  const done = useRef(false)
  const finish = (name: string | null) => {
    if (done.current) return
    done.current = true
    onDone(name)
  }
  return (
    <input
      className="puzzle-entry-rename"
      aria-label={`New name for ${displayName(entry.name)}`}
      value={value}
      autoFocus
      onFocus={(e) => e.target.select()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(value)
        if (e.key === 'Escape') {
          e.stopPropagation()
          finish(null)
        }
      }}
    />
  )
}
