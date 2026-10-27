import { puzzleGrid, type GridSize } from '../model/page'
import type { Answer, CellRef, Dir, Puzzle } from '../model/puzzle'

const STEP: Record<Dir, CellRef> = {
  right: { row: 0, col: 1 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  up: { row: -1, col: 0 },
}

const OPPOSITE: Record<Dir, Dir> = { right: 'left', left: 'right', down: 'up', up: 'down' }

export function cellKey(cell: CellRef): string {
  return `${cell.row},${cell.col}`
}

function move(cell: CellRef, dir: Dir): CellRef {
  return { row: cell.row + STEP[dir].row, col: cell.col + STEP[dir].col }
}

/** One character of an answer placed in one cell. A wide space produces two pieces. */
export type Piece = CellRef & {
  answerId: string
  index: number
  kind: 'letter' | 'space'
  char: string
  /** The reading direction at this cell, before any turn here. */
  dir: Dir
  /** Set on both cells of a wide space. */
  widePart?: 0 | 1
  /** A letter drawn in every image, even the empty grid. */
  alwaysVisible?: true
}

export type StartMarker = { answerId: string; cell: CellRef; dir: Dir }

export type TurnMarker = { answerId: string; cell: CellRef; from: Dir; to: Dir }

export type WideSpaceBlock = {
  answerId: string
  index: number
  cells: [CellRef, CellRef]
  dir: Dir
}

export type ResolvedAnagramCell = { cell: CellRef; answerId: string; letterIndex: number; number?: number }

export type LayoutIssue =
  | { type: 'out-of-bounds'; answerId: string; cell: CellRef }
  | { type: 'conflict'; cell: CellRef; answerIds: string[] }
  | {
      type: 'invalid-turn'
      answerId: string
      atIndex: number
      reason: 'out-of-range' | 'not-a-turn' | 'on-wide-space' | 'duplicate'
    }
  | { type: 'invalid-wide-space'; answerId: string; index: number }
  | {
      type: 'invalid-anagram-cell'
      answerId: string
      letterIndex: number
      reason: 'missing-answer' | 'out-of-range' | 'not-a-letter'
    }
  | { type: 'duplicate-anagram-number'; number: number }

export type AnswerPath = {
  pieces: Piece[]
  startMarker: StartMarker
  turnMarkers: TurnMarker[]
  wideSpaceBlocks: WideSpaceBlock[]
  issues: LayoutIssue[]
}

/** Lays out a single answer from its start cell, following turns and wide spaces. */
export function layoutAnswer(answer: Answer, start: CellRef): AnswerPath {
  const chars = Array.from(answer.text)
  const pieces: Piece[] = []
  const turnMarkers: TurnMarker[] = []
  const wideSpaceBlocks: WideSpaceBlock[] = []
  const issues: LayoutIssue[] = []

  const wideSpaces = new Set<number>()
  for (const index of answer.wideSpaces) {
    if (chars[index] === ' ') wideSpaces.add(index)
    else issues.push({ type: 'invalid-wide-space', answerId: answer.id, index })
  }

  const visibleLetters = new Set(answer.visibleLetters)

  const turns = new Map<number, Dir>()
  for (const turn of answer.turns) {
    const reason =
      turn.atIndex < 0 || turn.atIndex >= chars.length - 1
        ? 'out-of-range'
        : turns.has(turn.atIndex)
          ? 'duplicate'
          : wideSpaces.has(turn.atIndex)
            ? 'on-wide-space'
            : undefined
    if (reason) issues.push({ type: 'invalid-turn', answerId: answer.id, atIndex: turn.atIndex, reason })
    else turns.set(turn.atIndex, turn.dir)
  }

  let cell = start
  let dir = answer.dir

  chars.forEach((char, index) => {
    const kind = char === ' ' ? 'space' : 'letter'

    if (wideSpaces.has(index)) {
      const second = move(cell, dir)
      pieces.push({ ...cell, answerId: answer.id, index, kind, char, dir, widePart: 0 })
      pieces.push({ ...second, answerId: answer.id, index, kind, char, dir, widePart: 1 })
      wideSpaceBlocks.push({ answerId: answer.id, index, cells: [cell, second], dir })
      cell = second
    } else {
      const alwaysVisible = kind === 'letter' && visibleLetters.has(index) ? { alwaysVisible: true as const } : {}
      pieces.push({ ...cell, answerId: answer.id, index, kind, char, dir, ...alwaysVisible })
    }

    const turnDir = turns.get(index)
    if (turnDir !== undefined) {
      if (turnDir === dir || turnDir === OPPOSITE[dir]) {
        issues.push({ type: 'invalid-turn', answerId: answer.id, atIndex: index, reason: 'not-a-turn' })
      } else {
        turnMarkers.push({ answerId: answer.id, cell, from: dir, to: turnDir })
        dir = turnDir
      }
    }

    cell = move(cell, dir)
  })

  return {
    pieces,
    startMarker: { answerId: answer.id, cell: start, dir: answer.dir },
    turnMarkers,
    wideSpaceBlocks,
    issues,
  }
}

export type Layout = {
  /** Pieces per cell, keyed by `cellKey`. A cell has more than one piece where answers cross. */
  cells: Map<string, Piece[]>
  startMarkers: StartMarker[]
  turnMarkers: TurnMarker[]
  wideSpaceBlocks: WideSpaceBlock[]
  anagramCells: ResolvedAnagramCell[]
  issues: LayoutIssue[]
}

/** Computes every cell of the puzzle from its answers. Unplaced answers are skipped. */
export function layoutPuzzle(puzzle: Puzzle, grid: GridSize = puzzleGrid(puzzle)): Layout {
  const cells = new Map<string, Piece[]>()
  const startMarkers: StartMarker[] = []
  const turnMarkers: TurnMarker[] = []
  const wideSpaceBlocks: WideSpaceBlock[] = []
  const issues: LayoutIssue[] = []
  const piecesByAnswer = new Map<string, Piece[]>()

  for (const answer of puzzle.answers) {
    if (!answer.start) continue
    const path = layoutAnswer(answer, answer.start)

    startMarkers.push(path.startMarker)
    turnMarkers.push(...path.turnMarkers)
    wideSpaceBlocks.push(...path.wideSpaceBlocks)
    issues.push(...path.issues)
    piecesByAnswer.set(answer.id, path.pieces)

    for (const piece of path.pieces) {
      if (piece.row < 0 || piece.row >= grid.rows || piece.col < 0 || piece.col >= grid.columns) {
        issues.push({ type: 'out-of-bounds', answerId: answer.id, cell: { row: piece.row, col: piece.col } })
      }
      const key = cellKey(piece)
      const existing = cells.get(key)
      if (existing) existing.push(piece)
      else cells.set(key, [piece])
    }
  }

  for (const pieces of cells.values()) {
    if (pieces.length < 2) continue
    const chars = new Set(pieces.map((piece) => piece.char))
    const answerIds = new Set(pieces.map((piece) => piece.answerId))
    // Crossing answers must agree on the character. An answer may not cross itself.
    if (chars.size > 1 || answerIds.size < pieces.length) {
      issues.push({ type: 'conflict', cell: { row: pieces[0].row, col: pieces[0].col }, answerIds: [...answerIds] })
    }
  }

  const answersById = new Map(puzzle.answers.map((answer) => [answer.id, answer]))
  const anagramCells: ResolvedAnagramCell[] = []
  const seenNumbers = new Set<number>()

  for (const ref of puzzle.anagram.cells) {
    const answer = answersById.get(ref.answerId)
    if (!answer) {
      issues.push({ type: 'invalid-anagram-cell', ...ref, reason: 'missing-answer' })
      continue
    }
    const char = Array.from(answer.text)[ref.letterIndex]
    if (char === undefined) {
      issues.push({ type: 'invalid-anagram-cell', ...ref, reason: 'out-of-range' })
      continue
    }
    if (char === ' ') {
      issues.push({ type: 'invalid-anagram-cell', ...ref, reason: 'not-a-letter' })
      continue
    }
    if (ref.number !== undefined) {
      if (seenNumbers.has(ref.number)) issues.push({ type: 'duplicate-anagram-number', number: ref.number })
      seenNumbers.add(ref.number)
    }

    // An unplaced answer has no pieces, so its anagram cells are simply not shown.
    const piece = piecesByAnswer.get(answer.id)?.find((p) => p.index === ref.letterIndex)
    if (piece) {
      anagramCells.push({
        cell: { row: piece.row, col: piece.col },
        answerId: ref.answerId,
        letterIndex: ref.letterIndex,
        number: ref.number,
      })
    }
  }

  return { cells, startMarkers, turnMarkers, wideSpaceBlocks, anagramCells, issues }
}
