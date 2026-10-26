export type Dir = 'right' | 'down' | 'left' | 'up'

export type CellRef = { row: number; col: number }

/** The answer turns at the letter `atIndex` and continues in `dir`. */
export type Turn = { atIndex: number; dir: Dir }

export type Answer = {
  id: string
  /** Uppercase text. A space is drawn as a black cell. */
  text: string
  /** Cell of the first character, or null while the answer is not on the grid yet. */
  start: CellRef | null
  dir: Dir
  turns: Turn[]
  /** Indices of spaces that span two cells. */
  wideSpaces: number[]
}

export type AnagramCell = {
  answerId: string
  letterIndex: number
  number?: number
}

/** A thick border between two adjacent cells. */
export type Separator = { a: CellRef; b: CellRef }

/**
 * A run of consecutive answers in the list, such as one mini puzzle in a grid with several. It
 * starts at the answer with list index `start` and runs until the next group's start. The divider
 * belongs to the position, not to an answer, so dragging an answer across it changes its group.
 */
export type AnswerGroup = {
  start: number
  /** Empty means the default "Group N". */
  name: string
  /** Background color of the group's letter cells. */
  color: string
}

export type Puzzle = {
  /** Array order is the reveal order. */
  answers: Answer[]
  anagram: {
    showNumbersAndBar: boolean
    cells: AnagramCell[]
  }
  separators: Separator[]
  /** Sorted by start. Answers before the first group have none and stay white. */
  groups: AnswerGroup[]
  highlightColor: string
  /** Adds the pointer arrow to the quiz images. Sammy usually draws it in PowerPoint instead. */
  includeStartArrow: boolean
}
