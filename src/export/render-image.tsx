import { zipSync } from 'fflate'
import { renderToStaticMarkup } from 'react-dom/server'
import { GridView } from '../grid/grid-view'
import type { Layout } from '../layout/layout'
import { A4_LANDSCAPE_GRID, CELL_SIZE_MM } from '../model/page'
import type { Puzzle } from '../model/puzzle'
import { exportPlan, type ExportImage } from './export-plan'

/** 200 dots per inch: sharp on a projector, and still small files. */
const DPI = 200

export const IMAGE_SIZE = {
  width: Math.round(((A4_LANDSCAPE_GRID.columns * CELL_SIZE_MM) / 25.4) * DPI),
  height: Math.round(((A4_LANDSCAPE_GRID.rows * CELL_SIZE_MM) / 25.4) * DPI),
}

/** The SVG for one exported image. Transparent wherever there are no cells. */
export function renderImageSvg(puzzle: Puzzle, layout: Layout, image: ExportImage): string {
  return renderToStaticMarkup(
    <GridView
      puzzle={puzzle}
      layout={layout}
      mode="export"
      showLetters={image.revealed.length > 0}
      revealedAnswers={new Set(image.revealed)}
      highlight={
        image.highlightId
          ? { answerId: image.highlightId, color: puzzle.highlightColor, startArrow: puzzle.includeStartArrow }
          : undefined
      }
      size={IMAGE_SIZE}
    />,
  )
}

/** Draws an SVG onto a canvas of the export size and returns it as PNG bytes. Browser only. */
async function svgToPng(svg: string): Promise<Uint8Array> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = new Image(IMAGE_SIZE.width, IMAGE_SIZE.height)
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = IMAGE_SIZE.width
    canvas.height = IMAGE_SIZE.height
    canvas.getContext('2d')!.drawImage(image, 0, 0, IMAGE_SIZE.width, IMAGE_SIZE.height)
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The browser could not create a PNG.'))), 'image/png'),
    )
    return new Uint8Array(await png.arrayBuffer())
  } finally {
    URL.revokeObjectURL(url)
  }
}

export type RenderedImage = ExportImage & { png: Uint8Array }

/** Renders every image in the plan, in order. Reports progress as (done, total). */
export async function renderAllImages(
  puzzle: Puzzle,
  layout: Layout,
  onProgress: (done: number, total: number) => void,
): Promise<RenderedImage[]> {
  const { images } = exportPlan(puzzle)
  const rendered: RenderedImage[] = []
  for (const [i, image] of images.entries()) {
    rendered.push({ ...image, png: await svgToPng(renderImageSvg(puzzle, layout, image)) })
    onProgress(i + 1, images.length)
  }
  return rendered
}

/** All images in one zip, in the folders from the plan. */
export function buildZip(images: RenderedImage[]): Blob {
  const files = Object.fromEntries(images.map((image) => [image.path, image.png]))
  // PNGs are already compressed, so store them as they are.
  const zip = zipSync(files, { level: 0 })
  return new Blob([zip], { type: 'application/zip' })
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
