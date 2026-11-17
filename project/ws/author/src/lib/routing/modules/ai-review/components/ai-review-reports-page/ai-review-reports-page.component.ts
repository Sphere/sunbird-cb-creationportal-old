import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { Router } from '@angular/router'
import { saveAs } from 'file-saver'
import { Subscription, firstValueFrom } from 'rxjs'
import {
  AiReviewSource,
  AiReviewStatus,
  IAiReviewAdminFilter,
  IAiReviewAdminPage,
  IAiReviewAdminRow,
  IAiReviewAdminSummary,
} from '../../models/ai-review.model'
import { AiReviewService } from '../../services/ai-review.service'
import { statusLabel } from '../../utils/review-run'
import { AI_REVIEW_NEW, aiReviewCourse } from '../../utils/routes'
import { AirSelectOption } from '../air-select/air-select.component'

/** The periods the report offers; `custom` uses the two dates the admin picks. */
export type ReportPeriod = 'month' | '30d' | 'year' | 'all' | 'custom'

/** YYYY-MM-DD for a date, in the viewer's own calendar. */
export function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** The from and to days (both inclusive) of a period, counted back from `today`. */
export function rangeOf(
  period: ReportPeriod,
  today: Date,
  custom: { from: string; to: string } = { from: '', to: '' },
): { from?: string; to?: string } {
  switch (period) {
    case 'month':
      return { from: isoDay(new Date(today.getFullYear(), today.getMonth(), 1)), to: isoDay(today) }
    case '30d':
      return { from: isoDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)), to: isoDay(today) }
    case 'year':
      return { from: isoDay(new Date(today.getFullYear(), 0, 1)), to: isoDay(today) }
    case 'custom':
      return { ...(custom.from ? { from: custom.from } : {}), ...(custom.to ? { to: custom.to } : {}) }
    default:
      return {}
  }
}

/** "$0.81", or "$0.0042" for an amount under a cent, so small spends never read as $0.00. */
export function usdText(v: number | null | undefined): string {
  const n = Number(v || 0)
  return n > 0 && n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`
}

/** One CSV field: quoted, quotes doubled, and a leading =, +, - or @ neutralised (no formulas). */
export function csvField(v: unknown): string {
  const s = String(v ?? '')
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return `"${safe.replace(/"/g, '""')}"`
}

/** Every review in the list as CSV, with a header row. */
export function reviewsCsv(rows: IAiReviewAdminRow[]): string {
  const head = [
    'Started',
    'Finished',
    'Kind',
    'Course or files',
    'Course id',
    'Run by',
    'Run by (id)',
    'Status',
    'CBP score %',
    'Verdict',
    'Cost (USD)',
    'Review id',
  ]
  const lines = rows.map(r =>
    [
      r.createdAt,
      r.finishedAt || '',
      r.source === 'upload' ? 'Files' : 'Course',
      r.name,
      r.courseId || '',
      r.requestedBy.name,
      r.requestedBy.id,
      statusLabel(r.status),
      r.scorePct ?? '',
      r.verdict?.message || '',
      Number(r.costUsd || 0).toFixed(4),
      r.id,
    ]
      .map(csvField)
      .join(','),
  )
  return [head.map(csvField).join(','), ...lines].join('\r\n')
}

/** Two letters for an avatar: the first of the first and last names, or of the id. */
export function initials(name: string): string {
  const words = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) {
    return '?'
  }
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2)
  return letters.toUpperCase()
}

/** A person as the report names them: their name, or for a record saved without one, a short id. */
export function personName(id: string, name: string | null | undefined): string {
  return (name || '').trim() || `User ${String(id || '').slice(0, 8)}`
}

export type ReportTab = 'reviews' | 'people' | 'courses'

const PAGE_SIZE = 50
/** The most rows a download gathers (200 a request). */
const DOWNLOAD_MAX = 5000

/**
 * Reports, for AI review admins (AI_REVIEW_ADMIN): every review across everyone, course and
 * file, with who ran it, how it came out and what it cost; the spend in all, by person and by
 * course; and this month's spend against the budget. Each review opens its full report. The
 * service checks the admin role itself, so the page shows its refusal if it is not held.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-ai-review-reports-page',
  templateUrl: './ai-review-reports-page.component.html',
  styleUrls: ['../ai-review-course-page/ai-review-course-page.component.scss', './ai-review-reports-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiReviewReportsPageComponent implements OnInit {
  private readonly api = inject(AiReviewService)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)

  readonly usd = usdText
  readonly statusLabel = statusLabel
  readonly initials = initials
  readonly personName = personName

  /** The list the panel shows: every review, or the spend by person or by course. */
  readonly tab = signal<ReportTab>('reviews')

  // ---- filters ----
  readonly period = signal<ReportPeriod>('month')
  readonly customFrom = signal('')
  readonly customTo = signal('')
  readonly source = signal<AiReviewSource | ''>('')
  readonly status = signal<AiReviewStatus | ''>('')
  readonly userId = signal('')
  readonly query = signal('')

  readonly periodOptions: AirSelectOption[] = [
    { value: 'month', label: 'This month' },
    { value: '30d', label: 'Last 30 days' },
    { value: 'year', label: 'This year' },
    { value: 'all', label: 'All time' },
    { value: 'custom', label: 'Pick dates' },
  ]
  readonly sourceOptions: AirSelectOption[] = [
    { value: '', label: 'Courses & files' },
    { value: 'course', label: 'Courses' },
    { value: 'upload', label: 'Files' },
  ]
  readonly statusOptions: AirSelectOption[] = [
    { value: '', label: 'Any status' },
    ...(['done', 'partial', 'failed', 'cancelled', 'running', 'queued'] as AiReviewStatus[]).map(s => ({
      value: s,
      label: statusLabel(s),
    })),
  ]
  /** Everyone who ran a review in the period, from the summary, to filter by. */
  readonly personOptions = computed<AirSelectOption[]>(() => [
    { value: '', label: 'Everyone' },
    ...(this.summary()?.byPerson || []).map(p => ({
      value: p.userId,
      label: personName(p.userId, p.name),
      hint: `${p.reviews} reviews · ${usdText(p.costUsd)}`,
    })),
  ])

  /** The filter the service is asked for. */
  readonly filter = computed<IAiReviewAdminFilter>(() => ({
    ...rangeOf(this.period(), new Date(), { from: this.customFrom(), to: this.customTo() }),
    ...(this.userId() ? { userId: this.userId() } : {}),
    ...(this.source() ? { source: this.source() as AiReviewSource } : {}),
    ...(this.status() ? { status: this.status() as AiReviewStatus } : {}),
    ...(this.query().trim() ? { q: this.query().trim() } : {}),
  }))
  /**
   * Every filter that is set, as a chip that removes just that one: the period when it is not
   * this month, the person, the kind, the status and the search.
   */
  readonly activeFilters = computed<{ key: 'period' | 'person' | 'source' | 'status' | 'query'; label: string; value: string }[]>(() => {
    const out: { key: 'period' | 'person' | 'source' | 'status' | 'query'; label: string; value: string }[] = []
    if (this.period() !== 'month') {
      const label = this.period() === 'custom' ? this.periodText() : this.periodOptions.find(o => o.value === this.period())?.label || ''
      out.push({ key: 'period', label: 'Period', value: label })
    }
    if (this.userId()) {
      const p = (this.summary()?.byPerson || []).find(x => x.userId === this.userId())
      out.push({ key: 'person', label: 'Run by', value: personName(this.userId(), p?.name) })
    }
    if (this.source()) {
      out.push({ key: 'source', label: 'Type', value: this.source() === 'upload' ? 'Files' : 'Courses' })
    }
    if (this.status()) {
      out.push({ key: 'status', label: 'Status', value: statusLabel(this.status()) })
    }
    if (this.query().trim()) {
      out.push({ key: 'query', label: 'Search', value: `“${this.query().trim()}”` })
    }
    return out
  })

  /** Removes one filter, by its chip. */
  removeFilter(key: 'period' | 'person' | 'source' | 'status' | 'query'): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
    }
    switch (key) {
      case 'period':
        this.period.set('month')
        break
      case 'person':
        this.userId.set('')
        break
      case 'source':
        this.source.set('')
        break
      case 'status':
        this.status.set('')
        break
      case 'query':
        this.query.set('')
        break
    }
    this.reload()
  }

  readonly customInvalid = computed(
    () => this.period() === 'custom' && !!this.customFrom() && !!this.customTo() && this.customFrom() > this.customTo(),
  )
  readonly filtered = computed(() => this.activeFilters().length > 0)

  // ---- data ----
  readonly summary = signal<IAiReviewAdminSummary | null>(null)
  readonly page = signal<IAiReviewAdminPage | null>(null)
  readonly loadingSummary = signal(true)
  readonly loadingPage = signal(true)
  readonly error = signal('')
  readonly offset = signal(0)
  readonly downloading = signal(false)
  readonly downloadError = signal('')

  readonly budgetPct = computed(() => {
    const m = this.summary()?.month
    return m && m.budgetUsd > 0 ? Math.min(100, Math.round((m.spentUsd / m.budgetUsd) * 100)) : 0
  })
  readonly pageText = computed(() => {
    const p = this.page()
    if (!p || !p.page.total) {
      return ''
    }
    return `${p.page.offset + 1}–${Math.min(p.page.offset + p.reviews.length, p.page.total)} of ${p.page.total}`
  })
  readonly pageNo = computed(() => Math.floor(this.offset() / PAGE_SIZE) + 1)
  readonly pages = computed(() => Math.max(1, Math.ceil((this.page()?.page.total || 0) / PAGE_SIZE)))
  /** What a review cost on average in the period. */
  readonly perReview = computed(() => {
    const t = this.summary()?.totals
    return t && t.reviews ? t.costUsd / t.reviews : 0
  })
  /** The faces behind the people count: the five who spent most, then "+n". */
  readonly faces = computed(() => {
    const people = this.summary()?.byPerson || []
    return { shown: people.slice(0, 5), more: Math.max(0, (this.summary()?.totals.people || 0) - 5) }
  })
  /** The budget still free this month (never below nothing). */
  readonly budgetLeft = computed(() => {
    const m = this.summary()?.month
    return m ? Math.max(0, m.budgetUsd - m.spentUsd) : 0
  })
  /** The chosen period in words, under the spend. */
  readonly periodText = computed(() => {
    const range = rangeOf(this.period(), new Date(), { from: this.customFrom(), to: this.customTo() })
    const label = this.periodOptions.find(o => o.value === this.period())?.label || ''
    if (this.period() === 'all') {
      return 'since the first review'
    }
    if (this.period() === 'custom') {
      return range.from || range.to ? `from ${range.from || 'the start'} to ${range.to || 'today'}` : 'all time'
    }
    return label.toLowerCase()
  })
  readonly hasPrev = computed(() => this.offset() > 0)
  readonly hasNext = computed(() => {
    const p = this.page()
    return !!p && p.page.offset + p.reviews.length < p.page.total
  })

  private summarySub?: Subscription
  private pageSub?: Subscription
  private searchTimer: ReturnType<typeof setTimeout> | null = null

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.searchTimer && clearTimeout(this.searchTimer))
    this.reload()
  }

  /** Reads the summary and the first page again for the current filter. */
  reload(): void {
    if (this.customInvalid()) {
      return
    }
    this.error.set('')
    this.offset.set(0)
    this.loadSummary()
    this.loadPage()
  }

  private loadSummary(): void {
    this.summarySub?.unsubscribe()
    this.loadingSummary.set(true)
    this.summarySub = this.api
      .adminSummary(this.filter())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: s => {
          this.summary.set(s)
          this.loadingSummary.set(false)
        },
        error: err => {
          this.loadingSummary.set(false)
          this.error.set(AiReviewService.errorMessage(err, 'The report could not be loaded. Try again.'))
        },
      })
  }

  private loadPage(): void {
    this.pageSub?.unsubscribe()
    this.loadingPage.set(true)
    this.pageSub = this.api
      .adminReviews(this.filter(), PAGE_SIZE, this.offset())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: p => {
          this.page.set(p)
          this.loadingPage.set(false)
        },
        error: err => {
          this.loadingPage.set(false)
          this.error.set(AiReviewService.errorMessage(err, 'The reviews could not be loaded. Try again.'))
        },
      })
  }

  // ---- filter changes ----
  setPeriod(v: string): void {
    this.period.set(v as ReportPeriod)
    if (v !== 'custom') {
      this.reload()
    }
  }
  setCustom(which: 'from' | 'to', v: string): void {
    ;(which === 'from' ? this.customFrom : this.customTo).set(v)
    this.reload()
  }
  setSource(v: string): void {
    this.source.set(v as AiReviewSource | '')
    this.reload()
  }
  setStatus(v: string): void {
    this.status.set(v as AiReviewStatus | '')
    this.reload()
  }
  setPerson(v: string): void {
    this.userId.set(v)
    this.reload()
  }
  /** From the By person list: that person's reviews. */
  showPerson(id: string): void {
    this.tab.set('reviews')
    this.setPerson(id)
  }
  /** Search as the admin types, once they pause. */
  setQuery(v: string): void {
    this.query.set(v)
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
    }
    this.searchTimer = setTimeout(() => this.reload(), 350)
  }
  /** Every filter back to its start: everyone, this month, all types and statuses, no search. */
  clearFilters(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
    }
    this.period.set('month')
    this.userId.set('')
    this.source.set('')
    this.status.set('')
    this.query.set('')
    this.reload()
  }

  prev(): void {
    this.offset.set(Math.max(0, this.offset() - PAGE_SIZE))
    this.loadPage()
  }
  next(): void {
    this.offset.set(this.offset() + PAGE_SIZE)
    this.loadPage()
  }

  /** Opens a review's full report: a course's on its course page, files' on the file review page. */
  open(r: Pick<IAiReviewAdminRow, 'id' | 'source' | 'courseId'>): void {
    if (r.source === 'course' && r.courseId) {
      void this.router.navigate(aiReviewCourse(r.courseId), { queryParams: { review: r.id } })
    } else {
      void this.router.navigate([AI_REVIEW_NEW], { queryParams: { review: r.id } })
    }
  }

  /** Every review matching the filter (up to 5,000) as a CSV file. */
  async download(): Promise<void> {
    if (this.downloading()) {
      return
    }
    this.downloading.set(true)
    this.downloadError.set('')
    try {
      const rows: IAiReviewAdminRow[] = []
      const filter = this.filter()
      for (let offset = 0; offset < DOWNLOAD_MAX; offset += 200) {
        const p = await firstValueFrom(this.api.adminReviews(filter, 200, offset))
        rows.push(...p.reviews)
        if (!p.reviews.length || offset + p.reviews.length >= p.page.total) {
          break
        }
      }
      const range = rangeOf(this.period(), new Date(), { from: this.customFrom(), to: this.customTo() })
      const name = `AI-review-report-${range.from || 'start'}-to-${range.to || 'today'}.csv`
      // A byte-order mark so Excel reads Hindi and other scripts correctly.
      saveAs(new Blob(['﻿' + reviewsCsv(rows)], { type: 'text/csv;charset=utf-8' }), name)
    } catch (err) {
      this.downloadError.set(AiReviewService.errorMessage(err, 'The download could not be made. Try again.'))
    } finally {
      this.downloading.set(false)
    }
  }

  /** The line under a review's name: its competency and how many resources it covered. */
  metaOf(r: IAiReviewAdminRow): string {
    const total = r.progress?.total || 0
    const unit = r.source === 'upload' ? (total === 1 ? 'file' : 'files') : total === 1 ? 'resource' : 'resources'
    // The count first, so a long competency name never cuts it off.
    const parts = [total ? `${total} ${unit}` : '', r.competency?.label || '']
    if (r.status === 'running' || r.status === 'queued') {
      parts.push(`${r.progress.done} of ${total} done`)
    }
    return parts.filter(Boolean).join(' · ')
  }

  /** A part of the period's spend, as a whole percent. */
  sharePct(costUsd: number): number {
    const total = this.summary()?.totals.costUsd || 0
    return total > 0 ? Math.round((costUsd / total) * 100) : 0
  }

  /** How long a review took, from start to finish: "4 min", "1 h 5 min", "40 s". */
  durationText(from: string, to: string): string {
    const sec = Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 1000))
    if (sec < 60) {
      return `${sec} s`
    }
    const min = Math.round(sec / 60)
    return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`
  }

  /** The verdict to show in the list, or the CBP score when there is no verdict. */
  outcome(r: IAiReviewAdminRow): string {
    if (r.verdict?.message) {
      return r.verdict.message
    }
    return r.scorePct === null || r.scorePct === undefined ? '' : `CBP ${Math.round(r.scorePct)}%`
  }

  back(): void {
    void this.router.navigate(['/author/my-content'], { queryParams: { status: 'draft' } })
  }
}
