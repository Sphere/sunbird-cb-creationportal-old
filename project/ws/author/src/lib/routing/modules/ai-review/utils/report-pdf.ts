import { IAiReview } from '../models/ai-review.model'
import { buildReportHtml, reportFileName } from './report-export'

/**
 * Saves the report as a PDF file, without a print dialog.
 *
 * The same document the printable report shows, drawn by the browser (so Hindi and every other
 * script come out exactly as on screen; a text-only PDF library cannot shape Devanagari) and
 * paged onto A4 by html2pdf.js, which keeps a resource's block, a table row or a finding from
 * being cut across two pages where it can.
 *
 * The report's styles are scoped to its own container first: html2pdf draws inside this page,
 * and unscoped rules (`body`, `h2`, `table`) would restyle the portal while it does.
 */

const ROOT = 'air-pdf-root'

/**
 * Prefixes every selector with the root class, twice: the doubled class outranks the portal's
 * own rules (`.mat-typography h2` and the like), so headings keep the report's size and font
 * while html2pdf draws inside the portal. Drops print-only and page rules.
 */
export function scopeCss(css: string, root = `.${ROOT}.${ROOT}`): string {
  const out: string[] = []
  let rest = css
  // Drop @page {…} and @media print {…} (with its nested rules).
  rest = rest.replace(/@page\s*\{[^}]*\}/g, '')
  rest = rest.replace(/@media\s+print\s*\{(?:[^{}]*\{[^}]*\})*[^{}]*\}/g, '')
  const re = /([^{}]+)\{([^}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(rest))) {
    const selectors = m[1]
      .split(',')
      .map(sel => sel.trim())
      .filter(Boolean)
      .map(sel => {
        if (sel === 'body' || sel === 'html') {
          return root
        }
        if (sel === '*') {
          return `${root}, ${root} *`
        }
        return `${root} ${sel}`
      })
    if (selectors.length) {
      out.push(`${selectors.join(', ')}{${m[2]}}`)
    }
  }
  return out.join('\n')
}

/** The report as one self-contained, scoped element, ready to be drawn into a PDF. */
export function reportElement(review: IAiReview, doc: Document): HTMLElement {
  const html = buildReportHtml(review)
  const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || ''
  const body = (html.match(/<body>([\s\S]*)<\/body>/) || [])[1] || ''
  const el = doc.createElement('div')
  el.className = ROOT
  el.innerHTML = `<style>${scopeCss(css)}</style>${body}`
  el.style.width = `${PAGE.widthPx}px`
  el.style.background = '#fff'
  return el
}

/** A4 with the margins used below, in CSS pixels (96 per inch), so layout and pages agree. */
const MM = 96 / 25.4
const MARGIN = { top: 10, right: 10, bottom: 12, left: 10 }
export const PAGE = {
  widthPx: Math.floor((210 - MARGIN.left - MARGIN.right) * MM),
  heightPx: Math.floor((297 - MARGIN.top - MARGIN.bottom) * MM),
}

/** Blocks never cut across a page; headings are also kept with what follows them. */
const KEEP_WHOLE = '.hero, .cards, .resource > *, .domain > *, .items > li, .cov > li, .gap-src, .fit, .pkg, .align > *, tr, p, footer'
const HEADINGS = 'h2, h3, h4'
/** Room a heading needs below it on the same page. */
const HEADING_TAIL = 70

/**
 * Pushes every block that would straddle a page edge onto the next page, one at a time,
 * measuring again after each push (so each break accounts for the ones before it). The element
 * must be laid out (in the document) at the page width.
 */
export function keepBlocksWhole(root: HTMLElement, pageHeight: number = PAGE.heightPx): number {
  const doc = root.ownerDocument
  let pushed = 0
  const top = () => root.getBoundingClientRect().top
  const blocks = Array.from(root.querySelectorAll<HTMLElement>(`${KEEP_WHOLE}, ${HEADINGS}`))
  for (const el of blocks) {
    const rect = el.getBoundingClientRect()
    const start = rect.top - top()
    const isHeading = el.matches(HEADINGS)
    const height = rect.height + (isHeading ? HEADING_TAIL : 0)
    if (!rect.height || height >= pageHeight) {
      continue // empty, or taller than a page: it has to break somewhere
    }
    const offset = start % pageHeight
    if (offset + height <= pageHeight) {
      continue
    }
    const gap = Math.ceil(pageHeight - offset) + 1
    if (el.tagName === 'TR') {
      const table = el.closest('table')
      // A table's first row sets its column widths, so a spacer must never become it: when the
      // header (or the first row) would cross the edge, the whole table moves down instead.
      if (table && (el.parentElement?.tagName === 'THEAD' || table.rows[0] === el)) {
        const spacer = doc.createElement('div')
        spacer.style.cssText = `height:${Math.ceil(pageHeight - ((table.getBoundingClientRect().top - top()) % pageHeight)) + 1}px`
        table.parentElement?.insertBefore(spacer, table)
      } else {
        const columns = Array.from((el as HTMLTableRowElement).cells).reduce((n, c) => n + (c.colSpan || 1), 0) || 1
        const spacer = doc.createElement('tr')
        spacer.innerHTML = `<td colspan="${columns}" style="height:${gap}px;padding:0;border:0;background:none"></td>`
        el.parentElement?.insertBefore(spacer, el)
      }
    } else {
      const spacer = doc.createElement(el.tagName === 'LI' ? 'li' : 'div')
      spacer.style.cssText = `height:${gap}px;margin:0;padding:0;border:0;background:none;list-style:none`
      el.parentElement?.insertBefore(spacer, el)
    }
    pushed++
  }
  return pushed
}

/**
 * html2canvas finds where text sits by laying a 1x1 image beside a line of sample text and
 * reading the image's offset. The portal's Tailwind base styles make every `img` a block, so
 * that image drops below the text and every line of the PDF was drawn about a line too low:
 * text sank under its pills, header rows and heading rules. While the PDF is drawn, this puts
 * only html2canvas's own measuring image back inline (it is matched by its exact source, so no
 * image of the portal is touched). Returns the undo.
 */
export const HTML2CANVAS_PROBE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

export function keepTextOnItsBaseline(doc: Document): () => void {
  const style = doc.createElement('style')
  style.setAttribute('data-air-pdf', 'baseline')
  style.textContent = `img[src="${HTML2CANVAS_PROBE}"]{display:inline !important;vertical-align:baseline !important}`
  doc.head.appendChild(style)
  return () => style.remove()
}

interface Html2Pdf extends PromiseLike<unknown> {
  set(options: Record<string, unknown>): Html2Pdf
  from(source: HTMLElement): Html2Pdf
  toContainer(): Html2Pdf
  toCanvas(): Html2Pdf
  toPdf(): Html2Pdf
  save(): Html2Pdf
  /** The worker's canvas or jsPDF document, once the steps before have run. */
  get(key: 'canvas' | 'pdf'): PromiseLike<unknown>
}

/** The part of jsPDF used to add the pages of the later drawings. */
interface JsPdf {
  addPage(): unknown
  addImage(data: string, format: string, x: number, y: number, w: number, h: number): unknown
  save(name: string): unknown
}

/** The steps of making a file, as the download panel shows them. */
export type ExportStep = 'gather' | 'layout' | 'draw' | 'build' | 'save'

/**
 * Browsers refuse a canvas past a size, and some draw it blank instead of failing: Safari at
 * about 16.7 million pixels (about five A4 pages at scale 2), Firefox past about 32,000 pixels
 * high. A long report is therefore drawn a few pages at a time and the pages put together.
 */
const DRAW_PAGES = 4
const MAX_CANVAS_PIXELS = 16_000_000
const MAX_CANVAS_HEIGHT = 32_000
const SCALE = 2

/**
 * The report's top-level blocks, grouped so each group fits one drawing: by where each block
 * starts (`tops`) and where the last ends (`end`). A block taller than `limit` is a group of its own.
 */
export function groupBlocks(tops: readonly number[], end: number, limit: number): number[][] {
  const groups: number[][] = []
  let start = 0
  tops.forEach((top, i) => {
    const bottom = i + 1 < tops.length ? tops[i + 1] : end
    const group = groups[groups.length - 1]
    if (group && bottom - start <= limit) {
      group.push(i)
    } else {
      groups.push([i])
      start = top
    }
  })
  return groups
}

/** The drawing scale for a part `height` CSS pixels tall: 2, or less so the canvas is allowed. */
export function scaleFor(height: number, width: number = PAGE.widthPx): number {
  if (height <= 0) {
    return SCALE
  }
  const byArea = Math.sqrt(MAX_CANVAS_PIXELS / (width * height))
  const byHeight = MAX_CANVAS_HEIGHT / height
  return Math.max(0.5, Math.min(SCALE, byArea, byHeight))
}

/** True when a drawing came out empty: no size, or white all over (a refused canvas). */
export function looksBlank(canvas: HTMLCanvasElement | null | undefined, doc: Document): boolean {
  if (!canvas || !canvas.width || !canvas.height) {
    return true
  }
  const probe = doc.createElement('canvas')
  probe.width = 160
  probe.height = 640
  let ctx: CanvasRenderingContext2D | null = null
  try {
    ctx = probe.getContext('2d')
  } catch {
    ctx = null
  }
  if (!ctx) {
    return false // cannot tell (no 2D context): never refuse a PDF on a guess
  }
  ctx.drawImage(canvas, 0, 0, probe.width, probe.height)
  const px = ctx.getImageData(0, 0, probe.width, probe.height).data
  for (let i = 0; i < px.length; i += 4) {
    if (px[i] < 250 || px[i + 1] < 250 || px[i + 2] < 250) {
      return false
    }
  }
  return true
}

/**
 * The report split into parts that each fit one drawing, every part laid out on its own (so
 * keepBlocksWhole pages it from its own top). A short report stays one part, unchanged.
 */
function partsOf(el: HTMLElement, doc: Document): HTMLElement[] {
  const style = el.querySelector('style')
  const blocks = Array.from(el.children).filter(c => c.tagName !== 'STYLE') as HTMLElement[]
  const box = el.getBoundingClientRect()
  // Room for the space keepBlocksWhole adds at page edges.
  const limit = DRAW_PAGES * PAGE.heightPx * 0.85
  if (box.height <= limit || blocks.length < 2) {
    return [el]
  }
  const tops = blocks.map(b => b.getBoundingClientRect().top - box.top)
  return groupBlocks(tops, box.height, limit).map(group => {
    const part = doc.createElement('div')
    part.className = ROOT
    part.style.width = `${PAGE.widthPx}px`
    part.style.background = '#fff'
    if (style) {
      part.appendChild(style.cloneNode(true))
    }
    group.forEach(i => part.appendChild(blocks[i]))
    return part
  })
}

/** The pages of one drawing added to the PDF, cut the way html2pdf cuts its own. */
function addPages(pdf: JsPdf, canvas: HTMLCanvasElement, doc: Document): void {
  const inner = { w: 210 - MARGIN.left - MARGIN.right, h: 297 - MARGIN.top - MARGIN.bottom }
  const pxPage = Math.floor(canvas.width * (inner.h / inner.w))
  const count = Math.ceil(canvas.height / pxPage)
  const page = doc.createElement('canvas')
  const ctx = page.getContext('2d')
  if (!ctx) {
    throw new Error('No 2D canvas to cut the pages from.')
  }
  page.width = canvas.width
  for (let i = 0; i < count; i++) {
    const h = i === count - 1 && canvas.height % pxPage ? canvas.height % pxPage : pxPage
    page.height = h
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, page.width, h)
    ctx.drawImage(canvas, 0, i * pxPage, page.width, h, 0, 0, page.width, h)
    pdf.addPage()
    pdf.addImage(page.toDataURL('image/jpeg', 0.95), 'JPEG', MARGIN.left, MARGIN.top, inner.w, (h * inner.w) / page.width)
  }
}

/** Builds the PDF and saves it as a file, saying which step it is on. */
export async function downloadReportPdf(
  review: IAiReview,
  doc: Document,
  onStep: (step: ExportStep) => void = () => undefined,
): Promise<void> {
  onStep('gather')
  // The module itself or its default, depending on how the bundler wrapped the CommonJS build.
  const mod = (await import('html2pdf.js')) as unknown as { default?: unknown }
  const html2pdf = (typeof mod === 'function' ? mod : mod.default) as () => Html2Pdf
  // Laid out off screen at the page width first, so blocks can be kept whole across pages.
  const offScreen = (part: HTMLElement) => {
    part.style.position = 'absolute'
    part.style.left = '-20000px'
    part.style.top = '0'
    doc.body.appendChild(part)
  }
  const el = reportElement(review, doc)
  offScreen(el)
  const parts: { el: HTMLElement; height: number }[] = []
  try {
    await doc.fonts?.ready
    for (const part of partsOf(el, doc)) {
      if (part !== el) {
        offScreen(part)
      }
      try {
        keepBlocksWhole(part)
        parts.push({ el: part, height: part.getBoundingClientRect().height })
      } finally {
        part.remove()
        part.style.position = ''
        part.style.left = ''
      }
    }
  } finally {
    el.remove()
  }
  const restore = keepTextOnItsBaseline(doc)
  try {
    await drawAndSave(html2pdf, parts, review, doc, onStep)
  } finally {
    restore()
  }
}

async function drawAndSave(
  html2pdf: () => Html2Pdf,
  parts: { el: HTMLElement; height: number }[],
  review: IAiReview,
  doc: Document,
  onStep: (step: ExportStep) => void,
): Promise<void> {
  const worker = (part: { el: HTMLElement; height: number }) =>
    html2pdf()
      .set({
        margin: [MARGIN.top, MARGIN.right, MARGIN.bottom, MARGIN.left],
        filename: reportFileName(review, 'pdf'),
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: scaleFor(part.height), useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        // Breaks are placed by keepBlocksWhole; html2pdf only cuts the pages.
        pagebreak: { mode: [] },
      })
      .from(part.el)
  const drawn = async (w: Html2Pdf): Promise<HTMLCanvasElement> => {
    const canvas = (await w.get('canvas')) as HTMLCanvasElement
    if (looksBlank(canvas, doc)) {
      throw new Error('The browser drew an empty page.')
    }
    return canvas
  }
  // Each step of html2pdf in turn, so the panel follows the real work.
  const first = worker(parts[0])
  onStep('layout')
  await first.toContainer()
  onStep('draw')
  await first.toCanvas()
  await drawn(first)
  onStep('build')
  await first.toPdf()
  if (parts.length === 1) {
    onStep('save')
    await first.save()
    return
  }
  const pdf = (await first.get('pdf')) as JsPdf
  onStep('draw')
  for (const part of parts.slice(1)) {
    const next = worker(part)
    await next.toContainer()
    await next.toCanvas()
    addPages(pdf, await drawn(next), doc)
  }
  onStep('save')
  pdf.save(reportFileName(review, 'pdf'))
}
