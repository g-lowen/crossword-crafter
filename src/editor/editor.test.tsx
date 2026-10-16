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
})
