import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import type { Answer } from '../model/puzzle'
import { ANSWER_LIST_ID, listItemId, type DragData } from './drag-ids'
import { parseAnswerList } from './parse-answer-list'

type AnswerListProps = {
  answers: Answer[]
  onImport: (texts: string[]) => void
  onToggleDirection: (id: string) => void
  onRemove: (id: string) => void
}

export function AnswerList({ answers, onImport, onToggleDirection, onRemove }: AnswerListProps) {
  const [text, setText] = useState('')
  const { setNodeRef, isOver } = useDroppable({ id: ANSWER_LIST_ID })

  const importAnswers = () => {
    const texts = parseAnswerList(text)
    if (texts.length === 0) return
    onImport(texts)
    setText('')
  }

  return (
    <aside className="answer-panel">
      <label className="import">
        <span>Paste answers, one per line</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} />
      </label>
      <button type="button" onClick={importAnswers} disabled={parseAnswerList(text).length === 0}>
        Add answers
      </button>

      <section ref={setNodeRef} className={`answer-list${isOver ? ' answer-list--over' : ''}`} aria-label="Answers">
        {answers.length === 0 ? (
          <p className="hint">No answers yet.</p>
        ) : (
          <>
            <p className="hint">Drag an answer onto the grid. Drag it back here to take it off.</p>
            <SortableContext items={answers.map((a) => listItemId(a.id))} strategy={verticalListSortingStrategy}>
              <ol>
                {answers.map((answer, index) => (
                  <AnswerItem
                    key={answer.id}
                    answer={answer}
                    number={index + 1}
                    onToggleDirection={onToggleDirection}
                    onRemove={onRemove}
                  />
                ))}
              </ol>
            </SortableContext>
          </>
        )}
      </section>
    </aside>
  )
}

type AnswerItemProps = {
  answer: Answer
  number: number
  onToggleDirection: (id: string) => void
  onRemove: (id: string) => void
}

function AnswerItem({ answer, number, onToggleDirection, onRemove }: AnswerItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: listItemId(answer.id),
    data: { answerId: answer.id, source: 'list' } satisfies DragData,
  })
  const placed = answer.start !== null

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`answer${placed ? ' answer--placed' : ''}${isDragging ? ' answer--dragging' : ''}`}
    >
      <span className="answer-handle" {...attributes} {...listeners} aria-label={`Drag ${answer.text}`}>
        <span className="answer-number">{number}.</span>
        <span className="answer-text">{answer.text}</span>
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
