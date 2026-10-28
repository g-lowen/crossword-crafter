import { arrayMove } from '@dnd-kit/sortable'
import type { Answer, AnswerGroup, Puzzle } from './puzzle'

/** Pale colors, so black letters stay easy to read on them. */
export const GROUP_COLORS = ['#d4ebfb', '#fff1bf', '#d6f0cf', '#fbdbe6', '#e4dcf6', '#ffe0c4']

/** The next color in the palette that no group uses yet, or the palette again from the start. */
export function nextGroupColor(groups: AnswerGroup[]): string {
  const used = new Set(groups.map((group) => group.color))
  return GROUP_COLORS.find((color) => !used.has(color)) ?? GROUP_COLORS[groups.length % GROUP_COLORS.length]
}

/** The group an answer at a list position belongs to, or undefined when it has none. */
export function groupAt(groups: AnswerGroup[], index: number): AnswerGroup | undefined {
  return groups.find((group) => group.start <= index && index < group.end)
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
 * Keeps groups valid after the list changes: sorted, inside the list, never empty and never
 * overlapping. Where two overlap, the later one wins, so the earlier one ends where it starts.
 */
export function normalizeGroups(groups: AnswerGroup[], answerCount: number): AnswerGroup[] {
  const result: AnswerGroup[] = []
  for (const group of [...groups].sort((a, b) => a.start - b.start)) {
    const start = Math.max(0, group.start)
    const end = Math.min(answerCount, group.end)
    if (start >= end) continue
    const previous = result.at(-1)
    if (previous && previous.end > start) {
      if (previous.start === start) result.pop()
      else result[result.length - 1] = { ...previous, end: start }
    }
    result.push({ ...group, start, end })
  }
  return result
}

/** Groups after removing the answer at `removed`: later answers move up one place. */
export function groupsAfterRemoving(groups: AnswerGroup[], removed: number, answerCount: number): AnswerGroup[] {
  const shift = (index: number) => (index > removed ? index - 1 : index)
  return normalizeGroups(
    groups.map((group) => ({ ...group, start: shift(group.start), end: shift(group.end) })),
    answerCount,
  )
}

/**
 * Starts a new group at the answer with list index `start`. In a group, it splits that group in
 * two; otherwise it runs until the next group.
 */
export function addGroup(groups: AnswerGroup[], start: number, color: string, answerCount: number): AnswerGroup[] {
  if (start < 0 || start >= answerCount || groups.some((group) => group.start === start)) return groups
  const around = groupAt(groups, start)
  const end = around?.end ?? groups.find((group) => group.start > start)?.start ?? answerCount
  return normalizeGroups(
    [
      ...groups.map((group) => (group === around ? { ...group, end: start } : group)),
      { start, end, name: '', color },
    ],
    answerCount,
  )
}

/** Removes the group starting at `start`. Its answers join the group right above, or get none. */
export function removeGroup(groups: AnswerGroup[], start: number): AnswerGroup[] {
  const removed = groups.find((group) => group.start === start)
  if (!removed) return groups
  return groups.flatMap((group) => {
    if (group === removed) return []
    return group.end === removed.start ? [{ ...group, end: removed.end }] : [group]
  })
}

type GroupedList = { answers: Answer[]; groups: AnswerGroup[] }

/**
 * The start of the run an answer belongs to: its group's start, or the first of the answers without
 * a group around it.
 */
export function runStart(groups: AnswerGroup[], index: number): number {
  const group = groupAt(groups, index)
  if (group) return group.start
  return Math.max(0, ...groups.filter((g) => g.end <= index).map((g) => g.end))
}

/** The list rebuilt from each answer's group, which must keep every group in one piece. */
function fromMembership(answers: Answer[], groupOf: (AnswerGroup | undefined)[]): GroupedList {
  const groups: AnswerGroup[] = []
  groupOf.forEach((group, i) => {
    if (!group) return
    const last = groups.at(-1)
    if (last && groupOf[i - 1] === group) last.end = i + 1
    else groups.push({ ...group, start: i, end: i + 1 })
  })
  return { answers, groups }
}

const membership = ({ answers, groups }: GroupedList) => answers.map((_, i) => groupAt(groups, i))

/**
 * The list after dragging the answer at `from` onto the one at `to`. It joins the group of the
 * answer it's dropped on, or gets none if that answer has none. Every other answer keeps its
 * group, so groups grow and shrink rather than pass answers on. A group left empty is removed.
 */
export function moveAnswer(list: GroupedList, from: number, to: number): GroupedList {
  const groupOf = membership(list)
  groupOf[from] = groupOf[to]
  // The moved answer lands next to the one it was dropped on, so every group stays in one piece.
  return fromMembership(arrayMove(list.answers, from, to), arrayMove(groupOf, from, to))
}

/**
 * The list after dragging the answer at `from` onto the header of the group starting at `start`.
 * The list makes room on the side it comes from: dragged down it becomes the group's first answer;
 * dragged up it lands above the header, at the end of what comes before.
 */
export function moveAnswerToHeader(list: GroupedList, from: number, start: number): GroupedList {
  const groupOf = membership(list)
  const to = from < start ? start - 1 : start
  groupOf[from] = from < start ? groupAt(list.groups, start) : groupOf[start - 1]
  return fromMembership(arrayMove(list.answers, from, to), arrayMove(groupOf, from, to))
}

/**
 * The list after dragging the answer at `from` out of its group, to land without a group just
 * before list index `at`. `at` must be the edge of a group, so no group is split.
 */
export function moveOutOfGroups(list: GroupedList, from: number, at: number): GroupedList {
  const groupOf = membership(list)
  const to = at > from ? at - 1 : at
  groupOf[from] = undefined
  return fromMembership(arrayMove(list.answers, from, to), arrayMove(groupOf, from, to))
}

/** The runs of the list in order: each group, and each stretch of answers without one. */
function runs(list: GroupedList): { group?: AnswerGroup; answers: Answer[] }[] {
  const result: { group?: AnswerGroup; answers: Answer[] }[] = []
  membership(list).forEach((group, i) => {
    const last = result.at(-1)
    if (last && last.group === group) last.answers.push(list.answers[i])
    else result.push({ group, answers: [list.answers[i]] })
  })
  return result
}

/**
 * The list after dragging the group starting at `start`, with its answers, onto the run starting at
 * `target`. Dragged down it goes after that run, dragged up before it.
 */
export function moveGroup(list: GroupedList, start: number, target: number): GroupedList {
  const all = runs(list)
  const runStarts = all.map((_, i) => all.slice(0, i).reduce((sum, run) => sum + run.answers.length, 0))
  const from = all.findIndex((run) => run.group?.start === start)
  const to = runStarts.indexOf(target)
  if (from < 0 || to < 0 || from === to) return list
  const rest = all.filter((_, i) => i !== from)
  const at = rest.indexOf(all[to]) + (to > from ? 1 : 0)
  const ordered = [...rest.slice(0, at), all[from], ...rest.slice(at)]
  return fromMembership(
    ordered.flatMap((run) => run.answers),
    ordered.flatMap((run) => run.answers.map(() => run.group)),
  )
}
