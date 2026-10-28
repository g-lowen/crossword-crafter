import { describe, expect, it } from 'vitest'
import {
  GROUP_COLORS,
  addGroup,
  groupAt,
  groupColors,
  groupLabel,
  groupsAfterRemoving,
  moveAnswer,
  moveAnswerToHeader,
  moveGroup,
  moveOutOfGroups,
  nextGroupColor,
  normalizeGroups,
  removeGroup,
  runStart,
} from './groups'
import type { Answer, AnswerGroup, Puzzle } from './puzzle'
import { emptyPuzzle, puzzleReducer } from './puzzle-reducer'

const group = (start: number, end: number, color = '#aaaaaa', name = ''): AnswerGroup => ({ start, end, name, color })

describe('groupAt and runStart', () => {
  // a b | c d e | f | g h
  const groups = [group(2, 5, 'red'), group(6, 8, 'blue')]

  it('finds the group a list position belongs to', () => {
    expect(groupAt(groups, 0)).toBeUndefined()
    expect(groupAt(groups, 2)?.color).toBe('red')
    expect(groupAt(groups, 4)?.color).toBe('red')
    expect(groupAt(groups, 5)).toBeUndefined()
    expect(groupAt(groups, 7)?.color).toBe('blue')
    expect(groupAt(groups, 8)).toBeUndefined()
  })

  it('finds where the run around a position starts', () => {
    expect([0, 1, 2, 4, 5, 6, 7].map((i) => runStart(groups, i))).toEqual([0, 0, 2, 2, 5, 6, 6])
  })
})

describe('groupLabel', () => {
  it('uses the name, or Group N by position', () => {
    const groups = [group(0, 3), group(3, 4, '#fff', 'Christmas')]
    expect(groupLabel(groups, groups[0])).toBe('Group 1')
    expect(groupLabel(groups, groups[1])).toBe('Christmas')
  })
})

describe('nextGroupColor', () => {
  it('takes the first palette color not in use, then starts over', () => {
    expect(nextGroupColor([])).toBe(GROUP_COLORS[0])
    expect(nextGroupColor([group(0, 1, GROUP_COLORS[0])])).toBe(GROUP_COLORS[1])
    const all = GROUP_COLORS.map((color, i) => group(i, i + 1, color))
    expect(nextGroupColor(all)).toBe(GROUP_COLORS[0])
  })
})

describe('normalizeGroups', () => {
  it('sorts, drops groups outside the list, and keeps the later of two at the same start', () => {
    expect(normalizeGroups([group(4, 6, 'b'), group(1, 4, 'a'), group(9, 10, 'x'), group(4, 5, 'c')], 6)).toEqual([
      group(1, 4, 'a'),
      group(4, 5, 'c'),
    ])
  })

  it('ends an overlapping group where the next one starts, and cuts groups at the end of the list', () => {
    expect(normalizeGroups([group(0, 4, 'a'), group(2, 9, 'b')], 6)).toEqual([group(0, 2, 'a'), group(2, 6, 'b')])
  })
})

describe('groupsAfterRemoving', () => {
  const groups = [group(0, 3, 'a'), group(3, 5, 'b'), group(6, 7, 'c')]

  it('moves later groups up when an answer is removed', () => {
    expect(groupsAfterRemoving(groups, 1, 6)).toEqual([group(0, 2, 'a'), group(2, 4, 'b'), group(5, 6, 'c')])
  })

  it('drops a group whose last answer is removed', () => {
    const once = groupsAfterRemoving(groups, 3, 6)
    expect(once).toEqual([group(0, 3, 'a'), group(3, 4, 'b'), group(5, 6, 'c')])
    expect(groupsAfterRemoving(once, 3, 5)).toEqual([group(0, 3, 'a'), group(4, 5, 'c')])
  })
})

describe('addGroup and removeGroup', () => {
  // a | b c d | e f
  const groups = [group(1, 4, 'red')]

  it('splits a group in two', () => {
    expect(addGroup(groups, 2, 'blue', 6)).toEqual([group(1, 2, 'red'), group(2, 4, 'blue')])
  })

  it('runs a group from an answer without one until the next group', () => {
    expect(addGroup(groups, 0, 'blue', 6)).toEqual([group(0, 1, 'blue'), group(1, 4, 'red')])
    expect(addGroup(groups, 4, 'blue', 6)).toEqual([group(1, 4, 'red'), group(4, 6, 'blue')])
  })

  it('ignores a second group at the same answer', () => {
    expect(addGroup(groups, 1, 'blue', 6)).toBe(groups)
  })

  it('gives the answers to the group right above, or none', () => {
    const split = [group(1, 2, 'red'), group(2, 4, 'blue')]
    expect(removeGroup(split, 2)).toEqual([group(1, 4, 'red')])
    expect(removeGroup(split, 1)).toEqual([group(2, 4, 'blue')])
  })
})

describe('groupColors', () => {
  it('maps answers to their group color, leaving ungrouped answers out', () => {
    const puzzle: Puzzle = {
      ...puzzleReducer(emptyPuzzle, {
        type: 'import',
        answers: ['a', 'b', 'c'].map((id) => ({ id, text: id.toUpperCase() })),
      }),
      groups: [group(1, 2, 'pink')],
    }
    expect([...groupColors(puzzle)]).toEqual([['b', 'pink']])
  })
})

describe('moving answers and groups', () => {
  // a | b c | d e | f
  const list = {
    answers: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id }) as Answer),
    groups: [group(1, 3, 'red'), group(3, 5, 'blue')],
  }
  const ids = (l: { answers: Answer[] }) => l.answers.map((a) => a.id).join('')
  const ranges = (l: { groups: AnswerGroup[] }) => l.groups.map((g) => `${g.color}@${g.start}-${g.end}`)

  it('moves an answer into the group of the answer it is dropped on', () => {
    const moved = moveAnswer(list, 5, 3)
    expect(ids(moved)).toBe('abcfde')
    expect(ranges(moved)).toEqual(['red@1-3', 'blue@3-6'])
  })

  it('moves an answer out of its groups when dropped on an answer without one', () => {
    const moved = moveAnswer(list, 2, 5)
    expect(ids(moved)).toBe('abdefc')
    expect(ranges(moved)).toEqual(['red@1-2', 'blue@2-4'])
  })

  it('removes a group when its last answer is dragged out', () => {
    const one = { ...list, groups: [group(1, 2, 'red'), group(2, 5, 'blue')] }
    expect(ranges(moveAnswer(one, 1, 4))).toEqual(['blue@1-5'])
  })

  it('puts an answer dropped on a header where the list made room for it', () => {
    // Dragged down onto blue's header: blue's first answer.
    const down = moveAnswerToHeader(list, 0, 3)
    expect(ids(down)).toBe('bcadef')
    expect(ranges(down)).toEqual(['red@0-2', 'blue@2-5'])
    // Dragged up onto red's header: the last of the answers without a group above it.
    const up = moveAnswerToHeader(list, 4, 1)
    expect(ids(up)).toBe('aebcdf')
    expect(ranges(up)).toEqual(['red@2-4', 'blue@4-5'])
    // Dragged up onto blue's header, which red touches: red's last answer.
    expect(ranges(moveAnswerToHeader(list, 5, 3))).toEqual(['red@1-4', 'blue@4-6'])
  })

  it('takes an answer out of its group, between two groups', () => {
    const moved = moveOutOfGroups(list, 1, 3)
    expect(ids(moved)).toBe('acbdef')
    expect(ranges(moved)).toEqual(['red@1-2', 'blue@3-5'])
    expect(ranges(moveOutOfGroups(list, 4, 3))).toEqual(['red@1-3', 'blue@4-5'])
  })

  it('moves a group down after the run it is dropped on', () => {
    const moved = moveGroup(list, 1, 5)
    expect(ids(moved)).toBe('adefbc')
    expect(ranges(moved)).toEqual(['blue@1-3', 'red@4-6'])
  })

  it('moves a group up before the run it is dropped on', () => {
    const moved = moveGroup(list, 3, 0)
    expect(ids(moved)).toBe('deabcf')
    expect(ranges(moved)).toEqual(['blue@0-2', 'red@3-5'])
  })

  it('leaves the list alone when a group is dropped on itself', () => {
    expect(moveGroup(list, 1, 1)).toBe(list)
  })
})
