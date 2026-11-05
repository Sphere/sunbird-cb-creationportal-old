import { DOCUMENT } from '@angular/common'
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { saveAs } from 'file-saver'
import { AI_REVIEW_FINAL_STATUSES, IAiReview } from '../../models/ai-review.model'
import { AiReviewService } from '../../services/ai-review.service'
import { buildWorkbookSheets, openPrintableReport, reportFileName, xlsxApi } from '../../utils/report-export'
import { kindFromMime, kindLine, kindMeta, pipelineProgress } from '../../utils/resource-kind'
import { ReviewUnit, statusLabel } from '../../utils/review-run'

/**
 * A review once it has started: its live progress while it runs, then the report, with
 * Cancel, Download PDF / Excel and Review again. Shared by the course review and the review
 * of uploaded files, so both read and behave the same.
 *
 * It does not poll: the page follows the review and passes each fresh read in. Cancelling
 * tells the page (`cancelled`) so it reads the review again.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-air-review-run',
  templateUrl: './air-review-run.component.html',
  styleUrls: ['./air-review-run.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AirReviewRunComponent {
  private readonly api = inject(AiReviewService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly document = inject(DOCUMENT)

  readonly review = input.required<IAiReview>()
  /** What the review is made of, for its wording. */
  readonly unit = input<ReviewUnit>('resources')

  /** The review was cancelled: read it again. */
  readonly cancelled = output<string>()
  /** Back to the setup form, to run it again or change the settings. */
  readonly again = output<void>()

  readonly kindMeta = kindMeta
  readonly kindLine = kindLine
  readonly pipelineProgress = pipelineProgress

  readonly cancelling = signal(false)
  readonly cancelError = signal('')
  readonly exporting = signal<'excel' | null>(null)
  readonly exportError = signal('')

  readonly isRunning = computed(() => !AI_REVIEW_FINAL_STATUSES.has(this.review().status))
  readonly isFinished = computed(() => AI_REVIEW_FINAL_STATUSES.has(this.review().status))

  /** What is being reviewed, and what the review leaves out. */
  readonly runningItems = computed(() => (this.review().items || []).filter(i => i.status !== 'skipped'))
  readonly skippedItems = computed(() => (this.review().items || []).filter(i => i.status === 'skipped'))

  readonly progressPct = computed(() => {
    const p = this.review().progress
    return p.total ? Math.round((p.done / p.total) * 100) : 0
  })

  /**
   * The percentage shown: it counts up to the new value in step with the bar instead of
   * jumping. Straight to the value for anyone who has asked for less motion.
   */
  readonly shownPct = signal(0)
  private pctFrame = 0
  private readonly countPct = effect(() => {
    const target = this.progressPct()
    untracked(() => this.countTo(target))
  })

  /** One short line for screen readers, announced only when it changes (not every poll). */
  readonly progressText = computed(() => {
    const r = this.review()
    return `${r.progress.done} of ${r.progress.total} ${this.unit()} reviewed · ${this.statusLabel(r.status)}`
  })

  /** The heading while it runs. */
  readonly runningHeading = computed(() => (this.unit() === 'files' ? 'Reviewing your files' : 'Reviewing the course'))

  /** The report heading, true to how the review ended. */
  readonly reportHeading = computed(() => {
    const status = this.review().status
    return status === 'failed' ? 'Review failed' : status === 'cancelled' ? 'Review cancelled' : 'Report ready'
  })

  statusLabel(status: string): string {
    return statusLabel(status, this.unit())
  }

  /** The kind of an item: what the service said, or else what its file type says. */
  kindOf(item: { kind: string | null; mimeType?: string }): string {
    return item.kind || kindFromMime(item.mimeType)
  }

  cancel(): void {
    const r = this.review()
    if (this.cancelling()) {
      return
    }
    this.cancelling.set(true)
    this.cancelError.set('')
    this.api
      .cancel(r.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cancelling.set(false)
          this.cancelled.emit(r.id)
        },
        error: err => {
          this.cancelling.set(false)
          this.cancelError.set(AiReviewService.errorMessage(err, 'Could not cancel the review.'))
        },
      })
  }

  /** Opens the report as a print-ready page; the browser saves it as a PDF. */
  downloadPdf(): void {
    this.exportError.set('')
    if (!openPrintableReport(this.review(), this.document.defaultView || window)) {
      this.exportError.set('Your browser blocked the report window. Allow pop-ups for this site, then try again.')
    }
  }

  /** Every verdict, coverage line and question finding, as an Excel workbook. */
  async downloadExcel(): Promise<void> {
    if (this.exporting()) {
      return
    }
    const r = this.review()
    this.exporting.set('excel')
    this.exportError.set('')
    try {
      const XLSX = xlsxApi(await import('xlsx'))
      const wb = XLSX.utils.book_new()
      const sheets = buildWorkbookSheets(r)
      Object.keys(sheets).forEach(name => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheets[name]), name))
      const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      saveAs(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), reportFileName(r, 'xlsx'))
    } catch {
      this.exportError.set('Could not create the Excel file. Please try again.')
    } finally {
      this.exporting.set(null)
    }
  }

  private countTo(target: number): void {
    const win = this.document.defaultView
    const from = this.shownPct()
    if (this.pctFrame && win) {
      win.cancelAnimationFrame(this.pctFrame)
      this.pctFrame = 0
    }
    const still = !win || !win.requestAnimationFrame || !win.matchMedia || win.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (still || from === target) {
      this.shownPct.set(target)
      return
    }
    const start = win.performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 700)
      const eased = 1 - Math.pow(1 - t, 3)
      this.shownPct.set(Math.round(from + (target - from) * eased))
      this.pctFrame = t < 1 ? win.requestAnimationFrame(step) : 0
    }
    this.pctFrame = win.requestAnimationFrame(step)
    if (!this.pctCleanup) {
      this.pctCleanup = true
      this.destroyRef.onDestroy(() => this.pctFrame && win.cancelAnimationFrame(this.pctFrame))
    }
  }

  private pctCleanup = false
}
