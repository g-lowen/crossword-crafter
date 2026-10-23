import { describe, expect, it } from 'vitest'
import { STORAGE_KEY, loadSavedPuzzle, parsePuzzle, savePuzzle, serializePuzzle } from './persistence'
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

  it('fills in missing optional parts with defaults', () => {
    const result = parsePuzzle(saved({ answers: [{ id: 'a', text: 'ABBA', start: null }] }))
    expect(result).toEqual({
      ok: true,
      puzzle: {
        answers: [{ id: 'a', text: 'ABBA', start: null, dir: 'right', turns: [], wideSpaces: [] }],
        anagram: { showNumbersAndBar: false, cells: [] },
        separators: [],
        highlightColor: '#1e88e5',
        includeStartArrow: false,
      } satisfies Puzzle,
    })
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

describe('savePuzzle and loadSavedPuzzle', () => {
  it('saves and loads the puzzle', () => {
    const storage = memoryStorage()
    expect(savePuzzle(storage, samplePuzzle)).toBe(true)
    expect(loadSavedPuzzle(storage)).toEqual(samplePuzzle)
  })

  it('returns null when nothing is saved or it is unreadable', () => {
    expect(loadSavedPuzzle(memoryStorage())).toBeNull()
    expect(loadSavedPuzzle(memoryStorage({ [STORAGE_KEY]: 'garbage' }))).toBeNull()
    expect(loadSavedPuzzle(undefined)).toBeNull()
  })

  it('reports when the browser refuses to store it', () => {
    const full = {
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(savePuzzle(full, samplePuzzle)).toBe(false)
    expect(savePuzzle(undefined, samplePuzzle)).toBe(false)
  })

  it('never throws when reading fails', () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError')
      },
    }
    expect(loadSavedPuzzle(broken)).toBeNull()
  })
})
