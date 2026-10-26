import { describe, expect, it } from 'vitest'
import { A4_LANDSCAPE_GRID } from '../model/page'
import type { Answer, Puzzle } from '../model/puzzle'
import { centerOffset } from './center'
import { layoutPuzzle } from './layout'

function answer(id: string, text: string, row: number, col: number, dir: Answer['dir'] = 'right'): Answer {
  return { id, text, start: { row, col }, dir, turns: [], wideSpaces: [] }
}

function puzzle(answers: Answer[], anagramCells: Puzzle['anagram']['cells'] = []): Puzzle {
  return {
    answers,
    anagram: { showNumbersAndBar: false, cells: anagramCells },
    separators: [],
    groups: [],
    highlightColor: '#1e88e5',
    includeStartArrow: false,
    cellSizeMm: 10,
  }
}

const offset = (p: Puzzle, showsBar = false) => centerOffset(layoutPuzzle(p), A4_LANDSCAPE_GRID, showsBar)

describe('centerOffset', () => {
  it('moves the bounding box of all answers to the middle of the page', () => {
    // 5 wide and 3 high in the top-left corner of 29 × 21: to column 12, row 9.
    const p = puzzle([answer('a', 'ABCDE', 0, 0), answer('b', 'AXY', 0, 0, 'down')])
    expect(offset(p)).toEqual({ row: 9, col: 12 })
  })

  it('keeps the anagram bar and its numbers free', () => {
    const p = puzzle([answer('a', 'ABC', 0, 0, 'down')], [{ answerId: 'a', letterIndex: 0, number: 1 }])
    // 19 usable rows: (19 - 3) / 2 = 8.
    expect(offset(p, true)).toEqual({ row: 8, col: 14 })
    expect(offset(p, false)).toEqual({ row: 9, col: 14 })
  })

  it('brings back answers that stick out of the page', () => {
    expect(offset(puzzle([answer('a', 'ABC', 5, 27)]))).toEqual({ row: 5, col: -14 })
  })

  it('is null when there is nothing to do', () => {
    expect(offset(puzzle([]))).toBeNull()
    expect(offset(puzzle([answer('a', 'ABC', 10, 13)]))).toBeNull()
    expect(offset(puzzle([answer('a', 'A'.repeat(30), 0, 0)]))).toBeNull()
  })
})
