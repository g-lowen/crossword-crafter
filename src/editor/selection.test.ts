import { describe, expect, it } from 'vitest'
import { layoutPuzzle } from '../layout/layout'
import type { Answer, Puzzle } from '../model/puzzle'
import { selectAt, validSelection } from './selection'

function answer(id: string, text: string, row: number, col: number, dir: Answer['dir']): Answer {
  return { id, text, start: { row, col }, dir, turns: [], wideSpaces: [] }
}

const puzzle: Puzzle = {
  answers: [answer('cat', 'CAT', 1, 0, 'right'), answer('bad', 'BAD', 0, 1, 'down')],
  anagram: { showNumbersAndBar: false, cells: [] },
  separators: [],
  highlightColor: '#1e88e5',
  includeStartArrow: false,
}
const layout = layoutPuzzle(puzzle)
const crossing = { row: 1, col: 1 }

describe('selectAt', () => {
  it('selects the clicked answer and character', () => {
    expect(selectAt(layout, { row: 1, col: 2 }, 'cat', null)).toEqual({
      answerId: 'cat',
      index: 2,
      cell: { row: 1, col: 2 },
    })
  })

  it('cycles through the answers in a crossing cell', () => {
    const first = selectAt(layout, crossing, 'cat', null)
    expect(first).toEqual({ answerId: 'cat', index: 1, cell: crossing })
    const second = selectAt(layout, crossing, 'cat', first)
    expect(second).toEqual({ answerId: 'bad', index: 1, cell: crossing })
    expect(selectAt(layout, crossing, 'cat', second)).toEqual(first)
  })

  it('returns null for an empty cell', () => {
    expect(selectAt(layout, { row: 9, col: 9 }, 'cat', null)).toBeNull()
  })
})

describe('validSelection', () => {
  it('keeps a selection that still exists', () => {
    const selection = { answerId: 'cat', index: 0, cell: { row: 1, col: 0 } }
    expect(validSelection(layout, selection)).toBe(selection)
  })

  it('drops a selection whose answer moved away', () => {
    expect(validSelection(layout, { answerId: 'cat', index: 0, cell: { row: 7, col: 7 } })).toBeNull()
  })
})
