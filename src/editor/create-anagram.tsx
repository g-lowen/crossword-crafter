import { useState } from 'react'
import type { Layout } from '../layout/layout'
import { pickAnagram } from '../layout/pick-anagram'
import type { Puzzle } from '../model/puzzle'
import type { PuzzleAction } from '../model/puzzle-reducer'

type CreateAnagramProps = {
  puzzle: Puzzle
  layout: Layout
  dispatch: (action: PuzzleAction) => void
}

type Note = { kind: 'ok' | 'warn'; text: string }

/** Marks letters in the answers for an anagram Sammy types, one letter per answer where it can. */
export function CreateAnagram({ puzzle, layout, dispatch }: CreateAnagramProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  // What came of the last anagram, until the next one.
  const [note, setNote] = useState<Note | null>(null)
  const anagram = text.trim().toUpperCase()

  function create() {
    const pick = pickAnagram(puzzle, layout, anagram)
    if (!pick.ok) {
      const letters = pick.missing.map(({ char, needed, found }) => `${char} (${needed} needed, ${found} found)`)
      setError(`Not enough of these letters in the answers: ${letters.join(', ')}.`)
      return
    }
    dispatch({ type: 'set-anagram-cells', cells: pick.cells })
    setOpen(false)
    if (pick.shared.length === 0) {
      setNote({ kind: 'ok', text: `${anagram}: one letter from each of ${pick.cells.length} answers.` })
      return
    }
    const textOf = new Map(puzzle.answers.map((answer) => [answer.id, answer.text]))
    const shared = pick.shared.map(({ answerId, letters }) => `${textOf.get(answerId)} (${letters})`)
    setNote({
      kind: 'warn',
      text: `${anagram}: too few answers have these letters, so some give more than one: ${shared.join(', ')}.`,
    })
  }

  function cancel() {
    setOpen(false)
    setError(null)
  }

  if (!open) {
    return (
      <>
        <button
          type="button"
          disabled={puzzle.answers.length === 0}
          title="Type a word, and a letter in the answers is marked for each of its letters"
          onClick={() => {
            setOpen(true)
            setNote(null)
          }}
        >
          Create anagram
        </button>
        {note && <p className={`anagram-note anagram-note--${note.kind}`}>{note.text}</p>}
      </>
    )
  }

  return (
    <form
      className="create-anagram"
      onSubmit={(e) => {
        e.preventDefault()
        create()
      }}
    >
      <label>
        Anagram
        <input
          autoFocus
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => e.key === 'Escape' && cancel()}
        />
      </label>
      <p className="hint">
        Marks a letter for each of its letters, from a different answer where it can, and numbers them left to right.
        Replaces the anagram letters there are.
      </p>
      {error && (
        <p className="paste-error" role="alert">
          {error}
        </p>
      )}
      <div className="create-anagram-buttons">
        <button type="submit" className="primary-button" disabled={anagram === ''}>
          Create
        </button>
        <button type="button" onClick={cancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
