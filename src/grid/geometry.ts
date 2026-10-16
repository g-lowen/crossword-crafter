import { CELL_SIZE_MM } from '../model/page'
import type { CellRef, Dir, Separator } from '../model/puzzle'

/** SVG units are millimetres, so one cell is CELL_SIZE_MM units wide. */
export const CELL = CELL_SIZE_MM

type Point = { x: number; y: number }

const VECTOR: Record<Dir, Point> = {
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  up: { x: 0, y: -1 },
}

function add(p: Point, v: Point, scale = 1): Point {
  return { x: p.x + v.x * scale, y: p.y + v.y * scale }
}

function points(...ps: Point[]): string {
  return ps.map((p) => `${round(p.x)},${round(p.y)}`).join(' ')
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

function arrowHead(tip: Point, dir: Dir, length: number, halfWidth: number): string {
  const v = VECTOR[dir]
  const perpendicular = { x: -v.y, y: v.x }
  const base = add(tip, v, -length)
  return points(tip, add(base, perpendicular, halfWidth), add(base, perpendicular, -halfWidth))
}

export function cellOrigin(cell: CellRef): Point {
  return { x: cell.col * CELL, y: cell.row * CELL }
}

/**
 * A small bent arrow in the bottom-right corner of the cell where an answer turns. It comes in
 * along `from` and leaves along `to`.
 */
export function turnArrow(cell: CellRef, from: Dir, to: Dir): { line: string; head: string } {
  const corner = add(cellOrigin(cell), { x: 7.6, y: 7.6 })
  const arm = 1.3
  const end = add(corner, VECTOR[to], arm)
  return {
    line: points(add(corner, VECTOR[from], -arm), corner, end),
    head: arrowHead(add(end, VECTOR[to], 0.7), to, 0.9, 0.65),
  }
}

/** A small straight arrow in the bottom-right corner of an answer's first cell, along its direction. */
export function startArrow(cell: CellRef, dir: Dir): { line: string; head: string } {
  const center = add(cellOrigin(cell), { x: 7.4, y: 7.4 })
  return {
    line: points(add(center, VECTOR[dir], -1.4), add(center, VECTOR[dir], 0.6)),
    head: arrowHead(add(center, VECTOR[dir], 1.5), dir, 0.9, 0.65),
  }
}

/** The black block of a wide space, with a white arrow along its reading direction. */
export function wideSpaceShape(
  cells: [CellRef, CellRef],
  dir: Dir,
): { rect: { x: number; y: number; width: number; height: number }; line: string; head: string } {
  const [a, b] = cells.map(cellOrigin)
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const horizontal = a.y === b.y
  const rect = { x, y, width: horizontal ? 2 * CELL : CELL, height: horizontal ? CELL : 2 * CELL }
  const center = { x: x + rect.width / 2, y: y + rect.height / 2 }
  const tip = add(center, VECTOR[dir], 6)
  return {
    rect,
    line: points(add(center, VECTOR[dir], -6), add(tip, VECTOR[dir], -1.5)),
    head: arrowHead(tip, dir, 2.2, 1.4),
  }
}

/** The shared edge of two adjacent cells, or null when they are not adjacent. */
export function separatorLine(separator: Separator): { x1: number; y1: number; x2: number; y2: number } | null {
  const { a, b } = separator
  if (a.row === b.row && Math.abs(a.col - b.col) === 1) {
    const x = Math.max(a.col, b.col) * CELL
    return { x1: x, y1: a.row * CELL, x2: x, y2: (a.row + 1) * CELL }
  }
  if (a.col === b.col && Math.abs(a.row - b.row) === 1) {
    const y = Math.max(a.row, b.row) * CELL
    return { x1: a.col * CELL, y1: y, x2: (a.col + 1) * CELL, y2: y }
  }
  return null
}
