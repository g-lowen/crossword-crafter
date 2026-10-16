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
  /** Draws a small arrow in the first cell showing which way the answer reads. */
  showStartMarker: boolean
}

export type AnagramCell = {
  answerId: string
  letterIndex: number
  number?: number
}

/** A thick border between two adjacent cells. */
export type Separator = { a: CellRef; b: CellRef }

export type Puzzle = {
  /** Array order is the reveal order. */
  answers: Answer[]
  anagram: {
    showNumbersAndBar: boolean
    cells: AnagramCell[]
    /** First cell of the anagram bar, or null for the default spot on the bottom row. */
    barStart: CellRef | null
  }
  separators: Separator[]
  highlightColor: string
  /** Adds the pointer arrow to the quiz images. Sammy usually draws it in PowerPoint instead. */
  includeStartArrow: boolean
}
