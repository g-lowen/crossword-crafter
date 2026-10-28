import { describe, expect, it } from 'vitest'
import { cellKey, layoutPuzzle, type Layout, type Piece } from '../layout/layout'
import type { CellRef, Placement, Puzzle, Separator } from '../model/puzzle'
import { emptyPuzzle, puzzleReducer } from '../model/puzzle-reducer'
import { generateSolution, type GenerateOptions } from './generate'
import { maxBends } from './rules'

/** A seeded random number generator (mulberry32), so every run of the tests is the same. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Seeded, and limited by attempts rather than time, so slow machines get the same results. */
const options = (seed = 1): GenerateOptions => ({ random: seeded(seed), attempts: 60, now: () => 0 })

/** Answers off the grid. 10 mm cells give 29 × 21 cells; 50 mm cells a page of 5 × 4. */
function puzzleOf(texts: string[], cellSizeMm = 10): Puzzle {
  const puzzle = puzzleReducer(emptyPuzzle, {
    type: 'import',
    answers: texts.map((text) => ({ id: text, text })),
  })
  return { ...puzzle, cellSizeMm }
}

function generate(puzzle: Puzzle, seed = 1) {
  const result = generateSolution(puzzle, options(seed))
  if (!result.ok) throw new Error('No solution')
  return { ...result, puzzle: place(puzzle, result.placements, result.separators) }
}

const place = (puzzle: Puzzle, placements: Placement[], separators: Separator[] = []) =>
  puzzleReducer(puzzle, { type: 'place-all', placements, separators })

/** The other answers each answer shares a cell with. */
function partners(layout: Layout): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()
  for (const pieces of layout.cells.values()) {
    for (const piece of pieces) {
      const others = result.get(piece.answerId) ?? new Set()
      pieces.forEach((other) => other.answerId !== piece.answerId && others.add(other.answerId))
      result.set(piece.answerId, others)
    }
  }
  return result
}

/** Whether every answer can be reached from the first one through crossings. */
function linked(layout: Layout, puzzle: Puzzle): boolean {
  const links = partners(layout)
  const reached = new Set([puzzle.answers[0].id])
  for (const id of reached) links.get(id)?.forEach((other) => reached.add(other))
  return reached.size === puzzle.answers.length
}

/**
 * Every two cells side by side with different answers in them, and whether they meet end-on: an
 * answer ends against the other cell, which holds one answer going at right angles, not bending.
 */
function contacts(puzzle: Puzzle): (Separator & { endOn: boolean })[] {
  const layout = layoutPuzzle(puzzle)
  const answers = new Map(puzzle.answers.map((answer) => [answer.id, answer]))
  const across = (piece: Piece) => piece.dir === 'right'
  const bends = (piece: Piece) => answers.get(piece.answerId)!.turns.some((turn) => turn.atIndex === piece.index)
  const pointsAt = (piece: Piece, cell: CellRef) => {
    const last = Array.from(answers.get(piece.answerId)!.text).length - 1
    const step = across(piece) ? { row: 0, col: 1 } : { row: 1, col: 0 }
    const before = { row: piece.row - step.row, col: piece.col - step.col }
    const after = { row: piece.row + step.row, col: piece.col + step.col }
    const at = (other: CellRef) => cellKey(other) === cellKey(cell)
    return (piece.index === 0 && at(before)) || (piece.index === last && at(after))
  }
  const into = (from: Piece[], to: Piece[], cell: CellRef) =>
    to.length === 1 && !bends(to[0]) && from.some((piece) => pointsAt(piece, cell) && across(piece) !== across(to[0]))

  return [...layout.cells.values()].flatMap((pieces) => {
    const a = { row: pieces[0].row, col: pieces[0].col }
    return [
      { row: a.row, col: a.col + 1 },
      { row: a.row + 1, col: a.col },
    ].flatMap((b) => {
      const next = layout.cells.get(cellKey(b))
      if (!next || next.some((piece) => pieces.some((own) => own.answerId === piece.answerId))) return []
      return [{ a, b, endOn: into(pieces, next, b) || into(next, pieces, a) }]
    })
  })
}

const borders = (pairs: Separator[]) => pairs.map(({ a, b }) => `${cellKey(a)}|${cellKey(b)}`).sort()

const ARTISTS = ['MADONNA', 'NIRVANA', 'SANTANA', 'RIHANNA', 'BANANARAMA', 'ABBA', 'ANNA TERNHEIM', 'TINA TURNER']

describe('generateSolution', () => {
  it('places every answer on the page, linked together and crossing at least two others', () => {
    for (const seed of [1, 2, 3]) {
      const { puzzle, dropped } = generate(puzzleOf(ARTISTS), seed)
      const layout = layoutPuzzle(puzzle)
      expect(dropped).toEqual([])
      expect(puzzle.answers.every((answer) => answer.start)).toBe(true)
      // No answer outside the page, no mismatched letters, no answer running along another.
      expect(layout.issues).toEqual([])
      for (const answer of puzzle.answers) expect(partners(layout).get(answer.id)?.size).toBeGreaterThanOrEqual(2)
      expect(linked(layout, puzzle)).toBe(true)
      // Answers only touch end-on, with a thick border between.
      expect(contacts(puzzle).every((pair) => pair.endOn)).toBe(true)
      expect(borders(puzzle.separators)).toEqual(borders(contacts(puzzle)))
    }
  })

  it('keeps to the bend rules', () => {
    for (const seed of [1, 2, 3]) {
      const { puzzle } = generate(puzzleOf([...ARTISTS, 'THE BEATLES', 'BOB', 'FLORENCE + THE MACHINE']), seed)
      for (const { text, dir, turns } of puzzle.answers) {
        expect(turns.length).toBeLessThanOrEqual(text.length > 4 ? maxBends(text.length) : 0)
        turns.forEach((turn, i) => i > 0 && expect(turn.atIndex - turns[i - 1].atIndex).toBeGreaterThanOrEqual(2))
        // Not on the second or second to last character.
        for (const { atIndex } of turns) expect(atIndex >= 2 && atIndex <= text.length - 3).toBe(true)
        // Answers read right or down all the way.
        expect([dir, ...turns.map((turn) => turn.dir)].every((d) => d === 'right' || d === 'down')).toBe(true)
      }
    }
  })

  it('bends on a space rather than a letter', () => {
    // 35 characters fit neither across nor down on a page of 29 × 21, so the answer has to bend.
    const { puzzle } = generate(puzzleOf(['A'.repeat(20) + ' ' + 'B'.repeat(14)]))
    expect(puzzle.answers[0].turns.map((turn) => turn.atIndex)).toEqual([20])
  })

  it('gives a new layout every time', () => {
    const first = generate(puzzleOf(ARTISTS))
    // The same random numbers would give the same layout again, so it has to look further.
    const second = generate(first.puzzle)
    expect(second.placements).not.toEqual(first.placements)
  })

  it('gives the same layout again when there is no other', () => {
    // A page of 3 × 2 cells only has room for ABC across, and centring puts it in the top row.
    const only: Placement = { id: 'ABC', start: { row: 0, col: 0 }, dir: 'right', turns: [] }
    expect(generate(place(puzzleOf(['ABC'], 80), [only])).placements).toEqual([only])
  })

  it('drops the rule about linking answers when one has no letter in common with the rest, and says so', () => {
    const { puzzle, dropped } = generate(puzzleOf(['ABBA', 'QUEEN']))
    // Crossing as many as they can is crossing none.
    expect(dropped.map((rule) => rule.id)).toEqual(['connected'])
    expect(puzzle.answers.every((answer) => answer.start)).toBe(true)
    expect(contacts(puzzle)).toEqual([])
  })

  it('lets an answer end against another, with a thick border between', () => {
    // A page of 3 × 2 cells has no room for AB and CD apart: AB across, CD down, or the other way round.
    const { puzzle, dropped, separators } = generate(puzzleOf(['AB', 'CD'], 80))
    expect(dropped.map((rule) => rule.id)).toEqual(['connected'])
    expect(contacts(puzzle).map((pair) => pair.endOn)).toEqual([true])
    expect(borders(separators)).toEqual(borders(contacts(puzzle)))
  })

  it('asks no more crossings of an answer than it can have', () => {
    // U2's letters are side by side, so two answers crossing it would touch: one is enough.
    const { puzzle, dropped } = generate(puzzleOf([...ARTISTS, 'U2']))
    expect(dropped).toEqual([])
    expect(partners(layoutPuzzle(puzzle)).get('U2')?.size).toBeGreaterThanOrEqual(1)
  })

  it('lets answers lie side by side when the page is too full otherwise, with thick borders between', () => {
    // Four answers with nothing in common fill a page of 5 × 4 completely.
    const { puzzle, dropped } = generate(puzzleOf(['ABCDE', 'FGHIJ', 'KLMNO', 'PQRST'], 50))
    expect(dropped.map((rule) => rule.id)).toEqual(['connected', 'touching'])
    expect(layoutPuzzle(puzzle).issues).toEqual([])
    expect(borders(puzzle.separators)).toEqual(borders(contacts(puzzle)))
  })

  it('keeps the anagram bar free', () => {
    // A page of 5 × 4 fits 8 characters bent once, but not with the bottom two rows kept for the bar.
    const puzzle = puzzleOf(['ABCDEFGH'], 50)
    const withBar = {
      ...puzzle,
      anagram: { showNumbersAndBar: true, cells: [{ answerId: 'ABCDEFGH', letterIndex: 0, number: 1 }] },
    }
    expect(generateSolution(puzzle, options()).ok).toBe(true)
    expect(generateSolution(withBar, options()).ok).toBe(false)
  })

  it('fails when an answer is too long for the page', () => {
    // At most 5 + 4 - 1 cells from one corner of a 5 × 4 page to the other.
    expect(generateSolution(puzzleOf(['ABCDEFGHI'], 50), options())).toEqual({ ok: false })
    expect(generateSolution(puzzleOf([]), options())).toEqual({ ok: false })
  })

  it('places the answers in the middle of the page and drops the old thick borders', () => {
    const puzzle = { ...puzzleOf(['ABC']), separators: [{ a: { row: 0, col: 0 }, b: { row: 0, col: 1 } }] }
    const { puzzle: generated } = generate(puzzle)
    const { start, dir } = generated.answers[0]
    expect(start).toEqual(dir === 'right' ? { row: 10, col: 13 } : { row: 9, col: 14 })
    expect(generated.separators).toEqual([])
  })
})
