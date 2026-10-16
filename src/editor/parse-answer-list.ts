/**
 * Turns pasted text into answers: one per line, trimmed, uppercase, with runs of whitespace
 * collapsed to a single space. Empty lines are skipped.
 */
export function parseAnswerList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, ' ').toLocaleUpperCase('sv-SE'))
    .filter((line) => line.length > 0)
}
