import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal, viewChild } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { AiReviewService } from '../../services/ai-review.service'
import { judgedAgainst, mediaNotes, recallLine, reportWords } from '../../utils/report-export'
import { coverageSources, locateText, placeLabel } from '../../utils/report-detail'
import { costBreakdown, providerLabel, stepLabel, tokensLabel, usd } from '../../utils/usage'
import { Issue, ISSUE_SOURCES } from '../../utils/issues'
import { checklistTotalOf, coverageCountsOf, fixCountOf, fixGroupsOf, inShortOf, scoreNote, scoreRowsOf } from '../../utils/report-summary'
export type { FixGroup } from '../../utils/report-summary'
import { formatDuration, kindFromMime, kindLine, kindMeta } from '../../utils/resource-kind'
import {
  IAiReview,
  IAiReviewAddie,
  IAiReviewAlignment,
  IAiReviewCourseAlignment,
  IAiReviewCoverageRow,
  IAiReviewDomain,
  IAiReviewItem,
  IAiReviewQuestionFinding,
  IAiReviewScore,
  IAiReviewScoredItem,
  isPassError,
} from '../../models/ai-review.model'
import { AirEvidenceComponent } from '../air-evidence/air-evidence.component'
import { AirIconName } from '../air-icon/air-icon.component'

export { locateText } from '../../utils/report-detail'

/** One resource, with its two passes split into a report or the error that replaced it. */
export interface IReportRow {
  item: IAiReviewItem
  addie: IAiReviewAddie | null
  addieError: string
  domain: IAiReviewDomain | null
  domainError: string
  alignment: IAiReviewAlignment | null
  alignmentError: string
}

export function toReportRow(item: IAiReviewItem): IReportRow {
  const r = item.result
  const addie = r && r.addie && !isPassError(r.addie) ? r.addie : null
  const domain = r && r.domain && !isPassError(r.domain) ? r.domain : null
  return {
    item,
    addie,
    addieError: r && isPassError(r.addie) ? r.addie.error : '',
    domain,
    domainError: r && isPassError(r.domain) ? r.domain.error : '',
    alignment: r && r.alignment && !isPassError(r.alignment) ? r.alignment : null,
    alignmentError: r && r.alignment && isPassError(r.alignment) ? r.alignment.error : '',
  }
}

/** A resource's fit with the course description, in words. */
export function fitLabel(verdict: string): string {
  return (
    ({ aligned: 'Fits the course', partial: 'Partly fits the course', off_topic: 'Off topic for this course' } as Record<string, string>)[
      verdict
    ] || verdict
  )
}

/** The course's verdict against its description, in words. */
export function deliversLabel(verdict: string): string {
  return (
    (
      {
        delivers: 'Delivers what its description promises',
        partly: 'Partly delivers what its description promises',
        does_not: 'Does not deliver what its description promises',
      } as Record<string, string>
    )[verdict] || verdict
  )
}

/** The indicators a resource did not meet, in checklist order. */
export function notMet(score: IAiReviewScore): IAiReviewScoredItem[] {
  return score.areas.reduce<IAiReviewScoredItem[]>((acc, area) => acc.concat(area.items.filter(i => i.verdict === 'no')), [])
}

/**
 * The finished review, read top-down: the course as a whole first (checklist score, combined
 * coverage of the competency level, the gaps that recur), then each resource with what to fix.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-ai-review-report',
  templateUrl: './ai-review-report.component.html',
  styleUrls: ['./ai-review-report.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiReviewReportComponent {
  readonly review = input.required<IAiReview>()

  readonly summary = computed(() => this.review().result)
  /** The course-level alignment verdict, or its error, or null when not asked for. */
  readonly courseAlignment = computed<IAiReviewCourseAlignment | null>(() => {
    const a = this.summary()?.alignment
    return a && !isPassError(a) ? a : null
  })
  readonly courseAlignmentError = computed(() => {
    const a = this.summary()?.alignment
    return a && isPassError(a) ? a.error : ''
  })
  /** The words the course was checked against. */
  readonly brief = computed(() => this.review().options?.courseBrief || null)
  readonly fitLabel = fitLabel
  readonly deliversLabel = deliversLabel
  /** Course and resources, or the user's own files. */
  readonly words = computed(() => reportWords(this.review()))
  readonly rows = computed(() =>
    this.review()
      .items.filter(i => i.status !== 'skipped')
      .map(toReportRow),
  )
  readonly competency = computed(() => this.review().options.competency)
  /** What the domain review judged against, as one line (also in the PDF and Excel). */
  readonly judgedAgainst = computed(() => judgedAgainst(this.review().options))
  /** The FRAC role checked, or why not (FRAC style only). */
  readonly role = computed(() => (this.review().options?.domainStyle === 'frac' ? this.review().options.role || null : null))
  readonly roleNote = computed(() => (this.review().options?.domainStyle === 'frac' ? this.review().options.roleNote || '' : ''))

  /** How much of the competency level the course covers, for the summary card. */
  readonly coverageCounts = computed(() => coverageCountsOf(this.review()))

  /** Each course-level coverage component's sources: which resources cover it, with their evidence. */
  readonly coverageDetail = computed(
    () => new Map((this.summary()?.coverage || []).map(c => [c.component, coverageSources(this.review(), c.component)])),
  )
  readonly placeLabel = placeLabel
  /** Each resource's own findings, each once, grouped (shared with the HTML, PDF and Excel). */
  readonly fixGroups = computed(() => fixGroupsOf(this.review(), this.words().one))

  /** How many things to fix in one resource. */
  fixCount(contentId: string): number {
    return fixCountOf(this.fixGroups(), contentId)
  }

  /** The checklist's full length (47), read from a resource that was scored. */
  readonly checklistTotal = computed(() => checklistTotalOf(this.review()))
  /** One row per resource for the score table, with the course total underneath. */
  readonly scoreRows = computed(() => scoreRowsOf(this.review(), this.fixGroups()))
  readonly totalFixes = computed(() => this.scoreRows().reduce((n, r) => n + r.fixes, 0))
  /** The report in three or four plain sentences, at the top. */
  readonly inShort = computed(() => inShortOf(this.review(), this.words(), this.totalFixes()))
  readonly scoreNote = computed(() => scoreNote(this.checklistTotal(), this.words().one))

  /** Scrolls to one resource's block. */
  jumpTo(contentId: string): void {
    document.getElementById(`air-res-${contentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /** Opens an issue in place: the resource at its moment or page, with the finding and fix. */
  openIssue(x: Issue): void {
    this.evidence()?.open({
      item: this.latest(x.item),
      code: x.id,
      source: ISSUE_SOURCES[x.source],
      title: x.what,
      verdict: x.tone,
      notes: x.finding ? x.finding.split('\n') : [],
      fix: x.fix || undefined,
      at: x.place.at,
      atSec: x.place.atSec,
      page: x.place.page,
    })
  }

  /** Which coverage statuses the list shows. */
  readonly coverageFilter = signal<'all' | 'missing' | 'partial' | 'covered'>('all')
  readonly coverageShown = computed(() => {
    const f = this.coverageFilter()
    const rows = this.summary()?.coverage || []
    return f === 'all' ? rows : rows.filter(r => r.status === f)
  })
  /** Every AI call, by resource, provider, model and step; null when the service sends only totals. */
  readonly costs = computed(() => costBreakdown(this.review()))
  /** The review's estimate, which an older service sends as a string. */
  readonly estimateUsd = computed(() => Number(this.review().estimateUsd) || 0)
  readonly stepLabel = stepLabel
  readonly providerLabel = providerLabel
  readonly tokensLabel = tokensLabel
  readonly usd = usd

  /** Opens one resource's evidence for a course-level coverage component. */
  openCoverageSource(component: string, contentId: string): void {
    const src = (this.coverageDetail().get(component) || []).find(x => x.item.contentId === contentId)
    if (src) {
      this.openCoverage(src.item, src.row)
    }
  }

  /** Resources whose full indicator list is open. */
  private readonly expanded = signal<ReadonlySet<string>>(new Set())

  readonly notMet = notMet
  readonly kindMeta = kindMeta
  readonly mediaNotes = mediaNotes
  readonly recallLine = recallLine
  readonly kindLine = kindLine
  readonly duration = formatDuration

  private readonly evidence = viewChild<AirEvidenceComponent>('evidence')
  private readonly api = inject(AiReviewService)
  private readonly destroyRef = inject(DestroyRef)

  /** Items read again for fresh file links, by content id; used for every later open too. */
  private readonly fresh = signal<ReadonlyMap<string, IAiReviewItem>>(new Map())

  /** The item with its freshest link. */
  private latest(item: IAiReviewItem): IAiReviewItem {
    return this.fresh().get(item.contentId) || item
  }

  /** Reads the review again for new signed file links, and puts the one open back on screen. */
  refreshLinks(item: IAiReviewItem): void {
    this.api
      .get(this.review().id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: review => {
          this.fresh.set(new Map(review.items.map(i => [i.contentId, i])))
          this.evidence()?.replaceItem(this.latest(item))
        },
        error: err =>
          this.evidence()?.refreshFailed(AiReviewService.errorMessage(err, 'A fresh link could not be fetched just now. Try again.')),
      })
  }

  /** Opens a checklist indicator in place: the resource at its moment or page, and the fix. */
  openIndicator(item: IAiReviewItem, indicator: IAiReviewScoredItem): void {
    this.evidence()?.open({
      item: this.latest(item),
      code: indicator.id,
      source: 'CBP / ADDIE checklist',
      title: indicator.text,
      verdict: indicator.verdict,
      notes: indicator.note ? [indicator.note] : [],
      fix: indicator.fix,
      at: indicator.at,
      atSec: indicator.atSec,
      page: indicator.page,
    })
  }

  openCoverage(item: IAiReviewItem, row: IAiReviewCoverageRow): void {
    this.evidence()?.open({
      item: this.latest(item),
      code: '',
      source: 'Domain review · coverage of the level',
      title: row.component,
      verdict: row.status,
      notes: row.evidence ? [row.evidence] : [],
      ...locateText(row.evidence || ''),
    })
  }

  kindOf(item: Pick<IAiReviewItem, 'kind' | 'mimeType'>): string {
    return item.kind || kindFromMime(item.mimeType)
  }

  /** The quiz or assessment questions that need attention. */
  questionIssues(item: IAiReviewItem): IAiReviewQuestionFinding[] {
    return (item.result?.questions || []).filter(q => q.verdict === 'issue')
  }

  isExpanded(contentId: string): boolean {
    return this.expanded().has(contentId)
  }

  toggle(contentId: string): void {
    const next = new Set(this.expanded())
    if (next.has(contentId)) {
      next.delete(contentId)
    } else {
      next.add(contentId)
    }
    this.expanded.set(next)
  }

  coverageIcon(status: string): AirIconName {
    return status === 'covered' ? 'checkCircle' : status === 'partial' ? 'partial' : 'cancelCircle'
  }

  verdictLabel(verdict: string): string {
    return verdict === 'yes' ? 'Met' : verdict === 'no' ? 'Not met' : 'N/A'
  }

  levelFitLabel(verdict: string): string {
    const labels: Record<string, string> = {
      fits: 'Pitched at the right level',
      below: 'Pitched below the level',
      above: 'Pitched above the level',
      mixed: 'Pitched at mixed levels',
    }
    return labels[verdict] || verdict
  }
}
