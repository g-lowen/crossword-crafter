import { useEffect, useRef, useState } from 'react'
import { DEFAULT_GENERATE_SETTINGS, MAX_CROSSINGS_SETTING, type GenerateSettings } from '../generate/rules'

const SETTINGS_KEY = 'crossword-crafter/generate-settings'

/** The settings from last time, kept for every puzzle in this browser like the theme. */
function readGenerateSettings(): GenerateSettings {
  try {
    const saved: Partial<GenerateSettings> = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
    const count = (value: unknown) =>
      Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_CROSSINGS_SETTING
    const settings = { ...DEFAULT_GENERATE_SETTINGS }
    if (typeof saved.bendBetweenWordsOnly === 'boolean') settings.bendBetweenWordsOnly = saved.bendBetweenWordsOnly
    if (count(saved.minCrossings)) settings.minCrossings = saved.minCrossings!
    if (saved.maxCrossings === null || (count(saved.maxCrossings) && saved.maxCrossings! >= 1)) {
      settings.maxCrossings = saved.maxCrossings!
    }
    if (settings.maxCrossings !== null) settings.minCrossings = Math.min(settings.minCrossings, settings.maxCrossings)
    return settings
  } catch {
    return DEFAULT_GENERATE_SETTINGS
  }
}

function saveGenerateSettings(settings: GenerateSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Not remembered in this browser, but still used for now.
  }
}

const isDefault = (settings: GenerateSettings) =>
  settings.bendBetweenWordsOnly === DEFAULT_GENERATE_SETTINGS.bendBetweenWordsOnly &&
  settings.minCrossings === DEFAULT_GENERATE_SETTINGS.minCrossings &&
  settings.maxCrossings === DEFAULT_GENERATE_SETTINGS.maxCrossings

/** The settings in a few words, for the gear button's tooltip. */
function describe(settings: GenerateSettings): string {
  const { minCrossings, maxCrossings, bendBetweenWordsOnly } = settings
  const crossings =
    maxCrossings === null
      ? `${minCrossings}+`
      : minCrossings === maxCrossings
        ? `${minCrossings}`
        : `${minCrossings}–${maxCrossings}`
  return `${crossings} crossings${bendBetweenWordsOnly ? ', bends between words' : ''}`
}

const COUNTS = Array.from({ length: MAX_CROSSINGS_SETTING + 1 }, (_, i) => i)

type GenerateRowProps = {
  disabled: boolean
  onGenerate: (settings: GenerateSettings) => void
}

/** The Generate solution button, and a gear beside it for the settings of the rules it follows. */
export function GenerateRow({ disabled, onGenerate }: GenerateRowProps) {
  const [settings, setSettings] = useState(readGenerateSettings)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const gearRef = useRef<HTMLButtonElement>(null)

  function change(next: Partial<GenerateSettings>) {
    const changed = { ...settings, ...next }
    saveGenerateSettings(changed)
    setSettings(changed)
  }

  function close() {
    setOpen(false)
    gearRef.current?.focus()
  }

  // Like the header panels, the panel closes on Esc, or without taking the focus on a click outside.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const { minCrossings, maxCrossings, bendBetweenWordsOnly } = settings
  const changed = !isDefault(settings)

  return (
    <div className="generate-row" ref={ref}>
      <button
        type="button"
        className="primary-button"
        disabled={disabled}
        title="Place the checked answers on the page at random, crossing each other, around the locked ones. Each click gives a new layout."
        onClick={() => onGenerate(settings)}
      >
        Generate solution
      </button>
      <button
        type="button"
        ref={gearRef}
        className={`icon-button generate-gear${changed ? ' generate-gear--changed' : ''}`}
        aria-label="Generate solution settings"
        aria-expanded={open}
        title={`Settings: ${describe(settings)}`}
        onClick={() => (open ? close() : setOpen(true))}
      >
        ⚙︎
      </button>
      {open && (
        <div
          className="generate-settings"
          role="dialog"
          aria-label="Generate solution settings"
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return
            event.stopPropagation()
            close()
          }}
        >
          <div className="panel-title">
            <strong>Generate solution</strong>
            <button type="button" className="icon-button" onClick={close} aria-label="Close" title="Close (Esc)">
              ✕
            </button>
          </div>
          <label className="side-checkbox">
            <span className="hit-area hit-area--inline">
              <input
                type="checkbox"
                autoFocus
                checked={bendBetweenWordsOnly}
                onChange={(e) => change({ bendBetweenWordsOnly: e.target.checked })}
              />
            </span>
            Only bend between words
          </label>
          <p className="hint">At a space, - or /. Not at ' inside words like DON'T.</p>
          <fieldset className="generate-crossings">
            <legend>Crossings per answer</legend>
            <label>
              At least
              <select
                value={minCrossings}
                onChange={(e) => {
                  const min = Number(e.target.value)
                  // Raising the least above the most raises the most along with it.
                  change({ minCrossings: min, maxCrossings: maxCrossings === null ? null : Math.max(maxCrossings, min, 1) })
                }}
              >
                {COUNTS.map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
            <label>
              At most
              <select
                value={maxCrossings ?? ''}
                onChange={(e) => {
                  const max = e.target.value === '' ? null : Number(e.target.value)
                  change({ maxCrossings: max, minCrossings: max === null ? minCrossings : Math.min(minCrossings, max) })
                }}
              >
                <option value="">No limit</option>
                {COUNTS.slice(1).map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          <p className="hint">Rules that can't be kept are named after generating.</p>
          <button
            type="button"
            className="link-button"
            disabled={!changed}
            onClick={() => change(DEFAULT_GENERATE_SETTINGS)}
          >
            Back to the defaults
          </button>
        </div>
      )}
    </div>
  )
}
