import { describe, expect, it } from 'vitest'
import { layoutPuzzle } from '../layout/layout'
import type { Puzzle } from '../model/puzzle'
import { emptyPuzzle } from '../model/puzzle-reducer'
import { imageSize, renderImageSvg } from './render-image'

const puzzle: Puzzle = {
  ...emptyPuzzle,
  highlightColor: '#ff00aa',
  answers: [
    { id: 'cat', text: 'CAT', start: { row: 1, col: 0 }, dir: 'right', turns: [], wideSpaces: [], visibleLetters: [] },
    { id: 'bad', text: 'BAD', start: { row: 0, col: 1 }, dir: 'down', turns: [], wideSpaces: [], visibleLetters: [] },
  ],
}
const layout = layoutPuzzle(puzzle)

function parse(svg: string) {
  return new DOMParser().parseFromString(svg, 'image/svg+xml')
}

const letters = (doc: Document) => [...doc.querySelectorAll('[data-letter]')].map((el) => el.textContent).sort()

describe('renderImageSvg', () => {
  it('is a standalone SVG at the export size, with a transparent background', () => {
    const doc = parse(renderImageSvg(puzzle, layout, { path: 'skeleton.png', part: 'skeleton', label: '', revealed: [] }))
    const svg = doc.documentElement
    expect(svg.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg')
    expect(svg.getAttribute('width')).toBe(String(imageSize(10).width))
    expect(svg.getAttribute('height')).toBe(String(imageSize(10).height))
    expect(doc.querySelector('[data-editor-background]')).toBeNull()
  })

  it('is the grid on A4 landscape at 200 dpi', () => {
    expect(imageSize(10)).toEqual({ width: 2283, height: 1654 })
    // 42 × 30 cells of 7 mm: 294 × 210 mm.
    expect(imageSize(7)).toEqual({ width: 2315, height: 1654 })
  })

  it('shows no letters on the skeleton', () => {
    expect(letters(parse(renderImageSvg(puzzle, layout, { path: 'skeleton.png', part: 'skeleton', label: '', revealed: [] })))).toEqual([])
  })

  it('outlines the asked answer in the highlight color, without letters', () => {
    const doc = parse(renderImageSvg(puzzle, layout, { path: 'quiz/01.png', part: 'quiz' as const, label: '', revealed: [], highlightId: 'cat' }))
    const highlight = doc.querySelector('[data-highlight="cat"]')!
    expect(highlight.querySelectorAll('line')).toHaveLength(8)
    expect(highlight.querySelector('line')!.getAttribute('stroke')).toBe('#ff00aa')
    expect(letters(doc)).toEqual([])
  })

  it('adds the start arrow only when asked to', () => {
    const image = { path: 'quiz/01.png', part: 'quiz' as const, label: '', revealed: [], highlightId: 'cat' }
    expect(parse(renderImageSvg(puzzle, layout, image)).querySelector('[data-pointer-arrow]')).toBeNull()
    const withArrow = { ...puzzle, includeStartArrow: true }
    expect(parse(renderImageSvg(withArrow, layout, image)).querySelector('[data-pointer-arrow]')).not.toBeNull()
  })

  it('fills in only the revealed answers, including shared letters', () => {
    const doc = parse(renderImageSvg(puzzle, layout, { path: 'correction/01.png', part: 'correction', label: '', revealed: ['cat'] }))
    expect(letters(doc)).toEqual(['A', 'C', 'T'])
    const both = parse(renderImageSvg(puzzle, layout, { path: 'correction/02.png', part: 'correction', label: '', revealed: ['cat', 'bad'] }))
    expect(letters(both)).toEqual(['A', 'B', 'C', 'D', 'T'])
  })
})
