import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { serializePuzzle } from '../model/persistence'
import { samplePuzzle } from '../model/sample-puzzle'
import App from '../app'

function importAnswers(text: string) {
  // The paste box folds away once there are answers.
  if (!screen.queryByLabelText('Paste answers, one per line')) {
    fireEvent.click(screen.getByRole('button', { name: '+ Add answers' }))
  }
  fireEvent.change(screen.getByLabelText('Paste answers, one per line'), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Add answers' }))
}

function loadSample() {
  fireEvent.click(screen.getByRole('button', { name: /^My puzzles/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Add sample puzzle' }))
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

  it('imports pasted answers in order and folds the paste box away', () => {
    render(<App />)
    importAnswers('abba\n\nqueen\n')
    expect(listedAnswers()).toEqual(['ABBA', 'QUEEN'])
    expect(screen.queryByLabelText('Paste answers, one per line')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '+ Add answers' }))
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
    loadSample()
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
  })

  describe('adding answers from Spotify', () => {
    const spotifyHtml = `
      <li data-testid="tracklist-row-0"><h3>Rötter</h3><h4>Lasse Tennander</h4><div>04:00</div></li>
      <li data-testid="tracklist-row-1"><h3>Everyday (feat. Rod Stewart)</h3>
        <h4><span title="Explicit">E</span>A$AP Rocky, Rod Stewart</h4><div>04:20</div></li>
      <li data-testid="tracklist-row-2"><h3>Barracuda</h3><h4>Heart</h4><div>04:21</div></li>`

    function pasteSpotify() {
      fireEvent.paste(screen.getByLabelText('Paste answers, one per line'), {
        clipboardData: { getData: (type: string) => (type === 'text/html' ? spotifyHtml : 'ignored') },
      })
      return within(screen.getByRole('dialog', { name: 'Add answers from Spotify' }))
    }

    it('suggests the first artist of each track and adds them', () => {
      render(<App />)
      const dialog = pasteSpotify()
      const answers = dialog.getAllByRole('textbox').map((input) => (input as HTMLInputElement).value)
      expect(answers).toEqual(['Lasse Tennander', 'A$AP Rocky', 'Heart'])
      fireEvent.click(dialog.getByRole('button', { name: 'Add 3 answers' }))
      expect(listedAnswers()).toEqual(['LASSE TENNANDER', 'A$AP ROCKY', 'HEART'])
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('can use titles, skip tracks and take edits', () => {
      render(<App />)
      const dialog = pasteSpotify()
      fireEvent.click(dialog.getByRole('button', { name: 'Title' }))
      fireEvent.click(dialog.getByLabelText('Include Barracuda'))
      fireEvent.change(dialog.getByLabelText('Answer for Rötter'), { target: { value: 'Rötterna' } })
      fireEvent.click(dialog.getByRole('button', { name: 'Add 2 answers' }))
      expect(listedAnswers()).toEqual(['RÖTTERNA', 'EVERYDAY'])
    })

    it('adds nothing on cancel', () => {
      render(<App />)
      fireEvent.click(pasteSpotify().getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByText('No answers yet.')).toBeInTheDocument()
    })

    it('links to the simple view when a playlist link is pasted', () => {
      render(<App />)
      fireEvent.change(screen.getByLabelText('Paste answers, one per line'), {
        target: { value: 'https://open.spotify.com/playlist/5EqwTfwVNy778orBaIEWtY?si=x' },
      })
      expect(screen.getByRole('link', { name: 'the simple view of the list' })).toHaveAttribute(
        'href',
        'https://open.spotify.com/embed/playlist/5EqwTfwVNy778orBaIEWtY',
      )
      expect(screen.getByRole('button', { name: 'Add answers' })).toBeDisabled()
    })

    it('leaves ordinary pasted text alone', () => {
      render(<App />)
      fireEvent.paste(screen.getByLabelText('Paste answers, one per line'), {
        clipboardData: { getData: (type: string) => (type === 'text/plain' ? 'ABBA\nQUEEN' : '') },
      })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('edit menu and shortcuts', () => {
    function editMenu() {
      fireEvent.click(screen.getByRole('button', { name: 'Edit ▾' }))
      return within(screen.getByRole('menu', { name: 'Edit' }))
    }

    const status = () => screen.getAllByRole('status').find((el) => el.classList.contains('menu-status'))

    it('shows every command with its shortcut', () => {
      render(<App />)
      const items = editMenu()
        .getAllByRole('menuitem')
        .map((item) => item.textContent)
      expect(items).toEqual(['UndoCtrl+Z', 'RedoCtrl+Y', 'Copy puzzleCtrl+C', 'Paste puzzleCtrl+V'])
    })

    it('copies the puzzle and its name from the menu', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
      render(<App />)
      fireEvent.change(screen.getByLabelText('Puzzle name'), { target: { value: 'Quiz 18' } })
      importAnswers('abba')
      const item = editMenu().getByRole('menuitem', { name: /Copy puzzle/ })
      await act(async () => {
        fireEvent.click(item)
      })
      const copied = JSON.parse(writeText.mock.calls[0][0])
      expect(copied.name).toBe('Quiz 18')
      expect(copied.puzzle.answers[0].text).toBe('ABBA')
      expect(status()).toHaveTextContent('Puzzle copied to the clipboard.')
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('copies with Ctrl+C', () => {
      render(<App />)
      importAnswers('abba')
      const setData = vi.fn()
      fireEvent.copy(document.body, { clipboardData: { setData } })
      expect(JSON.parse(setData.mock.calls[0][1]).puzzle.answers[0].text).toBe('ABBA')
    })

    it('leaves Ctrl+C in a text field alone', () => {
      render(<App />)
      const setData = vi.fn()
      fireEvent.copy(screen.getByLabelText('Puzzle name'), { clipboardData: { setData } })
      expect(setData).not.toHaveBeenCalled()
    })

    it('pastes with Ctrl+V into the open puzzle, keeping its name, and undoes it', () => {
      render(<App />)
      fireEvent.change(screen.getByLabelText('Puzzle name'), { target: { value: 'Quiz 18' } })
      importAnswers('abba')
      const text = serializePuzzle(samplePuzzle, 'Quiz 7')
      fireEvent.paste(document.body, { clipboardData: { getData: () => text } })
      expect(listedAnswers()).toContain('PINK FLOYD')
      expect(screen.getByLabelText('Puzzle name')).toHaveValue('Quiz 18')
      expect(screen.getByRole('button', { name: 'My puzzles (1)' })).toBeInTheDocument()

      fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true })
      expect(listedAnswers()).toEqual(['ABBA'])
    })

    it('pastes from the menu', async () => {
      const readText = vi.fn().mockResolvedValue(serializePuzzle(samplePuzzle))
      Object.defineProperty(navigator, 'clipboard', { value: { readText }, configurable: true })
      render(<App />)
      const item = editMenu().getByRole('menuitem', { name: /Paste puzzle/ })
      await act(async () => {
        fireEvent.click(item)
      })
      expect(listedAnswers()).toContain('PINK FLOYD')
    })

    it("says so when the clipboard doesn't hold a puzzle, and changes nothing", () => {
      render(<App />)
      importAnswers('abba')
      fireEvent.paste(document.body, { clipboardData: { getData: () => 'hello' } })
      expect(status()).toHaveTextContent("The clipboard doesn't contain a copied puzzle.")
      expect(listedAnswers()).toEqual(['ABBA'])
    })

    it('undoes and redoes with the keyboard and the menu', () => {
      render(<App />)
      importAnswers('abba')
      importAnswers('queen')
      fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true })
      expect(listedAnswers()).toEqual(['ABBA'])
      fireEvent.keyDown(document.body, { key: 'y', ctrlKey: true })
      expect(listedAnswers()).toEqual(['ABBA', 'QUEEN'])
      fireEvent.keyDown(document.body, { key: 'Z', ctrlKey: true, shiftKey: true })
      expect(listedAnswers()).toEqual(['ABBA', 'QUEEN'])

      fireEvent.click(editMenu().getByRole('menuitem', { name: /Undo/ }))
      expect(listedAnswers()).toEqual(['ABBA'])
      expect(editMenu().getByRole('menuitem', { name: /Redo/ })).toBeEnabled()
    })

    it('disables Undo and Redo when there is nothing to undo or redo', () => {
      render(<App />)
      const menu = editMenu()
      expect(menu.getByRole('menuitem', { name: /Undo/ })).toBeDisabled()
      expect(menu.getByRole('menuitem', { name: /Redo/ })).toBeDisabled()
    })

    it('leaves Ctrl+Z in a text field alone', () => {
      render(<App />)
      importAnswers('abba')
      fireEvent.keyDown(screen.getByLabelText('Puzzle name'), { key: 'z', ctrlKey: true })
      expect(listedAnswers()).toEqual(['ABBA'])
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
      loadSample()
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
      fireEvent.pointerDown(screen.getByRole('img', { name: 'Crossword grid' }))
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
      loadSample()
      const list = openList()
      const names = list.getAllByRole('listitem').map((item) => item.querySelector('.puzzle-entry-name')?.textContent)
      expect(names).toEqual(['Sample puzzle', 'Quiz 18'])
      expect(list.getAllByRole('listitem')[0]).toHaveTextContent(/6 answers · \d{4}-\d{2}-\d{2} \d{2}:\d{2}/)
      expect(list.getAllByTitle('Last edited')).toHaveLength(2)
    })

    it('deletes a puzzle after asking', () => {
      render(<App />)
      loadSample()
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
      loadSample()
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
