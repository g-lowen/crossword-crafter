import { describe, expect, it } from 'vitest'
import type { Answer, Puzzle } from '../model/puzzle'
import { emptyPuzzle } from '../model/puzzle-reducer'
import { layoutPuzzle } from './layout'
import { pickAnagram, type AnagramPick } from './pick-anagram'

/** An answer across from `row`, `col`, or off the grid when `row` is null. */
function answer(id: string, text: string, row: number | null, col = 0, dir: Answer['dir'] = 'right'): Answer {
  const start = row === null ? null : { row, col }
  return { id, text, start, dir, turns: [], wideSpaces: [], visibleLetters: [] }
}

const puzzleOf = (...answers: Answer[]): Puzzle => ({ ...emptyPuzzle, answers })

function pick(puzzle: Puzzle, anagram: string): AnagramPick {
  // A fixed sequence, so ties always break the same way.
  let n = 1
  const random = () => ((n = (n * 16807) % 2147483647) - 1) / 2147483646
  return pickAnagram(puzzle, layoutPuzzle(puzzle), anagram, random)
}

/** The picked letters as "answer:letter", in number order. */
function letters(result: AnagramPick, puzzle: Puzzle): string[] {
  if (!result.ok) throw new Error('No anagram')
  const textOf = new Map(puzzle.answers.map((a) => [a.id, a.text]))
  return [...result.cells]
    .sort((a, b) => a.number! - b.number!)
    .map(({ answerId, letterIndex }) => `${answerId}:${textOf.get(answerId)![letterIndex]}`)
}

const shared = (result: AnagramPick) => (result.ok ? result.shared : null)

describe('pickAnagram', () => {
  it('takes each letter from a different answer, numbered left to right', () => {
    // Only KENT has a K, so the N has to come from QUEEN.
    const puzzle = puzzleOf(
      answer('queen', 'QUEEN', 0, 10),
      answer('abba', 'ABBA', 2, 0),
      answer('kent', 'KENT', 4, 20),
    )
    const result = pick(puzzle, 'NAK')
    expect(letters(result, puzzle)).toEqual(['abba:A', 'queen:N', 'kent:K'])
    expect(shared(result)).toEqual([])
  })

  it('spreads a repeated letter over the answers', () => {
    const puzzle = puzzleOf(answer('abba', 'ABBA', 0), answer('anna', 'ANNA', 2), answer('mama', 'MAMA', 4))
    const result = pick(puzzle, 'AAA')
    expect(letters(result, puzzle).sort()).toEqual(['abba:A', 'anna:A', 'mama:A'])
  })

  it('takes more than one letter from an answer when it has to, and says which', () => {
    // Only ABBA has an A or a B.
    const puzzle = puzzleOf(answer('abba', 'ABBA', 0), answer('kent', 'KENT', 2))
    const result = pick(puzzle, 'BAT')
    expect(letters(result, puzzle).sort()).toEqual(['abba:A', 'abba:B', 'kent:T'])
    expect(shared(result)).toEqual([{ answerId: 'abba', letters: 2 }])
  })

  it('counts a letter where answers cross for both of them', () => {
    // ABC across and XBY down cross on the B, which XBY's own X then joins.
    const across = answer('abc', 'ABC', 5, 5)
    const down = answer('xby', 'XBY', 4, 6, 'down')
    expect(shared(pick(puzzleOf(across, down), 'BX'))).toEqual([{ answerId: 'xby', letters: 2 }])

    // With a B of its own somewhere else, the crossing isn't needed.
    const puzzle = puzzleOf(across, down, answer('bob', 'BOB', 10, 0))
    const result = pick(puzzle, 'BX')
    expect(letters(result, puzzle).sort()).toEqual(['bob:B', 'xby:X'])
    expect(shared(result)).toEqual([])
  })

  it('leaves always visible letters alone when it can', () => {
    const puzzle = puzzleOf({ ...answer('ana', 'ANA', 0), visibleLetters: [0] })
    expect(pick(puzzle, 'A')).toMatchObject({ ok: true, cells: [{ answerId: 'ana', letterIndex: 2, number: 1 }] })
  })

  it('uses answers off the grid too, numbered after the ones on it', () => {
    const puzzle = puzzleOf(answer('abba', 'ABBA', null), answer('kent', 'KENT', 3, 8))
    expect(letters(pick(puzzle, 'ak'), puzzle)).toEqual(['kent:K', 'abba:A'])
    // Spaces and lowercase don't matter.
    expect(letters(pick(puzzle, ' a K '), puzzle)).toEqual(['kent:K', 'abba:A'])
  })

  it('says which letters the answers lack', () => {
    const result = pick(puzzleOf(answer('abba', 'ABBA', 0), answer('kent', 'KENT', 2)), 'AXA A')
    expect(result).toEqual({
      ok: false,
      missing: [
        { char: 'A', needed: 3, found: 2 },
        { char: 'X', needed: 1, found: 0 },
      ],
    })
  })
})
