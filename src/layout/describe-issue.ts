import type { CellRef, Puzzle } from '../model/puzzle'
import type { LayoutIssue } from './layout'

function where(cell: CellRef): string {
  return `row ${cell.row + 1}, column ${cell.col + 1}`
}

/** A short, human-readable description of a layout issue for the editor. */
export function describeIssue(issue: LayoutIssue, puzzle: Puzzle): string {
  const text = describe(issue, puzzle)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function describe(issue: LayoutIssue, puzzle: Puzzle): string {
  const name = (answerId: string) => {
    const answer = puzzle.answers.find((a) => a.id === answerId)
    return answer ? `"${answer.text}"` : 'a removed answer'
  }

  switch (issue.type) {
    case 'conflict':
      return issue.answerIds.length === 1
        ? `${name(issue.answerIds[0])} crosses itself at ${where(issue.cell)}.`
        : `${issue.answerIds.map(name).join(' and ')} don't match at ${where(issue.cell)}.`
    case 'out-of-bounds':
      return `${name(issue.answerId)} goes outside the page at ${where(issue.cell)}.`
    case 'invalid-turn': {
      const reasons = {
        'out-of-range': 'there is no letter to turn after',
        'not-a-turn': 'it must turn 90°',
        'on-wide-space': "it can't turn on a wide space",
        duplicate: 'there is already a turn there',
      }
      return `${name(issue.answerId)} has an ignored turn at character ${issue.atIndex + 1}: ${reasons[issue.reason]}.`
    }
    case 'invalid-wide-space':
      return `${name(issue.answerId)} has a wide space at character ${issue.index + 1}, which is not a space.`
    case 'invalid-anagram-cell': {
      const reasons = {
        'missing-answer': 'the answer no longer exists',
        'out-of-range': 'the answer is shorter now',
        'not-a-letter': 'it is a space',
      }
      return `An anagram cell on character ${issue.letterIndex + 1} of ${name(issue.answerId)} is hidden: ${reasons[issue.reason]}.`
    }
    case 'duplicate-anagram-number':
      return `Anagram number ${issue.number} is used more than once.`
  }
}
