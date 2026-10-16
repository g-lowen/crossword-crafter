import { describe, expect, it } from 'vitest'
import { cellAtPoint, moveByPixels } from './grid-coordinates'

const rect = { left: 100, top: 50, width: 290, height: 210 }
const grid = { rows: 21, columns: 29 }

describe('cellAtPoint', () => {
  it('finds the cell under the point', () => {
    expect(cellAtPoint(rect, grid, { x: 100, y: 50 })).toEqual({ row: 0, col: 0 })
    expect(cellAtPoint(rect, grid, { x: 125, y: 79.9 })).toEqual({ row: 2, col: 2 })
    expect(cellAtPoint(rect, grid, { x: 389.9, y: 259.9 })).toEqual({ row: 20, col: 28 })
  })

  it('returns null outside the grid', () => {
    expect(cellAtPoint(rect, grid, { x: 99, y: 60 })).toBeNull()
    expect(cellAtPoint(rect, grid, { x: 390, y: 60 })).toBeNull()
    expect(cellAtPoint(rect, grid, { x: 200, y: 260 })).toBeNull()
  })
})

describe('moveByPixels', () => {
  it('snaps to whole cells', () => {
    expect(moveByPixels({ row: 5, col: 5 }, { x: 14, y: -26 }, 10)).toEqual({ row: 2, col: 6 })
    expect(moveByPixels({ row: 5, col: 5 }, { x: 4, y: 4 }, 10)).toEqual({ row: 5, col: 5 })
  })
})
