import { describe, expect, it } from 'vitest'
import { appReducer, canRedo, canUndo, initialAppState, type AppAction, type AppState } from './history'
import { createLibrary, currentEntry } from './library'
import type { PuzzleAction } from './puzzle-reducer'
import { samplePuzzle } from './sample-puzzle'

const now = '2026-10-26T10:00:00.000Z'

function start(): AppState {
  return initialAppState(createLibrary('a', now, 'Quiz 1', samplePuzzle))
}

const edit = (action: PuzzleAction): AppAction => ({ type: 'edit', action, now })
const undo: AppAction = { type: 'undo', now }
const redo: AppAction = { type: 'redo', now }

function run(state: AppState, ...actions: AppAction[]): AppState {
  return actions.reduce(appReducer, state)
}

const answers = (state: AppState) => currentEntry(state.library).puzzle.answers.map((answer) => answer.text)

describe('appReducer', () => {
  it('has nothing to undo or redo at first', () => {
    const state = start()
    expect(canUndo(state)).toBe(false)
    expect(canRedo(state)).toBe(false)
    expect(run(state, undo, redo)).toBe(state)
  })

  it('undoes and redoes edits step by step', () => {
    const state = run(start(), edit({ type: 'remove', id: 'gorillaz' }), edit({ type: 'remove', id: 'pantera' }))
    expect(answers(state)).not.toContain('PANTERA')

    const once = run(state, undo)
    expect(answers(once)).toContain('PANTERA')
    expect(answers(once)).not.toContain('GORILLAZ')

    const twice = run(once, undo)
    expect(answers(twice)).toEqual(answers(start()))
    expect(canUndo(twice)).toBe(false)

    const back = run(twice, redo, redo)
    expect(answers(back)).toEqual(answers(state))
    expect(canRedo(back)).toBe(false)
  })

  it('forgets the redo steps after a new edit', () => {
    const state = run(start(), edit({ type: 'remove', id: 'gorillaz' }), undo, edit({ type: 'remove', id: 'pantera' }))
    expect(canRedo(state)).toBe(false)
  })

  it('ignores edits that change nothing', () => {
    const state = run(start(), edit({ type: 'reorder', fromId: 'gorillaz', toId: 'missing' }))
    expect(canUndo(state)).toBe(false)
  })

  it('undoes a paste', () => {
    const state = run(start(), { type: 'replace', puzzle: { ...samplePuzzle, answers: [] }, now })
    expect(answers(state)).toEqual([])
    expect(answers(run(state, undo))).toEqual(answers(start()))
  })

  it('merges a burst of color changes into one step', () => {
    const state = run(
      start(),
      edit({ type: 'set-highlight-color', color: '#111111' }),
      edit({ type: 'set-highlight-color', color: '#222222' }),
      edit({ type: 'set-highlight-color', color: '#333333' }),
    )
    expect(currentEntry(run(state, undo).library).puzzle.highlightColor).toBe(samplePuzzle.highlightColor)
  })

  it('keeps a separate history per puzzle', () => {
    let state = run(start(), edit({ type: 'remove', id: 'gorillaz' }))
    state = run(state, { type: 'add', id: 'b', name: 'Quiz 2', puzzle: samplePuzzle, now })
    expect(canUndo(state)).toBe(false)
    state = run(state, { type: 'open', id: 'a' })
    expect(canUndo(state)).toBe(true)
    expect(answers(run(state, undo))).toContain('GORILLAZ')
  })

  it("doesn't undo renaming, opening or adding puzzles", () => {
    const state = run(start(), { type: 'rename', id: 'a', name: 'Christmas' })
    expect(canUndo(state)).toBe(false)
  })

  it('drops the history of a deleted puzzle', () => {
    let state = run(start(), edit({ type: 'remove', id: 'gorillaz' }))
    state = run(state, { type: 'add', id: 'b', name: 'Quiz 2', puzzle: samplePuzzle, now })
    state = run(state, { type: 'delete', id: 'a', newId: 'x', now })
    expect(state.history).not.toHaveProperty('a')
  })
})
