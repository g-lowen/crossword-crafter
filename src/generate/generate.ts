import { centerOffset } from '../layout/center'
import { layoutAnswer, layoutPuzzle } from '../layout/layout'
import { puzzleGrid } from '../model/page'
import type { Answer, CellRef, Dir, Placement, Puzzle, Separator, Turn } from '../model/puzzle'
import { DROP_ORDER, RULES, type Rule, type RuleId } from './rules'

/**
 * Places every answer on the page at random, following the rules in `rules.ts`.
 *
 * Answers go on one at a time, the longest first, each where it crosses the most answers already
 * placed. Then answers that cross too few others or hang apart from the rest are moved, or others
 * are moved across them. A try that fails starts over with a new order and new shapes, until a
 * time limit. Then the first rule in `DROP_ORDER` is dropped and the search starts again, and so
 * on. A solution that is the same as the current layout is only used when no other turns up.
 */

export type GenerateResult =
  | {
      ok: true
      placements: Placement[]
      /** Between answers that touch without crossing. */
      separators: Separator[]
      /** Rules the solution breaks, dropped to find it. */
      dropped: Rule[]
    }
  | { ok: false }

export type GenerateOptions = {
  /** Random numbers from 0 up to 1. Tests pass a seeded one. */
  random?: () => number
  /** Tries with each set of rules before the next rule is dropped. */
  attempts?: number
  /**
   * Milliseconds with every rule before the first is dropped. Each later set of rules gets a third
   * as long, since it's only needed when the answers hardly fit.
   */
  timeLimit?: number
  now?: () => number
}

/** Which way an answer goes through a cell. Only letters going straight across or down can be crossed. */
type Line = 'across' | 'down' | 'corner'

type ShapeCell = CellRef & {
  char: string
  line: Line
  /** For the first and last character: the cell just before or after the answer. */
  points: CellRef[]
}

/** An answer with a direction and bends, laid out from row 0, column 0. */
type Shape = {
  dir: Dir
  turns: Turn[]
  bends: number[]
  cells: ShapeCell[]
  rows: number
  columns: number
  /** What the rules' preferences think of the bends. */
  score: number
}

type Spot = { shape: Shape; start: CellRef }

/** A spot the answer fits in, with the answers it crosses there. */
type Option = Spot & { crosses: number[]; score: number }

/** One answer's character in a cell, with `points` on the page. */
type Entry = Omit<ShapeCell, 'row' | 'col'> & { answer: number }

/** The answers and what can be worked out from their letters alone. */
type Words = {
  answers: Answer[]
  chars: string[][]
  /** For each answer, the other answers it has a letter in common with. */
  sharing: Set<number>[]
  /** The fewest pieces the puzzle can be in: answers without a letter in common can't cross. */
  minPieces: number
}

type State = {
  rows: number
  columns: number
  /** Row by row. A cell holds two entries where answers cross. */
  cells: Entry[][]
  /** Per answer, by its list index. */
  spots: (Spot | undefined)[]
  /** The other answers each answer crosses. */
  partners: Set<number>[]
  /** How many other answers each answer should cross. */
  needs: number[]
  minPieces: number
}

/** What the rules in play ask for, combined. */
type Settings = {
  /** Whether every answer has to cross as many others as it should, or only tries to. */
  mustCross: boolean
  /** Whether the answers have to hang together, or only try to. */
  mustConnect: boolean
  touching: 'never' | 'end-on' | 'any'
  allowsBends: (chars: string[], bends: number[]) => boolean
  bendScore: (chars: string[], bends: number[]) => number
}

/** A finished attempt. */
type Found = {
  state: State
  placements: Placement[]
  separators: Separator[]
  missing: number
  /** Pieces beyond the fewest possible. */
  extraPieces: number
  repeat: boolean
}

const CROSSING_SCORE = 10
/** Extra for crossing an answer that crosses fewer others than it should. */
const NEEDED_CROSSING_SCORE = 5
/** Answers that touch need a thick border, so each place they do costs as much as a bend on a letter. */
const TOUCH_SCORE = -3
/** Random extra on every option, so equally good options take turns. */
const JITTER = 2
/** Bent shapes each answer tries per attempt, besides the straight ones. */
const BENT_SHAPES = 16
/** Random spots tried for an answer that can't cross anything. */
const FREE_TRIES = 300

/**
 * How many others each answer tries to cross. Rule 1 says "try", so the search keeps aiming for
 * it after it is dropped.
 */
const CROSSING_GOAL = Math.max(0, ...RULES.map((rule) => rule.minCrossings ?? 0))

const STEP: Record<Dir, CellRef> = {
  right: { row: 0, col: 1 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  up: { row: -1, col: 0 },
}

const NEIGHBOURS = Object.values(STEP)

export function generateSolution(puzzle: Puzzle, options: GenerateOptions = {}): GenerateResult {
  const { random = Math.random, attempts = 200, timeLimit = 400, now = () => performance.now() } = options
  if (puzzle.answers.length === 0) return { ok: false }
  const grid = puzzleGrid(puzzle)
  // Like Center on page, keep the anagram bar and its numbers free.
  const rows = puzzle.anagram.showNumbersAndBar && puzzle.anagram.cells.length > 0 ? grid.rows - 2 : grid.rows
  const page = { rows, columns: grid.columns }
  const chars = puzzle.answers.map((answer) => Array.from(answer.text))
  const sharing = sharedLetters(chars)
  const words: Words = { answers: puzzle.answers, chars, sharing, minPieces: countPieces(sharing) }

  // Rules no layout can keep are dropped from the start.
  const impossible: RuleId[] = RULES.filter((rule) => rule.connected && words.minPieces > 1).map((rule) => rule.id)
  // The best attempt with each set of rules, for when a later set asks for less.
  const tried: Found[] = []
  for (let level = 0; level <= DROP_ORDER.length; level++) {
    if (level > 0 && impossible.includes(DROP_ORDER[level - 1])) continue
    const dropped = [...impossible, ...DROP_ORDER.slice(0, level)]
    const rules = RULES.filter((rule) => !dropped.includes(rule.id))
    const earlier = tried.find((found) => rules.every((rule) => keeps(rule, found.state, words)))
    if (earlier) return solution(earlier, dropped, words)

    const settings = settingsFor(rules)
    let best: Found | undefined
    const deadline = now() + (level === 0 ? timeLimit : timeLimit / 3)
    for (let i = 0; i < attempts && (i === 0 || now() < deadline); i++) {
      const state = attempt(words, page, settings, random)
      if (!state) continue
      const found = finish(puzzle, state)
      if (valid(found, settings) && !found.repeat) return solution(found, dropped, words)
      if (!best || rank(found) < rank(best)) best = found
    }
    if (best && valid(best, settings)) return solution(best, dropped, words)
    if (best) tried.push(best)
  }
  return { ok: false }
}

const valid = (found: Found, settings: Settings) =>
  (!settings.mustCross || found.missing === 0) && (!settings.mustConnect || found.extraPieces === 0)

/**
 * Hanging together counts most, as that rule is dropped after rule 1, then missing crossings, then
 * a new layout before the current one.
 */
const rank = (found: Found) => found.extraPieces * 1000 + found.missing * 2 + (found.repeat ? 1 : 0)

function solution(found: Found, dropped: string[], words: Words): GenerateResult {
  return {
    ok: true,
    placements: found.placements,
    separators: found.separators,
    dropped: RULES.filter((rule) => dropped.includes(rule.id) && !keeps(rule, found.state, words)),
  }
}

function settingsFor(rules: Rule[]): Settings {
  return {
    mustCross: rules.some((rule) => rule.minCrossings),
    mustConnect: rules.some((rule) => rule.connected),
    touching: rules.some((rule) => rule.touching === 'never')
      ? 'never'
      : rules.some((rule) => rule.touching === 'end-on')
        ? 'end-on'
        : 'any',
    allowsBends: (chars, bends) => rules.every((rule) => rule.allowsBends?.(chars, bends) ?? true),
    bendScore: (chars, bends) => rules.reduce((score, rule) => score + (rule.bendScore?.(chars, bends) ?? 0), 0),
  }
}

function sharedLetters(chars: string[][]): Set<number>[] {
  const letters = chars.map((answer) => new Set(answer.filter((char) => char !== ' ')))
  const shares = (a: Set<string>, b: Set<string>) => [...a].some((char) => b.has(char))
  return letters.map((own, i) => new Set(letters.flatMap((other, j) => (j !== i && shares(own, other) ? [j] : []))))
}

/**
 * How many other answers each answer should cross: as many as asked for, or as many as it can.
 * It can't cross more answers than it has letters in common with. Letters side by side can't both
 * be crossed without the answers crossing them touching, so U2 can only cross one either.
 */
function crossingNeeds(words: Words, minCrossings: number): number[] {
  return words.chars.map((answer, i) => {
    let room = 0
    let last = -Infinity
    answer.forEach((char, index) => {
      if (char === ' ' || index - last < 2) return
      room++
      last = index
    })
    return Math.min(minCrossings, room, words.sharing[i].size)
  })
}

/** How many crossings are still missing for every answer to cross as many others as it should. */
function missing(state: State): number {
  return state.partners.reduce((sum, partners, i) => sum + Math.max(0, state.needs[i] - partners.size), 0)
}

/** Which piece each answer is in, where answers that are linked, directly or not, are one piece. */
function pieceIds(links: Set<number>[]): number[] {
  const ids: number[] = links.map(() => -1)
  let next = 0
  links.forEach((_, first) => {
    if (ids[first] >= 0) return
    const queue = [first]
    ids[first] = next
    while (queue.length > 0) {
      for (const other of links[queue.pop()!]) {
        if (ids[other] < 0) {
          ids[other] = next
          queue.push(other)
        }
      }
    }
    next++
  })
  return ids
}

const countPieces = (links: Set<number>[]) => Math.max(0, ...pieceIds(links)) + 1

/**
 * How far an attempt is from crossing and hanging together as asked. A piece too many weighs like
 * two missing crossings, so joining a piece is worth losing a crossing.
 */
function shortfall(state: State): number {
  return 2 * (countPieces(state.partners) - state.minPieces) + missing(state)
}

/** Whether a solution keeps a rule anyway, even though it was dropped to find it. */
function keeps(rule: Rule, state: State, words: Words): boolean {
  const { minCrossings, connected, touching, allowsBends } = rule
  if (minCrossings) {
    const needs = crossingNeeds(words, minCrossings)
    if (state.partners.some((partners, i) => partners.size < needs[i])) return false
  }
  if (connected && countPieces(state.partners) > 1) return false
  if (touching && touchingPairs(state).some((pair) => touching === 'never' || !pair.endOn)) return false
  if (allowsBends && state.spots.some((spot, i) => spot && !allowsBends(words.chars[i], spot.shape.bends))) {
    return false
  }
  return true
}

/** One go at placing every answer, or null when one doesn't fit anywhere. */
function attempt(
  words: Words,
  page: { rows: number; columns: number },
  settings: Settings,
  random: () => number,
): State | null {
  const { answers, chars } = words
  const state: State = {
    ...page,
    cells: Array.from({ length: page.rows * page.columns }, () => []),
    spots: [],
    partners: answers.map(() => new Set()),
    needs: crossingNeeds(words, CROSSING_GOAL),
    minPieces: words.minPieces,
  }
  const shapes = answers.map((answer, i) => shapesFor(answer, chars[i], settings, random))
  // The longest answers go first, to give the rest something to cross.
  const order = answers
    .map((_, i) => ({ i, key: chars[i].length + random() * 4 }))
    .sort((a, b) => b.key - a.key)
    .map(({ i }) => i)

  for (const [n, i] of order.entries()) {
    const chosen =
      choose(n === 0 ? middleSpots(state, shapes[i], random) : crossingSpots(state, settings, i, shapes[i]), random) ??
      choose(freeSpots(state, settings, i, shapes[i], random), random)
    if (!chosen) return null
    put(state, i, chosen)
  }
  repair(state, settings, shapes, random)
  return state
}

/**
 * Moves answers around until every answer crosses as many others as it should and the puzzle hangs
 * together. Each step takes an answer that falls short, and either moves it or moves another
 * answer across it, whichever helps most. Steps that change nothing are taken too, to get out of
 * dead ends, but only so many in a row.
 */
function repair(state: State, settings: Settings, shapes: Shape[][], random: () => number) {
  let idle = 0
  while (idle < shapes.length) {
    const before = shortfall(state)
    if (before === 0) return
    const behind = stragglers(state)
    const move = bestMove(state, settings, shapes, behind[Math.floor(random() * behind.length)], random)
    if (!move || move.shortfall > before) {
      idle++
      continue
    }
    idle = move.shortfall < before ? 0 : idle + 1
    lift(state, move.answer)
    put(state, move.answer, move.option)
  }
}

/** Answers that cross too few others, and answers outside the biggest piece when there are too many. */
function stragglers(state: State): number[] {
  const ids = pieceIds(state.partners)
  const sizes = new Map<number, number>()
  for (const id of ids) sizes.set(id, (sizes.get(id) ?? 0) + 1)
  const loose = sizes.size > state.minPieces
  const biggest = [...sizes].reduce((a, b) => (b[1] > a[1] ? b : a))[0]
  return state.partners.flatMap((partners, i) =>
    partners.size < state.needs[i] || (loose && ids[i] !== biggest) ? [i] : [],
  )
}

/** The move that helps the answer most: moving it, or moving another answer across it. */
function bestMove(state: State, settings: Settings, shapes: Shape[][], behind: number, random: () => number) {
  let best: { answer: number; option: Option; shortfall: number } | undefined
  let bestValue = Infinity
  state.spots.forEach((spot, answer) => {
    if (!spot) return
    const old = { ...spot, crosses: [...state.partners[answer]], score: 0 }
    lift(state, answer)
    const options = crossingSpots(state, settings, answer, shapes[answer], answer === behind ? undefined : behind)
    for (const option of bestFew(options, random)) {
      put(state, answer, option)
      const after = shortfall(state)
      lift(state, answer)
      const value = after + random() * 0.5
      if (value < bestValue) {
        best = { answer, option, shortfall: after }
        bestValue = value
      }
    }
    put(state, answer, old)
  })
  return best
}

/** The three best options, give or take a little chance. */
function bestFew(options: Option[], random: () => number): Option[] {
  return options
    .map((option) => ({ option, value: option.score + random() * JITTER }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map(({ option }) => option)
}

/** The answer's shapes for one attempt: straight, bent on spaces, and a random pick of other bends. */
function shapesFor(answer: Answer, chars: string[], settings: Settings, random: () => number): Shape[] {
  // A bend on the first or last character changes nothing, and the layout ignores bends on wide spaces.
  const bendable = chars.flatMap((_, i) =>
    i > 0 && i < chars.length - 1 && !answer.wideSpaces.includes(i) ? [i] : [],
  )
  const sets = new Map<string, number[]>([['', []]])
  const add = (bends: number[]) => {
    if (settings.allowsBends(chars, bends)) sets.set(bends.join(), bends)
  }
  subsets(
    bendable.filter((i) => chars[i] === ' '),
    3,
  ).forEach(add)
  for (let tries = 0; sets.size <= BENT_SHAPES && tries < BENT_SHAPES * 4 && bendable.length > 0; tries++) {
    // Mostly one bend, sometimes more.
    let count = 1
    while (count < bendable.length && random() < 0.5) count++
    add(pickSome(bendable, count, random))
  }
  return [...sets.values()].flatMap((bends) =>
    (['right', 'down'] as const).map((dir) => makeShape(answer, chars, dir, bends, settings)),
  )
}

function makeShape(answer: Answer, chars: string[], dir: Dir, bends: number[], settings: Settings): Shape {
  // Answers read right or down, so the bends take turns between the two.
  const other: Dir = dir === 'right' ? 'down' : 'right'
  const turns = bends.map((atIndex, i) => ({ atIndex, dir: i % 2 === 0 ? other : dir }))
  const { pieces } = layoutAnswer({ ...answer, dir, turns }, { row: 0, col: 0 })
  const cells = pieces.map((piece, i): ShapeCell => {
    const step = STEP[piece.dir]
    const before = { row: piece.row - step.row, col: piece.col - step.col }
    const after = { row: piece.row + step.row, col: piece.col + step.col }
    return {
      row: piece.row,
      col: piece.col,
      char: piece.char,
      line: bends.includes(piece.index) ? 'corner' : piece.dir === 'right' ? 'across' : 'down',
      points: [...(i === 0 ? [before] : []), ...(i === pieces.length - 1 ? [after] : [])],
    }
  })
  return {
    dir,
    turns,
    bends,
    cells,
    rows: Math.max(0, ...cells.map((cell) => cell.row)) + 1,
    columns: Math.max(0, ...cells.map((cell) => cell.col)) + 1,
    score: settings.bendScore(chars, bends),
  }
}

/** Spots for the first answer, around the middle of the page. */
function middleSpots(state: State, shapes: Shape[], random: () => number): Option[] {
  const wobble = () => Math.floor(random() * 5) - 2
  return shapes.flatMap((shape) => {
    const start = {
      row: Math.floor((state.rows - shape.rows) / 2) + wobble(),
      col: Math.floor((state.columns - shape.columns) / 2) + wobble(),
    }
    return fits(state, { shape, start }) ? [{ shape, start, crosses: [], score: shape.score }] : []
  })
}

/** Every spot where the answer crosses answers already on the page, or crosses the answer `only`. */
function crossingSpots(state: State, settings: Settings, answer: number, shapes: Shape[], only?: number): Option[] {
  // The letters on the page that can still be crossed, by character.
  const letters = new Map<string, (CellRef & { line: Line })[]>()
  state.cells.forEach((entries, index) => {
    if (entries.length !== 1 || entries[0].char === ' ' || entries[0].line === 'corner') return
    if (only !== undefined && entries[0].answer !== only) return
    const { char, line } = entries[0]
    const cell = { row: Math.floor(index / state.columns), col: index % state.columns, line }
    const same = letters.get(char)
    if (same) same.push(cell)
    else letters.set(char, [cell])
  })

  const seen = new Set<string>()
  const options: Option[] = []
  shapes.forEach((shape, s) => {
    for (const cell of shape.cells) {
      for (const target of letters.get(cell.char) ?? []) {
        if (!perpendicular(cell.line, target.line)) continue
        const start = { row: target.row - cell.row, col: target.col - cell.col }
        const key = `${s},${start.row},${start.col}`
        if (seen.has(key)) continue
        seen.add(key)
        const option = optionAt(state, settings, answer, { shape, start })
        if (option) options.push(option)
      }
    }
  })
  return options
}

/** Random spots anywhere on the page, for an answer that can't cross anything. */
function freeSpots(state: State, settings: Settings, answer: number, shapes: Shape[], random: () => number): Option[] {
  const options: Option[] = []
  for (let i = 0; i < FREE_TRIES; i++) {
    const shape = shapes[Math.floor(random() * shapes.length)]
    const start = {
      row: Math.floor(random() * (state.rows - shape.rows + 1)),
      col: Math.floor(random() * (state.columns - shape.columns + 1)),
    }
    const option = optionAt(state, settings, answer, { shape, start })
    if (option) options.push(option)
  }
  return options
}

function optionAt(state: State, settings: Settings, answer: number, spot: Spot): Option | null {
  const crosses = fits(state, spot)
  const touches = crosses && contacts(state, settings, answer, spot)
  if (!crosses || touches === null) return null
  const needed = crosses.filter((other) => state.partners[other].size < state.needs[other]).length
  const score =
    CROSSING_SCORE * crosses.length + NEEDED_CROSSING_SCORE * needed + TOUCH_SCORE * touches + spot.shape.score
  return { ...spot, crosses, score }
}

/** The best option, give or take a little chance. */
function choose(options: Option[], random: () => number): Option | undefined {
  let best: Option | undefined
  let bestValue = -Infinity
  for (const option of options) {
    const value = option.score + random() * JITTER
    if (value > bestValue) {
      best = option
      bestValue = value
    }
  }
  return best
}

/**
 * The answers this spot crosses, or null when the answer doesn't fit there: it must stay on the
 * page, and only cross other answers at right angles on the same letter, away from bends.
 */
function fits(state: State, { shape, start }: Spot): number[] | null {
  if (
    start.row < 0 ||
    start.col < 0 ||
    start.row + shape.rows > state.rows ||
    start.col + shape.columns > state.columns
  ) {
    return null
  }
  const crosses: number[] = []
  for (const cell of shape.cells) {
    const entries = state.cells[(start.row + cell.row) * state.columns + start.col + cell.col]
    if (entries.length === 0) continue
    const [other] = entries
    if (entries.length > 1 || cell.char !== other.char || cell.char === ' ' || !perpendicular(cell.line, other.line)) {
      return null
    }
    if (!crosses.includes(other.answer)) crosses.push(other.answer)
  }
  return crosses
}

const perpendicular = (a: Line, b: Line) => a !== 'corner' && b !== 'corner' && a !== b

const sameCell = (a: CellRef, b: CellRef) => a.row === b.row && a.col === b.col

/**
 * How many places the answer would touch other answers besides where it crosses them, or null when
 * the rules don't allow one of them.
 */
function contacts(state: State, settings: Settings, answer: number, { shape, start }: Spot): number | null {
  let count = 0
  for (const [i, cell] of shape.cells.entries()) {
    const at = { row: start.row + cell.row, col: start.col + cell.col }
    const here = cellAt(state, at)
    for (const step of NEIGHBOURS) {
      const next = { row: at.row + step.row, col: at.col + step.col }
      // The answer's own characters before and after don't count.
      const own = [shape.cells[i - 1], shape.cells[i + 1]]
      if (own.some((c) => c && sameCell({ row: start.row + c.row, col: start.col + c.col }, next))) continue
      const there = cellAt(state, next)
      // Next to an answer it crosses is fine, as long as it's along that answer.
      if (there.length === 0 || there.some((entry) => here.some((crossed) => crossed.answer === entry.answer))) continue
      if (settings.touching === 'never') return null
      const meets = settings.touching === 'any' || endOn([...here, entryAt(answer, cell, start)], at, there, next)
      if (!meets) return null
      count++
    }
  }
  return count
}

/**
 * Whether two cells side by side meet end-on: an answer in one ends against the other, which holds
 * a single answer going at right angles to it.
 */
function endOn(a: Entry[], aCell: CellRef, b: Entry[], bCell: CellRef): boolean {
  const into = (from: Entry[], to: Entry[], toCell: CellRef) =>
    to.length === 1 &&
    from.some((entry) => entry.points.some((cell) => sameCell(cell, toCell)) && perpendicular(entry.line, to[0].line))
  return into(a, b, bCell) || into(b, a, aCell)
}

/** Every two cells side by side that hold different answers. */
function touchingPairs(state: State): (Separator & { endOn: boolean })[] {
  const pairs: (Separator & { endOn: boolean })[] = []
  state.cells.forEach((entries, index) => {
    if (entries.length === 0) return
    const a = { row: Math.floor(index / state.columns), col: index % state.columns }
    for (const b of [
      { row: a.row, col: a.col + 1 },
      { row: a.row + 1, col: a.col },
    ]) {
      const next = cellAt(state, b)
      if (next.length > 0 && !next.some((entry) => entries.some((own) => own.answer === entry.answer))) {
        pairs.push({ a, b, endOn: endOn(entries, a, next, b) })
      }
    }
  })
  return pairs
}

function cellAt(state: State, { row, col }: CellRef): Entry[] {
  if (row < 0 || col < 0 || row >= state.rows || col >= state.columns) return []
  return state.cells[row * state.columns + col]
}

/** The entry for one character of an answer starting at `start`. */
function entryAt(answer: number, { char, line, points }: ShapeCell, start: CellRef): Entry {
  return { answer, char, line, points: points.map((p) => ({ row: start.row + p.row, col: start.col + p.col })) }
}

function put(state: State, answer: number, { shape, start, crosses }: Option) {
  for (const cell of shape.cells) {
    state.cells[(start.row + cell.row) * state.columns + start.col + cell.col].push(entryAt(answer, cell, start))
  }
  state.spots[answer] = { shape, start }
  for (const other of crosses) {
    state.partners[answer].add(other)
    state.partners[other].add(answer)
  }
}

function lift(state: State, answer: number) {
  const spot = state.spots[answer]
  if (!spot) return
  for (const cell of spot.shape.cells) {
    const index = (spot.start.row + cell.row) * state.columns + spot.start.col + cell.col
    state.cells[index] = state.cells[index].filter((entry) => entry.answer !== answer)
  }
  for (const other of state.partners[answer]) state.partners[other].delete(answer)
  state.partners[answer].clear()
  state.spots[answer] = undefined
}

/** A finished attempt, moved to the middle of the page with thick borders where answers touch. */
function finish(puzzle: Puzzle, state: State): Found {
  const placements = puzzle.answers.map((answer, i) => {
    const { shape, start } = state.spots[i]!
    return { id: answer.id, start, dir: shape.dir, turns: shape.turns }
  })
  const placed = { ...puzzle, answers: puzzle.answers.map((answer, i) => ({ ...answer, ...placements[i] })) }
  const by = centerOffset(layoutPuzzle(placed), puzzleGrid(puzzle), puzzle.anagram.showNumbersAndBar) ?? {
    row: 0,
    col: 0,
  }
  const shift = (cell: CellRef) => ({ row: cell.row + by.row, col: cell.col + by.col })
  const centered = placements.map((placement) => ({ ...placement, start: shift(placement.start) }))
  return {
    state,
    placements: centered,
    separators: touchingPairs(state).map(({ a, b }) => ({ a: shift(a), b: shift(b) })),
    missing: missing(state),
    extraPieces: countPieces(state.partners) - state.minPieces,
    repeat: isCurrentLayout(puzzle, centered),
  }
}

function isCurrentLayout(puzzle: Puzzle, placements: Placement[]): boolean {
  return puzzle.answers.every((answer, i) => {
    const { start, dir, turns } = placements[i]
    return (
      answer.start?.row === start.row &&
      answer.start.col === start.col &&
      answer.dir === dir &&
      answer.turns.length === turns.length &&
      answer.turns.every((turn, t) => turn.atIndex === turns[t].atIndex && turn.dir === turns[t].dir)
    )
  })
}

/** Every non-empty choice of up to `max` items, in order. */
function subsets(items: number[], max: number): number[][] {
  const result: number[][] = []
  const grow = (from: number, picked: number[]) => {
    for (let i = from; i < items.length; i++) {
      const next = [...picked, items[i]]
      result.push(next)
      if (next.length < max) grow(i + 1, next)
    }
  }
  grow(0, [])
  return result
}

/** `count` different items picked at random, in order. */
function pickSome(items: number[], count: number, random: () => number): number[] {
  const pool = [...items]
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(random() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count).sort((a, b) => a - b)
}
