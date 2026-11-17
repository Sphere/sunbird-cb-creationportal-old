import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, computed, inject, input, signal, viewChild } from '@angular/core'
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
import { AirEvidence, AirEvidenceComponent } from '../air-evidence/air-evidence.component'
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

/**
 * The subject expert's checks, as the review service asks them (src/prompts/domain-indicators.ts),
 * from the client's spec (docs/Video_Reviewer_spec.md): six in the plain style; FRAC swaps D2–D4
 * for level fit, MECE and coverage, and adds D7 so accuracy is still checked.
 */
export const DOMAIN_CHECKS: Record<'plain' | 'frac', { id: string; text: string }[]> = {
  plain: [
    { id: 'D1', text: 'The content belongs to this competency and topic.' },
    { id: 'D2', text: 'It teaches what the level description specifies.' },
    { id: 'D3', text: 'Nothing essential in the level is skipped, garbled or taught incorrectly.' },
    { id: 'D4', text: 'Clinical and procedural accuracy under Indian public-health practice.' },
    { id: 'D5', text: 'Right for the learners: depth, language and safety emphasis suit the health workers the level is meant for.' },
    { id: 'D6', text: "The skill is shown in the health worker's real work setting." },
  ],
  frac: [
    { id: 'D1', text: "Within this competency's territory, not a different competency's." },
    { id: 'D2', text: 'Level fit: pitched at the level, not below it and not above it.' },
    { id: 'D3', text: 'MECE: stays inside the level, without drifting into the others.' },
    { id: 'D4', text: 'Coverage: no essential step, criterion or component is skipped or garbled.' },
    { id: 'D5', text: 'Role fit: prepares the position for its FRAC activities (or suits the cadre).' },
    { id: 'D6', text: 'Activity realism: the skill is shown the way the job is done.' },
    { id: 'D7', text: 'Clinical and procedural accuracy under Indian public-health practice.' },
  ],
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

  /** The subject checks this review asked, by its style: what the "i" beside the domain score lists. */
  readonly domainChecks = computed(() => DOMAIN_CHECKS[this.review().options?.domainStyle === 'frac' ? 'frac' : 'plain'])
  /** Which score card's explanation is open, if any. */
  readonly info = signal<'addie' | 'domain' | null>(null)

  toggleInfo(which: 'addie' | 'domain'): void {
    this.info.update(open => (open === which ? null : which))
  }

  /** Escape, or a click anywhere outside the explanation and its button, closes it. */
  @HostListener('document:keydown.escape')
  closeInfo(): void {
    this.info.set(null)
  }

  @HostListener('document:click', ['$event'])
  closeInfoOutside(event: Event): void {
    if (this.info() && !(event.target instanceof Element && event.target.closest('.air-info'))) {
      this.info.set(null)
    }
  }
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

  /**
   * Opens an issue in place: the resource at its moment or page, with the finding and fix. The
   * pop-up can step through the rest of that resource's "To fix" list with Previous and Next.
   */
  openIssue(x: Issue): void {
    const list = (this.fixGroups().get(x.item.contentId) || []).flatMap(g => g.issues)
    const index = list.indexOf(x)
    const e = this.issueEvidence(x)
    this.evidence()?.open(e, index >= 0 ? { list: list.map(i => (i === x ? e : this.issueEvidence(i))), index } : undefined)
  }

  /** One issue as the pop-up shows it. */
  private issueEvidence(x: Issue): AirEvidence {
    return {
      item: this.latest(x.item),
      code: x.id,
      source: ISSUE_SOURCES[x.source],
      title: x.what,
      verdict: x.tone,
      // A question shows its answer and options in their own places; the notes are the rest.
      notes: x.question ? x.question.issues : x.finding ? x.finding.split('\n') : [],
      fix: x.fix || undefined,
      at: x.place.at,
      atSec: x.place.atSec,
      page: x.place.page,
      ...(x.borderline ? { borderline: true } : {}),
      ...(x.check ? { check: x.check } : {}),
      ...(x.question ? { question: x.question } : {}),
    }
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

  /**
   * Opens a checklist indicator in place: the resource at its moment or page, and the fix. The
   * pop-up can step through the rest of that resource's checklist with Previous and Next.
   */
  openIndicator(item: IAiReviewItem, indicator: IAiReviewScoredItem): void {
    const addie = item.result?.addie && !isPassError(item.result.addie) ? item.result.addie : null
    const list = addie ? addie.score.areas.flatMap(a => a.items) : []
    const index = list.indexOf(indicator)
    const e = this.indicatorEvidence(item, indicator)
    this.evidence()?.open(
      e,
      index >= 0 ? { list: list.map(i => (i === indicator ? e : this.indicatorEvidence(item, i))), index } : undefined,
    )
  }

  /** One checklist indicator as the pop-up shows it. */
  private indicatorEvidence(item: IAiReviewItem, indicator: IAiReviewScoredItem): AirEvidence {
    return {
      item: this.latest(item),
      code: indicator.id,
      source: 'CBP / ADDIE checklist',
      title: indicator.text,
      verdict: indicator.verdict,
      notes: indicator.note && !indicator.withdrawn ? [indicator.note] : [],
      fix: indicator.withdrawn ? undefined : indicator.fix,
      at: indicator.at,
      atSec: indicator.atSec,
      page: indicator.page,
      ...(indicator.borderline ? { borderline: true } : {}),
      ...(indicator.check ? { check: indicator.check } : {}),
      ...(indicator.withdrawn ? { withdrawn: indicator.withdrawn } : {}),
    }
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
