import { describe, expect, it } from 'vitest'
import { imagePlacement } from './export-pptx'

describe('imagePlacement', () => {
  it('fills the height of a 16:9 slide and centres the A4 image', () => {
    const { x, y, w, h } = imagePlacement()
    expect(y).toBe(0)
    expect(h).toBe(7.5)
    expect(w).toBeCloseTo(10.35, 2)
    expect(x + w / 2).toBeCloseTo(13.333 / 2, 3)
  })
})
