import { useCallback, useEffect, useReducer, useState } from 'react'
import { currentEntry, libraryReducer } from '../model/library'
import { loadLibrary, saveLibrary } from '../model/persistence'
import type { PuzzleAction } from '../model/puzzle-reducer'
import { Editor } from './editor'
import { PuzzleMenu } from './puzzle-menu'

/** localStorage, or undefined where the browser blocks it. */
function browserStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

/** Holds the puzzle list, autosaves it, and shows the open puzzle in the editor. */
export function AppShell() {
  const [library, dispatchLibrary] = useReducer(libraryReducer, undefined, () =>
    loadLibrary(browserStorage(), crypto.randomUUID(), new Date().toISOString()),
  )
  const [saved, setSaved] = useState(true)
  const entry = currentEntry(library)

  useEffect(() => {
    setSaved(saveLibrary(browserStorage(), library))
  }, [library])

  const dispatch = useCallback(
    (action: PuzzleAction) => dispatchLibrary({ type: 'edit', action, now: new Date().toISOString() }),
    [],
  )

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
            onChange={(e) =>
              dispatchLibrary({ type: 'rename', id: entry.id, name: e.target.value })
            }
          />
        </label>
      }
      menu={<PuzzleMenu library={library} dispatch={dispatchLibrary} />}
      saveFailed={!saved}
    />
  )
}
