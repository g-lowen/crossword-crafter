import { useEffect, useState } from 'react'
import { applyTheme, readTheme, type Theme } from './theme'

const THEMES: { value: Exclude<Theme, 'auto'>; label: string; title?: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'gg', label: 'GG', title: 'GG Bar colors' },
]

function computerPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * A Light / Dark / GG switch for the header. Until Sammy picks one, the app follows the computer's
 * setting and the switch shows which theme that is.
 */
export function ThemeSwitch() {
  const [theme, setTheme] = useState(readTheme)
  const [prefersDark, setPrefersDark] = useState(computerPrefersDark)

  // While following the computer, keep the switch in step if its setting changes.
  useEffect(() => {
    if (theme !== 'auto' || typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setPrefersDark(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [theme])

  const active = theme === 'auto' ? (prefersDark ? 'dark' : 'light') : theme

  return (
    <div className="segmented theme-switch" role="group" aria-label="Theme">
      {THEMES.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={active === option.value}
          title={option.title}
          onClick={() => {
            applyTheme(option.value)
            setTheme(option.value)
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
