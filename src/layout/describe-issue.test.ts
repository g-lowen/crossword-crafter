import { describe, expect, it } from 'vitest'
import type { Puzzle } from '../model/puzzle'
import { describeIssue } from './describe-issue'

const puzzle: Puzzle = {
  answers: [
    { id: 'a', text: 'CAT', start: { row: 0, col: 0 }, dir: 'right', turns: [], wideSpaces: [] },
    { id: 'b', text: 'BED', start: { row: 0, col: 0 }, dir: 'down', turns: [], wideSpaces: [] },
  ],
  anagram: { showNumbersAndBar: false, cells: [] },
  separators: [],
    groups: [],
  highlightColor: '#1e88e5',
  includeStartArrow: false,
}

describe('describeIssue', () => {
  it('names both answers in a conflict, with 1-based positions', () => {
    expect(describeIssue({ type: 'conflict', cell: { row: 1, col: 1 }, answerIds: ['a', 'b'] }, puzzle)).toBe(
      '"CAT" and "BED" don\'t match at row 2, column 2.',
    )
  })

  it('describes an answer crossing itself', () => {
    expect(describeIssue({ type: 'conflict', cell: { row: 0, col: 0 }, answerIds: ['a'] }, puzzle)).toBe(
      '"CAT" crosses itself at row 1, column 1.',
    )
  })

  it('starts with a capital letter for removed answers', () => {
    expect(describeIssue({ type: 'out-of-bounds', answerId: 'gone', cell: { row: 0, col: 29 } }, puzzle)).toBe(
      'A removed answer goes outside the page at row 1, column 30.',
    )
  })

  it('explains ignored turns', () => {
    expect(
      describeIssue({ type: 'invalid-turn', answerId: 'a', atIndex: 1, reason: 'not-a-turn' }, puzzle),
    ).toBe('"CAT" has an ignored turn at character 2: it must turn 90°.')
  })
})
