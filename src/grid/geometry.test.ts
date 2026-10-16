import { describe, expect, it } from 'vitest'
import { cellOrigin, separatorLine, startArrow, turnArrow, wideSpaceShape } from './geometry'

describe('cellOrigin', () => {
  it('uses 10 mm cells', () => {
    expect(cellOrigin({ row: 2, col: 3 })).toEqual({ x: 30, y: 20 })
  })
})

describe('turnArrow', () => {
  it('comes in along the old direction and leaves along the new one', () => {
    const arrow = turnArrow({ row: 0, col: 0 }, 'right', 'down')
    expect(arrow.line).toBe('6.3,7.6 7.6,7.6 7.6,8.9')
    expect(arrow.head).toBe('7.6,9.6 6.95,8.7 8.25,8.7')
  })
})

describe('startArrow', () => {
  it('points along the reading direction', () => {
    const arrow = startArrow({ row: 0, col: 0 }, 'down')
    expect(arrow.line).toBe('7.4,6 7.4,8')
    expect(arrow.head).toBe('7.4,8.9 6.75,8 8.05,8')
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
