import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../app'

const WORKER_URL = 'https://feedback.example/'

/** Stands in for the feedback worker, answering with `status`. */
function worker(status = 204) {
  const fetch = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
    async () => new Response(null, { status }),
  )
  vi.stubGlobal('fetch', fetch)
  return fetch
}

function openFeedback() {
  fireEvent.click(screen.getByRole('button', { name: 'Feedback' }))
  return within(screen.getByRole('dialog', { name: 'Feedback' }))
}

const sentBody = (fetch: ReturnType<typeof worker>) => JSON.parse(String(fetch.mock.calls[0][1].body))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Feedback', () => {
  it('is only there when the feedback worker is set up', () => {
    vi.stubEnv('VITE_FEEDBACK_URL', '')
    render(<App />)
    expect(screen.queryByRole('button', { name: 'Feedback' })).not.toBeInTheDocument()
  })

  it('sends the message, the name and the open puzzle, and remembers the name', async () => {
    vi.stubEnv('VITE_FEEDBACK_URL', WORKER_URL)
    const fetch = worker()
    render(<App />)
    const box = openFeedback()
    expect(box.getByRole('button', { name: 'Send' })).toBeDisabled()
    fireEvent.change(box.getByLabelText(/What works/), { target: { value: 'The generator is great' } })
    fireEvent.change(box.getByLabelText('Your name (optional)'), { target: { value: 'Sammy' } })
    fireEvent.click(box.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('Thanks! Your feedback was sent.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Feedback' })).not.toBeInTheDocument()
    expect(fetch.mock.calls[0][0]).toBe(WORKER_URL)
    const body = sentBody(fetch)
    expect(body).toMatchObject({ message: 'The generator is great', name: 'Sammy', puzzleName: 'Untitled puzzle' })
    // In the Copy puzzle format, so it can be pasted into the app.
    expect(JSON.parse(body.puzzle)).toMatchObject({ name: 'Untitled puzzle', puzzle: { answers: [] } })

    expect(openFeedback().getByLabelText('Your name (optional)')).toHaveValue('Sammy')
  })

  it('leaves the puzzle out when asked to', async () => {
    vi.stubEnv('VITE_FEEDBACK_URL', WORKER_URL)
    const fetch = worker()
    render(<App />)
    const box = openFeedback()
    fireEvent.change(box.getByLabelText(/What works/), { target: { value: 'Hi' } })
    fireEvent.click(box.getByLabelText(/Include the open puzzle/))
    fireEvent.click(box.getByRole('button', { name: 'Send' }))
    await screen.findByText('Thanks! Your feedback was sent.')
    expect(sentBody(fetch)).not.toHaveProperty('puzzle')
  })

  it('keeps the message when it could not be sent', async () => {
    vi.stubEnv('VITE_FEEDBACK_URL', WORKER_URL)
    worker(502)
    render(<App />)
    const box = openFeedback()
    fireEvent.change(box.getByLabelText(/What works/), { target: { value: 'Hi' } })
    fireEvent.click(box.getByRole('button', { name: 'Send' }))
    expect(await box.findByRole('alert')).toHaveTextContent("Couldn't send the feedback")
    expect(box.getByLabelText(/What works/)).toHaveValue('Hi')
  })

  it('closes with Escape and gives the focus back to the button', () => {
    vi.stubEnv('VITE_FEEDBACK_URL', WORKER_URL)
    render(<App />)
    fireEvent.keyDown(openFeedback().getByLabelText(/What works/), { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Feedback' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Feedback' })).toHaveFocus()
  })
})
