import { useCallback, useEffect, useReducer, useState } from 'react'
import { appReducer, canRedo, canUndo, initialAppState } from '../model/history'
import { currentEntry } from '../model/library'
import { loadLibrary, parsePuzzle, saveLibrary, serializePuzzle } from '../model/persistence'
import type { PuzzleAction } from '../model/puzzle-reducer'
import { Editor } from './editor'
import { PuzzleMenu, type EditCommands, type Status } from './puzzle-menu'
import { SHORTCUT_LABELS, useShortcuts } from './use-shortcuts'

/** localStorage, or undefined where the browser blocks it. */
function browserStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

const now = () => new Date().toISOString()

/** Holds the puzzle list and its undo history, autosaves, and shows the open puzzle in the editor. */
export function AppShell() {
  const [state, dispatchApp] = useReducer(appReducer, undefined, () =>
    initialAppState(loadLibrary(browserStorage(), crypto.randomUUID(), now())),
  )
  const { library } = state
  const [saved, setSaved] = useState(true)
  const [status, setStatus] = useState<Status | null>(null)
  const entry = currentEntry(library)

  useEffect(() => {
    setSaved(saveLibrary(browserStorage(), library))
  }, [library])

  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(null), 5000)
    return () => clearTimeout(timer)
  }, [status])

  const dispatch = useCallback((action: PuzzleAction) => dispatchApp({ type: 'edit', action, now: now() }), [])

  const copyText = () => serializePuzzle(entry.puzzle, entry.name)

  function pasteText(text: string) {
    const result = parsePuzzle(text.trim())
    if (!result.ok) {
      setStatus({ kind: 'error', text: "The clipboard doesn't contain a copied puzzle." })
      return
    }
    dispatchApp({ type: 'replace', puzzle: result.puzzle, now: now() })
    setStatus({ kind: 'ok', text: `Puzzle pasted. ${SHORTCUT_LABELS.undo} undoes it.` })
  }

  const copied = () => setStatus({ kind: 'ok', text: 'Puzzle copied to the clipboard.' })

  const commands: EditCommands = {
    canUndo: canUndo(state),
    canRedo: canRedo(state),
    undo: () => dispatchApp({ type: 'undo', now: now() }),
    redo: () => dispatchApp({ type: 'redo', now: now() }),
    copy: async () => {
      try {
        await navigator.clipboard.writeText(copyText())
        copied()
      } catch {
        setStatus({ kind: 'error', text: `The browser blocked the clipboard. Try ${SHORTCUT_LABELS.copy}.` })
      }
    },
    paste: async () => {
      let text: string
      try {
        text = await navigator.clipboard.readText()
      } catch {
        setStatus({ kind: 'error', text: `The browser blocked the clipboard. Try ${SHORTCUT_LABELS.paste}.` })
        return
      }
      pasteText(text)
    },
  }

  useShortcuts({ onUndo: commands.undo, onRedo: commands.redo, copyText, onCopied: copied, onPaste: pasteText })

  return (
    <Editor
      // A fresh editor per puzzle, so selection and drag state don't carry over.
      key={entry.id}
      puzzle={entry.puzzle}
      dispatch={dispatch}
      nameField={
        <label className="puzzle-name-field">
          Name
          <input
            className="puzzle-name"
            aria-label="Puzzle name"
            placeholder="Untitled puzzle"
            value={entry.name}
            onChange={(e) => dispatchApp({ type: 'rename', id: entry.id, name: e.target.value })}
          />
        </label>
      }
      menu={<PuzzleMenu library={library} dispatch={dispatchApp} commands={commands} status={status} />}
      saveFailed={!saved}
    />
  )
}
