import type { AnagramCell, Answer, CellRef, Dir, Puzzle, Separator, Turn } from './puzzle'
import { emptyPuzzle } from './puzzle-reducer'

export const STORAGE_KEY = 'crossword-crafter/puzzle'

/** Bump when the saved shape changes, and teach `parsePuzzle` to read the old one. */
const VERSION = 1

type SavedPuzzle = { version: number; puzzle: Puzzle }

export type ParseResult = { ok: true; puzzle: Puzzle } | { ok: false; error: string }

export function serializePuzzle(puzzle: Puzzle): string {
  const saved: SavedPuzzle = { version: VERSION, puzzle }
  return JSON.stringify(saved)
}

class InvalidPuzzle extends Error {}

function fail(message: string): never {
  throw new InvalidPuzzle(message)
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isInteger = (value: unknown): value is number => Number.isInteger(value)

const DIRS: Dir[] = ['right', 'down', 'left', 'up']

function readCell(value: unknown, where: string): CellRef {
  if (!isObject(value) || !isInteger(value.row) || !isInteger(value.col)) fail(`${where} is not a cell.`)
  return { row: value.row, col: value.col }
}

function readDir(value: unknown, where: string): Dir {
  if (!DIRS.includes(value as Dir)) fail(`${where} is not a direction.`)
  return value as Dir
}

function readArray(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) fail(`${where} is not a list.`)
  return value
}

function readAnswer(value: unknown, i: number): Answer {
  const where = `Answer ${i + 1}`
  if (!isObject(value)) fail(`${where} is not an answer.`)
  if (typeof value.id !== 'string' || value.id === '') fail(`${where} has no id.`)
  if (typeof value.text !== 'string') fail(`${where} has no text.`)
  const turns: Turn[] = readArray(value.turns ?? [], `${where}'s turns`).map((turn, t) => {
    if (!isObject(turn) || !isInteger(turn.atIndex)) fail(`${where} has a broken turn ${t + 1}.`)
    return { atIndex: turn.atIndex, dir: readDir(turn.dir, `${where}'s turn ${t + 1}`) }
  })
  const wideSpaces = readArray(value.wideSpaces ?? [], `${where}'s wide spaces`).map((index) => {
    if (!isInteger(index)) fail(`${where} has a broken wide space.`)
    return index
  })
  return {
    id: value.id,
    text: value.text,
    start: value.start === null || value.start === undefined ? null : readCell(value.start, `${where}'s start`),
    dir: readDir(value.dir ?? 'right', `${where}'s direction`),
    turns,
    wideSpaces,
  }
}

function readAnagramCell(value: unknown, i: number): AnagramCell {
  const where = `Anagram letter ${i + 1}`
  if (!isObject(value) || typeof value.answerId !== 'string' || !isInteger(value.letterIndex)) {
    fail(`${where} is broken.`)
  }
  if (value.number !== undefined && !isInteger(value.number)) fail(`${where} has a broken number.`)
  return { answerId: value.answerId, letterIndex: value.letterIndex, number: value.number }
}

function readSeparator(value: unknown, i: number): Separator {
  if (!isObject(value)) fail(`Thick border ${i + 1} is broken.`)
  return { a: readCell(value.a, `Thick border ${i + 1}`), b: readCell(value.b, `Thick border ${i + 1}`) }
}

function readPuzzle(value: unknown): Puzzle {
  if (!isObject(value)) fail('There is no puzzle in it.')
  const answers = readArray(value.answers, 'The answers').map(readAnswer)
  const ids = new Set(answers.map((answer) => answer.id))
  if (ids.size !== answers.length) fail('Two answers have the same id.')

  const anagram = isObject(value.anagram) ? value.anagram : {}
  return {
    answers,
    anagram: {
      showNumbersAndBar: anagram.showNumbersAndBar === true,
      cells: readArray(anagram.cells ?? [], 'The anagram letters').map(readAnagramCell),
    },
    separators: readArray(value.separators ?? [], 'The thick borders').map(readSeparator),
    highlightColor: typeof value.highlightColor === 'string' ? value.highlightColor : emptyPuzzle.highlightColor,
    includeStartArrow: value.includeStartArrow === true,
  }
}

/**
 * Reads a puzzle saved by `serializePuzzle`. Optional parts that are missing get their defaults;
 * anything malformed is rejected with a message Sammy can make sense of.
 */
export function parsePuzzle(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: "That isn't a saved puzzle. Copy it again with Copy state and paste all of it." }
  }
  try {
    if (!isObject(data) || !('version' in data)) fail("That isn't a saved puzzle.")
    if (data.version !== VERSION) fail(`It was saved by a version of the app this one can't read (${String(data.version)}).`)
    return { ok: true, puzzle: readPuzzle(data.puzzle) }
  } catch (error) {
    if (error instanceof InvalidPuzzle) return { ok: false, error: error.message }
    throw error
  }
}

/** The autosaved puzzle, or null when there is none or it can't be read. Never throws. */
export function loadSavedPuzzle(storage: Pick<Storage, 'getItem'> | undefined): Puzzle | null {
  try {
    const text = storage?.getItem(STORAGE_KEY)
    if (!text) return null
    const result = parsePuzzle(text)
    return result.ok ? result.puzzle : null
  } catch {
    return null
  }
}

/** Saves the puzzle for next time. Returns false when the browser won't store it. */
export function savePuzzle(storage: Pick<Storage, 'setItem'> | undefined, puzzle: Puzzle): boolean {
  try {
    storage?.setItem(STORAGE_KEY, serializePuzzle(puzzle))
    return storage !== undefined
  } catch {
    return false
  }
}
