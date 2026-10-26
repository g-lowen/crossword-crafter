/** Trims an answer, collapses runs of whitespace to a single space and makes it uppercase. */
export function normalizeAnswer(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLocaleUpperCase('sv-SE')
}

/**
 * Turns pasted text into answers: one per line, normalized as in `normalizeAnswer`. Empty lines are
 * skipped.
 */
export function parseAnswerList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(normalizeAnswer)
    .filter((line) => line.length > 0)
}
