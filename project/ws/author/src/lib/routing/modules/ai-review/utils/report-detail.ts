import { IAiReview, IAiReviewCoverageRow, IAiReviewItem, IAiReviewScoredItem, isPassError } from '../models/ai-review.model'

/**
 * Where a finding is, and how to open it: shared by the on-screen report, the PDF and the
 * Excel workbook, so all three point to the same place.
 */

/** A place in a resource: a moment in a video or a page in a PDF. */
export interface Place {
  at?: string
  atSec?: number
  page?: number
}

/**
 * A time or page written in free text ("Shown at 0:10", "on page 3"), for findings that carry
 * no location field of their own, such as coverage evidence.
 */
export function locateText(text: string): Place {
  const page = text.match(/\bpages?\s+(\d{1,4})\b/i)
  if (page) {
    return { at: `page ${Number(page[1])}`, page: Number(page[1]) }
  }
  const time = text.match(/\b(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)\b/)
  if (time) {
    return { at: time[0], atSec: Number(time[1] || 0) * 3600 + Number(time[2]) * 60 + Number(time[3]) }
  }
  return {}
}

/** "0:12" or "page 3": how a place reads. */
export function placeLabel(p: Place): string {
  if (p.page) {
    return `page ${p.page}`
  }
  if (typeof p.atSec === 'number') {
    const s = Math.max(0, Math.floor(p.atSec))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }
  return p.at || ''
}

/**
 * A link that opens the resource at the place: a video at the moment (#t=), a PDF on the page
 * (#page=). Null for a resource with no file to open (a quiz), or an unsafe address.
 */
export function placeLink(item: Pick<IAiReviewItem, 'artifactUrl'>, p: Place = {}): string | null {
  const url = item.artifactUrl || ''
  if (!/^https?:\/\//i.test(url)) {
    return null
  }
  const base = url.split('#')[0]
  if (p.page) {
    return `${base}#page=${p.page}`
  }
  if (typeof p.atSec === 'number') {
    return `${base}#t=${Math.max(0, Math.floor(p.atSec))}`
  }
  return base
}

/** Letters and digits in any script, so "BP ≥160/110" and "bp 160 110" are the same component. */
export const normalise = (s: string) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim()

/** Each reviewed resource's own coverage row for a course-level component, with its evidence. */
export function coverageSources(review: Pick<IAiReview, 'items'>, component: string): { item: IAiReviewItem; row: IAiReviewCoverageRow }[] {
  const key = normalise(component)
  const out: { item: IAiReviewItem; row: IAiReviewCoverageRow }[] = []
  for (const item of review.items || []) {
    const d = item.result?.domain
    if (!d || isPassError(d)) {
      continue
    }
    const row = d.coverage.find(c => normalise(c.component) === key)
    if (row) {
      out.push({ item, row })
    }
  }
  return out
}

/** The resources that did not meet a checklist indicator, each with its finding and fix. */
export function gapSources(review: Pick<IAiReview, 'items'>, id: string): { item: IAiReviewItem; indicator: IAiReviewScoredItem }[] {
  const out: { item: IAiReviewItem; indicator: IAiReviewScoredItem }[] = []
  for (const item of review.items || []) {
    const a = item.result?.addie
    if (!a || isPassError(a)) {
      continue
    }
    for (const area of a.score.areas) {
      const indicator = area.items.find(i => i.id === id && i.verdict === 'no')
      if (indicator) {
        out.push({ item, indicator })
      }
    }
  }
  return out
}
