import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { groupAt, groupLabel } from '../model/groups'
import type { Answer, AnswerGroup } from '../model/puzzle'
import { ANSWER_LIST_ID, listItemId, type DragData } from './drag-ids'
import { parseAnswerList } from './parse-answer-list'
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
  onToggleDirection: (id: string) => void
  onRemove: (id: string) => void
}

export function AnswerList({
  answers,
  groups,
  groupActions,
  onImport,
  onToggleDirection,
  onRemove,
}: AnswerListProps) {
  const [text, setText] = useState('')
  // The paste box takes room from the list, so it's folded away once there are answers.
  const [importOpen, setImportOpen] = useState(answers.length === 0)
  const { setNodeRef, isOver } = useDroppable({ id: ANSWER_LIST_ID })
  const showImport = importOpen || answers.length === 0
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrack[] | null>(null)
  const spotifyLink = embedLink(text)

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
            <p className="hint">Drag onto the grid. Drag back here to take off.</p>
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
                        actions={groupActions}
                      />
                    ),
                    <AnswerItem
                      key={answer.id}
                      answer={answer}
                      number={index + 1}
                      groupColor={groupAt(groups, index)?.color}
                      onStartGroup={startsHere ? undefined : () => groupActions.add(index)}
                      onToggleDirection={onToggleDirection}
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

/** The start of a group in the list: its color, name and size, and a way to remove the divider. */
function GroupHeader({
  group,
  label,
  count,
  actions,
}: {
  group: AnswerGroup
  label: string
  count: number
  actions: GroupActions
}) {
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
  /** Starts a new group with this answer; undefined when one already starts here. */
  onStartGroup: (() => void) | undefined
  onToggleDirection: (id: string) => void
  onRemove: (id: string) => void
}

function AnswerItem({ answer, number, groupColor, onStartGroup, onToggleDirection, onRemove }: AnswerItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: listItemId(answer.id),
    data: { answerId: answer.id, source: 'list' } satisfies DragData,
  })
  const placed = answer.start !== null

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
      {onStartGroup && (
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
      <span className="answer-handle" {...attributes} {...listeners} aria-label={`Drag ${answer.text}`}>
        <span className="answer-number">{number}.</span>
        <span className="answer-text" title={answer.text}>
          {answer.text}
        </span>
      </span>
      <button
        type="button"
        className="icon-button"
        onClick={() => onToggleDirection(answer.id)}
        aria-label={`Direction of ${answer.text}: ${answer.dir}`}
        title="Switch between across and down"
      >
        {answer.dir === 'down' ? '↓' : '→'}
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
    </li>
  )
}
