import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GENERATE_SETTINGS,
  RULES,
  isWordBreak,
  maxBends,
  rulesFor,
  type GenerateSettings,
  type RuleId,
} from './rules'

function rule(id: RuleId, settings?: Partial<GenerateSettings>) {
  const found = (settings ? rulesFor({ ...DEFAULT_GENERATE_SETTINGS, ...settings }) : RULES).find((r) => r.id === id)
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

  it('prefers no bend, then a bend between words', () => {
    const score = rule('bends-on-spaces').bendScore!
    const text = chars('PINK FLOYD')
    expect(score(text, [])).toBeGreaterThan(score(text, [4]))
    expect(score(text, [4])).toBeGreaterThan(score(text, [3]))
    expect(score(chars('BLINK-182'), [5])).toBeGreaterThan(score(chars('BLINK-182'), [4]))
  })

  it('finds the breaks between words: spaces, hyphens, slashes, and apostrophes between words', () => {
    const breaks = (text: string) => chars(text).flatMap((_, i) => (isWordBreak(chars(text), i) ? [i] : []))
    expect(breaks('PINK FLOYD')).toEqual([4])
    expect(breaks('BLINK-182')).toEqual([5])
    expect(breaks('AC/DC')).toEqual([2])
    expect(breaks("ROCK'N'ROLL")).toEqual([4, 6])
    expect(breaks("ROCK’N’ROLL")).toEqual([4, 6])
    // Apostrophes in a word, or next to a space, don't split words.
    expect(breaks("DON'T")).toEqual([])
    expect(breaks("YOU'RE")).toEqual([])
    expect(breaks("MICHAEL JACKSON'S")).toEqual([7])
    expect(breaks("SINEAD O'CONNOR")).toEqual([6])
    expect(breaks("GUNS N' ROSES")).toEqual([4, 7])
  })

  it('only lets answers bend between words when asked', () => {
    expect(RULES.map((r) => r.id)).not.toContain('bend-between-words')
    const bendsAt = rule('bend-between-words', { bendBetweenWordsOnly: true }).bendsAt!
    expect(bendsAt(chars('PINK FLOYD'), 4)).toBe(true)
    expect(bendsAt(chars('PINK FLOYD'), 3)).toBe(false)
  })

  it('asks for as many crossings as set', () => {
    expect(rule('min-crossings').minCrossings).toBe(2)
    expect(RULES.map((r) => r.id)).not.toContain('max-crossings')
    const set = { minCrossings: 1, maxCrossings: 3 }
    expect(rule('min-crossings', set)).toMatchObject({ minCrossings: 1, text: 'every answer crosses at least 1 other' })
    expect(rule('max-crossings', set)).toMatchObject({ maxCrossings: 3, text: 'no answer is crossed more than 3 times' })
    expect(rulesFor({ ...DEFAULT_GENERATE_SETTINGS, minCrossings: 0 }).map((r) => r.id)).not.toContain('min-crossings')
  })
})
