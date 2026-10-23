import { useEffect, useState } from 'react'
import { parsePuzzle, serializePuzzle } from '../model/persistence'
import type { Puzzle } from '../model/puzzle'
import { emptyPuzzle } from '../model/puzzle-reducer'
import { samplePuzzle } from '../model/sample-puzzle'

type PuzzleMenuProps = {
  puzzle: Puzzle
  onLoad: (puzzle: Puzzle) => void
}

/** Starting over, loading the sample, and moving a puzzle between computers as text. */
export function PuzzleMenu({ puzzle, onLoad }: PuzzleMenuProps) {
  const [status, setStatus] = useState<string | null>(null)
  const [pasting, setPasting] = useState(false)

  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(null), 4000)
    return () => clearTimeout(timer)
  }, [status])

  /** Replacing a puzzle with answers in it can't be undone, so ask first. */
  function replace(next: Puzzle, question: string): boolean {
    if (puzzle.answers.length > 0 && !window.confirm(question)) return false
    onLoad(next)
    return true
  }

  async function copyState() {
    try {
      await navigator.clipboard.writeText(serializePuzzle(puzzle))
      setStatus('Copied. Paste it with Paste state on the other computer.')
    } catch {
      setStatus("Couldn't copy. The browser blocked the clipboard.")
    }
  }

  return (
    <div className="puzzle-menu">
      <button type="button" onClick={() => replace(emptyPuzzle, 'Start a new puzzle? The current one will be lost.')}>
        New puzzle
      </button>
      <button type="button" onClick={copyState}>
        Copy state
      </button>
      <button type="button" onClick={() => setPasting(true)} aria-expanded={pasting}>
        Paste state
      </button>
      <button
        type="button"
        onClick={() => replace(samplePuzzle, 'Load the sample? The current puzzle will be replaced.')}
      >
        Load sample
      </button>
      {status && (
        <span className="menu-status" role="status">
          {status}
        </span>
      )}
      {pasting && (
        <PastePanel
          onCancel={() => setPasting(false)}
          onPaste={(next) => {
            if (replace(next, 'Replace the current puzzle with the pasted one?')) {
              setPasting(false)
              setStatus('Puzzle loaded.')
            }
          }}
        />
      )}
    </div>
  )
}

function PastePanel({ onPaste, onCancel }: { onPaste: (puzzle: Puzzle) => void; onCancel: () => void }) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  function load() {
    const result = parsePuzzle(text.trim())
    if (result.ok) onPaste(result.puzzle)
    else setError(result.error)
  }

  return (
    <div className="paste-panel" role="dialog" aria-label="Paste state">
      <label>
        <span>Paste a puzzle copied with Copy state</span>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              onCancel()
            }
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
      <div className="paste-actions">
        <button type="button" onClick={load} disabled={text.trim() === ''}>
          Load
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
