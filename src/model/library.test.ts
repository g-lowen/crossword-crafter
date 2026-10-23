import { describe, expect, it } from 'vitest'
import { createLibrary, currentEntry, entriesByRecent, libraryReducer, uniqueName, type Library } from './library'
import { emptyPuzzle } from './puzzle-reducer'
import { samplePuzzle } from './sample-puzzle'

const t = (minute: number) => `2026-10-23T10:${String(minute).padStart(2, '0')}:00.000Z`

function twoPuzzles(): Library {
  const library = createLibrary('a', t(0), 'Quiz 1')
  return libraryReducer(library, { type: 'add', id: 'b', name: 'Quiz 2', puzzle: samplePuzzle, now: t(1) })
}

describe('libraryReducer', () => {
  it('starts with one empty puzzle', () => {
    const library = createLibrary('a', t(0))
    expect(currentEntry(library)).toEqual({ id: 'a', name: 'Untitled puzzle', updatedAt: t(0), puzzle: emptyPuzzle })
  })

  it('adds a puzzle and opens it', () => {
    const library = twoPuzzles()
    expect(library.currentId).toBe('b')
    expect(library.entries.map((e) => e.name)).toEqual(['Quiz 1', 'Quiz 2'])
  })

  it('edits only the open puzzle and marks it as changed', () => {
    const library = libraryReducer(twoPuzzles(), {
      type: 'edit',
      action: { type: 'unplace', id: 'abba' },
      now: t(5),
    })
    const [first, second] = library.entries
    expect(first.updatedAt).toBe(t(0))
    expect(second.updatedAt).toBe(t(5))
    expect(second.puzzle.answers.find((a) => a.id === 'abba')?.start).toBeNull()
  })

  it("doesn't mark a puzzle as changed when an edit does nothing", () => {
    const library = twoPuzzles()
    const same = libraryReducer(library, {
      type: 'edit',
      action: { type: 'reorder', fromId: 'abba', toId: 'nope' },
      now: t(9),
    })
    expect(same).toBe(library)
  })

  it('opens another puzzle', () => {
    expect(libraryReducer(twoPuzzles(), { type: 'open', id: 'a' }).currentId).toBe('a')
    const library = twoPuzzles()
    expect(libraryReducer(library, { type: 'open', id: 'missing' })).toBe(library)
  })

  it('renames a puzzle without counting it as a change', () => {
    const library = libraryReducer(twoPuzzles(), { type: 'rename', id: 'a', name: 'Christmas' })
    expect(library.entries[0]).toMatchObject({ name: 'Christmas', updatedAt: t(0) })
  })

  it('duplicates a puzzle as a new, open copy with a numbered name', () => {
    const library = libraryReducer(twoPuzzles(), { type: 'duplicate', id: 'b', newId: 'c', now: t(4) })
    expect(currentEntry(library)).toEqual({ id: 'c', name: 'Quiz 2 (1)', updatedAt: t(4), puzzle: samplePuzzle })
  })

  it('numbers new puzzles whose name is taken', () => {
    let library = createLibrary('a', t(0))
    library = libraryReducer(library, { type: 'add', id: 'b', name: 'Untitled puzzle', puzzle: emptyPuzzle, now: t(1) })
    library = libraryReducer(library, { type: 'add', id: 'c', name: 'Untitled puzzle', puzzle: emptyPuzzle, now: t(2) })
    expect(library.entries.map((e) => e.name)).toEqual(['Untitled puzzle', 'Untitled puzzle (1)', 'Untitled puzzle (2)'])
  })

  it('deletes a puzzle and opens the most recent other one', () => {
    let library = libraryReducer(twoPuzzles(), { type: 'add', id: 'c', name: 'Quiz 3', puzzle: emptyPuzzle, now: t(2) })
    library = libraryReducer(libraryReducer(library, { type: 'open', id: 'a' }), {
      type: 'edit',
      action: { type: 'import', answers: [{ id: 'x', text: 'ABBA' }] },
      now: t(7),
    })
    library = libraryReducer(library, { type: 'open', id: 'c' })
    library = libraryReducer(library, { type: 'delete', id: 'c', newId: 'x', now: t(8) })
    expect(library.entries.map((e) => e.id)).toEqual(['a', 'b'])
    expect(library.currentId).toBe('a')
  })

  it('keeps the open puzzle when deleting another one', () => {
    const library = libraryReducer(twoPuzzles(), { type: 'delete', id: 'a', newId: 'x', now: t(8) })
    expect(library).toEqual({ currentId: 'b', entries: [expect.objectContaining({ id: 'b' })] })
  })

  it('starts a new empty puzzle when the last one is deleted', () => {
    const library = libraryReducer(createLibrary('a', t(0)), { type: 'delete', id: 'a', newId: 'x', now: t(8) })
    expect(library).toEqual(createLibrary('x', t(8)))
  })
})

describe('uniqueName', () => {
  it('keeps a free name', () => {
    expect(uniqueName('Quiz 18', ['Quiz 17'])).toBe('Quiz 18')
  })

  it('adds the lowest free number', () => {
    expect(uniqueName('Quiz', ['Quiz'])).toBe('Quiz (1)')
    expect(uniqueName('Quiz', ['Quiz', 'Quiz (1)', 'Quiz (3)'])).toBe('Quiz (2)')
  })

  it('counts from the base of a numbered name', () => {
    expect(uniqueName('Quiz (1)', ['Quiz', 'Quiz (1)'])).toBe('Quiz (2)')
  })

  it("doesn't treat a number that belongs to the name as a counter when it's free", () => {
    expect(uniqueName('Top 40 (2026)', ['Top 40'])).toBe('Top 40 (2026)')
  })

  it('ignores surrounding spaces', () => {
    expect(uniqueName(' Quiz ', ['Quiz'])).toBe('Quiz (1)')
  })
})

describe('entriesByRecent', () => {
  it('puts the most recently changed first', () => {
    const library = libraryReducer(libraryReducer(twoPuzzles(), { type: 'open', id: 'a' }), {
      type: 'edit',
      action: { type: 'import', answers: [{ id: 'x', text: 'ABBA' }] },
      now: t(5),
    })
    expect(entriesByRecent(library).map((e) => e.id)).toEqual(['a', 'b'])
  })
})
