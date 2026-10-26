import { useEffect, useRef } from 'react'

export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** How each shortcut is written on this computer, for showing next to the commands. */
export const SHORTCUT_LABELS = IS_MAC
  ? { undo: '⌘Z', redo: '⇧⌘Z', copy: '⌘C', paste: '⌘V' }
  : { undo: 'Ctrl+Z', redo: 'Ctrl+Y', copy: 'Ctrl+C', paste: 'Ctrl+V' }

/** Text fields keep their own undo, copy and paste. */
export function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

type ShortcutHandlers = {
  onUndo: () => void
  onRedo: () => void
  /** The text Ctrl+C puts on the clipboard. */
  copyText: () => string
  onCopied: () => void
  onPaste: (text: string) => void
}

/**
 * Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) undo and redo, Ctrl+C copies the puzzle and Ctrl+V pastes one,
 * everywhere except in text fields. Ctrl+C also leaves selected page text alone.
 */
export function useShortcuts(handlers: ShortcutHandlers) {
  const latest = useRef(handlers)
  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditable(event.target) || !(event.ctrlKey || event.metaKey) || event.altKey) return
      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        latest.current.onUndo()
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault()
        latest.current.onRedo()
      }
    }

    // Copy and paste use the clipboard events, so the browser doesn't ask for permission.
    const onCopy = (event: ClipboardEvent) => {
      if (isEditable(event.target) || document.getSelection()?.toString()) return
      event.preventDefault()
      event.clipboardData?.setData('text/plain', latest.current.copyText())
      latest.current.onCopied()
    }
    const onPaste = (event: ClipboardEvent) => {
      if (isEditable(event.target)) return
      event.preventDefault()
      latest.current.onPaste(event.clipboardData?.getData('text/plain') ?? '')
    }

    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('copy', onCopy)
    document.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('paste', onPaste)
    }
  }, [])
}
