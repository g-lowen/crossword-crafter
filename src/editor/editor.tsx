import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useEffect, useMemo, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react'
import { CELL, cellOrigin } from '../grid/geometry'
import { GridView } from '../grid/grid-view'
import { leftToRightOrder } from '../layout/anagram'
import { describeIssue } from '../layout/describe-issue'
import { cellKey, layoutAnswer, layoutPuzzle, type Piece } from '../layout/layout'
import { nextGroupColor } from '../model/groups'
import { A4_LANDSCAPE_GRID } from '../model/page'
import type { CellRef, Puzzle } from '../model/puzzle'
import type { PuzzleAction } from '../model/puzzle-reducer'
import { AnswerList } from './answer-list'
import {
  ANSWER_LIST_ID,
  GRID_ID,
  answerIdFromListItem,
  gridHandleId,
  isListItemId,
  type DragData,
} from './drag-ids'
import { cellAtPoint, moveByPixels } from './grid-coordinates'
import { Inspector } from './inspector'
import { selectAt, validSelection, type Selection } from './selection'

const grid = A4_LANDSCAPE_GRID

type Point = { x: number; y: number }

const contains = (rect: DOMRect, point: Point) =>
  point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom

/** Prefer list items over the list itself, so dropping on an item reorders. */
function preferListItems<T extends { id: string | number }>(hits: T[]): T[] {
  const item = hits.find((hit) => isListItemId(String(hit.id)))
  return item ? [item] : hits
}

type EditorProps = {
  puzzle: Puzzle
  dispatch: (action: PuzzleAction) => void
  /** Shown next to the title. */
  nameField: ReactNode
  /** Puzzle-level actions such as New puzzle, the Edit menu and Export images. */
  menu: ReactNode
  saveFailed: boolean
}

export function Editor({ puzzle, dispatch, nameField, menu, saveFailed }: EditorProps) {
  const [showLetters, setShowLetters] = useState(true)
  const [dragging, setDragging] = useState<DragData | null>(null)
  const [previewStart, setPreviewStart] = useState<CellRef | null>(null)
  const [rawSelection, setSelection] = useState<Selection | null>(null)
  const pageRef = useRef<HTMLDivElement | null>(null)

  // The real pointer position during a mouse drag. dnd-kit's own position is off by the answer
  // list's scroll when an answer is dragged out of a scrolled list, so drops and hit tests use this
  // instead. Null during keyboard drags, which fall back to dnd-kit.
  const pointerRef = useRef<Point | null>(null)
  const dragOriginRef = useRef<Point | null>(null)
  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (dragOriginRef.current) pointerRef.current = { x: event.clientX, y: event.clientY }
    }
    window.addEventListener('pointermove', onPointerMove, { capture: true })
    return () => window.removeEventListener('pointermove', onPointerMove, { capture: true })
  }, [])

  /**
   * What's under the real pointer. The grid and the list are measured now, so scrolling can't put
   * them out of step. List rows use the positions dnd-kit measured when the drag started, because
   * their current positions slide aside to make room for the dragged answer.
   */
  const collisionDetection: CollisionDetection = (args) => {
    const pointer = pointerRef.current
    if (!pointer) return preferListItems(pointerWithin(args))
    const hits = args.droppableContainers
      .filter((container) => {
        const rect = isListItemId(String(container.id))
          ? args.droppableRects.get(container.id)
          : container.node.current?.getBoundingClientRect()
        return rect !== undefined && contains(rect as DOMRect, pointer)
      })
      .map((container) => ({ id: container.id, data: { droppableContainer: container, value: 0 } }))
    return preferListItems(hits)
  }

  const layout = useMemo(() => layoutPuzzle(puzzle, grid), [puzzle])
  const piecesByAnswer = useMemo(() => {
    const map = new Map<string, Piece[]>()
    for (const pieces of layout.cells.values()) {
      for (const piece of pieces) map.set(piece.answerId, [...(map.get(piece.answerId) ?? []), piece])
    }
    return map
  }, [layout])
  const selection = validSelection(layout, rawSelection)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelection(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const draggedAnswer = dragging ? puzzle.answers.find((a) => a.id === dragging.answerId) : undefined

  /**
   * Where the dragged answer starts if dropped now. Grid drags snap by whole cells; list drags put
   * the first letter under the pointer.
   */
  function targetStart(event: DragMoveEvent | DragEndEvent): CellRef | null {
    const data = event.active.data.current as DragData | undefined
    const rect = pageRef.current?.getBoundingClientRect()
    if (!data || !rect) return null
    const answer = puzzle.answers.find((a) => a.id === data.answerId)
    if (!answer) return null

    const pointer = pointerRef.current
    const origin = dragOriginRef.current
    const delta = pointer && origin ? { x: pointer.x - origin.x, y: pointer.y - origin.y } : event.delta

    if (data.source === 'grid' && answer.start) {
      return moveByPixels(answer.start, delta, rect.width / grid.columns)
    }
    if (pointer) return cellAtPoint(rect, grid, pointer)
    const activator = event.activatorEvent as PointerEvent
    if (typeof activator.clientX !== 'number') return null
    return cellAtPoint(rect, grid, { x: activator.clientX + delta.x, y: activator.clientY + delta.y })
  }

  function handleDragStart(event: DragStartEvent) {
    setDragging((event.active.data.current as DragData | undefined) ?? null)
    const activator = event.activatorEvent as PointerEvent
    const start = typeof activator.clientX === 'number' ? { x: activator.clientX, y: activator.clientY } : null
    dragOriginRef.current = start
    pointerRef.current = start
  }

  function endPointerTracking() {
    dragOriginRef.current = null
    pointerRef.current = null
  }

  function handleDragMove(event: DragMoveEvent) {
    setPreviewStart(event.over?.id === GRID_ID ? targetStart(event) : null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const data = event.active.data.current as DragData | undefined
    const overId = event.over ? String(event.over.id) : null
    const start = overId === GRID_ID ? targetStart(event) : null
    setDragging(null)
    setPreviewStart(null)
    endPointerTracking()
    if (!data || !overId) return

    if (overId === GRID_ID) {
      if (start) dispatch({ type: 'place', id: data.answerId, start })
    } else if (data.source === 'grid' && (overId === ANSWER_LIST_ID || isListItemId(overId))) {
      dispatch({ type: 'unplace', id: data.answerId })
    } else if (data.source === 'list' && isListItemId(overId)) {
      dispatch({ type: 'reorder', fromId: data.answerId, toId: answerIdFromListItem(overId) })
    }
  }

  function handleDragCancel() {
    setDragging(null)
    setPreviewStart(null)
    endPointerTracking()
  }

  const preview =
    draggedAnswer && previewStart
      ? { pieces: layoutAnswer(draggedAnswer, previewStart).pieces, color: puzzle.highlightColor }
      : undefined

  function handleCellClick(answerId: string, cell: CellRef) {
    setSelection(selectAt(layout, cell, answerId, selection))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="editor">
        <header className="app-header">
          {nameField}
          {menu}
          {saveFailed && (
            <p className="save-warning" role="alert">
              This browser won't save your puzzles, so they will be lost when the page closes. Use Copy
              puzzle in the Edit menu to keep them.
            </p>
          )}
        </header>

        <AnswerList
          answers={puzzle.answers}
          groups={puzzle.groups}
          groupActions={{
            add: (start) => dispatch({ type: 'add-group', start, color: nextGroupColor(puzzle.groups) }),
            remove: (start) => dispatch({ type: 'remove-group', start }),
            setColor: (start, color) => dispatch({ type: 'set-group-color', start, color }),
            setName: (start, name) => dispatch({ type: 'set-group-name', start, name }),
          }}
          onImport={(texts) =>
            dispatch({ type: 'import', answers: texts.map((text) => ({ id: crypto.randomUUID(), text })) })
          }
          onEdit={(id, text) => dispatch({ type: 'set-text', id, text })}
          onRemove={(id) => dispatch({ type: 'remove', id })}
        />

        <div className="workspace">
          <GridDropArea pageRef={pageRef} onBackgroundClick={() => setSelection(null)}>
            <GridView
              puzzle={puzzle}
              layout={layout}
              mode="editor"
              showLetters={showLetters}
              grid={grid}
              preview={preview}
            >
              {selection && (
                <SelectionOverlay
                  pieces={piecesByAnswer.get(selection.answerId) ?? []}
                  cell={selection.cell}
                  color={puzzle.highlightColor}
                />
              )}
              {[...piecesByAnswer].map(([answerId, answerPieces]) => (
                <AnswerHandle
                  key={answerId}
                  answerId={answerId}
                  pieces={answerPieces}
                  dimmed={dragging?.source === 'grid' && dragging.answerId === answerId}
                  onCellClick={handleCellClick}
                />
              ))}
            </GridView>
          </GridDropArea>
        </div>

        {/* Everything about the selected cell and the puzzle's display, beside the grid so the grid
            can use the full height of a laptop screen. */}
        <aside className="side-panel">
          {selection ? (
            <Inspector
              puzzle={puzzle}
              layout={layout}
              selection={selection}
              dispatch={dispatch}
              onClose={() => setSelection(null)}
            />
          ) : (
            <section className="side-section">
              <h2>Cell</h2>
              <p className="hint">Click a cell to add turns, wide spaces, anagram letters and thick borders.</p>
            </section>
          )}

          <section className="side-section" aria-label="Display">
            <h2>Display</h2>
            <label>
              <input type="checkbox" checked={showLetters} onChange={(e) => setShowLetters(e.target.checked)} />{' '}
              Show letters
            </label>
          </section>

          <section className="side-section" aria-label="Anagram">
            <h2>Anagram</h2>
            <label>
              <input
                type="checkbox"
                checked={puzzle.anagram.showNumbersAndBar}
                onChange={(e) => dispatch({ type: 'set-show-anagram-numbers', value: e.target.checked })}
              />{' '}
              Show anagram numbers and bar
            </label>
            <button
              type="button"
              disabled={layout.anagramCells.length === 0}
              onClick={() => dispatch({ type: 'renumber-anagram', order: leftToRightOrder(layout) })}
              title="Number the anagram letters column by column from the left"
            >
              Number anagram left to right
            </button>
          </section>

          {layout.issues.length > 0 && (
            <section className="side-section issues" aria-label="Issues">
              <h2>Issues ({layout.issues.length})</h2>
              <ul>
                {layout.issues.map((issue, i) => (
                  <li key={i}>{describeIssue(issue, puzzle)}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging?.source === 'list' && draggedAnswer && !previewStart ? (
          <div className="drag-chip">{draggedAnswer.text}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

/** The page the grid sits on. It has to be a child of DndContext to register as a drop target. */
function GridDropArea({
  pageRef,
  onBackgroundClick,
  children,
}: {
  pageRef: RefObject<HTMLDivElement | null>
  onBackgroundClick: () => void
  children: ReactNode
}) {
  const { setNodeRef } = useDroppable({ id: GRID_ID })
  return (
    <div
      className="page"
      ref={(element) => {
        pageRef.current = element
        setNodeRef(element)
      }}
      onClick={onBackgroundClick}
    >
      {children}
    </div>
  )
}

/** An invisible hit area over a placed answer's cells, so it can be clicked and dragged around the grid. */
function AnswerHandle({
  answerId,
  pieces,
  dimmed,
  onCellClick,
}: {
  answerId: string
  pieces: Piece[]
  dimmed: boolean
  onCellClick: (answerId: string, cell: CellRef) => void
}) {
  const { setNodeRef, listeners, attributes } = useDraggable({
    id: gridHandleId(answerId),
    data: { answerId, source: 'grid' } satisfies DragData,
  })
  return (
    <g
      ref={setNodeRef as unknown as Ref<SVGGElement>}
      {...listeners}
      {...attributes}
      className="answer-hit-area"
      data-answer-handle={answerId}
    >
      {pieces.map((piece) => {
        const { x, y } = cellOrigin(piece)
        return (
          <rect
            key={`${piece.index}-${piece.widePart ?? 0}`}
            x={x}
            y={y}
            width={CELL}
            height={CELL}
            fill="white"
            fillOpacity={dimmed ? 0.6 : 0}
            data-cell={cellKey(piece)}
            onClick={(event) => {
              event.stopPropagation()
              onCellClick(answerId, { row: piece.row, col: piece.col })
            }}
          />
        )
      })}
    </g>
  )
}

/** Tints the selected answer and outlines the selected cell. */
function SelectionOverlay({ pieces, cell, color }: { pieces: Piece[]; cell: CellRef; color: string }) {
  const selected = cellOrigin(cell)
  return (
    <g data-selection="" pointerEvents="none">
      {pieces.map((piece) => {
        const { x, y } = cellOrigin(piece)
        return (
          <rect
            key={`${piece.index}-${piece.widePart ?? 0}`}
            x={x}
            y={y}
            width={CELL}
            height={CELL}
            fill={color}
            fillOpacity={0.12}
          />
        )
      })}
      <rect
        x={selected.x + 0.4}
        y={selected.y + 0.4}
        width={CELL - 0.8}
        height={CELL - 0.8}
        fill="none"
        stroke={color}
        strokeWidth={0.8}
      />
    </g>
  )
}
