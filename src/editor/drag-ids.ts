import { runStart } from '../model/groups'
import type { Answer, AnswerGroup } from '../model/puzzle'

export const GRID_ID = 'grid'
export const ANSWER_LIST_ID = 'answer-list'

const LIST_PREFIX = 'list:'

export const listItemId = (answerId: string) => `${LIST_PREFIX}${answerId}`
export const isListItemId = (id: string) => id.startsWith(LIST_PREFIX)
export const answerIdFromListItem = (id: string) => id.slice(LIST_PREFIX.length)

const GROUP_PREFIX = 'group:'

/** A group header in the list, by the list index of its first answer. */
export const groupItemId = (start: number) => `${GROUP_PREFIX}${start}`
export const isGroupItemId = (id: string) => id.startsWith(GROUP_PREFIX)
export const startFromGroupItem = (id: string) => Number(id.slice(GROUP_PREFIX.length))

const NO_GROUP_PREFIX = 'no-group:'

/** A spot between groups where an answer can be dropped to leave its group, before list index `at`. */
export const noGroupId = (at: number) => `${NO_GROUP_PREFIX}${at}`
export const isNoGroupId = (id: string) => id.startsWith(NO_GROUP_PREFIX)
export const atFromNoGroup = (id: string) => Number(id.slice(NO_GROUP_PREFIX.length))

/** The start of the run (a group, or the answers before the first one) under a list row. */
export function runStartAt(answers: Answer[], groups: AnswerGroup[], rowId: string): number | null {
  if (isGroupItemId(rowId)) return startFromGroupItem(rowId)
  if (!isListItemId(rowId)) return null
  const index = answers.findIndex((answer) => answer.id === answerIdFromListItem(rowId))
  return index < 0 ? null : runStart(groups, index)
}

export const gridHandleId = (answerId: string) => `grid:${answerId}`

/** Attached to every draggable answer, so a drop knows what moved and from where. */
export type DragData = { source: 'list' | 'grid'; answerId: string }

/** Attached to a group header, which drags the whole group within the list. */
export type GroupDragData = { source: 'group'; start: number }
