import { describe, expect, it } from 'vitest'
import { CELL_SIZES_MM, gridForCellSize } from './page'

describe('gridForCellSize', () => {
  it('fits as many whole cells as A4 landscape allows', () => {
    expect(CELL_SIZES_MM.map((size) => gridForCellSize(size))).toEqual([
      { columns: 29, rows: 21 },
      { columns: 33, rows: 23 },
      { columns: 37, rows: 26 },
      { columns: 42, rows: 30 },
    ])
  })
})
