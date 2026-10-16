import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { layoutPuzzle } from '../layout/layout'
import type { Answer, Puzzle } from '../model/puzzle'
import { GridView } from './grid-view'

function answer(overrides: Partial<Answer> & Pick<Answer, 'id' | 'text'>): Answer {
  return { start: { row: 0, col: 0 }, dir: 'right', turns: [], wideSpaces: [], ...overrides }
}

function puzzle(overrides: Partial<Puzzle>): Puzzle {
  return {
    answers: [],
    anagram: { showNumbersAndBar: false, cells: [] },
    separators: [],
    highlightColor: '#1e88e5',
    includeStartArrow: false,
    ...overrides,
  }
}

function renderGrid(p: Puzzle, options: { mode?: 'editor' | 'export'; showLetters?: boolean } = {}) {
  const { container } = render(
    <GridView
      puzzle={p}
      layout={layoutPuzzle(p)}
      mode={options.mode ?? 'editor'}
      showLetters={options.showLetters ?? true}
    />,
  )
  return {
    svg: container.querySelector('svg')!,
    all: (selector: string) => container.querySelectorAll(selector),
  }
}

describe('GridView', () => {
  it('is A4 landscape in millimetres', () => {
    const { svg } = renderGrid(puzzle({}))
    expect(svg.getAttribute('viewBox')).toBe('0 0 290 210')
    expect(svg.getAttribute('width')).toBe('290mm')
  })

  it('draws letter cells, space cells and letters, counting crossings once', () => {
    const { all } = renderGrid(
      puzzle({
        answers: [
          answer({ id: 'a', text: 'A BC', start: { row: 1, col: 0 } }),
          answer({ id: 'b', text: 'XC', start: { row: 0, col: 3 }, dir: 'down' }),
        ],
      }),
    )
    expect(all('[data-cell-kind="letter"]')).toHaveLength(4)
    expect(all('[data-cell-kind="space"]')).toHaveLength(1)
    expect([...all('[data-letter]')].map((el) => el.textContent).sort()).toEqual(['A', 'B', 'C', 'X'])
  })

  it('hides letters for the skeleton', () => {
    const { all } = renderGrid(puzzle({ answers: [answer({ id: 'a', text: 'ABC' })] }), { showLetters: false })
    expect(all('[data-cell-kind="letter"]')).toHaveLength(3)
    expect(all('[data-letter]')).toHaveLength(0)
  })

  it('draws a wide space as one block instead of two cells', () => {
    const { all } = renderGrid(puzzle({ answers: [answer({ id: 'a', text: 'A B', wideSpaces: [1] })] }))
    expect(all('[data-wide-space]')).toHaveLength(1)
    expect(all('[data-cell-kind="space"]')).toHaveLength(0)
  })

  it('draws turn markers and separators', () => {
    const { all } = renderGrid(
      puzzle({
        answers: [answer({ id: 'a', text: 'ABC', turns: [{ atIndex: 1, dir: 'down' }] })],
        separators: [{ a: { row: 0, col: 0 }, b: { row: 0, col: 1 } }],
      }),
    )
    expect(all('[data-turn-marker]')).toHaveLength(1)
    expect(all('[data-separator]')).toHaveLength(1)
  })

  it('always draws red anagram borders, and numbers only when enabled', () => {
    const answers = [answer({ id: 'a', text: 'ABC' })]
    const cells = [{ answerId: 'a', letterIndex: 1, number: 4 }]

    const hidden = renderGrid(puzzle({ answers, anagram: { showNumbersAndBar: false, cells } }))
    expect(hidden.all('[data-anagram-cell]')).toHaveLength(1)
    expect(hidden.all('[data-anagram-number]')).toHaveLength(0)

    const shown = renderGrid(puzzle({ answers, anagram: { showNumbersAndBar: true, cells } }))
    expect([...shown.all('[data-anagram-number]')].map((el) => el.textContent)).toEqual(['4'])
  })

  it('shows conflicts and guide lines only in the editor', () => {
    const p = puzzle({
      answers: [
        answer({ id: 'a', text: 'CAT', start: { row: 1, col: 0 } }),
        answer({ id: 'b', text: 'BED', start: { row: 0, col: 1 }, dir: 'down' }),
      ],
    })

    const editor = renderGrid(p, { mode: 'editor' })
    expect(editor.all('[data-conflict]')).toHaveLength(1)
    expect(editor.all('[data-editor-background]')).toHaveLength(1)

    const exported = renderGrid(p, { mode: 'export' })
    expect(exported.all('[data-conflict]')).toHaveLength(0)
    expect(exported.all('[data-editor-background]')).toHaveLength(0)
  })

  it('draws the anagram bar with one numbered cell per anagram letter when enabled', () => {
    const answers = [answer({ id: 'a', text: 'ABC' })]
    const cells = [
      { answerId: 'a', letterIndex: 0, number: 1 },
      { answerId: 'a', letterIndex: 2, number: 2 },
    ]
    const shown = renderGrid(puzzle({ answers, anagram: { showNumbersAndBar: true, cells } }))
    expect([...shown.all('[data-anagram-bar] text')].map((el) => el.textContent)).toEqual(['1', '2'])

    const hidden = renderGrid(puzzle({ answers, anagram: { showNumbersAndBar: false, cells } }))
    expect(hidden.all('[data-anagram-bar]')).toHaveLength(0)
  })
})
