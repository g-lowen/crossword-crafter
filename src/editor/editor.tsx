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
import { useMemo, useReducer, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react'
import { CELL, cellOrigin } from '../grid/geometry'
import { GridView } from '../grid/grid-view'
import { describeIssue } from '../layout/describe-issue'
import { layoutAnswer, layoutPuzzle, type Piece } from '../layout/layout'
import { A4_LANDSCAPE_GRID } from '../model/page'
import type { CellRef } from '../model/puzzle'
import { emptyPuzzle, puzzleReducer } from '../model/puzzle-reducer'
import { samplePuzzle } from '../model/sample-puzzle'
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

const grid = A4_LANDSCAPE_GRID

/** Prefer list items over the list itself, so dropping on an item reorders. */
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  const item = hits.find((hit) => isListItemId(String(hit.id)))
  return item ? [item] : hits
}

export function Editor() {
  const [puzzle, dispatch] = useReducer(puzzleReducer, emptyPuzzle)
  const [showLetters, setShowLetters] = useState(true)
  const [dragging, setDragging] = useState<DragData | null>(null)
  const [previewStart, setPreviewStart] = useState<CellRef | null>(null)
  const pageRef = useRef<HTMLDivElement | null>(null)

  const layout = useMemo(() => layoutPuzzle(puzzle, grid), [puzzle])
  const piecesByAnswer = useMemo(() => {
    const map = new Map<string, Piece[]>()
    for (const pieces of layout.cells.values()) {
      for (const piece of pieces) map.set(piece.answerId, [...(map.get(piece.answerId) ?? []), piece])
    }
    return map
  }, [layout])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const draggedAnswer = dragging ? puzzle.answers.find((a) => a.id === dragging.answerId) : undefined

  /** Where the dragged answer starts if dropped now. Grid drags snap by cells; list drags put the first letter under the pointer. */
  function targetStart(event: DragMoveEvent | DragEndEvent): CellRef | null {
    const data = event.active.data.current as DragData | undefined
    const rect = pageRef.current?.getBoundingClientRect()
    const answer = data && puzzle.answers.find((a) => a.id === data.answerId)
    if (!data || !rect || !answer) return null

    if (data.source === 'grid' && answer.start) {
      return moveByPixels(answer.start, event.delta, rect.width / grid.columns)
    }
    const pointer = event.activatorEvent as PointerEvent
    if (typeof pointer.clientX !== 'number') return null
    return cellAtPoint(rect, grid, { x: pointer.clientX + event.delta.x, y: pointer.clientY + event.delta.y })
  }

  function handleDragStart(event: DragStartEvent) {
    setDragging((event.active.data.current as DragData | undefined) ?? null)
  }

  function handleDragMove(event: DragMoveEvent) {
    setPreviewStart(event.over?.id === GRID_ID ? targetStart(event) : null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const data = event.active.data.current as DragData | undefined
    const overId = event.over ? String(event.over.id) : null
    setDragging(null)
    setPreviewStart(null)
    if (!data || !overId) return

    if (overId === GRID_ID) {
      const start = targetStart(event)
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
  }

  const preview =
    draggedAnswer && previewStart
      ? { pieces: layoutAnswer(draggedAnswer, previewStart).pieces, color: puzzle.highlightColor }
      : undefined

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
          <h1>Crossword Crafter</h1>
          <label>
            <input type="checkbox" checked={showLetters} onChange={(e) => setShowLetters(e.target.checked)} /> Show
            letters
          </label>
          <button type="button" onClick={() => dispatch({ type: 'load', puzzle: samplePuzzle })}>
            Load sample
          </button>
        </header>

        <AnswerList
          answers={puzzle.answers}
          onImport={(texts) =>
            dispatch({ type: 'import', answers: texts.map((text) => ({ id: crypto.randomUUID(), text })) })
          }
          onToggleDirection={(id) => dispatch({ type: 'toggle-direction', id })}
          onRemove={(id) => dispatch({ type: 'remove', id })}
        />

        <div className="workspace">
          <GridDropArea pageRef={pageRef}>
            <GridView puzzle={puzzle} layout={layout} mode="editor" showLetters={showLetters} grid={grid} preview={preview}>
              {[...piecesByAnswer].map(([answerId, pieces]) => (
                <AnswerHandle key={answerId} answerId={answerId} pieces={pieces} dimmed={dragging?.answerId === answerId} />
              ))}
            </GridView>
          </GridDropArea>

          {layout.issues.length > 0 && (
            <section className="issues" aria-label="Issues">
              <h2>Issues</h2>
              <ul>
                {layout.issues.map((issue, i) => (
                  <li key={i}>{describeIssue(issue, puzzle)}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
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
function GridDropArea({ pageRef, children }: { pageRef: RefObject<HTMLDivElement | null>; children: ReactNode }) {
  const { setNodeRef } = useDroppable({ id: GRID_ID })
  return (
    <div
      className="page"
      ref={(element) => {
        pageRef.current = element
        setNodeRef(element)
      }}
    >
      {children}
    </div>
  )
}

/** An invisible hit area over a placed answer's cells, so it can be dragged around the grid. */
function AnswerHandle({ answerId, pieces, dimmed }: { answerId: string; pieces: Piece[]; dimmed: boolean }) {
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
          />
        )
      })}
    </g>
  )
}
