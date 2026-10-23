import { describe, expect, it } from 'vitest'
import { createLibrary, currentEntry, entriesByRecent, libraryReducer, type Library } from './library'
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

  it('renames a puzzle', () => {
    const library = libraryReducer(twoPuzzles(), { type: 'rename', id: 'a', name: 'Christmas', now: t(3) })
    expect(library.entries[0]).toMatchObject({ name: 'Christmas', updatedAt: t(3) })
  })

  it('duplicates a puzzle as a new, open copy', () => {
    const library = libraryReducer(twoPuzzles(), { type: 'duplicate', id: 'b', newId: 'c', now: t(4) })
    expect(currentEntry(library)).toEqual({ id: 'c', name: 'Quiz 2 (copy)', updatedAt: t(4), puzzle: samplePuzzle })
  })

  it('deletes a puzzle and opens the most recent other one', () => {
    let library = libraryReducer(twoPuzzles(), { type: 'add', id: 'c', name: 'Quiz 3', puzzle: emptyPuzzle, now: t(2) })
    library = libraryReducer(library, { type: 'rename', id: 'a', name: 'Quiz 1', now: t(7) })
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

describe('entriesByRecent', () => {
  it('puts the most recently changed first', () => {
    const library = libraryReducer(twoPuzzles(), { type: 'rename', id: 'a', name: 'Quiz 1', now: t(5) })
    expect(entriesByRecent(library).map((e) => e.id)).toEqual(['a', 'b'])
  })
})
