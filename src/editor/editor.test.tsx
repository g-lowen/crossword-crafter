import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
