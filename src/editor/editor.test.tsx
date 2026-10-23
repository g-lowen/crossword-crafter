import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { serializePuzzle } from '../model/persistence'
import { samplePuzzle } from '../model/sample-puzzle'
import App from '../app'

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
    render(<App />)
    expect(screen.getByText('No answers yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add answers' })).toBeDisabled()
  })

  it('imports pasted answers in order and clears the text box', () => {
    render(<App />)
    importAnswers('abba\n\nqueen\n')
    expect(listedAnswers()).toEqual(['ABBA', 'QUEEN'])
    expect(screen.getByLabelText('Paste answers, one per line')).toHaveValue('')
  })

  it('switches the direction of an answer', () => {
    render(<App />)
    importAnswers('abba')
    fireEvent.click(screen.getByRole('button', { name: 'Direction of ABBA: right' }))
    expect(screen.getByRole('button', { name: 'Direction of ABBA: down' })).toHaveTextContent('↓')
  })

  it('removes an answer', () => {
    render(<App />)
    importAnswers('abba\nqueen')
    fireEvent.click(screen.getByRole('button', { name: 'Remove ABBA' }))
    expect(listedAnswers()).toEqual(['QUEEN'])
  })

  it('loads the sample puzzle onto the grid', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Load sample' }))
    expect(listedAnswers()).toContain('PINK FLOYD')
    expect(container.querySelectorAll('[data-answer-handle]')).toHaveLength(6)
  })

  describe('saving', () => {
    it('keeps the puzzle after a reload', () => {
      const first = render(<App />)
      importAnswers('abba\nqueen')
      first.unmount()
      render(<App />)
      expect(listedAnswers()).toEqual(['ABBA', 'QUEEN'])
    })

    it('keeps the name after a reload', () => {
      const first = render(<App />)
      fireEvent.change(screen.getByLabelText('Puzzle name'), { target: { value: 'Quiz 18' } })
      first.unmount()
      render(<App />)
      expect(screen.getByLabelText('Puzzle name')).toHaveValue('Quiz 18')
    })

    it('copies the puzzle and its name to the clipboard', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
      render(<App />)
      fireEvent.change(screen.getByLabelText('Puzzle name'), { target: { value: 'Quiz 18' } })
      importAnswers('abba')
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Copy state' }))
      })
      const copied = JSON.parse(writeText.mock.calls[0][0])
      expect(copied.name).toBe('Quiz 18')
      expect(copied.puzzle.answers[0].text).toBe('ABBA')
      expect(screen.getByText(/^Copied\./)).toBeInTheDocument()
    })

    function paste(text: string) {
      fireEvent.click(screen.getByRole('button', { name: 'Paste state' }))
      fireEvent.change(screen.getByLabelText(/^Paste a puzzle copied with Copy state/), { target: { value: text } })
      fireEvent.click(screen.getByRole('button', { name: 'Add puzzle' }))
    }

    it('adds a pasted puzzle as a new puzzle and opens it', () => {
      render(<App />)
      importAnswers('abba')
      paste(serializePuzzle(samplePuzzle, 'Quiz 7'))
      expect(listedAnswers()).toContain('PINK FLOYD')
      expect(screen.getByLabelText('Puzzle name')).toHaveValue('Quiz 7')
      expect(screen.getByRole('button', { name: 'My puzzles (2)' })).toBeInTheDocument()
      expect(screen.queryByRole('dialog', { name: 'Paste state' })).not.toBeInTheDocument()
    })

    it('explains why a pasted text could not be loaded', () => {
      render(<App />)
      paste('hello')
      expect(screen.getByRole('alert')).toHaveTextContent("That isn't a saved puzzle.")
      expect(screen.getByRole('dialog', { name: 'Paste state' })).toBeInTheDocument()
    })
  })

  describe('my puzzles', () => {
    function openList() {
      fireEvent.click(screen.getByRole('button', { name: /^My puzzles/ }))
      return within(screen.getByRole('dialog', { name: 'My puzzles' }))
    }

    const listIsOpen = () => screen.queryByRole('dialog', { name: 'My puzzles' }) !== null

    it('numbers a new puzzle whose name is taken', () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'New puzzle' }))
      expect(screen.getByLabelText('Puzzle name')).toHaveValue('Untitled puzzle (1)')
    })

    it('renames a puzzle from the list, and Esc cancels', () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'Load sample' }))
      const list = openList()
      fireEvent.click(list.getByRole('button', { name: 'Rename Untitled puzzle' }))
      const field = list.getByLabelText('New name for Untitled puzzle')
      fireEvent.change(field, { target: { value: 'Quiz 18' } })
      fireEvent.keyDown(field, { key: 'Enter' })
      expect(list.getByText('Quiz 18')).toBeInTheDocument()

      fireEvent.click(list.getByRole('button', { name: 'Rename Quiz 18' }))
      const again = list.getByLabelText('New name for Quiz 18')
      fireEvent.change(again, { target: { value: 'Nope' } })
      fireEvent.keyDown(again, { key: 'Escape' })
      expect(list.getByText('Quiz 18')).toBeInTheDocument()
      expect(listIsOpen()).toBe(true)
    })

    it('has no Open button for the puzzle that is already open', () => {
      render(<App />)
      const list = openList()
      expect(list.queryByRole('button', { name: /^Open/ })).not.toBeInTheDocument()
    })

    it('closes with Esc and with a click outside', () => {
      render(<App />)
      openList()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(listIsOpen()).toBe(false)

      openList()
      fireEvent.pointerDown(screen.getByRole('heading', { name: 'Crossword Crafter' }))
      expect(listIsOpen()).toBe(false)
    })

    it('stays open when clicking inside it', () => {
      render(<App />)
      const list = openList()
      fireEvent.pointerDown(list.getByText('My puzzles'))
      expect(listIsOpen()).toBe(true)
    })

    it('starts a new puzzle without losing the old one', () => {
      render(<App />)
      fireEvent.change(screen.getByLabelText('Puzzle name'), { target: { value: 'Quiz 18' } })
      importAnswers('abba')
      fireEvent.click(screen.getByRole('button', { name: 'New puzzle' }))
      expect(screen.getByText('No answers yet.')).toBeInTheDocument()
      expect(screen.getByLabelText('Puzzle name')).toHaveValue('Untitled puzzle')

      fireEvent.click(openList().getByRole('button', { name: 'Open Quiz 18' }))
      expect(listedAnswers()).toEqual(['ABBA'])
    })

    it('lists puzzles with their answer counts, most recent first', () => {
      render(<App />)
      fireEvent.change(screen.getByLabelText('Puzzle name'), { target: { value: 'Quiz 18' } })
      fireEvent.click(screen.getByRole('button', { name: 'Load sample' }))
      const list = openList()
      const names = list.getAllByRole('listitem').map((item) => item.querySelector('.puzzle-entry-name')?.textContent)
      expect(names).toEqual(['Sample puzzle', 'Quiz 18'])
      expect(list.getAllByRole('listitem')[0]).toHaveTextContent(/6 answers · Edited \d{4}-\d{2}-\d{2} \d{2}:\d{2}/)
      expect(list.getAllByTitle('Last edited')).toHaveLength(2)
    })

    it('duplicates a puzzle', () => {
      render(<App />)
      fireEvent.change(screen.getByLabelText('Puzzle name'), { target: { value: 'Quiz 18' } })
      importAnswers('abba')
      fireEvent.click(openList().getByRole('button', { name: 'Duplicate Quiz 18' }))
      expect(screen.getByLabelText('Puzzle name')).toHaveValue('Quiz 18 (1)')
      expect(listedAnswers()).toEqual(['ABBA'])
    })

    it('deletes a puzzle after asking', () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'Load sample' }))
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
      fireEvent.click(openList().getByRole('button', { name: 'Delete Sample puzzle' }))
      expect(confirm).toHaveBeenCalledWith('Delete "Sample puzzle"? This can\'t be undone.')
      expect(screen.getByRole('button', { name: 'My puzzles (2)' })).toBeInTheDocument()

      confirm.mockReturnValue(true)
      fireEvent.click(
        within(screen.getByRole('dialog', { name: 'My puzzles' })).getByRole('button', { name: 'Delete Sample puzzle' }),
      )
      expect(screen.getByRole('button', { name: 'My puzzles (1)' })).toBeInTheDocument()
      expect(screen.getByText('No answers yet.')).toBeInTheDocument()
    })
  })

  describe('inspector', () => {
    function loadSampleAndClick(cell: string) {
      const view = render(<App />)
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
