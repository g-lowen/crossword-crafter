import { useState } from 'react'
import { applyTheme, readTheme, type Theme } from './theme'

const THEMES: { value: Theme; label: string; title: string }[] = [
  { value: 'auto', label: 'Auto', title: "Follow the computer's light or dark setting" },
  { value: 'light', label: 'Light', title: 'Always light' },
  { value: 'dark', label: 'Dark', title: 'Always dark' },
]

/** A small Auto / Light / Dark switch for the header. */
export function ThemeSwitch() {
  const [theme, setTheme] = useState(readTheme)
  return (
    <div className="segmented theme-switch" role="group" aria-label="Theme">
      {THEMES.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={theme === option.value}
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
