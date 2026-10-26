import type { Puzzle } from './puzzle'
import { emptyPuzzle, puzzleReducer, type PuzzleAction } from './puzzle-reducer'

export const UNTITLED = 'Untitled puzzle'

export type LibraryEntry = {
  id: string
  name: string
  /** ISO timestamp of the last change. */
  updatedAt: string
  puzzle: Puzzle
}

/** All of Sammy's puzzles in this browser, and the one that is open. */
export type Library = {
  currentId: string
  entries: LibraryEntry[]
}

/** Ids and timestamps are passed in so the reducer stays pure. */
export type LibraryAction =
  | { type: 'edit'; action: PuzzleAction; now: string }
  | { type: 'add'; id: string; name: string; puzzle: Puzzle; now: string }
  | { type: 'open'; id: string }
  /** Doesn't count as a change, so the list doesn't reorder while Sammy types. */
  | { type: 'rename'; id: string; name: string }
  /** Replaces the open puzzle's content, for example with a pasted puzzle. Keeps its name. */
  | { type: 'replace'; puzzle: Puzzle; now: string }
  /** `newId` is used when the last puzzle is deleted and an empty one takes its place. */
  | { type: 'delete'; id: string; newId: string; now: string }

export function createLibrary(id: string, now: string, name = UNTITLED, puzzle: Puzzle = emptyPuzzle): Library {
  return { currentId: id, entries: [{ id, name, updatedAt: now, puzzle }] }
}

export function currentEntry(library: Library): LibraryEntry {
  return library.entries.find((entry) => entry.id === library.currentId) ?? library.entries[0]
}

/** Most recently changed first. */
export function entriesByRecent(library: Library): LibraryEntry[] {
  return [...library.entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/**
 * `name`, or `name (1)`, `name (2)`… when it's taken. A name that already ends in a number starts
 * counting from its base, so "Quiz (1)" gives "Quiz (2)" when taken.
 */
export function uniqueName(name: string, taken: string[]): string {
  const used = new Set(taken.map((n) => n.trim()))
  const trimmed = name.trim()
  if (!used.has(trimmed)) return trimmed
  const base = trimmed.match(/^(.*) \(\d+\)$/)?.[1] ?? trimmed
  for (let n = 1; ; n++) {
    const candidate = `${base} (${n})`
    if (!used.has(candidate)) return candidate
  }
}

function updateEntry(library: Library, id: string, update: (entry: LibraryEntry) => LibraryEntry): Library {
  return { ...library, entries: library.entries.map((entry) => (entry.id === id ? update(entry) : entry)) }
}

export function libraryReducer(library: Library, action: LibraryAction): Library {
  switch (action.type) {
    case 'edit': {
      const entry = currentEntry(library)
      const puzzle = puzzleReducer(entry.puzzle, action.action)
      if (puzzle === entry.puzzle) return library
      return updateEntry(library, entry.id, (e) => ({ ...e, puzzle, updatedAt: action.now }))
    }

    case 'add': {
      const name = uniqueName(
        action.name,
        library.entries.map((entry) => entry.name),
      )
      return {
        currentId: action.id,
        entries: [...library.entries, { id: action.id, name, updatedAt: action.now, puzzle: action.puzzle }],
      }
    }

    case 'open':
      return library.entries.some((entry) => entry.id === action.id) ? { ...library, currentId: action.id } : library

    case 'rename':
      return updateEntry(library, action.id, (entry) => ({ ...entry, name: action.name }))

    case 'replace':
      return updateEntry(library, library.currentId, (entry) => ({
        ...entry,
        puzzle: action.puzzle,
        updatedAt: action.now,
      }))

    case 'delete': {
      const entries = library.entries.filter((entry) => entry.id !== action.id)
      if (entries.length === library.entries.length) return library
      if (entries.length === 0) return createLibrary(action.newId, action.now)
      const currentId =
        library.currentId === action.id ? entriesByRecent({ ...library, entries })[0].id : library.currentId
      return { currentId, entries }
    }
  }
}
