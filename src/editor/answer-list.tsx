import { useDndContext, useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, type SortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
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

/** How a click in the list changes the selection: replace it, add or remove one (Ctrl), or a range (Shift). */
export type SelectHow = 'replace' | 'toggle' | 'range'

/** The two checkbox columns: included by "Generate solution", and locked in place for it. */
type Column = 'include' | 'lock'

type AnswerListProps = {
  answers: Answer[]
  groups: AnswerGroup[]
  groupActions: GroupActions
  onImport: (texts: string[]) => void
  onEdit: (id: string, text: string) => void
  onRemove: (id: string) => void
  /** The selected answers, on the grid or off it. */
  selectedIds: string[]
  onSelect: (id: string, how: SelectHow) => void
  onSetIncluded: (ids: string[], value: boolean) => void
  onSetLocked: (ids: string[], value: boolean) => void
  onGenerate: () => void
}

export function AnswerList({
  answers,
  groups,
  groupActions,
  onImport,
  onEdit,
  onRemove,
  selectedIds,
  onSelect,
  onSetIncluded,
  onSetLocked,
  onGenerate,
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

  const canImport = spotifyLink === null && parseAnswerList(text).length > 0

  const included = answers.filter((answer) => !answer.excluded || answer.locked)
  const placed = answers.filter((answer) => answer.start)
  const locked = placed.filter((answer) => answer.locked)
  // Where the last click in each column was, for Shift+click.
  const anchors = useRef<Record<Column, string | null>>({ include: null, lock: null })

  /**
   * A click on a checkbox. Shift+click sets every answer from the last click in that column to this
   * one, and a click on one of several selected answers sets them all.
   */
  function setColumn(column: Column, id: string, value: boolean, shift: boolean) {
    const index = answers.findIndex((answer) => answer.id === id)
    const anchor = answers.findIndex((answer) => answer.id === anchors.current[column])
    const ids =
      shift && anchor >= 0
        ? answers.slice(Math.min(anchor, index), Math.max(anchor, index) + 1).map((answer) => answer.id)
        : selectedIds.length > 1 && selectedIds.includes(id)
          ? selectedIds
          : [id]
    anchors.current[column] = id
    if (column === 'include') onSetIncluded(ids, value)
    else onSetLocked(ids, value)
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
              // Enter adds the answers. Shift+Enter or Ctrl+Enter starts a new line.
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.shiftKey || e.altKey) return
                e.preventDefault()
                if (e.ctrlKey || e.metaKey) {
                  const field = e.currentTarget
                  field.setRangeText('\n', field.selectionStart, field.selectionEnd, 'end')
                  setText(field.value)
                } else if (canImport) {
                  importAnswers()
                }
              }}
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
            <p className="hint">
              Enter adds them, Shift+Enter starts a new line. Or paste a Spotify playlist link to get its
              artists.
            </p>
          )}
          <button
            type="button"
            onClick={importAnswers}
            disabled={!canImport}
          >
            Add answers
          </button>
        </div>
      )}

      {spotifyTracks && (
        <SpotifyImport tracks={spotifyTracks} onAdd={finish} onCancel={() => setSpotifyTracks(null)} />
      )}

      {answers.length > 0 && (
        <div className="generate-row">
          <button
            type="button"
            className="primary-button"
            disabled={included.length === 0}
            title="Place the checked answers on the page at random, crossing each other, around the locked ones. Each click gives a new layout."
            onClick={onGenerate}
          >
            Generate solution
          </button>
        </div>
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
            <div className="answer-columns">
              <TriStateBox
                checked={included.length === answers.length}
                mixed={included.length > 0 && included.length < answers.length}
                label="Include every answer in Generate solution"
                onChange={(value) => onSetIncluded(answers.map((answer) => answer.id), value)}
              />
              <TriStateBox
                className="lock-box"
                checked={placed.length > 0 && locked.length === placed.length}
                mixed={locked.length > 0 && locked.length < placed.length}
                disabled={placed.length === 0}
                label="Lock every answer on the grid"
                onChange={(value) => onSetLocked(placed.map((answer) => answer.id), value)}
              />
              <span className="hint" title="Generate solution places the checked answers, and leaves locked ones where they are">
                {included.length} of {answers.length} included
                {locked.length > 0 && `, ${locked.length} locked`}
              </span>
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
                      selected={selectedIds.includes(answer.id)}
                      // With several selected, scrolling to each would jump around.
                      scrollIntoView={selectedIds.length === 1}
                      onSelect={onSelect}
                      onColumn={setColumn}
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
  selected: boolean
  /** Scrolls the list to show this answer when it becomes selected. */
  scrollIntoView: boolean
  onSelect: (id: string, how: SelectHow) => void
  onColumn: (column: Column, id: string, value: boolean, shift: boolean) => void
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
  selected,
  scrollIntoView,
  onSelect,
  onColumn,
}: AnswerItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: listItemId(answer.id),
    data: { answerId: answer.id, source: 'list' } satisfies DragData,
    // An answer that isn't a drop target is never "over", so the list doesn't shuffle.
    disabled: { draggable: false, droppable: !editable },
  })
  const placed = answer.start !== null
  const locked = placed && answer.locked === true
  const included = locked || !answer.excluded
  const [editingText, setEditingText] = useState(false)
  const editing = editable && editingText
  const rowRef = useRef<HTMLLIElement | null>(null)
  useEffect(() => {
    if (selected && scrollIntoView) rowRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [selected, scrollIntoView])

  return (
    <li
      ref={(element) => {
        rowRef.current = element
        setNodeRef(element)
      }}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        borderLeftColor: groupColor,
      }}
      data-answer-id={answer.id}
      className={`answer${placed ? ' answer--placed' : ''}${isDragging || dimmed ? ' answer--dragging' : ''}${
        groupColor ? ' answer--grouped' : ''
      }${selected ? ' answer--selected' : ''}${included ? '' : ' answer--excluded'}${dropAbove ? ' drop-above' : ''}${dropBelow ? ' drop-below' : ''}`}
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
      <input
        type="checkbox"
        className="answer-box"
        checked={included}
        aria-label={`Include ${answer.text} in Generate solution`}
        title="Include in Generate solution. Shift+click sets a range."
        onChange={() => {}}
        onClick={(e) => onColumn('include', answer.id, !included, e.shiftKey)}
      />
      <input
        type="checkbox"
        className="answer-box lock-box"
        checked={locked}
        disabled={!placed}
        aria-label={`Lock ${answer.text}`}
        title={
          placed
            ? 'Lock in place, so Generate solution leaves it where it is. Shift+click sets a range.'
            : 'Only answers on the grid can be locked'
        }
        onChange={() => {}}
        onClick={(e) => onColumn('lock', answer.id, !locked, e.shiftKey)}
      />
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
        <span
          className="answer-handle"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${answer.text}`}
          onClick={(e: MouseEvent) => onSelect(answer.id, e.shiftKey ? 'range' : e.ctrlKey || e.metaKey ? 'toggle' : 'replace')}
        >
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

/** A checkbox for a whole column, showing a dash when only some rows are checked. */
function TriStateBox({
  checked,
  mixed,
  disabled = false,
  label,
  className = '',
  onChange,
}: {
  checked: boolean
  mixed: boolean
  disabled?: boolean
  label: string
  className?: string
  /** Checks every row, or unchecks them all when every row was checked. */
  onChange: (value: boolean) => void
}) {
  const ref = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = mixed
  }, [mixed])
  return (
    <input
      ref={ref}
      type="checkbox"
      className={`answer-box ${className}`}
      checked={checked}
      disabled={disabled}
      aria-label={label}
      title={label}
      onChange={() => onChange(!checked)}
    />
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
