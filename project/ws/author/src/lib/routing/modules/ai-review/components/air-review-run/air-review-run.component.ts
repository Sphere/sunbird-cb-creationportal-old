import { DOCUMENT } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { saveAs } from 'file-saver'
import { AI_REVIEW_FINAL_STATUSES, IAiReview } from '../../models/ai-review.model'
import { AiReviewService } from '../../services/ai-review.service'
import { AirIconName } from '../air-icon/air-icon.component'
import { buildReportPage, openReportTab, reportFileName } from '../../utils/report-export'
import { buildExcelWorkbook, excelJsApi } from '../../utils/report-excel'
import { downloadReportPdf, ExportStep } from '../../utils/report-pdf'

/** The steps of each download, in order, with how far along each one starts. */
const EXPORT_STEPS: Record<'pdf' | 'excel', { id: ExportStep; label: string; at: number }[]> = {
  pdf: [
    { id: 'gather', label: 'Gathering every finding', at: 4 },
    { id: 'layout', label: 'Laying out the pages', at: 15 },
    { id: 'draw', label: 'Drawing the pages', at: 30 },
    { id: 'build', label: 'Building the PDF', at: 82 },
    { id: 'save', label: 'Saving the file', at: 95 },
  ],
  excel: [
    { id: 'gather', label: 'Gathering every finding', at: 5 },
    { id: 'layout', label: 'Loading the Excel engine', at: 20 },
    { id: 'build', label: 'Formatting the sheets', at: 45 },
    { id: 'save', label: 'Saving the file', at: 92 },
  ],
}
import { itemFraction, kindFromMime, kindLine, kindMeta, pipelineProgress } from '../../utils/resource-kind'
import { AIR_VIEWER, ReviewUnit, requesterName, statusLabel, withRequesterName } from '../../utils/review-run'

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
  private readonly viewer = inject(AIR_VIEWER, { optional: true })

  readonly review = input.required<IAiReview>()
  /** What the review is made of, for its wording. */
  readonly unit = input<ReviewUnit>('resources')

  /** The review was cancelled: read it again. */
  readonly cancelled = output<string>()
  /** Back to the setup form, to run it again or change the settings. */
  readonly again = output<void>()

  readonly kindMeta = kindMeta
  readonly kindLine = kindLine
  /** Who started it: their name, or for your own review your profile name. */
  readonly requester = computed(() => requesterName(this.review(), this.viewer?.() ?? null, 'a user'))
  /** The review as the downloads take it, with its requester named. */
  private readonly exported = (): IAiReview => withRequesterName(this.review(), this.viewer?.() ?? null)
  readonly pipelineProgress = pipelineProgress

  readonly cancelling = signal(false)
  readonly cancelError = signal('')
  readonly exporting = signal<'excel' | 'pdf' | null>(null)

  /** The Download menu: open or not, and its formats in order. */
  readonly downloadOpen = signal(false)
  readonly downloadFormats: { id: 'html' | 'pdf' | 'excel'; label: string; hint: string; icon: AirIconName }[] = [
    { id: 'html', label: 'HTML', hint: 'A web page, to read or share', icon: 'document' },
    { id: 'pdf', label: 'PDF', hint: 'To print or attach', icon: 'pdf' },
    { id: 'excel', label: 'Excel', hint: 'Every finding in sheets, to track fixes', icon: 'table' },
  ]
  private readonly downloadTrigger = viewChild<ElementRef<HTMLButtonElement>>('downloadTrigger')
  private readonly host = inject(ElementRef<HTMLElement>)

  toggleDownloads(): void {
    this.downloadOpen.update(open => !open)
    if (this.downloadOpen()) {
      // The first format takes focus, so the menu is ready for the keyboard.
      setTimeout(() => this.menuItems()[0]?.focus())
    }
  }

  closeDownloads(focusTrigger = false): void {
    if (!this.downloadOpen()) {
      return
    }
    this.downloadOpen.set(false)
    if (focusTrigger) {
      this.downloadTrigger()?.nativeElement.focus()
    }
  }

  chooseDownload(kind: 'html' | 'pdf' | 'excel'): void {
    this.closeDownloads(true)
    if (kind === 'html') {
      this.downloadHtml()
    } else if (kind === 'pdf') {
      void this.downloadPdf()
    } else {
      void this.downloadExcel()
    }
  }

  /** Arrows move through the formats, Home/End jump, Esc closes back to the button, Tab closes. */
  onDownloadKey(e: KeyboardEvent): void {
    const items = this.menuItems()
    const at = items.indexOf(this.document.activeElement as HTMLButtonElement)
    if (!this.downloadOpen()) {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.target === this.downloadTrigger()?.nativeElement) {
        e.preventDefault()
        this.toggleDownloads()
      }
      return
    }
    const move = (to: number) => {
      e.preventDefault()
      items[(to + items.length) % items.length]?.focus()
    }
    if (e.key === 'ArrowDown') {
      move(at + 1)
    } else if (e.key === 'ArrowUp') {
      move(at < 0 ? items.length - 1 : at - 1)
    } else if (e.key === 'Home') {
      move(0)
    } else if (e.key === 'End') {
      move(items.length - 1)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.closeDownloads(true)
    } else if (e.key === 'Tab') {
      this.closeDownloads()
    }
  }

  /** A click anywhere outside the menu closes it. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const dl = (this.host.nativeElement as HTMLElement).querySelector('.air-dl')
    if (this.downloadOpen() && dl && !dl.contains(e.target as Node)) {
      this.closeDownloads()
    }
  }

  private menuItems(): HTMLButtonElement[] {
    return Array.from((this.host.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.air-dl-item'))
  }
  /** The download under way: its step and how far along it is, then the saved file's name. */
  readonly exportStep = signal<ExportStep | null>(null)
  readonly exportPct = signal(0)
  readonly exportDone = signal('')
  /** The steps of the download under way, each marked done, now or to come. */
  readonly exportSteps = computed(() => {
    const kind = this.exporting()
    if (!kind) {
      return []
    }
    const steps = EXPORT_STEPS[kind]
    const now = steps.findIndex(s => s.id === this.exportStep())
    return steps.map((s, i) => ({ ...s, state: i < now ? 'done' : i === now ? 'active' : 'todo' }))
  })
  private creep = 0

  /** Moves to a step: the bar jumps to the step's start, then creeps towards the next one while it works. */
  private step(kind: 'pdf' | 'excel', id: ExportStep): void {
    const steps = EXPORT_STEPS[kind]
    const i = steps.findIndex(s => s.id === id)
    if (i < 0) {
      return
    }
    this.exportStep.set(id)
    this.exportPct.set(Math.max(this.exportPct(), steps[i].at))
    const ceiling = (steps[i + 1]?.at ?? 99) - 1
    const win = this.document.defaultView
    if (this.creep && win) {
      win.clearInterval(this.creep)
    }
    this.creep =
      win?.setInterval(() => {
        const pct = this.exportPct()
        if (pct < ceiling) {
          this.exportPct.set(Math.min(ceiling, pct + Math.max(0.4, (ceiling - pct) * 0.08)))
        }
      }, 250) || 0
  }

  private startExport(kind: 'pdf' | 'excel'): void {
    this.exporting.set(kind)
    this.exportError.set('')
    this.exportDone.set('')
    this.exportPct.set(0)
    this.step(kind, 'gather')
  }

  private endExport(saved: string | null): void {
    const win = this.document.defaultView
    if (this.creep && win) {
      win.clearInterval(this.creep)
      this.creep = 0
    }
    if (saved) {
      this.exportPct.set(100)
      this.exportDone.set(saved)
      win?.setTimeout(() => this.exportDone() === saved && this.exportDone.set(''), 5000)
    }
    this.exporting.set(null)
    this.exportStep.set(null)
  }
  readonly exportError = signal('')

  readonly isRunning = computed(() => !AI_REVIEW_FINAL_STATUSES.has(this.review().status))
  readonly isFinished = computed(() => AI_REVIEW_FINAL_STATUSES.has(this.review().status))

  /** What is being reviewed, and what the review leaves out. */
  readonly runningItems = computed(() => (this.review().items || []).filter(i => i.status !== 'skipped'))
  readonly skippedItems = computed(() => (this.review().items || []).filter(i => i.status === 'skipped'))
  /** Videos with no sound: reviewed on what they show, and the report says so. */
  readonly silentItems = computed(() => (this.review().items || []).filter(i => i.result?.noSound))

  /**
   * The real progress: each resource adds what its steps have done (see itemFraction), so the
   * bar moves as frames are taken and scores come in, not only when a whole resource ends.
   * Held under 100 while the course-level part is still being put together.
   */
  readonly progressPct = computed(() => {
    const r = this.review()
    const items = (r.items || []).filter(i => i.status !== 'skipped')
    if (!items.length) {
      const p = r.progress
      return p.total ? Math.round((p.done / p.total) * 100) : 0
    }
    const pct = Math.round((items.reduce((n, i) => n + itemFraction(i), 0) / items.length) * 100)
    return AI_REVIEW_FINAL_STATUSES.has(r.status) ? pct : Math.min(pct, 98)
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

  /** Now, ticking each second while the review runs: drives the elapsed time and "12 s ago". */
  readonly now = signal(Date.now())
  private readonly ticker = effect(onCleanup => {
    if (!this.isRunning()) {
      return
    }
    const win = this.document.defaultView
    const id = win?.setInterval(() => this.now.set(Date.now()), 1000)
    onCleanup(() => id !== undefined && win?.clearInterval(id))
  })

  /** "2 min 05 s" since the review started. */
  readonly elapsed = computed(() => {
    const sec = Math.max(0, Math.floor((this.now() - new Date(this.review().createdAt).getTime()) / 1000))
    const m = Math.floor(sec / 60)
    return m ? `${m} min ${String(sec % 60).padStart(2, '0')} s` : `${sec} s`
  })

  /**
   * What the review is doing right now, from the resources in progress: their stage and name,
   * or how many run side by side. Not the last log line, which names whatever finished last.
   */
  readonly nowDoing = computed(() => {
    const r = this.review()
    if (r.status === 'queued') {
      return r.queuePosition > 0 ? 'Waiting for its turn in the queue' : 'Starting…'
    }
    const running = (r.items || []).filter(i => i.status === 'running')
    if (!running.length) {
      return r.progress.done >= r.progress.total ? 'Putting the report together…' : 'Picking up the next one…'
    }
    if (running.length === 1) {
      const i = running[0]
      return `${(i.stage || 'Working').replace(/…$/, '')} · ${i.name}`
    }
    return `Reviewing ${running.length} ${this.unit()} side by side`
  })

  /** The latest steps of the review, newest first, each with how long ago it happened. */
  readonly activity = computed(() => {
    const now = this.now()
    return [...(this.review().log || [])]
      .slice(-6)
      .reverse()
      .map(l => {
        const sec = Math.max(0, Math.floor((now - new Date(l.at).getTime()) / 1000))
        return { key: l.at + l.msg, msg: l.msg, ago: sec < 60 ? `${sec} s ago` : `${Math.floor(sec / 60)} min ago` }
      })
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

  /** Saves the report as a PDF file, showing each step as it happens. */
  async downloadPdf(): Promise<void> {
    if (this.exporting()) {
      return
    }
    this.startExport('pdf')
    let saved: string | null = null
    try {
      await downloadReportPdf(this.exported(), this.document, step => this.step('pdf', step))
      saved = reportFileName(this.review(), 'pdf')
    } catch {
      this.exportError.set('Could not create the PDF. Try again, or download the HTML report instead.')
    } finally {
      this.endExport(saved)
    }
  }

  /** Opens the full report as a web page in a new tab. */
  openReport(): void {
    this.exportError.set('')
    if (!openReportTab(this.exported(), this.document.defaultView || window)) {
      this.exportError.set('Your browser blocked the new tab. Allow pop-ups for this site, then try again.')
    }
  }

  /** Saves the report as a web page (.html) that opens in any browser, offline too. */
  downloadHtml(): void {
    this.exportError.set('')
    const r = this.exported()
    try {
      saveAs(new Blob([buildReportPage(r)], { type: 'text/html;charset=utf-8' }), reportFileName(r, 'html'))
    } catch {
      this.exportError.set('Could not create the HTML file. Please try again.')
    }
  }

  /** Every finding, verdict, coverage line and question, as a formatted Excel workbook. */
  async downloadExcel(): Promise<void> {
    if (this.exporting()) {
      return
    }
    const r = this.exported()
    this.startExport('excel')
    let saved: string | null = null
    try {
      this.step('excel', 'layout')
      const ExcelJS = excelJsApi(await import('exceljs'))
      this.step('excel', 'build')
      const data = await buildExcelWorkbook(r, ExcelJS)
      this.step('excel', 'save')
      saved = reportFileName(r, 'xlsx')
      saveAs(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), saved)
    } catch {
      saved = null
      this.exportError.set('Could not create the Excel file. Please try again.')
    } finally {
      this.endExport(saved)
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
