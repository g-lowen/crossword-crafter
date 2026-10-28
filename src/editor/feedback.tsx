import { useEffect, useRef, useState } from 'react'

type FeedbackProps = {
  /** The feedback worker in `feedback/`, which passes the feedback on to Discord. */
  url: string
  puzzleName: string
  /** The open puzzle as Copy puzzle puts it on the clipboard, to send along. */
  puzzleText: () => string
  onSent: () => void
}

/** The worker turns away anything longer, to fit in one Discord message. */
const MAX_MESSAGE = 1500

const NAME_KEY = 'crossword-crafter/feedback-name'

/** The name given last time, so it doesn't have to be typed again. */
function savedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // Not remembering the name is fine.
  }
}

/** A button in the bottom-right corner that opens a box for sending feedback to the developers. */
export function Feedback({ url, puzzleName, puzzleText, onSent }: FeedbackProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [name, setName] = useState(savedName)
  const [includePuzzle, setIncludePuzzle] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  function close() {
    setOpen(false)
    setError(null)
    buttonRef.current?.focus()
  }

  // Like the header panels, the box closes on Esc, or without taking the focus on a click outside.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  async function send() {
    setSending(true)
    setError(null)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, name, puzzleName, ...(includePuzzle ? { puzzle: puzzleText() } : {}) }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      saveName(name)
      setMessage('')
      close()
      onSent()
    } catch {
      setError("Couldn't send the feedback. Check the connection and try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="feedback" ref={ref}>
      {open && (
        <div
          className="feedback-panel"
          role="dialog"
          aria-label="Feedback"
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return
            event.stopPropagation()
            close()
          }}
        >
          <div className="panel-title">
            <strong>Feedback</strong>
            <button type="button" className="icon-button" onClick={close} aria-label="Close" title="Close (Esc)">
              ✕
            </button>
          </div>
          <label>
            What works, what doesn't, what's missing?
            <textarea
              autoFocus
              rows={6}
              maxLength={MAX_MESSAGE}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <label>
            Your name (optional)
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="side-checkbox">
            <input type="checkbox" checked={includePuzzle} onChange={(e) => setIncludePuzzle(e.target.checked)} />
            Include the open puzzle, to show what you mean
          </label>
          {error && (
            <p className="paste-error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="primary-button" disabled={!message.trim() || sending} onClick={send}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      )}
      <button
        type="button"
        ref={buttonRef}
        className="feedback-button"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        Feedback
      </button>
    </div>
  )
}
