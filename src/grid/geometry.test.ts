import { describe, expect, it } from 'vitest'
import { cellOrigin, outlineSegments, pointerArrow, separatorLine, turnArrow, wideSpaceShape } from './geometry'

describe('outlineSegments', () => {
  it('outlines a straight answer as one rectangle', () => {
    const segments = outlineSegments([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ])
    expect(segments).toHaveLength(6)
    expect(segments).not.toContainEqual({ x1: 10, y1: 0, x2: 10, y2: 10 })
  })

  it('follows a turn', () => {
    const segments = outlineSegments([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 1 },
    ])
    expect(segments).toHaveLength(8)
  })

  it('counts a cell listed twice once', () => {
    expect(outlineSegments([{ row: 0, col: 0 }, { row: 0, col: 0 }])).toHaveLength(4)
  })
})

describe('pointerArrow', () => {
  it('ends just before the start cell and points in the reading direction', () => {
    const arrow = pointerArrow({ row: 0, col: 2 }, 'right')
    expect(arrow.line).toBe('5.4,5 16.4,5')
    expect(arrow.head).toBe('19.4,5 15.4,7.6 15.4,2.4')
  })
})

describe('cellOrigin', () => {
  it('uses 10 mm cells', () => {
    expect(cellOrigin({ row: 2, col: 3 })).toEqual({ x: 30, y: 20 })
  })
})

describe('turnArrow', () => {
  it('comes in along the old direction and leaves along the new one', () => {
    const arrow = turnArrow({ row: 0, col: 0 }, 'right', 'down')
    expect(arrow.line).toBe('7.2,1.5 8.5,1.5 8.5,2.8')
    expect(arrow.head).toBe('8.5,3.5 7.85,2.6 9.15,2.6')
  })

  it('puts the bend in the matching corner of the cell', () => {
    const bend = (from: Parameters<typeof turnArrow>[1], to: Parameters<typeof turnArrow>[2]) =>
      turnArrow({ row: 1, col: 1 }, from, to).line.split(' ')[1]
    expect(bend('down', 'right')).toBe('11.5,18.5') // ↳ bottom-left
    expect(bend('up', 'right')).toBe('11.5,11.5') // ↱ top-left
    expect(bend('down', 'left')).toBe('18.5,18.5') // ↲ bottom-right
    expect(bend('right', 'down')).toBe('18.5,11.5') // ↴ top-right
  })
})

describe('wideSpaceShape', () => {
  it('covers two cells side by side', () => {
    const shape = wideSpaceShape(
      [
        { row: 1, col: 4 },
        { row: 1, col: 5 },
      ],
      'right',
    )
    expect(shape.rect).toEqual({ x: 40, y: 10, width: 20, height: 10 })
  })

  it('covers two stacked cells, in either order', () => {
    const shape = wideSpaceShape(
      [
        { row: 4, col: 1 },
        { row: 3, col: 1 },
      ],
      'up',
    )
    expect(shape.rect).toEqual({ x: 10, y: 30, width: 10, height: 20 })
  })
})

describe('separatorLine', () => {
  it('draws the shared vertical edge of horizontal neighbours', () => {
    expect(separatorLine({ a: { row: 6, col: 13 }, b: { row: 6, col: 12 } })).toEqual({
      x1: 130,
      y1: 60,
      x2: 130,
      y2: 70,
    })
  })

  it('draws the shared horizontal edge of vertical neighbours', () => {
    expect(separatorLine({ a: { row: 1, col: 2 }, b: { row: 2, col: 2 } })).toEqual({
      x1: 20,
      y1: 20,
      x2: 30,
      y2: 20,
    })
  })

  it('ignores cells that are not adjacent', () => {
    expect(separatorLine({ a: { row: 1, col: 1 }, b: { row: 2, col: 2 } })).toBeNull()
  })
})
