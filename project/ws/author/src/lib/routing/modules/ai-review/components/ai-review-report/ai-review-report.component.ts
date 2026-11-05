import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal, viewChild } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { AiReviewService } from '../../services/ai-review.service'
import { judgedAgainst, reportWords } from '../../utils/report-export'
import { formatDuration, kindFromMime, kindLine, kindMeta } from '../../utils/resource-kind'
import {
  IAiReview,
  IAiReviewAddie,
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

/**
 * A time or page written in free text ("Shown at 0:10", "on page 3"), for findings that
 * carry no location field of their own, such as coverage evidence.
 */
export function locateText(text: string): { at?: string; atSec?: number; page?: number } {
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

/** One resource, with its two passes split into a report or the error that replaced it. */
export interface IReportRow {
  item: IAiReviewItem
  addie: IAiReviewAddie | null
  addieError: string
  domain: IAiReviewDomain | null
  domainError: string
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
  }
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
  readonly coverageCounts = computed(() => {
    const coverage = this.summary()?.coverage || []
    if (!coverage.length) {
      return null
    }
    const count = (status: string) => coverage.filter(c => c.status === status).length
    return { covered: count('covered'), partial: count('partial'), missing: count('missing') }
  })

  /** Resources whose full indicator list is open. */
  private readonly expanded = signal<ReadonlySet<string>>(new Set())

  readonly notMet = notMet
  readonly kindMeta = kindMeta
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

  openQuestion(item: IAiReviewItem, question: IAiReviewQuestionFinding): void {
    this.evidence()?.open({
      item: this.latest(item),
      code: `Q${question.n}`,
      source: 'Question check',
      title: question.question,
      verdict: question.verdict,
      notes: question.issues,
      fix: question.fix,
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
