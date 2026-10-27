import { describe, expect, it } from 'vitest'
import { layoutPuzzle } from '../layout/layout'
import type { Answer, Puzzle } from '../model/puzzle'
import { A4_LANDSCAPE_GRID } from '../model/page'
import { arrowShortcut, canMoveBy, selectAt, separatorsMovingWith, validSelection } from './selection'

function answer(id: string, text: string, row: number, col: number, dir: Answer['dir']): Answer {
  return { id, text, start: { row, col }, dir, turns: [], wideSpaces: [], visibleLetters: [] }
}

const puzzle: Puzzle = {
  answers: [answer('cat', 'CAT', 1, 0, 'right'), answer('bad', 'BAD', 0, 1, 'down')],
  anagram: { showNumbersAndBar: false, cells: [] },
  separators: [],
    groups: [],
  highlightColor: '#1e88e5',
  includeStartArrow: false,
  cellSizeMm: 10,
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

describe('separatorsMovingWith', () => {
  const below = { a: { row: 1, col: 0 }, b: { row: 2, col: 0 } }
  const betweenBoth = { a: { row: 1, col: 1 }, b: { row: 1, col: 2 } }
  const nextToBad = { a: { row: 0, col: 1 }, b: { row: 0, col: 2 } }
  const separators = [below, betweenBoth, nextToBad]

  it('takes borders touching only the moving answers', () => {
    // CAT moves, BAD stays: the border between C and an empty cell goes along. The one between
    // CAT's T and the crossing A touches BAD too, so it stays.
    expect(separatorsMovingWith(layout, separators, ['cat'])).toEqual([below])
  })

  it('takes every border touching them when all answers move', () => {
    expect(separatorsMovingWith(layout, separators, ['cat', 'bad'])).toEqual(separators)
  })
})

describe('canMoveBy', () => {
  it('stops at the edges of the page', () => {
    expect(canMoveBy(layout, ['cat'], { row: 0, col: -1 }, A4_LANDSCAPE_GRID)).toBe(false)
    expect(canMoveBy(layout, ['cat'], { row: -1, col: 0 }, A4_LANDSCAPE_GRID)).toBe(true)
    expect(canMoveBy(layout, ['cat', 'bad'], { row: -1, col: 0 }, A4_LANDSCAPE_GRID)).toBe(false)
  })
})

describe('arrowShortcut', () => {
  // CAT reads right from (1,0), BAD reads down from (0,1).
  const at = (answerId: string, index: number, row: number, col: number) => ({ answerId, index, cell: { row, col } })

  it('sets the direction on the first letter', () => {
    expect(arrowShortcut(puzzle, layout, at('cat', 0, 1, 0), 'down')).toEqual({ type: 'toggle-direction', id: 'cat' })
    expect(arrowShortcut(puzzle, layout, at('cat', 0, 1, 0), 'right')).toBeNull()
    expect(arrowShortcut(puzzle, layout, at('bad', 0, 0, 1), 'right')).toEqual({ type: 'toggle-direction', id: 'bad' })
  })

  it('turns across the reading direction, and turns back', () => {
    expect(arrowShortcut(puzzle, layout, at('cat', 1, 1, 1), 'up')).toEqual({ type: 'set-turn', id: 'cat', atIndex: 1, dir: 'up' })
    expect(arrowShortcut(puzzle, layout, at('cat', 1, 1, 1), 'left')).toBeNull()
    const turned: Puzzle = {
      ...puzzle,
      answers: puzzle.answers.map((a) => (a.id === 'cat' ? { ...a, turns: [{ atIndex: 1, dir: 'up' as const }] } : a)),
    }
    expect(arrowShortcut(turned, layoutPuzzle(turned), at('cat', 1, 1, 1), 'up')).toEqual({
      type: 'set-turn',
      id: 'cat',
      atIndex: 1,
      dir: null,
    })
  })

  it('does not turn at the last letter', () => {
    expect(arrowShortcut(puzzle, layout, at('cat', 2, 1, 2), 'down')).toBeNull()
  })
})
