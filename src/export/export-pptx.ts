import PptxGenJS from 'pptxgenjs'
import type { ExportImage } from './export-plan'
import type { ImageSize, RenderedImage } from './render-image'

/** PowerPoint's default widescreen slide, in inches. */
const SLIDE = { width: 13.333, height: 7.5 }

const SECTIONS: Record<ExportImage['part'], string> = {
  print: 'Print grid',
  quiz: 'Quiz',
  correction: 'Correction',
}

/** Where the A4 image sits on a 16:9 slide: full height, centred. Every slide uses the same spot. */
export function imagePlacement(size: ImageSize): { x: number; y: number; w: number; h: number } {
  const h = SLIDE.height
  const w = h * (size.width / size.height)
  return { x: (SLIDE.width - w) / 2, y: 0, w, h }
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

/**
 * One slide per image, in order: the print grid, the quiz, then the correction, the last two each
 * starting with the empty grid.
 * Each part is its own section, and each slide's notes say which question or answer it is.
 */
export async function buildPptx(images: RenderedImage[], size: ImageSize, title: string): Promise<Blob> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.title = title
  const placement = imagePlacement(size)

  let section: string | null = null
  for (const image of images) {
    const sectionTitle = SECTIONS[image.part]
    if (sectionTitle !== section) {
      pptx.addSection({ title: sectionTitle })
      section = sectionTitle
    }
    const slide = pptx.addSlide({ sectionTitle })
    slide.addImage({ data: `image/png;base64,${toBase64(image.png)}`, ...placement })
    slide.addNotes(image.label)
  }

  return (await pptx.write({ outputType: 'blob' })) as Blob
}
