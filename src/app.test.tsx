import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './app'

describe('App', () => {
  it('renders the title and the grid', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Crossword Crafter' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Crossword grid' })).toBeInTheDocument()
  })

  it('shows the sample puzzle without issues', () => {
    render(<App />)
    expect(screen.queryByRole('region', { name: 'Issues' })).not.toBeInTheDocument()
  })

  it('can hide the letters', () => {
    const { container } = render(<App />)
    expect(container.querySelectorAll('[data-letter]').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByLabelText('Show letters'))
    expect(container.querySelectorAll('[data-letter]')).toHaveLength(0)
  })
})
