import { describe, expect, it } from 'vitest'
import type { Puzzle } from '../model/puzzle'
import { emptyPuzzle } from '../model/puzzle-reducer'
import { exportFileName, exportPlan, fileSlug } from './export-plan'

const puzzle: Puzzle = {
  ...emptyPuzzle,
  answers: [
    { id: 'a', text: 'THE BEATLES', start: { row: 0, col: 0 }, dir: 'right', turns: [], wideSpaces: [], visibleLetters: [] },
    { id: 'b', text: 'ABBA', start: null, dir: 'right', turns: [], wideSpaces: [], visibleLetters: [] },
    { id: 'c', text: 'HÅKAN HELLSTRÖM', start: { row: 2, col: 0 }, dir: 'right', turns: [], wideSpaces: [], visibleLetters: [] },
  ],
}

describe('exportPlan', () => {
  it('makes the print grid, then quiz and correction images for placed answers in list order, each starting with the empty grid', () => {
    const { images } = exportPlan(puzzle)
    expect(images).toEqual([
      { path: 'print-grid.png', part: 'print', label: 'Print grid', revealed: [] },
      { path: 'quiz/00-empty-grid.png', part: 'quiz', label: 'Empty grid', revealed: [] },
      {
        path: 'quiz/01-the-beatles.png',
        part: 'quiz',
        label: 'Question 1: THE BEATLES',
        revealed: [],
        highlightId: 'a',
      },
      {
        path: 'quiz/02-håkan-hellström.png',
        part: 'quiz',
        label: 'Question 2: HÅKAN HELLSTRÖM',
        revealed: [],
        highlightId: 'c',
      },
      { path: 'correction/00-empty-grid.png', part: 'correction', label: 'Empty grid', revealed: [] },
      { path: 'correction/01-the-beatles.png', part: 'correction', label: 'Answer 1: THE BEATLES', revealed: ['a'] },
      {
        path: 'correction/02-håkan-hellström.png',
        part: 'correction',
        label: 'Answer 2: HÅKAN HELLSTRÖM',
        revealed: ['a', 'c'],
      },
    ])
  })

  it('lists the answers that are left out because they are not on the grid', () => {
    expect(exportPlan(puzzle).leftOut.map((answer) => answer.text)).toEqual(['ABBA'])
  })

  it('makes only the print grid and the empty grids for a puzzle without placed answers', () => {
    expect(exportPlan(emptyPuzzle).images.map((image) => image.path)).toEqual([
      'print-grid.png',
      'quiz/00-empty-grid.png',
      'correction/00-empty-grid.png',
    ])
  })
})

describe('fileSlug', () => {
  it('keeps letters and digits and turns everything else into single dashes', () => {
    expect(fileSlug('AC/DC: "Back in Black"')).toBe('ac-dc-back-in-black')
    expect(fileSlug('U2')).toBe('u2')
    expect(fileSlug('?!')).toBe('answer')
  })
})

describe('exportFileName', () => {
  it('uses the puzzle name without characters Windows rejects', () => {
    expect(exportFileName('Quiz 18', 'zip')).toBe('Quiz 18.zip')
    expect(exportFileName('Quiz: 18/19?', 'pptx')).toBe('Quiz 18 19.pptx')
    expect(exportFileName('  ', 'zip')).toBe('crossword.zip')
  })
})
