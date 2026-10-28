import type { AnagramCell, CellRef, Puzzle } from '../model/puzzle'
import type { Layout } from './layout'

/** A letter of an answer that could be an anagram letter. */
type Candidate = {
  answerId: string
  letterIndex: number
  char: string
  /** Every answer through its cell: two where answers cross. */
  answers: string[]
  /** Null for an answer that isn't on the grid. */
  cell: CellRef | null
  /** Drawn in every image already. */
  visible: boolean
}

export type AnagramPick =
  | {
      ok: true
      /** Numbered left to right, then the letters of answers off the grid, in list order. */
      cells: AnagramCell[]
      /** Answers that give more than one letter, because too few answers have the letters. */
      shared: { answerId: string; letters: number }[]
    }
  | {
      ok: false
      /** Letters the answers don't have enough of. */
      missing: { char: string; needed: number; found: number }[]
    }

/** Steps the search takes before it settles for the best letters it has found. */
const SEARCH_LIMIT = 50_000

/**
 * Picks a letter in the answers for each letter of `anagram`, ignoring spaces, so that as few
 * answers as possible give more than one. A letter where two answers cross counts for both. Among
 * equally good picks it avoids letters on crossings, then letters that are always visible, and
 * otherwise picks at random.
 */
export function pickAnagram(puzzle: Puzzle, layout: Layout, anagram: string, random = Math.random): AnagramPick {
  const letters = Array.from(anagram.toUpperCase()).filter((char) => char.trim() !== '')
  const byChar = new Map<string, Candidate[]>()
  for (const candidate of candidates(puzzle, layout, new Set(letters))) {
    byChar.set(candidate.char, [...(byChar.get(candidate.char) ?? []), candidate])
  }
  for (const list of byChar.values()) shuffle(list, random)

  const needed = new Map<string, number>()
  for (const char of letters) needed.set(char, (needed.get(char) ?? 0) + 1)
  const missing = [...needed]
    .map(([char, count]) => ({ char, needed: count, found: byChar.get(char)?.length ?? 0 }))
    .filter(({ needed, found }) => found < needed)
  if (missing.length > 0) return { ok: false, missing }

  // The scarcest letters first, as they have the fewest places to go.
  const order = [...letters].sort((a, b) => byChar.get(a)!.length - byChar.get(b)!.length)
  const unavoidable = order.length - mostFromDifferentAnswers(order, byChar)

  const used = new Map<string, number>()
  const taken = new Set<Candidate>()
  const picked: Candidate[] = []
  let best: { picks: Candidate[]; extra: number; cost: number } | undefined
  let steps = 0

  /** Searches on from the `i`th letter. True when the search is done. */
  function search(i: number, extra: number, cost: number): boolean {
    if (best && (extra > best.extra || (extra === best.extra && cost >= best.cost))) return false
    if (i === order.length) {
      best = { picks: [...picked], extra, cost }
      return extra === unavoidable && cost === 0
    }
    if (++steps > SEARCH_LIMIT) return true
    const options = byChar
      .get(order[i])!
      .filter((candidate) => !taken.has(candidate))
      .map((candidate) => ({
        candidate,
        // Each answer it is in that already gives a letter.
        extra: candidate.answers.filter((id) => (used.get(id) ?? 0) > 0).length,
        cost: candidate.answers.length - 1 + (candidate.visible ? 2 : 0),
      }))
      .sort((a, b) => a.extra - b.extra || a.cost - b.cost)
    for (const option of options) {
      const { candidate } = option
      taken.add(candidate)
      picked.push(candidate)
      for (const id of candidate.answers) used.set(id, (used.get(id) ?? 0) + 1)
      const done = search(i + 1, extra + option.extra, cost + option.cost)
      for (const id of candidate.answers) used.set(id, used.get(id)! - 1)
      picked.pop()
      taken.delete(candidate)
      if (done) return true
    }
    return false
  }
  search(0, 0, 0)

  const listIndex = new Map(puzzle.answers.map((answer, i) => [answer.id, i]))
  const picks = [...(best?.picks ?? [])].sort((a, b) =>
    a.cell && b.cell
      ? a.cell.col - b.cell.col || a.cell.row - b.cell.row
      : a.cell
        ? -1
        : b.cell
          ? 1
          : listIndex.get(a.answerId)! - listIndex.get(b.answerId)! || a.letterIndex - b.letterIndex,
  )
  const letterCount = new Map<string, number>()
  for (const id of picks.flatMap((pick) => pick.answers)) letterCount.set(id, (letterCount.get(id) ?? 0) + 1)
  return {
    ok: true,
    cells: picks.map(({ answerId, letterIndex }, i) => ({ answerId, letterIndex, number: i + 1 })),
    shared: puzzle.answers
      .map((answer) => ({ answerId: answer.id, letters: letterCount.get(answer.id) ?? 0 }))
      .filter(({ letters }) => letters > 1),
  }
}

/** The letters of every answer that are among `chars`: one per cell on the grid. */
function candidates(puzzle: Puzzle, layout: Layout, chars: Set<string>): Candidate[] {
  const result: Candidate[] = []
  for (const pieces of layout.cells.values()) {
    const answers = [...new Set(pieces.map((piece) => piece.answerId))]
    for (const char of new Set(pieces.map((piece) => piece.char))) {
      const piece = pieces.find((p) => p.char === char && p.kind === 'letter')
      if (!piece || !chars.has(char)) continue
      const { answerId, index, row, col } = piece
      result.push({ answerId, letterIndex: index, char, answers, cell: { row, col }, visible: !!piece.alwaysVisible })
    }
  }
  for (const answer of puzzle.answers) {
    if (answer.start) continue
    Array.from(answer.text).forEach((char, index) => {
      if (char === ' ' || !chars.has(char)) return
      const visible = answer.visibleLetters.includes(index)
      result.push({ answerId: answer.id, letterIndex: index, char, answers: [answer.id], cell: null, visible })
    })
  }
  return result
}

/**
 * How many of the letters can each come from a different answer, by matching letters to answers.
 * The rest have to share an answer whatever the search picks.
 */
function mostFromDifferentAnswers(letters: string[], byChar: Map<string, Candidate[]>): number {
  const answersWith = new Map(
    [...byChar].map(([char, list]) => [char, [...new Set(list.flatMap((candidate) => candidate.answers))]]),
  )
  const letterOf = new Map<string, number>()
  const match = (i: number, tried: Set<string>): boolean =>
    answersWith.get(letters[i])!.some((answer) => {
      if (tried.has(answer)) return false
      tried.add(answer)
      const other = letterOf.get(answer)
      if (other !== undefined && !match(other, tried)) return false
      letterOf.set(answer, i)
      return true
    })
  return letters.filter((_, i) => match(i, new Set())).length
}

function shuffle<T>(items: T[], random: () => number) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
}
