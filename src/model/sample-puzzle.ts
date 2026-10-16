import type { Puzzle } from './puzzle'

/** A small puzzle that shows every feature. Used until answers can be imported. */
export const samplePuzzle: Puzzle = {
  answers: [
    { id: 'beatles', text: 'THE BEATLES', start: { row: 2, col: 2 }, dir: 'right', turns: [], wideSpaces: [] },
    { id: 'abba', text: 'ABBA', start: { row: 2, col: 8 }, dir: 'down', turns: [], wideSpaces: [] },
    { id: 'madonna', text: 'MADONNA', start: { row: 5, col: 7 }, dir: 'right', turns: [], wideSpaces: [] },
    { id: 'sting', text: 'STING', start: { row: 2, col: 12 }, dir: 'down', turns: [], wideSpaces: [] },
    { id: 'queen', text: 'QUEEN', start: { row: 6, col: 13 }, dir: 'right', turns: [], wideSpaces: [] },
    {
      id: 'pink-floyd',
      text: 'PINK FLOYD',
      start: { row: 8, col: 2 },
      dir: 'right',
      turns: [{ atIndex: 5, dir: 'down' }],
      wideSpaces: [4],
    },
  ],
  anagram: {
    showNumbersAndBar: true,
    cells: [
      { answerId: 'beatles', letterIndex: 0, number: 1 },
      { answerId: 'madonna', letterIndex: 3, number: 2 },
      { answerId: 'pink-floyd', letterIndex: 7, number: 3 },
    ],
  },
  separators: [{ a: { row: 6, col: 12 }, b: { row: 6, col: 13 } }],
  highlightColor: '#1e88e5',
  includeStartArrow: false,
}
