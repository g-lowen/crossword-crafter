import { useMemo, useState } from 'react'
import { GridView } from '../grid/grid-view'
import { layoutPuzzle } from '../layout/layout'
import type { Puzzle } from '../model/puzzle'
import type { PuzzleAction } from '../model/puzzle-reducer'
import { exportFileName, exportPlan } from './export-plan'

type ExportPanelProps = {
  puzzle: Puzzle
  name: string
  dispatch: (action: PuzzleAction) => void
}

type Format = 'zip' | 'pptx'

type Progress = { done: number; total: number } | null

const FORMATS: { value: Format; label: string; description: string; button: string }[] = [
  {
    value: 'zip',
    label: 'Images (zip)',
    description:
      'Transparent PNGs of the whole A4 page in quiz and correction folders, so they line up exactly when stacked in PowerPoint.',
    button: 'Download zip',
  },
  {
    value: 'pptx',
    label: 'PowerPoint',
    description:
      'A 16:9 deck with one slide per image, all in the same spot: the empty grid, then the quiz, then the correction. The notes say which question each slide is.',
    button: 'Download PowerPoint',
  },
]

/** Settings for the exported images, a preview, and the download. */
export function ExportPanel({ puzzle, name, dispatch }: ExportPanelProps) {
  const layout = useMemo(() => layoutPuzzle(puzzle), [puzzle])
  const { images, leftOut } = exportPlan(puzzle)
  const quizCount = images.filter((image) => image.highlightId).length
  const firstQuiz = images.find((image) => image.highlightId)
  const [format, setFormat] = useState<Format>('zip')
  const [progress, setProgress] = useState<Progress>(null)
  const [error, setError] = useState<string | null>(null)
  const chosen = FORMATS.find((f) => f.value === format)!

  async function download() {
    setError(null)
    setProgress({ done: 0, total: images.length })
    try {
      // Loaded on demand: rendering pulls in react-dom/server, and the deck pptxgenjs, which the
      // editor doesn't need.
      const { buildZip, downloadBlob, imageSize, renderAllImages } = await import('./render-image')
      const rendered = await renderAllImages(puzzle, layout, (done, total) => setProgress({ done, total }))
      if (format === 'zip') {
        downloadBlob(buildZip(rendered), exportFileName(name, 'zip'))
      } else {
        const { buildPptx } = await import('./export-pptx')
        downloadBlob(await buildPptx(rendered, imageSize(puzzle.cellSizeMm), name), exportFileName(name, 'pptx'))
      }
    } catch (e) {
      setError(`Couldn't create the export: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="menu-panel export-panel" role="dialog" aria-label="Export images">
      <strong>Export images</strong>

      <div className="export-settings">
        <div className="export-format">
          <span>Export as</span>
          <div className="segmented" role="group" aria-label="Export as">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={format === f.value}
                onClick={() => setFormat(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <p className="hint">{chosen.description}</p>
        <label>
          Highlight color{' '}
          <input
            type="color"
            value={puzzle.highlightColor}
            onChange={(e) => dispatch({ type: 'set-highlight-color', color: e.target.value })}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={puzzle.includeStartArrow}
            onChange={(e) => dispatch({ type: 'set-include-start-arrow', value: e.target.checked })}
          />{' '}
          Arrow to the start of the answer in quiz images
        </label>
      </div>

      {firstQuiz && (
        <figure className="export-preview">
          <GridView
            puzzle={puzzle}
            layout={layout}
            mode="export"
            showLetters={false}
            highlight={{
              answerId: firstQuiz.highlightId!,
              color: puzzle.highlightColor,
              startArrow: puzzle.includeStartArrow,
            }}
          />
          <figcaption>Quiz image 1</figcaption>
        </figure>
      )}

      <p className="export-summary">
        1 empty grid, {quizCount} quiz {quizCount === 1 ? 'image' : 'images'} and {quizCount} correction{' '}
        {quizCount === 1 ? 'image' : 'images'}
        {format === 'pptx' ? `, one slide each (${images.length} slides).` : '.'}
      </p>
      {leftOut.length > 0 && (
        <p className="export-warning">
          Not on the grid, so left out: {leftOut.map((answer) => answer.text).join(', ')}.
        </p>
      )}
      {layout.issues.length > 0 && (
        <p className="export-warning">
          The puzzle has {layout.issues.length} {layout.issues.length === 1 ? 'issue' : 'issues'}. The images show it
          as it is.
        </p>
      )}
      {error && (
        <p className="paste-error" role="alert">
          {error}
        </p>
      )}

      <div className="panel-actions">
        <button type="button" className="primary-button" onClick={download} disabled={progress !== null}>
          {progress ? `Creating images… ${progress.done}/${progress.total}` : chosen.button}
        </button>
      </div>
    </div>
  )
}
