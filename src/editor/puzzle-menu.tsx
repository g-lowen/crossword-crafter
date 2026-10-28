import { useCallback, useEffect, useRef, useState, type Dispatch, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { ExportPanel } from '../export/export-panel'
import { UNTITLED, currentEntry, type Library, type LibraryAction } from '../model/library'
import type { Puzzle } from '../model/puzzle'
import { emptyPuzzle, type PuzzleAction } from '../model/puzzle-reducer'
import { samplePuzzle } from '../model/sample-puzzle'
import { PageMenu } from './page-menu'
import { PuzzleList } from './puzzle-list'
import { SHORTCUT_LABELS } from './use-shortcuts'

export type Status = { kind: 'ok' | 'error'; text: string }

/** Undo, redo, copy and paste, shared by the Edit menu and the keyboard shortcuts. */
export type EditCommands = {
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  copy: () => void
  paste: () => void
}

type PuzzleMenuProps = {
  library: Library
  dispatch: Dispatch<LibraryAction>
  commands: EditCommands
  status: Status | null
  onStatus: (status: Status) => void
  showLetters: boolean
  onShowLettersChange: (value: boolean) => void
}

type Panel = 'list' | 'edit' | 'page' | 'export' | null

const now = () => new Date().toISOString()

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea, a[href]'

/** The up and down arrows, Home and End move between the items of a menu. */
function moveInMenu(event: ReactKeyboardEvent<HTMLElement>) {
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')]
  const at = items.indexOf(document.activeElement as HTMLElement)
  const next = {
    ArrowDown: (at + 1) % items.length,
    ArrowUp: at <= 0 ? items.length - 1 : at - 1,
    Home: 0,
    End: items.length - 1,
  }[event.key]
  if (next === undefined || items.length === 0) return
  event.preventDefault()
  items[next].focus()
}

/** Starting and switching puzzles, the Edit and Page menus, and exporting images. */
export function PuzzleMenu({
  library,
  dispatch,
  commands,
  status,
  onStatus,
  showLetters,
  onShowLettersChange,
}: PuzzleMenuProps) {
  const [panel, setPanel] = useState<Panel>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const current = currentEntry(library)

  /**
   * Closes the open panel and puts focus back on the button that opened it. Opening a puzzle gives
   * the editor a fresh menu, so the button is looked up once the change is on screen.
   */
  const close = useCallback(() => {
    if (!panel) return
    setPanel(null)
    setTimeout(() => document.querySelector<HTMLElement>(`[data-menu-button="${panel}"]`)?.focus())
  }, [panel])

  // An opened panel takes the focus, so it can be used from the keyboard right away.
  useEffect(() => {
    if (!panel) return
    const opened = menuRef.current?.querySelector('.menu-panel, [role="menu"]')
    opened?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
  }, [panel])

  // An open panel closes on Esc, or without taking the focus back on a click anywhere outside the
  // menu.
  useEffect(() => {
    if (!panel) return
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setPanel(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [panel, close])

  const editPuzzle = (action: PuzzleAction) => dispatch({ type: 'edit', action, now: now() })

  function add(name: string, puzzle: Puzzle) {
    dispatch({ type: 'add', id: crypto.randomUUID(), name, puzzle, now: now() })
  }

  const toggle = (next: Panel) => setPanel(panel === next ? null : next)

  /** Runs a menu command and closes the menu. */
  const run = (command: () => void) => () => {
    close()
    command()
  }

  return (
    <div
      className="puzzle-menu"
      ref={menuRef}
      // Tabbing out of an open panel closes it.
      onBlur={(event) => {
        const next = event.relatedTarget
        if (next instanceof Node && !menuRef.current?.contains(next)) setPanel(null)
      }}
    >
      <button type="button" data-menu-button="list" onClick={() => toggle('list')} aria-expanded={panel === 'list'}>
        Puzzles ▾
      </button>
      <button
        type="button"
        data-menu-button="edit"
        onClick={() => toggle('edit')}
        aria-expanded={panel === 'edit'}
        aria-haspopup="menu"
      >
        Edit ▾
      </button>
      <button type="button" data-menu-button="page" onClick={() => toggle('page')} aria-expanded={panel === 'page'}>
        Page ▾
      </button>
      <button
        type="button"
        className="primary-button"
        data-menu-button="export"
        onClick={() => toggle('export')}
        aria-expanded={panel === 'export'}
      >
        Export images
      </button>
      {status && (
        <span className={`menu-status menu-status--${status.kind}`} role="status">
          {status.text}
        </span>
      )}
      {panel === 'edit' && (
        <div className="dropdown-menu" role="menu" aria-label="Edit" onKeyDown={moveInMenu}>
          <MenuItem
            label="Undo"
            shortcut={SHORTCUT_LABELS.undo}
            disabled={!commands.canUndo}
            onClick={run(commands.undo)}
          />
          <MenuItem
            label="Redo"
            shortcut={SHORTCUT_LABELS.redo}
            disabled={!commands.canRedo}
            onClick={run(commands.redo)}
          />
          <div className="menu-separator" role="separator" />
          <MenuItem label="Copy puzzle" shortcut={SHORTCUT_LABELS.copy} onClick={run(commands.copy)} />
          <MenuItem label="Paste puzzle" shortcut={SHORTCUT_LABELS.paste} onClick={run(commands.paste)} />
          <p className="menu-note">Paste replaces the open puzzle.</p>
        </div>
      )}
      {panel === 'list' && (
        <PuzzleList
          library={library}
          dispatch={dispatch}
          onNew={run(() => add(UNTITLED, emptyPuzzle))}
          onAddSample={run(() => add('Sample puzzle', samplePuzzle))}
          onClose={close}
        />
      )}
      {panel === 'page' && (
        <PageMenu
          puzzle={current.puzzle}
          dispatch={editPuzzle}
          showLetters={showLetters}
          onShowLettersChange={onShowLettersChange}
          onStatus={onStatus}
        />
      )}
      {panel === 'export' && <ExportPanel puzzle={current.puzzle} name={current.name} dispatch={editPuzzle} />}
    </div>
  )
}

function MenuItem({
  label,
  shortcut,
  disabled = false,
  onClick,
}: {
  label: string
  shortcut: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button type="button" role="menuitem" className="menu-item" disabled={disabled} onClick={onClick}>
      <span>{label}</span>
      <kbd>{shortcut}</kbd>
    </button>
  )
}
