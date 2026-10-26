/** Auto follows the computer until Sammy picks one of the others. */
export type Theme = 'auto' | 'light' | 'dark' | 'gg'

/** Also read by the script in index.html, so the right theme shows before React starts. */
export const THEME_KEY = 'crossword-crafter/theme'

export function readTheme(): Theme {
  try {
    const theme = localStorage.getItem(THEME_KEY)
    return theme === 'light' || theme === 'dark' || theme === 'gg' ? theme : 'auto'
  } catch {
    return 'auto'
  }
}

/** Auto leaves the choice to the CSS media query; light and dark override it. */
export function applyTheme(theme: Theme) {
  if (theme === 'auto') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
  try {
    if (theme === 'auto') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Not remembered in this browser, but still applied for now.
  }
}
