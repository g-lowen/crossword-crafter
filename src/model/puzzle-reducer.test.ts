import { describe, expect, it } from 'vitest'
import type { Puzzle } from './puzzle'
import { emptyPuzzle, puzzleReducer } from './puzzle-reducer'

function withAnswers(...texts: string[]): Puzzle {
  return puzzleReducer(emptyPuzzle, {
    type: 'import',
    answers: texts.map((text) => ({ id: text.toLowerCase(), text })),
  })
}

const texts = (puzzle: Puzzle) => puzzle.answers.map((answer) => answer.text)

describe('puzzleReducer', () => {
  it('imports answers off the grid, going right', () => {
    const puzzle = withAnswers('ABBA', 'QUEEN')
    expect(puzzle.answers).toEqual([
      { id: 'abba', text: 'ABBA', start: null, dir: 'right', turns: [], wideSpaces: [] },
      { id: 'queen', text: 'QUEEN', start: null, dir: 'right', turns: [], wideSpaces: [] },
    ])
  })

  it('appends later imports to the end of the list', () => {
    const puzzle = puzzleReducer(withAnswers('ABBA'), { type: 'import', answers: [{ id: 'sting', text: 'STING' }] })
    expect(texts(puzzle)).toEqual(['ABBA', 'STING'])
  })

  it('places and unplaces an answer', () => {
    const placed = puzzleReducer(withAnswers('ABBA'), { type: 'place', id: 'abba', start: { row: 3, col: 4 } })
    expect(placed.answers[0].start).toEqual({ row: 3, col: 4 })
    const unplaced = puzzleReducer(placed, { type: 'unplace', id: 'abba' })
    expect(unplaced.answers[0].start).toBeNull()
  })

  it('removes an answer together with its anagram cells', () => {
    const puzzle: Puzzle = {
      ...withAnswers('ABBA', 'QUEEN'),
      anagram: {
        showNumbersAndBar: true,
        cells: [
          { answerId: 'abba', letterIndex: 0, number: 1 },
          { answerId: 'queen', letterIndex: 1, number: 2 },
        ],
      },
    }
    const removed = puzzleReducer(puzzle, { type: 'remove', id: 'abba' })
    expect(texts(removed)).toEqual(['QUEEN'])
    expect(removed.anagram.cells).toEqual([{ answerId: 'queen', letterIndex: 1, number: 2 }])
  })

  it('reorders answers', () => {
    const puzzle = withAnswers('ABBA', 'QUEEN', 'STING')
    expect(texts(puzzleReducer(puzzle, { type: 'reorder', fromId: 'sting', toId: 'abba' }))).toEqual([
      'STING',
      'ABBA',
      'QUEEN',
    ])
    expect(texts(puzzleReducer(puzzle, { type: 'reorder', fromId: 'abba', toId: 'queen' }))).toEqual([
      'QUEEN',
      'ABBA',
      'STING',
    ])
  })

  it('ignores reorders with unknown ids', () => {
    const puzzle = withAnswers('ABBA', 'QUEEN')
    expect(puzzleReducer(puzzle, { type: 'reorder', fromId: 'abba', toId: 'nope' })).toBe(puzzle)
  })

  it('toggles between right and down', () => {
    const down = puzzleReducer(withAnswers('ABBA'), { type: 'toggle-direction', id: 'abba' })
    expect(down.answers[0].dir).toBe('down')
    expect(puzzleReducer(down, { type: 'toggle-direction', id: 'abba' }).answers[0].dir).toBe('right')
  })
})

describe('puzzleReducer editing', () => {
  const id = 'pink floyd'
  const placed = puzzleReducer(withAnswers('PINK FLOYD'), { type: 'place', id, start: { row: 0, col: 0 } })

  it('adds, changes and removes a turn', () => {
    const down = puzzleReducer(placed, { type: 'set-turn', id, atIndex: 5, dir: 'down' })
    expect(down.answers[0].turns).toEqual([{ atIndex: 5, dir: 'down' }])
    const up = puzzleReducer(down, { type: 'set-turn', id, atIndex: 5, dir: 'up' })
    expect(up.answers[0].turns).toEqual([{ atIndex: 5, dir: 'up' }])
    const two = puzzleReducer(up, { type: 'set-turn', id, atIndex: 1, dir: 'down' })
    expect(two.answers[0].turns.map((t) => t.atIndex)).toEqual([1, 5])
    expect(puzzleReducer(two, { type: 'set-turn', id, atIndex: 5, dir: null }).answers[0].turns).toEqual([
      { atIndex: 1, dir: 'down' },
    ])
  })

  it('toggles a wide space', () => {
    const wide = puzzleReducer(placed, { type: 'toggle-wide-space', id, index: 4 })
    expect(wide.answers[0].wideSpaces).toEqual([4])
    expect(puzzleReducer(wide, { type: 'toggle-wide-space', id, index: 4 }).answers[0].wideSpaces).toEqual([])
  })

  it('numbers new anagram cells after the highest number, and removes them again', () => {
    let p = puzzleReducer(placed, { type: 'toggle-anagram-cell', answerId: id, letterIndex: 0 })
    p = puzzleReducer(p, { type: 'set-anagram-number', answerId: id, letterIndex: 0, number: 7 })
    p = puzzleReducer(p, { type: 'toggle-anagram-cell', answerId: id, letterIndex: 2 })
    expect(p.anagram.cells).toEqual([
      { answerId: id, letterIndex: 0, number: 7 },
      { answerId: id, letterIndex: 2, number: 8 },
    ])
    p = puzzleReducer(p, { type: 'toggle-anagram-cell', answerId: id, letterIndex: 0 })
    expect(p.anagram.cells).toEqual([{ answerId: id, letterIndex: 2, number: 8 }])
  })

  it('renumbers anagram cells in the given order', () => {
    let p = puzzleReducer(placed, { type: 'toggle-anagram-cell', answerId: id, letterIndex: 0 })
    p = puzzleReducer(p, { type: 'toggle-anagram-cell', answerId: id, letterIndex: 2 })
    p = puzzleReducer(p, {
      type: 'renumber-anagram',
      order: [
        { answerId: id, letterIndex: 2 },
        { answerId: id, letterIndex: 0 },
      ],
    })
    expect(p.anagram.cells.map((c) => [c.letterIndex, c.number])).toEqual([
      [0, 2],
      [2, 1],
    ])
  })

  it('sets the anagram display option', () => {
    const shown = puzzleReducer(placed, { type: 'set-show-anagram-numbers', value: true })
    expect(shown.anagram.showNumbersAndBar).toBe(true)
  })

  it('toggles a separator regardless of cell order', () => {
    const a = { row: 0, col: 0 }
    const b = { row: 0, col: 1 }
    const added = puzzleReducer(placed, { type: 'toggle-separator', separator: { a, b } })
    expect(added.separators).toEqual([{ a, b }])
    expect(puzzleReducer(added, { type: 'toggle-separator', separator: { a: b, b: a } }).separators).toEqual([])
  })
})

describe('puzzleReducer groups', () => {
  const ids = ['a', 'b', 'c', 'd', 'e']
  const base = puzzleReducer(emptyPuzzle, { type: 'import', answers: ids.map((id) => ({ id, text: id.toUpperCase() })) })

  it('adds groups in list order and ignores a second one at the same answer', () => {
    let p = puzzleReducer(base, { type: 'add-group', start: 3, color: '#222222' })
    p = puzzleReducer(p, { type: 'add-group', start: 0, color: '#111111' })
    expect(p.groups.map((g) => g.start)).toEqual([0, 3])
    expect(puzzleReducer(p, { type: 'add-group', start: 3, color: '#333333' })).toBe(p)
  })

  it('renames, recolors and removes a group', () => {
    let p = puzzleReducer(base, { type: 'add-group', start: 2, color: '#222222' })
    p = puzzleReducer(p, { type: 'set-group-name', start: 2, name: 'Mini 2' })
    p = puzzleReducer(p, { type: 'set-group-color', start: 2, color: '#abcdef' })
    expect(p.groups).toEqual([{ start: 2, name: 'Mini 2', color: '#abcdef' }])
    expect(puzzleReducer(p, { type: 'remove-group', start: 2 }).groups).toEqual([])
  })

  it('keeps groups in place when answers above them are removed', () => {
    const p = puzzleReducer(base, { type: 'add-group', start: 3, color: '#222222' })
    expect(puzzleReducer(p, { type: 'remove', id: 'a' }).groups[0].start).toBe(2)
  })

  it('leaves dividers where they are when answers are reordered', () => {
    const p = puzzleReducer(base, { type: 'add-group', start: 3, color: '#222222' })
    const moved = puzzleReducer(p, { type: 'reorder', fromId: 'e', toId: 'a' })
    expect(moved.groups[0].start).toBe(3)
    expect(moved.answers.map((a) => a.id)).toEqual(['e', 'a', 'b', 'c', 'd'])
  })
})
