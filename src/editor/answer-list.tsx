import { useDndContext, useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, type SortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRef, useState } from 'react'
import { groupAt, groupLabel, runStart } from '../model/groups'
import type { Answer, AnswerGroup } from '../model/puzzle'
import {
  ANSWER_LIST_ID,
  groupItemId,
  listItemId,
  noGroupId,
  runStartAt,
  type DragData,
  type GroupDragData,
} from './drag-ids'
import { normalizeAnswer, parseAnswerList } from './parse-answer-list'
import { PenIcon } from './pen-icon'
import { embedLink, parseSpotifyPaste, parseSpotifyText, type SpotifyTrack } from './spotify'
import { SpotifyImport } from './spotify-import'

/** Dividing the list into groups, such as the mini puzzles in a grid with several. */
export type GroupActions = {
  add: (start: number) => void
  remove: (start: number) => void
  setColor: (start: number, color: string) => void
  setName: (start: number, name: string) => void
}

/** A dragged group moves as a block, so the rows don't slide aside for it. */
const keepRowsInPlace: SortingStrategy = () => null

/** Where a dragged group would land: above the first row of the answer at `index`, or below it. */
type DropLine = { side: 'above' | 'below'; index: number }

function dropLine(groups: AnswerGroup[], answerCount: number, dragged: number, target: number | null): DropLine | null {
  if (target === null || target === dragged) return null
  if (target < dragged) return { side: 'above', index: target }
  // Dragged down it goes after the run it's dropped on: a group, or answers without one.
  const end =
    groups.find((group) => group.start === target)?.end ??
    groups.find((group) => group.start > target)?.start ??
    answerCount
  return { side: 'below', index: end - 1 }
}

/**
 * Where an answer can be dropped to leave its group: after each group, and above the first one when
 * it starts the list. Given as the list index the answer would land before.
 */
function noGroupSpots(groups: AnswerGroup[]): number[] {
  const spots = groups.map((group) => group.end)
  if (groups[0]?.start === 0) spots.unshift(0)
  return [...new Set(spots)]
}

type AnswerListProps = {
  answers: Answer[]
  groups: AnswerGroup[]
  groupActions: GroupActions
  onImport: (texts: string[]) => void
  onEdit: (id: string, text: string) => void
  onRemove: (id: string) => void
}

export function AnswerList({
  answers,
  groups,
  groupActions,
  onImport,
  onEdit,
  onRemove,
}: AnswerListProps) {
  const [text, setText] = useState('')
  // The paste box takes room from the list, so it's folded away once there are answers.
  const [importOpen, setImportOpen] = useState(answers.length === 0)
  const { setNodeRef, isOver } = useDroppable({ id: ANSWER_LIST_ID })
  const showImport = importOpen || answers.length === 0
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrack[] | null>(null)
  const spotifyLink = embedLink(text)
  // Off by default, so an answer dragged back from the grid can't land somewhere else in the list,
  // and the list only shows what's needed for placing answers.
  const [editable, setEditable] = useState(false)
  const { active, over } = useDndContext()
  const groupDrag = active?.data.current as GroupDragData | DragData | undefined
  const draggedGroup = groupDrag?.source === 'group' ? groupDrag.start : null
  const line =
    draggedGroup === null
      ? null
      : dropLine(groups, answers.length, draggedGroup, over ? runStartAt(answers, groups, String(over.id)) : null)
  const inDraggedGroup = (index: number) => draggedGroup !== null && runStart(groups, index) === draggedGroup
  // While an answer is dragged within the list, spots appear for taking it out of its group.
  const spots = editable && groupDrag?.source === 'list' ? noGroupSpots(groups) : []

  const finish = (texts: string[]) => {
    onImport(texts)
    setText('')
    setImportOpen(false)
    setSpotifyTracks(null)
  }

  const importAnswers = () => {
    // A Spotify list typed or dropped in, rather than pasted, still gets the preview.
    const tracks = parseSpotifyText(text)
    if (tracks) {
      setSpotifyTracks(tracks)
      return
    }
    const texts = parseAnswerList(text)
    if (texts.length > 0) finish(texts)
  }

  return (
    <aside className="answer-panel">
      <div className="panel-heading">
        <h2>Answers {answers.length > 0 && `(${answers.length})`}</h2>
        {answers.length > 0 && (
          <button type="button" className="link-button" onClick={() => setImportOpen(!importOpen)}>
            {importOpen ? 'Cancel' : '+ Add answers'}
          </button>
        )}
      </div>

      {showImport && (
        <div className="import">
          <label>
            <span>Paste answers, one per line</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={(e) => {
                const tracks = parseSpotifyPaste(
                  e.clipboardData.getData('text/html'),
                  e.clipboardData.getData('text/plain'),
                )
                if (tracks) {
                  e.preventDefault()
                  setSpotifyTracks(tracks)
                }
              }}
              rows={5}
              autoFocus={answers.length > 0}
            />
          </label>
          {spotifyLink ? (
            <p className="spotify-hint">
              That's a Spotify link. Open{' '}
              <a href={spotifyLink} target="_blank" rel="noreferrer">
                the simple view of the list
              </a>
              , press Ctrl+A and Ctrl+C there, then paste here.
            </p>
          ) : (
            <p className="hint">Or paste a Spotify playlist link to get its artists.</p>
          )}
          <button
            type="button"
            onClick={importAnswers}
            disabled={spotifyLink !== null || parseAnswerList(text).length === 0}
          >
            Add answers
          </button>
        </div>
      )}

      {spotifyTracks && (
        <SpotifyImport tracks={spotifyTracks} onAdd={finish} onCancel={() => setSpotifyTracks(null)} />
      )}

      <section ref={setNodeRef} className={`answer-list${isOver ? ' answer-list--over' : ''}`} aria-label="Answers">
        {answers.length === 0 ? (
          <p className="hint">No answers yet.</p>
        ) : (
          <>
            <div className="answer-list-hint">
              <p className="hint">
                {editable
                  ? 'Drag up or down to reorder, or into a group. Hover an answer to start a group.'
                  : 'Drag onto the grid. Drag back here to take off.'}
              </p>
              <button
                type="button"
                className="link-button"
                aria-pressed={editable}
                title={editable ? 'Stop changing the list' : 'Edit, remove, reorder and group the answers'}
                onClick={() => setEditable(!editable)}
              >
                {editable ? 'Done' : 'Edit list'}
              </button>
            </div>
            <SortableContext
              items={answers.flatMap((answer, index) => [
                ...(groups.some((group) => group.start === index) ? [groupItemId(index)] : []),
                listItemId(answer.id),
              ])}
              strategy={draggedGroup === null ? verticalListSortingStrategy : keepRowsInPlace}
            >
              <ol>
                {answers.map((answer, index) => {
                  const startsHere = groups.find((group) => group.start === index)
                  const lineAbove = line?.side === 'above' && line.index === index
                  return [
                    spots.includes(index) && <NoGroupSpot key={`no-group-${index}`} at={index} />,
                    startsHere && (
                      <GroupHeader
                        key={`group-${index}`}
                        group={startsHere}
                        label={groupLabel(groups, startsHere)}
                        count={startsHere.end - index}
                        editable={editable}
                        actions={groupActions}
                        dropAbove={lineAbove}
                      />
                    ),
                    <AnswerItem
                      key={answer.id}
                      answer={answer}
                      number={index + 1}
                      groupColor={groupAt(groups, index)?.color}
                      editable={editable}
                      dimmed={inDraggedGroup(index)}
                      dropAbove={lineAbove && !startsHere}
                      dropBelow={line?.side === 'below' && line.index === index}
                      onStartGroup={startsHere ? undefined : () => groupActions.add(index)}
                      onEdit={onEdit}
                      onRemove={onRemove}
                    />,
                  ]
                })}
                {spots.includes(answers.length) && <NoGroupSpot at={answers.length} />}
              </ol>
            </SortableContext>
          </>
        )}
      </section>
    </aside>
  )
}

/**
 * A spot between groups to drop an answer on, so it has no group. It takes no room in the list: it
 * appears once the drag has started, and moving the rows then would put the dragged chip off the
 * pointer.
 */
function NoGroupSpot({ at }: { at: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: noGroupId(at) })
  return (
    <li className="no-group-spot">
      <span ref={setNodeRef} className={`no-group-spot-label${isOver ? ' no-group-spot-label--over' : ''}`}>
        No group
      </span>
    </li>
  )
}

/**
 * The start of a group in the list: its color, name and size. In edit mode the color and name can
 * be changed, the divider removed, and the group dragged by its handle with its answers.
 */
function GroupHeader({
  group,
  label,
  count,
  editable,
  actions,
  dropAbove,
}: {
  group: AnswerGroup
  label: string
  count: number
  editable: boolean
  actions: GroupActions
  /** Shows where a dragged group would land. */
  dropAbove: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: groupItemId(group.start),
    data: { source: 'group', start: group.start } satisfies GroupDragData,
    disabled: { draggable: !editable, droppable: !editable },
  })
  const className = `group-header${isDragging ? ' answer--dragging' : ''}${dropAbove ? ' drop-above' : ''}`
  const style = { borderColor: group.color, transform: CSS.Translate.toString(transform), transition }

  if (!editable) {
    return (
      <li className={className} style={{ borderColor: group.color }} aria-label={label}>
        <span className="group-swatch" style={{ background: group.color }} />
        <span className="group-label">{label}</span>
        <span className="group-count">{count}</span>
      </li>
    )
  }
  return (
    <li ref={setNodeRef} className={className} style={style} aria-label={label}>
      <span
        className="group-handle"
        {...attributes}
        {...listeners}
        aria-label={`Drag ${label}`}
        title="Drag to move the group and its answers"
      >
        ⠿
      </span>
      <input
        type="color"
        className="group-color"
        value={group.color}
        aria-label={`Color of ${label}`}
        title="Background color of this group's cells"
        onChange={(e) => actions.setColor(group.start, e.target.value)}
      />
      <input
        className="group-name"
        value={group.name}
        placeholder={label}
        aria-label={`Name of ${label}`}
        onChange={(e) => actions.setName(group.start, e.target.value)}
      />
      <span className="group-count">{count}</span>
      <button
        type="button"
        className="icon-button"
        aria-label={`Remove ${label}`}
        title="Remove this divider. Its answers join the group above."
        onClick={() => actions.remove(group.start)}
      >
        ✕
      </button>
    </li>
  )
}

type AnswerItemProps = {
  answer: Answer
  number: number
  groupColor: string | undefined
  /**
   * Shows the buttons for changing the list and lets answers be reordered. Otherwise other answers
   * don't make room for a dragged answer and dropping it doesn't reorder.
   */
  editable: boolean
  /** Part of a group that is being dragged. */
  dimmed: boolean
  /** Shows that a dragged group would land above or below this answer. */
  dropAbove: boolean
  dropBelow: boolean
  /** Starts a new group with this answer; undefined when one already starts here. */
  onStartGroup: (() => void) | undefined
  onEdit: (id: string, text: string) => void
  onRemove: (id: string) => void
}

function AnswerItem({
  answer,
  number,
  groupColor,
  editable,
  dimmed,
  dropAbove,
  dropBelow,
  onStartGroup,
  onEdit,
  onRemove,
}: AnswerItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: listItemId(answer.id),
    data: { answerId: answer.id, source: 'list' } satisfies DragData,
    // An answer that isn't a drop target is never "over", so the list doesn't shuffle.
    disabled: { draggable: false, droppable: !editable },
  })
  const placed = answer.start !== null
  const [editingText, setEditingText] = useState(false)
  const editing = editable && editingText

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        borderLeftColor: groupColor,
      }}
      className={`answer${placed ? ' answer--placed' : ''}${isDragging || dimmed ? ' answer--dragging' : ''}${
        groupColor ? ' answer--grouped' : ''
      }${dropAbove ? ' drop-above' : ''}${dropBelow ? ' drop-below' : ''}`}
    >
      {editable && onStartGroup && !editing && (
        <button
          type="button"
          className="new-group-button"
          aria-label={`New group from ${answer.text}`}
          title="Start a new group from this answer"
          onClick={onStartGroup}
        >
          + New group
        </button>
      )}
      {editing ? (
        <span className="answer-handle">
          <span className="answer-number">{number}.</span>
          <EditField
            answer={answer}
            onDone={(text) => {
              if (text !== null && text !== answer.text) onEdit(answer.id, text)
              setEditingText(false)
            }}
          />
        </span>
      ) : (
        <span className="answer-handle" {...attributes} {...listeners} aria-label={`Drag ${answer.text}`}>
          <span className="answer-number">{number}.</span>
          <span className="answer-text" title={answer.text}>
            {answer.text}
          </span>
        </span>
      )}
      {editable && (
        <>
          <button
            type="button"
            className="icon-button pen-button"
            onClick={() => setEditingText(true)}
            aria-label={`Edit ${answer.text}`}
            title="Edit"
          >
            <PenIcon />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => onRemove(answer.id)}
            aria-label={`Remove ${answer.text}`}
            title="Remove"
          >
            ✕
          </button>
        </>
      )}
    </li>
  )
}

/** Enter or leaving the field saves; Esc cancels. An empty answer is not saved. */
function EditField({ answer, onDone }: { answer: Answer; onDone: (text: string | null) => void }) {
  const [value, setValue] = useState(answer.text)
  // Enter or Esc removes the field, which can also fire blur. Only the first one counts.
  const done = useRef(false)
  const finish = (text: string | null) => {
    if (done.current) return
    done.current = true
    onDone(text === null || normalizeAnswer(text) === '' ? null : normalizeAnswer(text))
  }
  return (
    <input
      className="answer-edit"
      aria-label={`New text for ${answer.text}`}
      value={value}
      autoFocus
      onFocus={(e) => e.target.select()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(value)
        if (e.key === 'Escape') {
          // Esc also closes the cell panel; here it only cancels the edit.
          e.stopPropagation()
          finish(null)
        }
      }}
    />
  )
}
