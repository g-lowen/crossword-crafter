import type { AnswerGroup, Puzzle } from './puzzle'

/** Pale colors, so black letters stay easy to read on them. */
export const GROUP_COLORS = ['#d4ebfb', '#fff1bf', '#d6f0cf', '#fbdbe6', '#e4dcf6', '#ffe0c4']

/** The next color in the palette that no group uses yet, or the palette again from the start. */
export function nextGroupColor(groups: AnswerGroup[]): string {
  const used = new Set(groups.map((group) => group.color))
  return GROUP_COLORS.find((color) => !used.has(color)) ?? GROUP_COLORS[groups.length % GROUP_COLORS.length]
}

/** The group an answer at a list position belongs to, or undefined before the first divider. */
export function groupAt(groups: AnswerGroup[], index: number): AnswerGroup | undefined {
  let found: AnswerGroup | undefined
  for (const group of groups) {
    if (group.start <= index) found = group
  }
  return found
}

export function groupLabel(groups: AnswerGroup[], group: AnswerGroup): string {
  return group.name.trim() || `Group ${groups.indexOf(group) + 1}`
}

/** Each answer's group color, by answer id. Answers without a group aren't in the map. */
export function groupColors(puzzle: Puzzle): Map<string, string> {
  const colors = new Map<string, string>()
  puzzle.answers.forEach((answer, i) => {
    const group = groupAt(puzzle.groups, i)
    if (group) colors.set(answer.id, group.color)
  })
  return colors
}

/**
 * Keeps groups valid after the list changes length: sorted, inside the list, and never empty. When
 * two groups end up starting at the same answer, the later one wins, since the earlier one has no
 * answers left.
 */
export function normalizeGroups(groups: AnswerGroup[], answerCount: number): AnswerGroup[] {
  const byStart = new Map<number, AnswerGroup>()
  for (const group of [...groups].sort((a, b) => a.start - b.start)) {
    if (group.start >= 0 && group.start < answerCount) byStart.set(group.start, group)
  }
  return [...byStart.values()]
}

/** Groups after removing the answer at `removed`: later dividers move up one place. */
export function groupsAfterRemoving(groups: AnswerGroup[], removed: number, answerCount: number): AnswerGroup[] {
  return normalizeGroups(
    groups.map((group) => (group.start > removed ? { ...group, start: group.start - 1 } : group)),
    answerCount,
  )
}
