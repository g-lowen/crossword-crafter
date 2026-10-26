import { describe, expect, it } from 'vitest'
import { createLibrary, libraryReducer } from './library'
import { LIBRARY_KEY, STORAGE_KEY, loadLibrary, parsePuzzle, saveLibrary, serializeLibrary, serializePuzzle } from './persistence'
import type { Puzzle } from './puzzle'
import { samplePuzzle } from './sample-puzzle'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value
    },
  }
}

const saved = (puzzle: unknown, version: unknown = 1) => JSON.stringify({ version, puzzle })

describe('serializePuzzle and parsePuzzle', () => {
  it('round-trips a puzzle', () => {
    expect(parsePuzzle(serializePuzzle(samplePuzzle))).toEqual({ ok: true, puzzle: samplePuzzle })
  })

  it('keeps the puzzle name', () => {
    expect(parsePuzzle(serializePuzzle(samplePuzzle, 'Quiz 18'))).toEqual({
      ok: true,
      puzzle: samplePuzzle,
      name: 'Quiz 18',
    })
  })

  it('fills in missing optional parts with defaults', () => {
    const result = parsePuzzle(saved({ answers: [{ id: 'a', text: 'ABBA', start: null }] }))
    expect(result).toEqual({
      ok: true,
      puzzle: {
        answers: [{ id: 'a', text: 'ABBA', start: null, dir: 'right', turns: [], wideSpaces: [] }],
        anagram: { showNumbersAndBar: false, cells: [] },
        separators: [],
        groups: [],
        highlightColor: '#1e88e5',
        includeStartArrow: false,
      } satisfies Puzzle,
    })
  })

  it('reads groups and drops ones outside the list', () => {
    const result = parsePuzzle(
      saved({
        answers: [{ id: 'a', text: 'ABBA' }, { id: 'b', text: 'QUEEN' }],
        groups: [
          { start: 1, name: 'Mini 2', color: '#fff1bf' },
          { start: 7, color: '#d4ebfb' },
        ],
      }),
    )
    expect(result.ok && result.puzzle.groups).toEqual([{ start: 1, name: 'Mini 2', color: '#fff1bf' }])
  })

  it('drops unknown fields', () => {
    const result = parsePuzzle(saved({ answers: [], somethingElse: 1 }))
    expect(result.ok && 'somethingElse' in result.puzzle).toBe(false)
  })

  it.each([
    ['not JSON', 'abba', "That isn't a saved puzzle. Copy it again with Copy state and paste all of it."],
    ['JSON without a version', '{"answers": []}', "That isn't a saved puzzle."],
    ['a newer version', saved({ answers: [] }, 2), "It was saved by a version of the app this one can't read (2)."],
    ['no answers list', saved({}), 'The answers is not a list.'],
    ['an answer without text', saved({ answers: [{ id: 'a' }] }), 'Answer 1 has no text.'],
    [
      'a bad direction',
      saved({ answers: [{ id: 'a', text: 'A', dir: 'sideways' }] }),
      "Answer 1's direction is not a direction.",
    ],
    [
      'a bad start',
      saved({ answers: [{ id: 'a', text: 'A', start: { row: 1 } }] }),
      "Answer 1's start is not a cell.",
    ],
    [
      'duplicate ids',
      saved({
        answers: [
          { id: 'a', text: 'A' },
          { id: 'a', text: 'B' },
        ],
      }),
      'Two answers have the same id.',
    ],
  ])('rejects %s', (_, text, error) => {
    expect(parsePuzzle(text)).toEqual({ ok: false, error })
  })
})

describe('saveLibrary and loadLibrary', () => {
  const now = '2026-10-23T10:00:00.000Z'
  const library = libraryReducer(createLibrary('a', now, 'Quiz 1'), {
    type: 'add',
    id: 'b',
    name: 'Quiz 2',
    puzzle: samplePuzzle,
    now,
  })

  it('saves and loads the puzzle list', () => {
    const storage = memoryStorage()
    expect(saveLibrary(storage, library)).toBe(true)
    expect(loadLibrary(storage, 'new', now)).toEqual(library)
  })

  it('starts a list with one empty puzzle when nothing is saved', () => {
    expect(loadLibrary(memoryStorage(), 'new', now)).toEqual(createLibrary('new', now))
    expect(loadLibrary(undefined, 'new', now)).toEqual(createLibrary('new', now))
  })

  it('carries over the single puzzle saved before the list existed', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: serializePuzzle(samplePuzzle) })
    expect(loadLibrary(storage, 'new', now)).toEqual(createLibrary('new', now, 'Untitled puzzle', samplePuzzle))
  })

  it('prefers the list over the old single puzzle', () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: serializePuzzle(samplePuzzle),
      [LIBRARY_KEY]: serializeLibrary(library),
    })
    expect(loadLibrary(storage, 'new', now)).toEqual(library)
  })

  it('opens the first puzzle when the open one is missing', () => {
    const storage = memoryStorage({ [LIBRARY_KEY]: serializeLibrary({ ...library, currentId: 'gone' }) })
    expect(loadLibrary(storage, 'new', now).currentId).toBe('a')
  })

  it('starts fresh when the saved list is unreadable', () => {
    const storage = memoryStorage({ [LIBRARY_KEY]: 'garbage' })
    expect(loadLibrary(storage, 'new', now)).toEqual(createLibrary('new', now))
  })

  it('reports when the browser refuses to store it', () => {
    const full = {
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(saveLibrary(full, library)).toBe(false)
    expect(saveLibrary(undefined, library)).toBe(false)
  })

  it('never throws when reading fails', () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError')
      },
    }
    expect(loadLibrary(broken, 'new', now)).toEqual(createLibrary('new', now))
  })
})
