import { currentEntry, libraryReducer, type Library, type LibraryAction } from './library'
import type { Puzzle } from './puzzle'
import type { PuzzleAction } from './puzzle-reducer'

/** How many steps back Sammy can go per puzzle. */
const LIMIT = 100

/**
 * Changes that arrive in quick bursts, such as dragging the color picker or typing an anagram
 * number. Several in a row become one undo step.
 */
const MERGED: PuzzleAction['type'][] = ['set-highlight-color', 'set-anagram-number']

type PuzzleHistory = {
  past: Puzzle[]
  future: Puzzle[]
  /** The kind of the last change, so bursts of the same kind can be merged. */
  last?: string
}

/** The puzzle list plus undo history for each puzzle. History isn't saved; it lasts until a reload. */
export type AppState = {
  library: Library
  history: Record<string, PuzzleHistory>
}

export type AppAction = LibraryAction | { type: 'undo'; now: string } | { type: 'redo'; now: string }

export function initialAppState(library: Library): AppState {
  return { library, history: {} }
}

function historyOf(state: AppState): PuzzleHistory {
  return state.history[state.library.currentId] ?? { past: [], future: [] }
}

export const canUndo = (state: AppState) => historyOf(state).past.length > 0
export const canRedo = (state: AppState) => historyOf(state).future.length > 0

function withHistory(state: AppState, library: Library, history: PuzzleHistory): AppState {
  return { library, history: { ...state.history, [state.library.currentId]: history } }
}

/** What kind of change an action is, or null when it doesn't change the open puzzle's content. */
function changeKind(action: AppAction): string | null {
  if (action.type === 'edit') return action.action.type
  if (action.type === 'replace') return 'replace'
  return null
}

/**
 * Undo and redo cover changes to the open puzzle's content: edits and pastes. Opening, renaming,
 * adding and deleting puzzles aren't undone.
 */
export function appReducer(state: AppState, action: AppAction): AppState {
  const entry = currentEntry(state.library)

  if (action.type === 'undo' || action.type === 'redo') {
    const history = historyOf(state)
    const [from, to] = action.type === 'undo' ? [history.past, history.future] : [history.future, history.past]
    const target = from.at(-1)
    if (!target) return state
    const library = libraryReducer(state.library, { type: 'replace', puzzle: target, now: action.now })
    const moved = { from: from.slice(0, -1), to: [...to, entry.puzzle] }
    return withHistory(
      state,
      library,
      action.type === 'undo' ? { past: moved.from, future: moved.to } : { past: moved.to, future: moved.from },
    )
  }

  const library = libraryReducer(state.library, action)
  if (library === state.library) return state

  if (action.type === 'delete') {
    const history = { ...state.history }
    delete history[action.id]
    return { library, history }
  }

  const kind = changeKind(action)
  if (!kind || currentEntry(library).puzzle === entry.puzzle) return { ...state, library }

  const history = historyOf(state)
  const merge = MERGED.includes(kind as PuzzleAction['type']) && history.last === kind
  const past = merge ? history.past : [...history.past, entry.puzzle].slice(-LIMIT)
  return withHistory(state, library, { past, future: [], last: kind })
}
