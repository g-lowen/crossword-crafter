import { describe, expect, it } from 'vitest'
import { GROUP_COLORS, groupAt, groupColors, groupLabel, groupsAfterRemoving, nextGroupColor, normalizeGroups } from './groups'
import type { AnswerGroup, Puzzle } from './puzzle'
import { emptyPuzzle, puzzleReducer } from './puzzle-reducer'

const group = (start: number, color = '#aaaaaa', name = ''): AnswerGroup => ({ start, name, color })

describe('groupAt', () => {
  const groups = [group(2, 'red'), group(5, 'blue')]

  it('finds the group a list position belongs to', () => {
    expect(groupAt(groups, 0)).toBeUndefined()
    expect(groupAt(groups, 2)?.color).toBe('red')
    expect(groupAt(groups, 4)?.color).toBe('red')
    expect(groupAt(groups, 5)?.color).toBe('blue')
    expect(groupAt(groups, 99)?.color).toBe('blue')
  })
})

describe('groupLabel', () => {
  it('uses the name, or Group N by position', () => {
    const groups = [group(0), group(3, '#fff', 'Christmas')]
    expect(groupLabel(groups, groups[0])).toBe('Group 1')
    expect(groupLabel(groups, groups[1])).toBe('Christmas')
  })
})

describe('nextGroupColor', () => {
  it('takes the first palette color not in use, then starts over', () => {
    expect(nextGroupColor([])).toBe(GROUP_COLORS[0])
    expect(nextGroupColor([group(0, GROUP_COLORS[0])])).toBe(GROUP_COLORS[1])
    const all = GROUP_COLORS.map((color, i) => group(i, color))
    expect(nextGroupColor(all)).toBe(GROUP_COLORS[0])
  })
})

describe('normalizeGroups', () => {
  it('sorts, drops groups outside the list, and keeps the later of two at the same start', () => {
    expect(normalizeGroups([group(4, 'b'), group(1, 'a'), group(9, 'x'), group(4, 'c')], 6)).toEqual([
      group(1, 'a'),
      group(4, 'c'),
    ])
  })
})

describe('groupsAfterRemoving', () => {
  const groups = [group(0, 'a'), group(3, 'b'), group(5, 'c')]

  it('moves later dividers up when an answer is removed', () => {
    expect(groupsAfterRemoving(groups, 1, 7)).toEqual([group(0, 'a'), group(2, 'b'), group(4, 'c')])
  })

  it('drops a group whose last answer is removed', () => {
    // Group b has answers 3 and 4; removing 3 then 4 leaves it empty.
    const once = groupsAfterRemoving(groups, 3, 7)
    expect(once).toEqual([group(0, 'a'), group(3, 'b'), group(4, 'c')])
    expect(groupsAfterRemoving(once, 3, 6)).toEqual([group(0, 'a'), group(3, 'c')])
  })
})

describe('groupColors', () => {
  it('maps answers to their group color, leaving ungrouped answers out', () => {
    const puzzle: Puzzle = {
      ...puzzleReducer(emptyPuzzle, {
        type: 'import',
        answers: ['a', 'b', 'c'].map((id) => ({ id, text: id.toUpperCase() })),
      }),
      groups: [group(1, 'pink')],
    }
    expect([...groupColors(puzzle)]).toEqual([
      ['b', 'pink'],
      ['c', 'pink'],
    ])
  })
})
