import { arrayMove } from '@dnd-kit/sortable'
import { groupsAfterRemoving, normalizeGroups } from './groups'
import { DEFAULT_CELL_SIZE_MM } from './page'
import type { AnagramCell, AnswerGroup, Answer, CellRef, Dir, Puzzle, Separator } from './puzzle'

export const emptyPuzzle: Puzzle = {
  answers: [],
  anagram: { showNumbersAndBar: false, cells: [] },
  separators: [],
  groups: [],
  highlightColor: '#1e88e5',
  includeStartArrow: false,
  cellSizeMm: DEFAULT_CELL_SIZE_MM,
}

export type PuzzleAction =
  | { type: 'load'; puzzle: Puzzle }
  /** Ids are passed in so the reducer stays pure. */
  | { type: 'import'; answers: { id: string; text: string }[] }
  | { type: 'place'; id: string; start: CellRef }
  | { type: 'unplace'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'reorder'; fromId: string; toId: string }
  | { type: 'toggle-direction'; id: string }
  /** Changes an answer's text. Turns, wide spaces and anagram letters that no longer fit are dropped. */
  | { type: 'set-text'; id: string; text: string }
  /** A null `dir` removes the turn at that letter. */
  | { type: 'set-turn'; id: string; atIndex: number; dir: Dir | null }
  | { type: 'toggle-wide-space'; id: string; index: number }
  | { type: 'toggle-anagram-cell'; answerId: string; letterIndex: number }
  | { type: 'set-anagram-number'; answerId: string; letterIndex: number; number: number | undefined }
  /** Numbers the anagram cells 1, 2, 3… in the given order. */
  | { type: 'renumber-anagram'; order: { answerId: string; letterIndex: number }[] }
  | { type: 'set-show-anagram-numbers'; value: boolean }
  | { type: 'toggle-separator'; separator: Separator }
  | { type: 'set-highlight-color'; color: string }
  | { type: 'set-include-start-arrow'; value: boolean }
  /** Answers keep their cells, counted from the top left, so ones near the edge can end up outside. */
  | { type: 'set-cell-size'; cellSizeMm: number }
  /** Starts a new group at the answer with this list index. */
  | { type: 'add-group'; start: number; color: string }
  | { type: 'remove-group'; start: number }
  | { type: 'set-group-color'; start: number; color: string }
  | { type: 'set-group-name'; start: number; name: string }

const sameAnagramCell = (a: AnagramCell, b: { answerId: string; letterIndex: number }) =>
  a.answerId === b.answerId && a.letterIndex === b.letterIndex

const sameCell = (a: CellRef, b: CellRef) => a.row === b.row && a.col === b.col

const sameSeparator = (a: Separator, b: Separator) =>
  (sameCell(a.a, b.a) && sameCell(a.b, b.b)) || (sameCell(a.a, b.b) && sameCell(a.b, b.a))

function toggle(values: number[], value: number): number[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value].sort((a, b) => a - b)
}

function updateAnagramCells(puzzle: Puzzle, update: (cells: AnagramCell[]) => AnagramCell[]): Puzzle {
  return { ...puzzle, anagram: { ...puzzle.anagram, cells: update(puzzle.anagram.cells) } }
}

function updateGroup(puzzle: Puzzle, start: number, update: (group: AnswerGroup) => AnswerGroup): Puzzle {
  return { ...puzzle, groups: puzzle.groups.map((group) => (group.start === start ? update(group) : group)) }
}

function updateAnswer(puzzle: Puzzle, id: string, update: (answer: Answer) => Answer): Puzzle {
  return { ...puzzle, answers: puzzle.answers.map((answer) => (answer.id === id ? update(answer) : answer)) }
}

export function puzzleReducer(puzzle: Puzzle, action: PuzzleAction): Puzzle {
  switch (action.type) {
    case 'load':
      return action.puzzle

    case 'import':
      return {
        ...puzzle,
        answers: [
          ...puzzle.answers,
          ...action.answers.map(({ id, text }) => ({
            id,
            text,
            start: null,
            dir: 'right' as const,
            turns: [],
            wideSpaces: [],
          })),
        ],
      }

    case 'place':
      return updateAnswer(puzzle, action.id, (answer) => ({ ...answer, start: action.start }))

    case 'unplace':
      return updateAnswer(puzzle, action.id, (answer) => ({ ...answer, start: null }))

    case 'remove': {
      const index = puzzle.answers.findIndex((answer) => answer.id === action.id)
      if (index < 0) return puzzle
      const answers = puzzle.answers.filter((answer) => answer.id !== action.id)
      return {
        ...puzzle,
        answers,
        groups: groupsAfterRemoving(puzzle.groups, index, answers.length),
        anagram: {
          ...puzzle.anagram,
          cells: puzzle.anagram.cells.filter((cell) => cell.answerId !== action.id),
        },
      }
    }

    case 'reorder': {
      const from = puzzle.answers.findIndex((answer) => answer.id === action.fromId)
      const to = puzzle.answers.findIndex((answer) => answer.id === action.toId)
      if (from < 0 || to < 0 || from === to) return puzzle
      return { ...puzzle, answers: arrayMove(puzzle.answers, from, to) }
    }

    case 'toggle-direction':
      return updateAnswer(puzzle, action.id, (answer) => ({
        ...answer,
        dir: answer.dir === 'right' ? 'down' : 'right',
      }))

    case 'set-text': {
      const isLetter = (index: number) => index < action.text.length && action.text[index] !== ' '
      const edited = updateAnswer(puzzle, action.id, (answer) => ({
        ...answer,
        text: action.text,
        turns: answer.turns.filter((turn) => turn.atIndex < action.text.length - 1),
        wideSpaces: answer.wideSpaces.filter((index) => action.text[index] === ' '),
      }))
      return updateAnagramCells(edited, (cells) =>
        cells.filter((cell) => cell.answerId !== action.id || isLetter(cell.letterIndex)),
      )
    }

    case 'set-turn':
      return updateAnswer(puzzle, action.id, (answer) => {
        const turns = answer.turns.filter((turn) => turn.atIndex !== action.atIndex)
        if (action.dir) turns.push({ atIndex: action.atIndex, dir: action.dir })
        return { ...answer, turns: turns.sort((a, b) => a.atIndex - b.atIndex) }
      })

    case 'toggle-wide-space':
      return updateAnswer(puzzle, action.id, (answer) => ({
        ...answer,
        wideSpaces: toggle(answer.wideSpaces, action.index),
      }))

    case 'toggle-anagram-cell':
      return updateAnagramCells(puzzle, (cells) => {
        if (cells.some((cell) => sameAnagramCell(cell, action))) {
          return cells.filter((cell) => !sameAnagramCell(cell, action))
        }
        // New cells get the next free number. Sammy can change it afterwards.
        const next = Math.max(0, ...cells.map((cell) => cell.number ?? 0)) + 1
        return [...cells, { answerId: action.answerId, letterIndex: action.letterIndex, number: next }]
      })

    case 'set-anagram-number':
      return updateAnagramCells(puzzle, (cells) =>
        cells.map((cell) => (sameAnagramCell(cell, action) ? { ...cell, number: action.number } : cell)),
      )

    case 'renumber-anagram':
      return updateAnagramCells(puzzle, (cells) =>
        cells.map((cell) => {
          const position = action.order.findIndex((ref) => sameAnagramCell(cell, ref))
          return position < 0 ? cell : { ...cell, number: position + 1 }
        }),
      )

    case 'set-show-anagram-numbers':
      return { ...puzzle, anagram: { ...puzzle.anagram, showNumbersAndBar: action.value } }

    case 'toggle-separator': {
      const exists = puzzle.separators.some((separator) => sameSeparator(separator, action.separator))
      return {
        ...puzzle,
        separators: exists
          ? puzzle.separators.filter((separator) => !sameSeparator(separator, action.separator))
          : [...puzzle.separators, action.separator],
      }
    }

    case 'set-highlight-color':
      return { ...puzzle, highlightColor: action.color }

    case 'set-include-start-arrow':
      return { ...puzzle, includeStartArrow: action.value }

    case 'set-cell-size':
      return { ...puzzle, cellSizeMm: action.cellSizeMm }

    case 'add-group':
      if (puzzle.groups.some((group) => group.start === action.start)) return puzzle
      return {
        ...puzzle,
        groups: normalizeGroups(
          [...puzzle.groups, { start: action.start, name: '', color: action.color }],
          puzzle.answers.length,
        ),
      }

    case 'remove-group':
      return { ...puzzle, groups: puzzle.groups.filter((group) => group.start !== action.start) }

    case 'set-group-color':
      return updateGroup(puzzle, action.start, (group) => ({ ...group, color: action.color }))

    case 'set-group-name':
      return updateGroup(puzzle, action.start, (group) => ({ ...group, name: action.name }))
  }
}
