import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRef, useState } from 'react'
import { groupAt, groupLabel } from '../model/groups'
import type { Answer, AnswerGroup } from '../model/puzzle'
import { ANSWER_LIST_ID, listItemId, type DragData } from './drag-ids'
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

  const finish = (texts: string[]) => {
    onImport(texts)
    setText('')
    setImportOpen(false)
    setSpotifyTracks(null)
  }

  const canImport = spotifyLink === null && parseAnswerList(text).length > 0

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

      <section ref={setNodeRef} className={`answer-list${isOver ? ' answer-list--over' : ''}`} aria-label="Answers">
        {answers.length === 0 ? (
          <p className="hint">No answers yet.</p>
        ) : (
          <>
            <div className="answer-list-hint">
              <p className="hint">
                {editable
                  ? 'Drag up or down to reorder. Hover an answer to start a group.'
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
            <SortableContext items={answers.map((a) => listItemId(a.id))} strategy={verticalListSortingStrategy}>
              <ol>
                {answers.map((answer, index) => {
                  const startsHere = groups.find((group) => group.start === index)
                  const nextStart = groups.find((group) => group.start > index)?.start ?? answers.length
                  return [
                    startsHere && (
                      <GroupHeader
                        key={`group-${index}`}
                        group={startsHere}
                        label={groupLabel(groups, startsHere)}
                        count={nextStart - index}
                        editable={editable}
                        actions={groupActions}
                      />
                    ),
                    <AnswerItem
                      key={answer.id}
                      answer={answer}
                      number={index + 1}
                      groupColor={groupAt(groups, index)?.color}
                      editable={editable}
                      onStartGroup={startsHere ? undefined : () => groupActions.add(index)}
                      onEdit={onEdit}
                      onRemove={onRemove}
                    />,
                  ]
                })}
              </ol>
            </SortableContext>
          </>
        )}
      </section>
    </aside>
  )
}

/**
 * The start of a group in the list: its color, name and size. In edit mode the color and name can
 * be changed and the divider removed.
 */
function GroupHeader({
  group,
  label,
  count,
  editable,
  actions,
}: {
  group: AnswerGroup
  label: string
  count: number
  editable: boolean
  actions: GroupActions
}) {
  if (!editable) {
    return (
      <li className="group-header" style={{ borderColor: group.color }} aria-label={label}>
        <span className="group-swatch" style={{ background: group.color }} />
        <span className="group-label">{label}</span>
        <span className="group-count">{count}</span>
      </li>
    )
  }
  return (
    <li className="group-header" style={{ borderColor: group.color }} aria-label={label}>
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
  /** Starts a new group with this answer; undefined when one already starts here. */
  onStartGroup: (() => void) | undefined
  onEdit: (id: string, text: string) => void
  onRemove: (id: string) => void
}

function AnswerItem({ answer, number, groupColor, editable, onStartGroup, onEdit, onRemove }: AnswerItemProps) {
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
      className={`answer${placed ? ' answer--placed' : ''}${isDragging ? ' answer--dragging' : ''}${
        groupColor ? ' answer--grouped' : ''
      }`}
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
