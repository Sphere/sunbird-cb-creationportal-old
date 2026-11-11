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

interface Html2Pdf extends PromiseLike<unknown> {
  set(options: Record<string, unknown>): Html2Pdf
  from(source: HTMLElement): Html2Pdf
  toContainer(): Html2Pdf
  toCanvas(): Html2Pdf
  toPdf(): Html2Pdf
  save(): Html2Pdf
}

/** The steps of making a file, as the download panel shows them. */
export type ExportStep = 'gather' | 'layout' | 'draw' | 'build' | 'save'

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
  const el = reportElement(review, doc)
  el.style.position = 'absolute'
  el.style.left = '-20000px'
  el.style.top = '0'
  doc.body.appendChild(el)
  try {
    await doc.fonts?.ready
    keepBlocksWhole(el)
  } finally {
    el.remove()
  }
  el.style.position = ''
  el.style.left = ''
  const worker = html2pdf()
    .set({
      margin: [MARGIN.top, MARGIN.right, MARGIN.bottom, MARGIN.left],
      filename: reportFileName(review, 'pdf'),
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      // Breaks are placed by keepBlocksWhole; html2pdf only cuts the pages.
      pagebreak: { mode: [] },
    })
    .from(el)
  // Each step of html2pdf in turn, so the panel follows the real work.
  onStep('layout')
  await worker.toContainer()
  onStep('draw')
  await worker.toCanvas()
  onStep('build')
  await worker.toPdf()
  onStep('save')
  await worker.save()
}
