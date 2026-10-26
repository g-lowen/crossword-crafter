import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { THEME_KEY } from './theme'
import { ThemeSwitch } from './theme-switch'

afterEach(() => {
  delete document.documentElement.dataset.theme
})

const pressed = () => screen.getAllByRole('button').find((b) => b.getAttribute('aria-pressed') === 'true')?.textContent

describe('ThemeSwitch', () => {
  it('starts on Auto, which leaves the choice to the computer', () => {
    render(<ThemeSwitch />)
    expect(pressed()).toBe('Auto')
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('applies and remembers Dark and Light', () => {
    render(<ThemeSwitch />)
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')

    fireEvent.click(screen.getByRole('button', { name: 'Light' }))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(pressed()).toBe('Light')
  })

  it('forgets the choice when going back to Auto', () => {
    render(<ThemeSwitch />)
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }))
    fireEvent.click(screen.getByRole('button', { name: 'Auto' }))
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
  })

  it('shows the remembered choice', () => {
    localStorage.setItem(THEME_KEY, 'light')
    render(<ThemeSwitch />)
    expect(pressed()).toBe('Light')
  })
})
