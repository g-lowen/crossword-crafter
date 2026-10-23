import { useEffect, useRef, useState, type Dispatch } from 'react'
import { UNTITLED, currentEntry, type Library, type LibraryAction } from '../model/library'
import { parsePuzzle, serializePuzzle } from '../model/persistence'
import type { Puzzle } from '../model/puzzle'
import { emptyPuzzle } from '../model/puzzle-reducer'
import { samplePuzzle } from '../model/sample-puzzle'
import { PuzzleList } from './puzzle-list'

type PuzzleMenuProps = {
  library: Library
  dispatch: Dispatch<LibraryAction>
}

type Panel = 'list' | 'paste' | null

const now = () => new Date().toISOString()

/** Starting puzzles, switching between them, and moving one between computers as text. */
export function PuzzleMenu({ library, dispatch }: PuzzleMenuProps) {
  const [status, setStatus] = useState<string | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const current = currentEntry(library)

  // An open panel closes on Esc or on a click anywhere outside the menu.
  useEffect(() => {
    if (!panel) return
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setPanel(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanel(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [panel])

  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(null), 4000)
    return () => clearTimeout(timer)
  }, [status])

  function add(name: string, puzzle: Puzzle) {
    dispatch({ type: 'add', id: crypto.randomUUID(), name, puzzle, now: now() })
  }

  async function copyState() {
    try {
      await navigator.clipboard.writeText(serializePuzzle(current.puzzle, current.name))
      setStatus('Copied. Paste it with Paste state on the other computer.')
    } catch {
      setStatus("Couldn't copy. The browser blocked the clipboard.")
    }
  }

  const toggle = (next: Panel) => setPanel(panel === next ? null : next)

  return (
    <div className="puzzle-menu" ref={menuRef}>
      <button type="button" onClick={() => add(UNTITLED, emptyPuzzle)}>
        New puzzle
      </button>
      <button type="button" onClick={() => toggle('list')} aria-expanded={panel === 'list'}>
        My puzzles ({library.entries.length})
      </button>
      <button type="button" onClick={copyState}>
        Copy state
      </button>
      <button type="button" onClick={() => toggle('paste')} aria-expanded={panel === 'paste'}>
        Paste state
      </button>
      <button type="button" onClick={() => add('Sample puzzle', samplePuzzle)}>
        Load sample
      </button>
      {status && (
        <span className="menu-status" role="status">
          {status}
        </span>
      )}
      {panel === 'list' && (
        <PuzzleList library={library} dispatch={dispatch} onClose={() => setPanel(null)} />
      )}
      {panel === 'paste' && (
        <PastePanel
          onCancel={() => setPanel(null)}
          onPaste={(puzzle, name) => {
            add(name ?? 'Pasted puzzle', puzzle)
            setPanel(null)
            setStatus('Pasted puzzle added to My puzzles.')
          }}
        />
      )}
    </div>
  )
}

function PastePanel({
  onPaste,
  onCancel,
}: {
  onPaste: (puzzle: Puzzle, name: string | undefined) => void
  onCancel: () => void
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  function load() {
    const result = parsePuzzle(text.trim())
    if (result.ok) onPaste(result.puzzle, result.name)
    else setError(result.error)
  }

  return (
    <div className="menu-panel" role="dialog" aria-label="Paste state">
      <label>
        <span>Paste a puzzle copied with Copy state. It's added as a new puzzle.</span>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }}
          rows={6}
          autoFocus
        />
      </label>
      {error && (
        <p className="paste-error" role="alert">
          {error}
        </p>
      )}
      <div className="panel-actions">
        <button type="button" onClick={load} disabled={text.trim() === ''}>
          Add puzzle
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
