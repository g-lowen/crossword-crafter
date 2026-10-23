import { useMemo, useState } from 'react'
import { GridView } from '../grid/grid-view'
import { layoutPuzzle } from '../layout/layout'
import type { Puzzle } from '../model/puzzle'
import type { PuzzleAction } from '../model/puzzle-reducer'
import { exportPlan, zipFileName } from './export-plan'

type ExportPanelProps = {
  puzzle: Puzzle
  name: string
  dispatch: (action: PuzzleAction) => void
}

type Progress = { done: number; total: number } | null

/** Settings for the exported images, a preview, and the download. */
export function ExportPanel({ puzzle, name, dispatch }: ExportPanelProps) {
  const layout = useMemo(() => layoutPuzzle(puzzle), [puzzle])
  const { images, leftOut } = exportPlan(puzzle)
  const quizCount = images.filter((image) => image.highlightId).length
  const firstQuiz = images.find((image) => image.highlightId)
  const [progress, setProgress] = useState<Progress>(null)
  const [error, setError] = useState<string | null>(null)

  async function download() {
    setError(null)
    setProgress({ done: 0, total: images.length })
    try {
      // Loaded on demand: rendering pulls in react-dom/server, which the editor doesn't need.
      const { buildExportZip, downloadBlob } = await import('./render-image')
      const zip = await buildExportZip(puzzle, layout, (done, total) => setProgress({ done, total }))
      downloadBlob(zip, zipFileName(name))
    } catch (e) {
      setError(`Couldn't create the images: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="menu-panel export-panel" role="dialog" aria-label="Export images">
      <strong>Export images</strong>
      <p className="hint">
        Transparent PNGs of the whole A4 page, so they line up exactly when stacked in PowerPoint.
      </p>

      <div className="export-settings">
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
        {quizCount === 1 ? 'image' : 'images'}.
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
          {progress ? `Creating images… ${progress.done}/${progress.total}` : 'Download zip'}
        </button>
      </div>
    </div>
  )
}
