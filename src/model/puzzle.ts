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
  /** Indices of letters drawn in every image, even the empty grid, as a hint. */
  visibleLetters: number[]
}

/** Where an answer goes on the grid, as "Generate solution" decides it. */
export type Placement = { id: string; start: CellRef; dir: Dir; turns: Turn[] }

export type AnagramCell = {
  answerId: string
  letterIndex: number
  number?: number
}

/** A thick border between two adjacent cells. */
export type Separator = { a: CellRef; b: CellRef }

/**
 * A run of consecutive answers in the list, such as one mini puzzle in a grid with several: list
 * indices `start` up to but not including `end`. Answers between groups have none. An answer
 * dragged within the list joins the group it's dropped in (`moveAnswer` in `groups.ts`).
 */
export type AnswerGroup = {
  start: number
  end: number
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
  /** Width of a cell on paper. Smaller cells fit more of them on the A4 page. */
  cellSizeMm: number
}
