import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './app'

describe('App', () => {
  it('renders the editor', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Crossword Crafter' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Crossword grid' })).toBeInTheDocument()
  })
})
