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
