import { UNTITLED, createLibrary, type Library, type LibraryEntry } from './library'
import { normalizeGroups } from './groups'
import type { AnagramCell, Answer, AnswerGroup, CellRef, Dir, Puzzle, Separator, Turn } from './puzzle'
import { CELL_SIZES_MM, DEFAULT_CELL_SIZE_MM } from './page'
import { emptyPuzzle } from './puzzle-reducer'

/** Where the single autosaved puzzle lived before there was a puzzle list. Read once, to carry it over. */
export const STORAGE_KEY = 'crossword-crafter/puzzle'
export const LIBRARY_KEY = 'crossword-crafter/library'

/** Bump when a saved shape changes, and teach the parsers to read the old one. */
const VERSION = 1

type SavedPuzzle = { version: number; name?: string; puzzle: Puzzle }

export type ParseResult = { ok: true; puzzle: Puzzle; name?: string } | { ok: false; error: string }

/** The text Copy state puts on the clipboard. */
export function serializePuzzle(puzzle: Puzzle, name?: string): string {
  const saved: SavedPuzzle = { version: VERSION, name, puzzle }
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

function readGroup(value: unknown, i: number): AnswerGroup {
  if (!isObject(value) || !isInteger(value.start) || typeof value.color !== 'string') fail(`Group ${i + 1} is broken.`)
  return { start: value.start, name: typeof value.name === 'string' ? value.name : '', color: value.color }
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
    groups: normalizeGroups(readArray(value.groups ?? [], 'The groups').map(readGroup), answers.length),
    highlightColor: typeof value.highlightColor === 'string' ? value.highlightColor : emptyPuzzle.highlightColor,
    includeStartArrow: value.includeStartArrow === true,
    // Puzzles from before cells could be smaller have 1 cm cells.
    cellSizeMm: CELL_SIZES_MM.includes(value.cellSizeMm as number) ? (value.cellSizeMm as number) : DEFAULT_CELL_SIZE_MM,
  }
}

/**
 * Reads a puzzle copied with `serializePuzzle`. Optional parts that are missing get their defaults;
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
    const name = typeof data.name === 'string' && data.name.trim() !== '' ? data.name : undefined
    return { ok: true, puzzle: readPuzzle(data.puzzle), name }
  } catch (error) {
    if (error instanceof InvalidPuzzle) return { ok: false, error: error.message }
    throw error
  }
}

type SavedLibrary = { version: number; library: Library }

export function serializeLibrary(library: Library): string {
  const saved: SavedLibrary = { version: VERSION, library }
  return JSON.stringify(saved)
}

function readLibrary(value: unknown): Library {
  if (!isObject(value)) fail('There is no puzzle list in it.')
  const entries = readArray(value.entries, 'The puzzle list').map((entry, i): LibraryEntry => {
    if (!isObject(entry) || typeof entry.id !== 'string' || typeof entry.name !== 'string') {
      fail(`Puzzle ${i + 1} is broken.`)
    }
    return {
      id: entry.id,
      name: entry.name,
      updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : new Date(0).toISOString(),
      puzzle: readPuzzle(entry.puzzle),
    }
  })
  if (entries.length === 0) fail('The puzzle list is empty.')
  const currentId = entries.some((entry) => entry.id === value.currentId) ? (value.currentId as string) : entries[0].id
  return { currentId, entries }
}

function parseLibrary(text: string): Library | null {
  try {
    const data: unknown = JSON.parse(text)
    if (!isObject(data) || data.version !== VERSION) return null
    return readLibrary(data.library)
  } catch {
    return null
  }
}

/**
 * The saved puzzle list. Before the list existed only one puzzle was saved, under STORAGE_KEY; that
 * one becomes the first entry. With nothing saved, starts a list with one empty puzzle. Never throws.
 */
export function loadLibrary(storage: Pick<Storage, 'getItem'> | undefined, newId: string, now: string): Library {
  const read = (key: string) => {
    try {
      return storage?.getItem(key) ?? null
    } catch {
      return null
    }
  }

  const libraryText = read(LIBRARY_KEY)
  const library = libraryText ? parseLibrary(libraryText) : null
  if (library) return library

  const puzzleText = read(STORAGE_KEY)
  const old = puzzleText ? parsePuzzle(puzzleText) : null
  if (old?.ok) return createLibrary(newId, now, UNTITLED, old.puzzle)

  return createLibrary(newId, now)
}

/** Saves the puzzle list for next time. Returns false when the browser won't store it. */
export function saveLibrary(storage: Pick<Storage, 'setItem'> | undefined, library: Library): boolean {
  try {
    storage?.setItem(LIBRARY_KEY, serializeLibrary(library))
    return storage !== undefined
  } catch {
    return false
  }
}
