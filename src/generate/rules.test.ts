import { describe, expect, it } from 'vitest'
import { RULES, maxBends, type RuleId } from './rules'

function rule(id: RuleId) {
  const found = RULES.find((r) => r.id === id)
  if (!found) throw new Error(`No rule ${id}`)
  return found
}

const chars = (text: string) => Array.from(text)

describe('rules', () => {
  it('only lets answers over 4 characters bend', () => {
    const allows = rule('bend-length').allowsBends!
    expect(allows(chars('ABCD'), [])).toBe(true)
    expect(allows(chars('ABCD'), [2])).toBe(false)
    expect(allows(chars('ABCDE'), [2])).toBe(true)
  })

  it('allows 1 bend below 6 characters, 2 below 12 and 3 after that', () => {
    expect([4, 5, 6, 11, 12, 30].map(maxBends)).toEqual([1, 1, 2, 2, 3, 3])
    const allows = rule('max-bends').allowsBends!
    expect(allows(chars('ABCDE'), [1, 3])).toBe(false)
    expect(allows(chars('ABCDEF'), [1, 3])).toBe(true)
  })

  it('keeps bends at least 2 characters apart', () => {
    const allows = rule('bend-gap').allowsBends!
    expect(allows(chars('ABCDEFGH'), [2, 3])).toBe(false)
    expect(allows(chars('ABCDEFGH'), [2, 4, 6])).toBe(true)
  })

  it('keeps bends off the second and second to last character', () => {
    const allows = rule('bend-ends').allowsBends!
    expect(allows(chars('ABCDEF'), [1])).toBe(false)
    expect(allows(chars('ABCDEF'), [4])).toBe(false)
    expect(allows(chars('ABCDEF'), [2, 3])).toBe(true)
  })

  it('prefers no bend, then a bend on a space', () => {
    const score = rule('bends-on-spaces').bendScore!
    const text = chars('PINK FLOYD')
    expect(score(text, [])).toBeGreaterThan(score(text, [4]))
    expect(score(text, [4])).toBeGreaterThan(score(text, [3]))
  })
})
