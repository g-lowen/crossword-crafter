export const GRID_ID = 'grid'
export const ANSWER_LIST_ID = 'answer-list'

const LIST_PREFIX = 'list:'

export const listItemId = (answerId: string) => `${LIST_PREFIX}${answerId}`
export const isListItemId = (id: string) => id.startsWith(LIST_PREFIX)
export const answerIdFromListItem = (id: string) => id.slice(LIST_PREFIX.length)

export const gridHandleId = (answerId: string) => `grid:${answerId}`

/** Attached to every draggable answer, so a drop knows what moved and from where. */
export type DragData = { answerId: string; source: 'list' | 'grid' }
