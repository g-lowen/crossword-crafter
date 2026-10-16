import { arrayMove } from '@dnd-kit/sortable'
import type { Answer, CellRef, Puzzle } from './puzzle'

export const emptyPuzzle: Puzzle = {
  answers: [],
  anagram: { showNumbersAndBar: false, cells: [] },
  separators: [],
  highlightColor: '#1e88e5',
  includeStartArrow: false,
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

    case 'remove':
      return {
        ...puzzle,
        answers: puzzle.answers.filter((answer) => answer.id !== action.id),
        anagram: {
          ...puzzle.anagram,
          cells: puzzle.anagram.cells.filter((cell) => cell.answerId !== action.id),
        },
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
  }
}
