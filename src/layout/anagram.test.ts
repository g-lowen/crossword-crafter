import { describe, expect, it } from 'vitest'
import type { Answer, Puzzle } from '../model/puzzle'
import { anagramBarCells, leftToRightOrder } from './anagram'
import { layoutPuzzle } from './layout'

const grid = { rows: 21, columns: 29 }

function answer(id: string, text: string, row: number, col: number, dir: Answer['dir'] = 'right'): Answer {
  return { id, text, start: { row, col }, dir, turns: [], wideSpaces: [], showStartMarker: false }
}

function puzzle(cells: Puzzle['anagram']['cells'], barStart: Puzzle['anagram']['barStart'] = null): Puzzle {
  return {
    answers: [answer('a', 'ABC', 5, 10), answer('b', 'XYZ', 2, 3, 'down')],
    anagram: { showNumbersAndBar: true, cells, barStart },
    separators: [],
    highlightColor: '#1e88e5',
    includeStartArrow: false,
  }
}

describe('anagramBarCells', () => {
  it('centres one cell per anagram letter on the bottom row by default', () => {
    const p = puzzle([
      { answerId: 'a', letterIndex: 0 },
      { answerId: 'a', letterIndex: 2 },
      { answerId: 'b', letterIndex: 1 },
    ])
    expect(anagramBarCells(p, layoutPuzzle(p), grid)).toEqual([
      { row: 20, col: 13 },
      { row: 20, col: 14 },
      { row: 20, col: 15 },
    ])
  })

  it('starts where the bar was moved to', () => {
    const p = puzzle([{ answerId: 'a', letterIndex: 0 }], { row: 3, col: 4 })
    expect(anagramBarCells(p, layoutPuzzle(p), grid)).toEqual([{ row: 3, col: 4 }])
  })

  it('is empty without anagram letters', () => {
    const p = puzzle([])
    expect(anagramBarCells(p, layoutPuzzle(p), grid)).toEqual([])
  })
})

describe('leftToRightOrder', () => {
  it('orders by column, then by row', () => {
    const p = puzzle([
      { answerId: 'a', letterIndex: 2 }, // row 5, col 12
      { answerId: 'b', letterIndex: 2 }, // row 4, col 3
      { answerId: 'a', letterIndex: 0 }, // row 5, col 10
      { answerId: 'b', letterIndex: 0 }, // row 2, col 3
    ])
    expect(leftToRightOrder(layoutPuzzle(p))).toEqual([
      { answerId: 'b', letterIndex: 0 },
      { answerId: 'b', letterIndex: 2 },
      { answerId: 'a', letterIndex: 0 },
      { answerId: 'a', letterIndex: 2 },
    ])
  })
})
