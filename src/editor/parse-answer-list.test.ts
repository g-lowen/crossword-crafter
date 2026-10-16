import { describe, expect, it } from 'vitest'
import { parseAnswerList } from './parse-answer-list'

describe('parseAnswerList', () => {
  it('makes one uppercase answer per line', () => {
    expect(parseAnswerList('abba\nqueen')).toEqual(['ABBA', 'QUEEN'])
  })

  it('handles Swedish letters and digits', () => {
    expect(parseAnswerList('håkan hellström\nu2')).toEqual(['HÅKAN HELLSTRÖM', 'U2'])
  })

  it('trims lines, collapses whitespace and skips empty lines', () => {
    expect(parseAnswerList('  pink   floyd \r\n\n\t\nthe\tbeatles\n')).toEqual(['PINK FLOYD', 'THE BEATLES'])
  })
})
