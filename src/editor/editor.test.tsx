import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { serializePuzzle } from '../model/persistence'
import { samplePuzzle } from '../model/sample-puzzle'
import { Editor } from './editor'

function importAnswers(text: string) {
  fireEvent.change(screen.getByLabelText('Paste answers, one per line'), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Add answers' }))
}

function listedAnswers() {
  return within(screen.getByRole('region', { name: 'Answers' }))
    .queryAllByRole('listitem')
    .map((item) => item.querySelector('.answer-text')?.textContent)
}

describe('Editor', () => {
  it('starts empty', () => {
    render(<Editor />)
    expect(screen.getByText('No answers yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add answers' })).toBeDisabled()
  })

  it('imports pasted answers in order and clears the text box', () => {
    render(<Editor />)
    importAnswers('abba\n\nqueen\n')
    expect(listedAnswers()).toEqual(['ABBA', 'QUEEN'])
    expect(screen.getByLabelText('Paste answers, one per line')).toHaveValue('')
  })

  it('switches the direction of an answer', () => {
    render(<Editor />)
    importAnswers('abba')
    fireEvent.click(screen.getByRole('button', { name: 'Direction of ABBA: right' }))
    expect(screen.getByRole('button', { name: 'Direction of ABBA: down' })).toHaveTextContent('↓')
  })

  it('removes an answer', () => {
    render(<Editor />)
    importAnswers('abba\nqueen')
    fireEvent.click(screen.getByRole('button', { name: 'Remove ABBA' }))
    expect(listedAnswers()).toEqual(['QUEEN'])
  })

  it('loads the sample puzzle onto the grid', () => {
    const { container } = render(<Editor />)
    fireEvent.click(screen.getByRole('button', { name: 'Load sample' }))
    expect(listedAnswers()).toContain('PINK FLOYD')
    expect(container.querySelectorAll('[data-answer-handle]')).toHaveLength(6)
  })

  describe('saving', () => {
    it('keeps the puzzle after a reload', () => {
      const first = render(<Editor />)
      importAnswers('abba\nqueen')
      first.unmount()
      render(<Editor />)
      expect(listedAnswers()).toEqual(['ABBA', 'QUEEN'])
    })

    it('asks before replacing a puzzle with answers, and keeps it on cancel', () => {
      render(<Editor />)
      importAnswers('abba')
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
      fireEvent.click(screen.getByRole('button', { name: 'New puzzle' }))
      expect(confirm).toHaveBeenCalledOnce()
      expect(listedAnswers()).toEqual(['ABBA'])

      confirm.mockReturnValue(true)
      fireEvent.click(screen.getByRole('button', { name: 'New puzzle' }))
      expect(screen.getByText('No answers yet.')).toBeInTheDocument()
    })

    it("doesn't ask when the puzzle is empty", () => {
      render(<Editor />)
      const confirm = vi.spyOn(window, 'confirm')
      fireEvent.click(screen.getByRole('button', { name: 'Load sample' }))
      expect(confirm).not.toHaveBeenCalled()
    })

    it('copies the puzzle to the clipboard', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
      render(<Editor />)
      importAnswers('abba')
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Copy state' }))
      })
      expect(JSON.parse(writeText.mock.calls[0][0]).puzzle.answers[0].text).toBe('ABBA')
      expect(screen.getByText(/^Copied\./)).toBeInTheDocument()
    })

    it('loads a pasted puzzle', () => {
      render(<Editor />)
      fireEvent.click(screen.getByRole('button', { name: 'Paste state' }))
      fireEvent.change(screen.getByLabelText('Paste a puzzle copied with Copy state'), {
        target: { value: serializePuzzle(samplePuzzle) },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Load' }))
      expect(listedAnswers()).toContain('PINK FLOYD')
      expect(screen.queryByRole('dialog', { name: 'Paste state' })).not.toBeInTheDocument()
    })

    it('explains why a pasted text could not be loaded', () => {
      render(<Editor />)
      fireEvent.click(screen.getByRole('button', { name: 'Paste state' }))
      fireEvent.change(screen.getByLabelText('Paste a puzzle copied with Copy state'), {
        target: { value: 'hello' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Load' }))
      expect(screen.getByRole('alert')).toHaveTextContent("That isn't a saved puzzle.")
      expect(screen.getByRole('dialog', { name: 'Paste state' })).toBeInTheDocument()
    })
  })

  describe('inspector', () => {
    function loadSampleAndClick(cell: string) {
      const view = render(<Editor />)
      fireEvent.click(screen.getByRole('button', { name: 'Load sample' }))
      fireEvent.click(view.container.querySelector(`[data-cell="${cell}"]`)!)
      return view
    }

    it('opens for the clicked cell and closes with Escape', () => {
      loadSampleAndClick('2,3')
      const inspector = screen.getByRole('region', { name: 'Selected cell' })
      expect(inspector).toHaveTextContent('THE BEATLES')
      expect(inspector).toHaveTextContent('character 2 (H)')
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(screen.queryByRole('region', { name: 'Selected cell' })).not.toBeInTheDocument()
    })

    it('adds a turn, which moves the rest of the answer', () => {
      const { container } = loadSampleAndClick('2,3')
      fireEvent.click(screen.getByRole('button', { name: 'Turn down' }))
      expect(container.querySelectorAll('[data-turn-marker]')).toHaveLength(2)
      expect(container.querySelector('[data-cell="3,3"]')).not.toBeNull()
    })

    it('removes a turn when its button is clicked again', () => {
      const { container } = loadSampleAndClick('2,3')
      fireEvent.click(screen.getByRole('button', { name: 'Turn down' }))
      expect(screen.getByRole('button', { name: 'Turn down' })).toHaveAttribute('aria-pressed', 'true')
      fireEvent.click(screen.getByRole('button', { name: 'Turn down' }))
      expect(screen.getByRole('button', { name: 'Turn down' })).toHaveAttribute('aria-pressed', 'false')
      expect(container.querySelectorAll('[data-turn-marker]')).toHaveLength(1)
    })

    it('marks an anagram letter with the next number', () => {
      const { container } = loadSampleAndClick('2,3')
      fireEvent.click(screen.getByLabelText('Anagram letter'))
      expect(screen.getByLabelText('Number')).toHaveValue(4)
      expect(container.querySelectorAll('[data-anagram-cell]')).toHaveLength(4)
    })

    it('makes a space wide', () => {
      const { container } = loadSampleAndClick('2,5')
      fireEvent.click(screen.getByLabelText('Wide space (2 cells)'))
      expect(container.querySelectorAll('[data-wide-space]')).toHaveLength(2)
    })

    it('toggles a thick border', () => {
      const { container } = loadSampleAndClick('2,3')
      fireEvent.click(screen.getByRole('button', { name: 'Bottom' }))
      expect(container.querySelectorAll('[data-separator]')).toHaveLength(2)
      fireEvent.click(screen.getByRole('button', { name: 'Bottom' }))
      expect(container.querySelectorAll('[data-separator]')).toHaveLength(1)
    })
  })
})
