import { IAiReview, IAiReviewItem, isPassError } from '../models/ai-review.model'
import { collectIssues, Issue, ISSUE_SOURCES, IssueSource } from './issues'

/**
 * The report's summary, worked out once for the screen, the HTML/PDF and the Excel, so they
 * always agree: each resource's things to fix (each finding once), the score by resource with
 * the course total, and the report in a few plain sentences.
 */

/** One kind of finding within a resource's "To fix" list. */
export interface FixGroup {
  source: IssueSource
  label: string
  issues: Issue[]
}

/**
 * What a resource's "To fix" list holds, in this order. Level coverage, fit with the course and
 * passes that could not run are left out: each is shown once, in its own place.
 */
export const FIX_ORDER: IssueSource[] = ['noSound', 'checklist', 'domain', 'question']
export const FIX_LABELS: Partial<Record<IssueSource, string>> = {
  checklist: 'CBP checklist · not met',
  domain: 'Domain review · not met',
  question: 'Questions that need attention',
}

/** Each resource's findings to fix, by content id, grouped and in FIX_ORDER. */
export function fixGroupsOf(review: Pick<IAiReview, 'items'>, oneWord = 'resource'): Map<string, FixGroup[]> {
  const out = new Map<string, FixGroup[]>()
  for (const x of collectIssues(review, oneWord)) {
    if (!FIX_ORDER.includes(x.source)) {
      continue
    }
    const groups = out.get(x.item.contentId) || []
    let g = groups.find(y => y.source === x.source)
    if (!g) {
      g = { source: x.source, label: FIX_LABELS[x.source] || ISSUE_SOURCES[x.source], issues: [] }
      groups.push(g)
    }
    g.issues.push(x)
    out.set(x.item.contentId, groups)
  }
  out.forEach(groups => groups.sort((a, b) => FIX_ORDER.indexOf(a.source) - FIX_ORDER.indexOf(b.source)))
  return out
}

/** How many things to fix in one resource. */
export function fixCountOf(groups: Map<string, FixGroup[]>, contentId: string): number {
  return (groups.get(contentId) || []).reduce((n, g) => n + g.issues.length, 0)
}

/** One resource's line in the score table. */
export interface ScoreRow {
  item: IAiReviewItem
  addie: { yes: number; applicable: number; pct: number | null; band: string } | null
  domain: { yes: number; applicable: number } | null
  fixes: number
  failed: boolean
}

export function scoreRowsOf(review: Pick<IAiReview, 'items'>, groups: Map<string, FixGroup[]>): ScoreRow[] {
  return (review.items || [])
    .filter(i => i.status !== 'skipped')
    .map(item => {
      const r = item.result
      const a = r?.addie && !isPassError(r.addie) ? r.addie : null
      const d = r?.domain && !isPassError(r.domain) ? r.domain : null
      return {
        item,
        addie: a ? { yes: a.score.yes, applicable: a.score.applicable, pct: a.score.scorePct, band: a.score.band || 'none' } : null,
        domain: d ? { yes: d.score.yes, applicable: d.score.applicable } : null,
        fixes: fixCountOf(groups, item.contentId),
        failed: item.status === 'failed' || item.status === 'cancelled',
      }
    })
}

/**
 * The CBP checklist's full length: the 47 indicators of the client's spec (§3), which the
 * service seeds. A resource's own score.total is smaller for types the checklist only partly
 * fits (17 for a quiz), so it cannot stand for the checklist.
 */
export const CBP_CHECKLIST_POINTS = 47

/** The checklist's full length when any resource was scored; 0 when none was. */
export function checklistTotalOf(review: Pick<IAiReview, 'items'>): number {
  return (review.items || []).some(i => i.result?.addie && !isPassError(i.result.addie)) ? CBP_CHECKLIST_POINTS : 0
}

/** How much of the competency level the course covers; null when there is no coverage. */
export function coverageCountsOf(review: Pick<IAiReview, 'result'>): { covered: number; partial: number; missing: number } | null {
  const coverage = review.result?.coverage || []
  if (!coverage.length) {
    return null
  }
  const count = (status: string) => coverage.filter(c => c.status === status).length
  return { covered: count('covered'), partial: count('partial'), missing: count('missing') }
}

/** The report in three or four plain sentences. */
export function inShortOf(review: Pick<IAiReview, 'result' | 'items'>, words: { one: string; many: string }, totalFixes: number): string[] {
  const s = review.result
  if (!s) {
    return []
  }
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`
  const lines: string[] = [
    `${n(s.reviewed, words.one, words.many)} reviewed` +
      (s.failed ? `; ${s.failed} could not be reviewed` : '') +
      (s.skipped.length ? `; ${s.skipped.length} left out (listed below)` : '') +
      '.',
  ]
  if (s.addie) {
    lines.push(
      `CBP checklist: ${s.addie.scorePct ?? '—'}% — ${s.addie.yes} of the ${s.addie.applicable} checks that apply are met` +
        (s.addie.bandMessage ? ` (${s.addie.bandMessage.replace(/[.\s]+$/, '')}).` : '.'),
    )
  }
  const cc = coverageCountsOf(review)
  if (cc) {
    lines.push(
      `Competency level: ${cc.covered} of ${cc.covered + cc.partial + cc.missing} parts fully taught, ${cc.partial} partly, ${cc.missing} missing.`,
    )
  }
  if (totalFixes) {
    lines.push(`${n(totalFixes, 'thing', 'things')} to fix, listed under each ${words.one} below.`)
  }
  const unsure = borderlineCountOf(review)
  if (unsure) {
    lines.push(
      `${n(unsure, 'finding is', 'findings are')} marked Borderline: the reviewer was not sure, or could not prove ${unsure === 1 ? 'it' : 'them'} from the material. Check ${unsure === 1 ? 'it' : 'them'} by hand before acting.`,
    )
  }
  return lines
}

/** Findings to fix that need a person to check them (borderline). */
export function borderlineCountOf(review: Pick<IAiReview, 'items'>): number {
  let n = 0
  fixGroupsOf(review).forEach(groups => groups.forEach(g => (n += g.issues.filter(x => x.borderline).length)))
  return n
}

/** The note under the score table: why a resource is scored on fewer than the full checklist. */
export function scoreNote(total: number, one: string): string {
  return `The CBP checklist has ${total} points. Each ${one} is scored only on the points that apply to it: some do not fit its type at all (a quiz has no visuals or narration to judge), and the reviewer marks others not applicable. So a ${one} is scored on fewer than ${total}. The total adds every ${one} together.`
}
