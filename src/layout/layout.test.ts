import { describe, expect, it } from 'vitest'
import type { Answer, Puzzle } from '../model/puzzle'
import { cellKey, layoutAnswer, layoutPuzzle, type Piece } from './layout'

function answer(overrides: Partial<Answer> & Pick<Answer, 'id' | 'text'>): Answer {
  return { start: { row: 0, col: 0 }, dir: 'right', turns: [], wideSpaces: [], ...overrides }
}

function puzzle(answers: Answer[], anagramCells: Puzzle['anagram']['cells'] = []): Puzzle {
  return {
    answers,
    anagram: { showNumbersAndBar: false, cells: anagramCells },
    separators: [],
    groups: [],
    highlightColor: '#e53935',
    includeStartArrow: false,
  }
}

function positions(pieces: Piece[]): string[] {
  return pieces.map((piece) => `${piece.char}@${cellKey(piece)}`)
}

describe('layoutAnswer', () => {
  it('lays out a straight answer to the right', () => {
    const path = layoutAnswer(answer({ id: 'a', text: 'ABC' }), { row: 2, col: 3 })
    expect(positions(path.pieces)).toEqual(['A@2,3', 'B@2,4', 'C@2,5'])
    expect(path.startMarker).toEqual({ answerId: 'a', cell: { row: 2, col: 3 }, dir: 'right' })
    expect(path.issues).toEqual([])
  })

  it('lays out a straight answer downwards', () => {
    const path = layoutAnswer(answer({ id: 'a', text: 'ABC', dir: 'down' }), { row: 0, col: 0 })
    expect(positions(path.pieces)).toEqual(['A@0,0', 'B@1,0', 'C@2,0'])
  })

  it('marks spaces as space pieces', () => {
    const path = layoutAnswer(answer({ id: 'a', text: 'A B' }), { row: 0, col: 0 })
    expect(path.pieces.map((piece) => piece.kind)).toEqual(['letter', 'space', 'letter'])
  })

  it('keeps Swedish letters and digits as single cells', () => {
    const path = layoutAnswer(answer({ id: 'a', text: 'ÅÄÖ9' }), { row: 0, col: 0 })
    expect(positions(path.pieces)).toEqual(['Å@0,0', 'Ä@0,1', 'Ö@0,2', '9@0,3'])
  })

  it('turns at the given letter and continues in the new direction', () => {
    const path = layoutAnswer(
      answer({ id: 'a', text: 'ABCDE', turns: [{ atIndex: 2, dir: 'down' }] }),
      { row: 0, col: 0 },
    )
    expect(positions(path.pieces)).toEqual(['A@0,0', 'B@0,1', 'C@0,2', 'D@1,2', 'E@2,2'])
    expect(path.turnMarkers).toEqual([{ answerId: 'a', cell: { row: 0, col: 2 }, from: 'right', to: 'down' }])
  })

  it('supports several turns, including turning up and left', () => {
    const path = layoutAnswer(
      answer({
        id: 'a',
        text: 'ABCDEF',
        dir: 'down',
        turns: [
          { atIndex: 1, dir: 'right' },
          { atIndex: 3, dir: 'up' },
        ],
      }),
      { row: 5, col: 5 },
    )
    expect(positions(path.pieces)).toEqual(['A@5,5', 'B@6,5', 'C@6,6', 'D@6,7', 'E@5,7', 'F@4,7'])
    expect(path.turnMarkers).toHaveLength(2)
  })

  it('lets a wide space take two cells', () => {
    const path = layoutAnswer(answer({ id: 'a', text: 'AB CD', wideSpaces: [2] }), { row: 0, col: 0 })
    expect(positions(path.pieces)).toEqual(['A@0,0', 'B@0,1', ' @0,2', ' @0,3', 'C@0,4', 'D@0,5'])
    expect(path.pieces.filter((piece) => piece.widePart !== undefined).map((piece) => piece.widePart)).toEqual([
      0, 1,
    ])
    expect(path.wideSpaceBlocks).toEqual([
      {
        answerId: 'a',
        index: 2,
        cells: [
          { row: 0, col: 2 },
          { row: 0, col: 3 },
        ],
        dir: 'right',
      },
    ])
  })

  it('places a wide space after a turn in the new direction', () => {
    const path = layoutAnswer(
      answer({ id: 'a', text: 'AB C', turns: [{ atIndex: 1, dir: 'up' }], wideSpaces: [2] }),
      { row: 5, col: 0 },
    )
    expect(positions(path.pieces)).toEqual(['A@5,0', 'B@5,1', ' @4,1', ' @3,1', 'C@2,1'])
    expect(path.wideSpaceBlocks[0].dir).toBe('up')
  })

  it('reports wide spaces that are not spaces', () => {
    const path = layoutAnswer(answer({ id: 'a', text: 'ABC', wideSpaces: [1] }), { row: 0, col: 0 })
    expect(path.issues).toEqual([{ type: 'invalid-wide-space', answerId: 'a', index: 1 }])
    expect(path.pieces).toHaveLength(3)
  })

  it('reports and ignores invalid turns', () => {
    const path = layoutAnswer(
      answer({
        id: 'a',
        text: 'AB CD',
        wideSpaces: [2],
        turns: [
          { atIndex: 0, dir: 'right' },
          { atIndex: 1, dir: 'down' },
          { atIndex: 1, dir: 'up' },
          { atIndex: 2, dir: 'down' },
          { atIndex: 4, dir: 'down' },
          { atIndex: -1, dir: 'down' },
        ],
      }),
      { row: 0, col: 0 },
    )
    expect(path.issues).toEqual([
      { type: 'invalid-turn', answerId: 'a', atIndex: 1, reason: 'duplicate' },
      { type: 'invalid-turn', answerId: 'a', atIndex: 2, reason: 'on-wide-space' },
      { type: 'invalid-turn', answerId: 'a', atIndex: 4, reason: 'out-of-range' },
      { type: 'invalid-turn', answerId: 'a', atIndex: -1, reason: 'out-of-range' },
      { type: 'invalid-turn', answerId: 'a', atIndex: 0, reason: 'not-a-turn' },
    ])
    expect(positions(path.pieces)).toEqual(['A@0,0', 'B@0,1', ' @1,1', ' @2,1', 'C@3,1', 'D@4,1'])
  })

  it('reports a reversing turn as not a turn', () => {
    const path = layoutAnswer(answer({ id: 'a', text: 'ABC', turns: [{ atIndex: 1, dir: 'left' }] }), {
      row: 0,
      col: 0,
    })
    expect(path.issues).toEqual([{ type: 'invalid-turn', answerId: 'a', atIndex: 1, reason: 'not-a-turn' }])
    expect(positions(path.pieces)).toEqual(['A@0,0', 'B@0,1', 'C@0,2'])
  })
})

describe('layoutPuzzle', () => {
  it('skips unplaced answers', () => {
    const layout = layoutPuzzle(puzzle([answer({ id: 'a', text: 'ABC', start: null })]))
    expect(layout.cells.size).toBe(0)
    expect(layout.startMarkers).toEqual([])
    expect(layout.issues).toEqual([])
  })

  it('allows crossings with the same letter', () => {
    const layout = layoutPuzzle(
      puzzle([
        answer({ id: 'a', text: 'CAT', start: { row: 1, col: 0 } }),
        answer({ id: 'b', text: 'BAD', start: { row: 0, col: 1 }, dir: 'down' }),
      ]),
    )
    expect(layout.cells.get('1,1')?.map((piece) => piece.answerId)).toEqual(['a', 'b'])
    expect(layout.issues).toEqual([])
  })

  it('reports crossings with different letters but keeps both pieces', () => {
    const layout = layoutPuzzle(
      puzzle([
        answer({ id: 'a', text: 'CAT', start: { row: 1, col: 0 } }),
        answer({ id: 'b', text: 'BED', start: { row: 0, col: 1 }, dir: 'down' }),
      ]),
    )
    expect(layout.cells.get('1,1')).toHaveLength(2)
    expect(layout.issues).toEqual([{ type: 'conflict', cell: { row: 1, col: 1 }, answerIds: ['a', 'b'] }])
  })

  it('reports a letter crossing a space', () => {
    const layout = layoutPuzzle(
      puzzle([
        answer({ id: 'a', text: 'A B', start: { row: 1, col: 0 } }),
        answer({ id: 'b', text: 'XYZ', start: { row: 0, col: 1 }, dir: 'down' }),
      ]),
    )
    expect(layout.issues).toEqual([{ type: 'conflict', cell: { row: 1, col: 1 }, answerIds: ['a', 'b'] }])
  })

  it('reports an answer that crosses itself', () => {
    const layout = layoutPuzzle(
      puzzle([
        answer({
          id: 'a',
          text: 'AAAAA',
          start: { row: 1, col: 0 },
          turns: [
            { atIndex: 1, dir: 'down' },
            { atIndex: 2, dir: 'left' },
            { atIndex: 3, dir: 'up' },
          ],
        }),
      ]),
    )
    // A@1,0 A@1,1 A@2,1 A@2,0 A@1,0
    expect(layout.issues).toEqual([{ type: 'conflict', cell: { row: 1, col: 0 }, answerIds: ['a'] }])
  })

  it('reports cells outside the grid', () => {
    const layout = layoutPuzzle(puzzle([answer({ id: 'a', text: 'ABC', start: { row: 0, col: 1 } })]), {
      rows: 5,
      columns: 3,
    })
    expect(layout.issues).toEqual([{ type: 'out-of-bounds', answerId: 'a', cell: { row: 0, col: 3 } }])
  })

  it('uses an A4 landscape grid of 29 by 21 cells by default', () => {
    const inside = layoutPuzzle(puzzle([answer({ id: 'a', text: 'AB', start: { row: 20, col: 27 } })]))
    expect(inside.issues).toEqual([])
    const outside = layoutPuzzle(puzzle([answer({ id: 'a', text: 'AB', start: { row: 21, col: 0 } })]))
    expect(outside.issues.map((issue) => issue.type)).toEqual(['out-of-bounds', 'out-of-bounds'])
  })

  it('collects markers and wide space blocks from all answers', () => {
    const layout = layoutPuzzle(
      puzzle([
        answer({ id: 'a', text: 'A BC', wideSpaces: [1], turns: [{ atIndex: 2, dir: 'down' }] }),
        answer({ id: 'b', text: 'XY', start: { row: 5, col: 5 }, dir: 'down' }),
      ]),
    )
    expect(layout.startMarkers.map((marker) => marker.answerId)).toEqual(['a', 'b'])
    expect(layout.turnMarkers).toEqual([{ answerId: 'a', cell: { row: 0, col: 3 }, from: 'right', to: 'down' }])
    expect(layout.wideSpaceBlocks).toHaveLength(1)
  })

  describe('anagram cells', () => {
    it('resolves anagram cells to grid cells and follows the answer when it moves', () => {
      const anagram = [{ answerId: 'a', letterIndex: 2, number: 1 }]
      const before = layoutPuzzle(puzzle([answer({ id: 'a', text: 'ABC', start: { row: 0, col: 0 } })], anagram))
      const after = layoutPuzzle(puzzle([answer({ id: 'a', text: 'ABC', start: { row: 4, col: 4 } })], anagram))
      expect(before.anagramCells).toEqual([{ cell: { row: 0, col: 2 }, answerId: 'a', letterIndex: 2, number: 1 }])
      expect(after.anagramCells[0].cell).toEqual({ row: 4, col: 6 })
    })

    it('resolves anagram cells after a wide space', () => {
      const layout = layoutPuzzle(
        puzzle([answer({ id: 'a', text: 'A B', wideSpaces: [1] })], [{ answerId: 'a', letterIndex: 2 }]),
      )
      expect(layout.anagramCells[0].cell).toEqual({ row: 0, col: 3 })
    })

    it('hides anagram cells of unplaced answers without reporting them', () => {
      const layout = layoutPuzzle(
        puzzle([answer({ id: 'a', text: 'ABC', start: null })], [{ answerId: 'a', letterIndex: 0 }]),
      )
      expect(layout.anagramCells).toEqual([])
      expect(layout.issues).toEqual([])
    })

    it('reports invalid anagram cells', () => {
      const layout = layoutPuzzle(
        puzzle(
          [answer({ id: 'a', text: 'A B' })],
          [
            { answerId: 'missing', letterIndex: 0 },
            { answerId: 'a', letterIndex: 3 },
            { answerId: 'a', letterIndex: 1 },
          ],
        ),
      )
      expect(layout.issues).toEqual([
        { type: 'invalid-anagram-cell', answerId: 'missing', letterIndex: 0, reason: 'missing-answer' },
        { type: 'invalid-anagram-cell', answerId: 'a', letterIndex: 3, reason: 'out-of-range' },
        { type: 'invalid-anagram-cell', answerId: 'a', letterIndex: 1, reason: 'not-a-letter' },
      ])
      expect(layout.anagramCells).toEqual([])
    })

    it('reports duplicate anagram numbers', () => {
      const layout = layoutPuzzle(
        puzzle(
          [answer({ id: 'a', text: 'ABC' })],
          [
            { answerId: 'a', letterIndex: 0, number: 1 },
            { answerId: 'a', letterIndex: 2, number: 1 },
          ],
        ),
      )
      expect(layout.issues).toEqual([{ type: 'duplicate-anagram-number', number: 1 }])
      expect(layout.anagramCells).toHaveLength(2)
    })
  })
})
