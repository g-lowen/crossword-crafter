import type { Answer, Puzzle } from '../model/puzzle'

/** One image in the export, and what it shows. */
export type ExportImage = {
  path: string
  /** Answers whose letters are filled in. None for the skeleton and the quiz images. */
  revealed: string[]
  /** The answer being asked, outlined in the highlight color. */
  highlightId?: string
}

export type ExportPlan = {
  images: ExportImage[]
  /** Answers that aren't on the grid, so they get no images. */
  leftOut: Answer[]
}

/** A file-name-safe version of an answer: lowercase, Swedish letters kept, everything else a dash. */
export function fileSlug(text: string): string {
  return (
    text
      .toLocaleLowerCase('sv-SE')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'answer'
  )
}

/** A zip file name from the puzzle name, without characters Windows won't allow. */
export function zipFileName(puzzleName: string): string {
  const name = puzzleName
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return `${name || 'crossword'}.zip`
}

/**
 * The images for one puzzle, in list order:
 * - `skeleton.png`: the empty grid.
 * - `quiz/NN-answer.png`: the empty grid with answer NN outlined.
 * - `correction/NN-answer.png`: answers 1 to NN filled in.
 */
export function exportPlan(puzzle: Puzzle): ExportPlan {
  const placed = puzzle.answers.filter((answer) => answer.start !== null)
  const leftOut = puzzle.answers.filter((answer) => answer.start === null)
  const name = (answer: Answer, i: number) => `${String(i + 1).padStart(2, '0')}-${fileSlug(answer.text)}.png`

  const images: ExportImage[] = [{ path: 'skeleton.png', revealed: [] }]
  placed.forEach((answer, i) => {
    images.push({ path: `quiz/${name(answer, i)}`, revealed: [], highlightId: answer.id })
  })
  placed.forEach((answer, i) => {
    images.push({ path: `correction/${name(answer, i)}`, revealed: placed.slice(0, i + 1).map((a) => a.id) })
  })
  return { images, leftOut }
}
