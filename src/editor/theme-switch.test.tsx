import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { THEME_KEY } from './theme'
import { ThemeSwitch } from './theme-switch'

afterEach(() => {
  delete document.documentElement.dataset.theme
  vi.unstubAllGlobals()
})

function computerSetTo(scheme: 'light' | 'dark') {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes(scheme),
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

const pressed = () => screen.getAllByRole('button').find((b) => b.getAttribute('aria-pressed') === 'true')?.textContent

describe('ThemeSwitch', () => {
  it('has Light, Dark and GG', () => {
    render(<ThemeSwitch />)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Light', 'Dark', 'GG'])
  })

  it('applies and remembers the GG theme', () => {
    render(<ThemeSwitch />)
    fireEvent.click(screen.getByRole('button', { name: 'GG' }))
    expect(document.documentElement.dataset.theme).toBe('gg')
    expect(localStorage.getItem(THEME_KEY)).toBe('gg')
    expect(pressed()).toBe('GG')
  })

  it("follows the computer's setting until a theme is picked", () => {
    computerSetTo('dark')
    render(<ThemeSwitch />)
    expect(pressed()).toBe('Dark')
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
  })

  it('shows Light on a light computer', () => {
    computerSetTo('light')
    render(<ThemeSwitch />)
    expect(pressed()).toBe('Light')
  })

  it('applies and remembers a picked theme, even against the computer', () => {
    computerSetTo('dark')
    render(<ThemeSwitch />)
    fireEvent.click(screen.getByRole('button', { name: 'Light' }))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
    expect(pressed()).toBe('Light')
  })

  it('shows the remembered choice', () => {
    computerSetTo('light')
    localStorage.setItem(THEME_KEY, 'dark')
    render(<ThemeSwitch />)
    expect(pressed()).toBe('Dark')
  })
})
