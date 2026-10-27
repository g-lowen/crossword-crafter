import type { ReactNode } from 'react'
import { anagramBarCells } from '../layout/anagram'
import type { Layout, Piece } from '../layout/layout'
import { cellKey } from '../layout/layout'
import { groupColors } from '../model/groups'
import { puzzleGrid, type GridSize } from '../model/page'
import type { Puzzle } from '../model/puzzle'
import { CELL, cellOrigin, outlineSegments, pointerArrow, separatorLine, turnArrow, wideSpaceShape } from './geometry'

type GridViewProps = {
  puzzle: Puzzle
  layout: Layout
  /** The editor adds a page background, guide lines and conflict warnings. Exports get none of them. */
  mode: 'editor' | 'export'
  /** Letters marked always visible are drawn either way. */
  showLetters: boolean
  /** When set, only these answers' letters are shown. Used for the correction images. */
  revealedAnswers?: ReadonlySet<string>
  /** Marks one answer with a thick colored outline, optionally with an arrow to its start. */
  highlight?: { answerId: string; color: string; startArrow: boolean }
  /** Leaves out the anagram numbers and bar even when the puzzle shows them. Used for the quiz images. */
  hideAnagramNumbers?: boolean
  /** Pixel size for exported images. The editor scales with the page instead. */
  size?: { width: number; height: number }
  grid?: GridSize
  /** Where an answer would land while it is being dragged. Editor only. */
  preview?: { pieces: Piece[]; color: string }
  /** Extra SVG content drawn on top, such as drag handles. */
  children?: ReactNode
}

const LINE = 0.35
const SEPARATOR = 1.4
const ANAGRAM_BORDER = 1
const ANAGRAM_RED = '#d32f2f'

export function GridView({
  puzzle,
  layout,
  mode,
  showLetters,
  revealedAnswers,
  highlight,
  hideAnagramNumbers = false,
  size,
  grid = puzzleGrid(puzzle),
  preview,
  children,
}: GridViewProps) {
  const width = grid.columns * CELL
  const height = grid.rows * CELL
  const conflictKeys = new Set(
    layout.issues.flatMap((issue) => (issue.type === 'conflict' ? [cellKey(issue.cell)] : [])),
  )
  const cells = [...layout.cells.values()]
  const colors = groupColors(puzzle)
  // Where answers from different groups cross, the one earliest in the list decides the color.
  const cellFill = (pieces: Piece[]) =>
    pieces.map((piece) => colors.get(piece.answerId)).find((color) => color !== undefined) ?? 'white'
  const showAnagramNumbers = puzzle.anagram.showNumbersAndBar && !hideAnagramNumbers
  const barCells = showAnagramNumbers ? anagramBarCells(layout, grid) : []
  const answerShown = (answerId: string) => showLetters && (!revealedAnswers || revealedAnswers.has(answerId))
  // A bar cell gets its letter once an answer through the numbered anagram cell is shown.
  const barLetter = (number: number) => {
    const anagramCell = layout.anagramCells.find((c) => c.number === number)
    if (!anagramCell) return undefined
    return layout.cells
      .get(cellKey(anagramCell.cell))
      ?.find((piece) => piece.kind === 'letter' && answerShown(piece.answerId))?.char
  }

  return (
    <svg
      className="grid-view"
      viewBox={`0 0 ${width} ${height}`}
      width={size ? size.width : `${width}mm`}
      height={size ? size.height : `${height}mm`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Crossword grid"
    >
      {mode === 'editor' && <EditorBackground width={width} height={height} grid={grid} />}

      {cells.map((pieces) => {
        const cell = pieces[0]
        const { x, y } = cellOrigin(cell)
        const isSpace = pieces.every((piece) => piece.kind === 'space')
        if (isSpace && pieces.some((piece) => piece.widePart !== undefined)) return null
        return (
          <rect
            key={cellKey(cell)}
            data-cell-kind={isSpace ? 'space' : 'letter'}
            x={x}
            y={y}
            width={CELL}
            height={CELL}
            fill={isSpace ? 'black' : cellFill(pieces)}
            stroke="black"
            strokeWidth={LINE}
          />
        )
      })}

      {layout.wideSpaceBlocks.map((block) => {
        const shape = wideSpaceShape(block.cells, block.dir)
        return (
          <g key={`${block.answerId}-${block.index}`} data-wide-space="">
            <rect {...shape.rect} fill="black" stroke="black" strokeWidth={LINE} />
            <polyline points={shape.line} fill="none" stroke="white" strokeWidth={1} />
            <polygon points={shape.head} fill="white" />
          </g>
        )
      })}

      {cells.map((pieces) => {
        const letter = pieces.find(
          (piece) => piece.kind === 'letter' && (piece.alwaysVisible || answerShown(piece.answerId)),
        )
        if (!letter) return null
        const { x, y } = cellOrigin(letter)
        return (
          <text
            key={cellKey(letter)}
            data-letter=""
            x={x + CELL / 2}
            y={y + CELL / 2 + 0.4}
            fontSize={5.5}
            fontFamily="Arial, Helvetica, sans-serif"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {letter.char}
          </text>
        )
      })}

      {layout.anagramCells.map(({ cell, number }) => {
        const { x, y } = cellOrigin(cell)
        const inset = ANAGRAM_BORDER / 2
        return (
          <g key={cellKey(cell)} data-anagram-cell="">
            <rect
              x={x + inset}
              y={y + inset}
              width={CELL - ANAGRAM_BORDER}
              height={CELL - ANAGRAM_BORDER}
              fill="none"
              stroke={ANAGRAM_RED}
              strokeWidth={ANAGRAM_BORDER}
            />
            {showAnagramNumbers && number !== undefined && (
              <text data-anagram-number="" x={x + 1.6} y={y + 3.2} fontSize={2.6} fontFamily="Arial, Helvetica, sans-serif">
                {number}
              </text>
            )}
          </g>
        )
      })}

      {layout.turnMarkers.map((marker) => {
        const arrow = turnArrow(marker.cell, marker.from, marker.to)
        // A turn at a space sits on a black cell, so it's drawn in white.
        const onSpace = layout.cells
          .get(cellKey(marker.cell))
          ?.some((piece) => piece.answerId === marker.answerId && piece.kind === 'space')
        const color = onSpace ? 'white' : 'black'
        return (
          <g key={`${marker.answerId}-${cellKey(marker.cell)}`} data-turn-marker="">
            <polyline points={arrow.line} fill="none" stroke={color} strokeWidth={0.4} />
            <polygon points={arrow.head} fill={color} />
          </g>
        )
      })}

      {barCells.length > 0 && (
        <g data-anagram-bar="">
          {barCells.map((cell, i) => {
            const { x, y } = cellOrigin(cell)
            const letter = barLetter(i + 1)
            return (
              <g key={i}>
                <rect x={x} y={y} width={CELL} height={CELL} fill="white" stroke="black" strokeWidth={LINE} />
                {letter && (
                  <text
                    data-anagram-bar-letter=""
                    x={x + CELL / 2}
                    y={y + CELL / 2 + 0.4}
                    fontSize={5.5}
                    fontFamily="Arial, Helvetica, sans-serif"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {letter}
                  </text>
                )}
                <text
                  data-anagram-bar-number=""
                  x={x + CELL / 2}
                  y={y - 1.2}
                  fontSize={2.8}
                  fontFamily="Arial, Helvetica, sans-serif"
                  textAnchor="middle"
                >
                  {i + 1}
                </text>
              </g>
            )
          })}
        </g>
      )}

      {puzzle.separators.map((separator) => {
        const line = separatorLine(separator)
        if (!line) return null
        return (
          <line
            key={`${cellKey(separator.a)}|${cellKey(separator.b)}`}
            data-separator=""
            {...line}
            stroke="black"
            strokeWidth={SEPARATOR}
            strokeLinecap="square"
          />
        )
      })}

      {highlight && <Highlight layout={layout} {...highlight} />}

      {mode === 'editor' &&
        [...conflictKeys].map((key) => {
          const [row, col] = key.split(',').map(Number)
          const { x, y } = cellOrigin({ row, col })
          return (
            <rect
              key={key}
              data-conflict=""
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              fill="#ff9800"
              fillOpacity={0.45}
              pointerEvents="none"
            />
          )
        })}

      {mode === 'editor' && preview && <Preview {...preview} />}

      {children}
    </svg>
  )
}

function Highlight({
  layout,
  answerId,
  color,
  startArrow,
}: { layout: Layout } & NonNullable<GridViewProps['highlight']>) {
  const pieces = [...layout.cells.values()].flat().filter((piece) => piece.answerId === answerId)
  const start = layout.startMarkers.find((marker) => marker.answerId === answerId)
  const arrow = startArrow && start ? pointerArrow(start.cell, start.dir) : null
  return (
    <g data-highlight={answerId}>
      {outlineSegments(pieces).map((segment, i) => (
        <line key={i} {...segment} stroke={color} strokeWidth={1.4} strokeLinecap="square" />
      ))}
      {arrow && (
        <g data-pointer-arrow="">
          <polyline points={arrow.line} fill="none" stroke={color} strokeWidth={1.8} />
          <polygon points={arrow.head} fill={color} />
        </g>
      )}
    </g>
  )
}

function Preview({ pieces, color }: { pieces: Piece[]; color: string }) {
  return (
    <g data-preview="" pointerEvents="none">
      {pieces.map((piece) => {
        const { x, y } = cellOrigin(piece)
        return (
          <g key={`${piece.index}-${piece.widePart ?? 0}`}>
            <rect
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              fill={piece.kind === 'space' ? color : 'white'}
              fillOpacity={piece.kind === 'space' ? 0.6 : 0.85}
              stroke={color}
              strokeWidth={0.8}
            />
            {piece.kind === 'letter' && (
              <text
                x={x + CELL / 2}
                y={y + CELL / 2 + 0.4}
                fontSize={5.5}
                fontFamily="Arial, Helvetica, sans-serif"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="central"
                fill={color}
              >
                {piece.char}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}

function EditorBackground({ width, height, grid }: { width: number; height: number; grid: GridSize }) {
  const lines = []
  for (let col = 1; col < grid.columns; col++) {
    lines.push(<line key={`c${col}`} x1={col * CELL} y1={0} x2={col * CELL} y2={height} />)
  }
  for (let row = 1; row < grid.rows; row++) {
    lines.push(<line key={`r${row}`} x1={0} y1={row * CELL} x2={width} y2={row * CELL} />)
  }
  return (
    <g data-editor-background="">
      <rect width={width} height={height} fill="white" />
      <g stroke="#e3e3e3" strokeWidth={0.2}>
        {lines}
      </g>
    </g>
  )
}
