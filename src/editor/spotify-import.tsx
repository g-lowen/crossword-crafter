import { useEffect, useState } from 'react'
import { parseAnswerList } from './parse-answer-list'
import { suggestedAnswer, type AnswerChoice, type SpotifyTrack } from './spotify'

type SpotifyImportProps = {
  tracks: SpotifyTrack[]
  onAdd: (texts: string[]) => void
  onCancel: () => void
}

const CHOICES: { value: AnswerChoice; label: string }[] = [
  { value: 'artist', label: 'Artist' },
  { value: 'all-artists', label: 'All artists' },
  { value: 'title', label: 'Title' },
]

/**
 * A preview of a pasted Spotify list: one row per track, with the suggested answer in a text field
 * Sammy can change, and a checkbox to leave a track out.
 */
export function SpotifyImport({ tracks, onAdd, onCancel }: SpotifyImportProps) {
  const [choice, setChoice] = useState<AnswerChoice>('artist')
  const [answers, setAnswers] = useState(() => tracks.map((track) => suggestedAnswer(track, 'artist')))
  const [included, setIncluded] = useState(() => tracks.map(() => true))

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  function choose(next: AnswerChoice) {
    // Switching replaces the suggestions, including any edits, so the column is consistent.
    setChoice(next)
    setAnswers(tracks.map((track) => suggestedAnswer(track, next)))
  }

  const chosen = answers.filter((answer, i) => included[i] && answer.trim() !== '')

  return (
    <div className="modal-backdrop">
      <div className="modal spotify-import" role="dialog" aria-label="Add answers from Spotify">
        <h2>Add answers from Spotify</h2>
        <div className="spotify-choice">
          <span>Use</span>
          <div className="segmented" role="group" aria-label="Use">
            {CHOICES.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={choice === option.value}
                onClick={() => choose(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="hint">You can change any answer before adding.</span>
        </div>

        <ol className="spotify-tracks">
          {tracks.map((track, i) => (
            <li key={i} className={included[i] ? undefined : 'spotify-track--skipped'}>
              <input
                type="checkbox"
                checked={included[i]}
                aria-label={`Include ${track.title}`}
                onChange={() => setIncluded(included.map((value, j) => (j === i ? !value : value)))}
              />
              <span className="spotify-track-source">
                <span className="spotify-track-title">{track.title}</span>
                <span className="spotify-track-artists">{track.artists.join(', ')}</span>
              </span>
              <input
                className="spotify-track-answer"
                aria-label={`Answer for ${track.title}`}
                value={answers[i]}
                disabled={!included[i]}
                onChange={(e) => setAnswers(answers.map((value, j) => (j === i ? e.target.value : value)))}
              />
            </li>
          ))}
        </ol>

        <div className="panel-actions">
          <button
            type="button"
            className="primary-button"
            disabled={chosen.length === 0}
            onClick={() => onAdd(parseAnswerList(chosen.join('\n')))}
          >
            Add {chosen.length} {chosen.length === 1 ? 'answer' : 'answers'}
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
