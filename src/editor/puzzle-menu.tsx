import { useEffect, useRef, useState, type Dispatch } from 'react'
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
  showLetters: boolean
  onShowLettersChange: (value: boolean) => void
}

type Panel = 'list' | 'edit' | 'page' | 'export' | null

const now = () => new Date().toISOString()

/** Starting and switching puzzles, the Edit and Page menus, and exporting images. */
export function PuzzleMenu({ library, dispatch, commands, status, showLetters, onShowLettersChange }: PuzzleMenuProps) {
  const [panel, setPanel] = useState<Panel>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const current = currentEntry(library)

  // An open panel closes on Esc or on a click anywhere outside the menu.
  useEffect(() => {
    if (!panel) return
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setPanel(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanel(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [panel])

  const editPuzzle = (action: PuzzleAction) => dispatch({ type: 'edit', action, now: now() })

  function add(name: string, puzzle: Puzzle) {
    dispatch({ type: 'add', id: crypto.randomUUID(), name, puzzle, now: now() })
  }

  const toggle = (next: Panel) => setPanel(panel === next ? null : next)

  /** Runs a menu command and closes the menu. */
  const run = (command: () => void) => () => {
    setPanel(null)
    command()
  }

  return (
    <div className="puzzle-menu" ref={menuRef}>
      <button type="button" onClick={() => toggle('list')} aria-expanded={panel === 'list'}>
        Puzzles ▾
      </button>
      <button type="button" onClick={() => toggle('edit')} aria-expanded={panel === 'edit'} aria-haspopup="menu">
        Edit ▾
      </button>
      <button type="button" onClick={() => toggle('page')} aria-expanded={panel === 'page'}>
        Page ▾
      </button>
      <button
        type="button"
        className="primary-button"
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
        <div className="dropdown-menu" role="menu" aria-label="Edit">
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
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'page' && (
        <PageMenu
          puzzle={current.puzzle}
          dispatch={editPuzzle}
          showLetters={showLetters}
          onShowLettersChange={onShowLettersChange}
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
