import { DOCUMENT } from '@angular/common'
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core'
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router } from '@angular/router'
import {
  Observable,
  Subscription,
  TimeoutError,
  catchError,
  debounceTime,
  defer,
  distinctUntilChanged,
  fromEvent,
  last,
  map,
  of,
  retry,
  switchMap,
  tap,
  throwError,
  timeout,
  timer,
} from 'rxjs'
import {
  AI_REVIEW_FINAL_STATUSES,
  AiReviewDomainStyle,
  AiReviewLanguage,
  AiReviewUploadKind,
  IAiReview,
  IAiReviewCheckedUpload,
  IAiReviewEstimateParts,
  IAiReviewOptions,
  IAiReviewRoleCheck,
  IAiReviewUploadContext,
  IAiReviewUploadHistoryEntry,
} from '../../models/ai-review.model'
import { AiReviewService } from '../../services/ai-review.service'
import { formatDuration, kindMeta } from '../../utils/resource-kind'
import { isTransient, isUnclear, statusLabel, watchReview } from '../../utils/review-run'
import { ACCEPT_ATTRIBUTE, estimateFor, fileProblem, formatBytes, kindForFile, readQuizSheet } from '../../utils/upload-files'
import { AirSelectOption } from '../air-select/air-select.component'
import {
  AiReviewStep,
  LANGUAGES,
  LEVELS,
  REUSE_CHECK_DEBOUNCE_MS,
  ROLE_CHECK_TIMEOUT_MS,
  STEPS,
} from '../ai-review-page/ai-review-page.component'

/** Files sent to storage at once: enough to keep the line busy, few enough to show progress. */
export const UPLOAD_CONCURRENCY = 3

/** How often, and how far apart, a file the service has not seen yet is checked again. */
export const CHECK_RETRIES = 4
export const CHECK_RETRY_MS = 1500

/** The longest title a review of files may have (the service's limit). */
export const MAX_TITLE = 150

/**
 * Where a file is, from picked to ready. `waiting`: in line for a free upload slot.
 * `rejected`: it cannot be reviewed (nothing to retry). `failed`: it could not be sent or
 * checked this time, and can be tried again.
 */
export type UploadState = 'reading' | 'waiting' | 'signing' | 'uploading' | 'checking' | 'ready' | 'rejected' | 'failed'

export interface UploadEntry {
  /** This page's own id for the row: stays the same when the file is sent again. */
  key: number
  name: string
  /** The size of the file picked (a sheet is sent as its questions, which is smaller). */
  size: number
  kind: AiReviewUploadKind
  state: UploadState
  /** 0–100 while uploading. */
  progress: number
  uploadId: string | null
  /** Why it cannot be reviewed, or why the upload failed. */
  problem: string | null
  /** It can be reviewed, but the user should know something. */
  warning: string | null
  /** The service's check, once it is ready: its size and estimate. */
  checked: IAiReviewCheckedUpload | null
  /**
   * The file reached storage. Trying again then only asks the service to check it again: a
   * large file is never sent twice because its check failed.
   */
  stored: boolean
}

/** The states in which a file is still on its way, so Start waits for it. */
const IN_FLIGHT: ReadonlySet<UploadState> = new Set<UploadState>(['reading', 'waiting', 'signing', 'uploading', 'checking'])

/** A check the service could not finish yet; its message is the service's own reason. */
export class CheckPendingError extends Error {}

/** Start found these same files, with these settings, already being reviewed: that review is shown. */
export const JOINED_FILE_REVIEW =
  'These files were already being reviewed with these settings, so you are following that review instead of starting another.'

/** A storage failure, told apart from the review service's own errors (they are worded differently). */
export class StorageUploadError extends Error {
  constructor(readonly cause: unknown) {
    super('upload failed')
  }
}

/** The message for a file storage refused or could not be reached for. */
export function storageMessage(err: unknown): string {
  const status = (err as { status?: number } | null)?.status
  if (status === 0 || status === undefined) {
    return typeof navigator !== 'undefined' && navigator.onLine === false
      ? "You're offline. Reconnect, then try this file again."
      : 'The upload was interrupted. Check your connection and try again.'
  }
  if (status === 403) {
    return 'Storage refused the file: the upload link may have expired, or the file changed after it was added. Try again.'
  }
  if (status === 400 || status === 413) {
    return 'Storage refused the file (wrong type or larger than allowed). Check the file, then try again.'
  }
  return `The file could not be uploaded (storage answered ${status}). Try again.`
}

/** "2 videos · 1 PDF" — what a list of files holds. */
function kindSummary(
  entries: readonly UploadEntry[],
): { kind: string; count: number; label: string; icon: ReturnType<typeof kindMeta>['icon'] }[] {
  const counts = new Map<string, number>()
  entries.forEach(e => counts.set(e.kind, (counts.get(e.kind) || 0) + 1))
  return [...counts.entries()].map(([kind, count]) => {
    const meta = kindMeta(kind)
    return { kind, count, label: count === 1 ? meta.label : meta.plural, icon: meta.icon }
  })
}

/**
 * AI review of the user's own files: videos, PDFs and quiz or assessment Excel sheets that
 * are not in a course yet. Add files, set up the review, follow it, read the report.
 *
 * Files go straight from the browser to private storage with a short-lived signed upload the
 * service issues (no session headers leave the portal); the service then confirms and measures
 * each one before it can be reviewed. A quiz or assessment sheet is read here with Course
 * Builder's own parser and sent as its questions.
 *
 * The review id lives in the URL (`?review=`), so a reload picks up the same review. Each
 * user sees only their own file reviews. Advisory only: nothing in CBP changes.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-ai-review-files-page',
  templateUrl: './ai-review-files-page.component.html',
  styleUrls: ['../ai-review-page/ai-review-page.component.scss', './ai-review-files-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiReviewFilesPageComponent implements OnInit {
  private readonly api = inject(AiReviewService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)
  private readonly document = inject(DOCUMENT)

  readonly steps = STEPS
  readonly kindMeta = kindMeta
  readonly formatBytes = formatBytes
  readonly formatDuration = formatDuration
  readonly accept = ACCEPT_ATTRIBUTE
  readonly languageOptions: AirSelectOption[] = LANGUAGES
  readonly maxTitle = MAX_TITLE

  readonly context = signal<IAiReviewUploadContext | null>(null)
  readonly loadingContext = signal(true)
  readonly contextError = signal('')

  // ---- the files ----
  readonly entries = signal<UploadEntry[]>([])
  /** What happened to files that were not added (too many, duplicates). */
  readonly addNote = signal('')
  readonly dragging = signal(false)
  private nextKey = 1
  /** What is sent for each row: the file itself, or a sheet's questions. */
  private readonly bodies = new Map<number, Blob>()
  private readonly files = new Map<number, File>()
  private readonly uploads = new Map<number, Subscription>()

  // ---- setup choices ----
  readonly addie = signal(true)
  readonly domain = signal(true)
  readonly watch = signal(true)
  readonly domainStyle = signal<AiReviewDomainStyle>('plain')
  readonly competencyId = signal<string | null>(null)
  readonly level = signal<number | null>(null)
  readonly audience = signal('')
  readonly language = signal<AiReviewLanguage>('auto')
  readonly notes = signal('')
  readonly title = signal('')

  readonly starting = signal(false)
  readonly startError = signal('')
  /** Said when Start joined a review already running, instead of starting (and paying for) another. */
  readonly joinedNote = signal('')
  /** Files dropped or picked before the page knew what it accepts: added once it does. */
  private early: File[] = []

  readonly review = signal<IAiReview | null>(null)
  readonly pollError = signal('')
  /** Opening a review by its link: true until its first read, so the setup form does not flash. */
  readonly following = signal(false)
  private followedId: string | null = null
  private pollSub: Subscription | null = null

  readonly history = signal<IAiReviewUploadHistoryEntry[]>([])
  readonly historyError = signal('')
  readonly loadingHistory = signal(false)

  readonly online = signal(typeof navigator === 'undefined' || navigator.onLine !== false)

  readonly roleCheck = signal<IAiReviewRoleCheck | null>(null)
  readonly roleChecking = signal(false)

  // ---- derived ----
  readonly enabled = computed(() => !!this.context()?.enabled)
  readonly maxFiles = computed(() => this.context()?.limits.maxUploadFiles || 20)
  readonly ready = computed(() => this.entries().filter(e => e.state === 'ready'))
  readonly inFlight = computed(() => this.entries().filter(e => IN_FLIGHT.has(e.state)))
  readonly unusable = computed(() => this.entries().filter(e => e.state === 'rejected' || e.state === 'failed'))
  readonly kindCounts = computed(() => kindSummary(this.ready()))
  readonly hasVideos = computed(() => this.entries().some(e => e.kind === 'video'))

  /** One line for screen readers, changed only when a file settles (not on every progress tick). */
  readonly uploadStatus = computed(() => {
    const all = this.entries()
    if (!all.length) {
      return ''
    }
    const busy = this.inFlight().length
    const ready = this.ready().length
    const bad = this.unusable().length
    return [
      `${ready} of ${all.length} ${all.length === 1 ? 'file' : 'files'} ready`,
      busy ? `${busy} still uploading or being checked` : '',
      bad ? `${bad} cannot be reviewed` : '',
    ]
      .filter(Boolean)
      .join(', ')
  })

  readonly catalog = computed(() => this.context()?.competencyCatalog || [])
  readonly lookupFailed = computed(() => new Set(this.context()?.lookupErrors || []))
  readonly canJudge = computed(() => this.catalog().length > 0)
  readonly competencyOptions = computed<AirSelectOption[]>(() =>
    this.catalog().map(c => ({ value: c.competencyId, label: c.name, hint: c.levels.length ? `${c.levels.length} levels` : undefined })),
  )
  readonly selectedCompetency = computed(() => this.catalog().find(c => c.competencyId === this.competencyId()) || null)
  readonly levelOptions = computed<AirSelectOption[]>(() => {
    const levels = this.selectedCompetency()?.levels || []
    return levels.length
      ? levels.map(l => ({ value: String(l.level), label: `Level ${l.level}`, hint: l.label || undefined }))
      : LEVELS.map(l => ({ value: String(l), label: `Level ${l}` }))
  })
  /** The level's description, so the user sees what the content is judged against. */
  readonly levelLabel = computed(() => {
    const level = this.level()
    return (level && this.selectedCompetency()?.levels.find(l => l.level === level)?.label) || ''
  })
  readonly positionNames = computed(() => (this.context()?.positionList || []).map(p => p.name))
  readonly position = computed(() => {
    const name = this.audience().trim().toLowerCase()
    return (name && (this.context()?.positionList || []).find(p => p.name.trim().toLowerCase() === name && p.code)) || null
  })
  readonly judgedFor = computed(() => this.audience().trim() || this.context()?.defaults.audience || '')

  /** The title used when the user gives none: the file's name, or the first and a count. */
  readonly defaultTitle = computed(() => {
    const files = this.ready()
    if (!files.length) {
      return ''
    }
    const first = files[0].name.replace(/\.[^.]+$/, '')
    return (files.length === 1 ? first : `${first} and ${files.length - 1} more`).slice(0, MAX_TITLE)
  })

  readonly estimateUsd = computed(() =>
    estimateFor(
      this.ready()
        .map(e => e.checked?.estimate)
        .filter((p): p is IAiReviewEstimateParts => !!p),
      { addie: this.addie(), domain: this.domain(), watch: this.watch() && this.hasVideos() },
    ),
  )

  readonly limitsNote = computed(() => {
    const l = this.context()?.limits
    if (!l) {
      return ''
    }
    return [
      l.maxVideoMinutes ? `videos up to ${l.maxVideoMinutes} min` : '',
      l.maxPdfPages ? `PDFs up to ${l.maxPdfPages} pages` : '',
      l.maxQuizQuestions ? `quizzes and assessments up to ${l.maxQuizQuestions} questions` : '',
    ]
      .filter(Boolean)
      .join(' · ')
  })

  /** What the choices are missing, before thinking about the files (the role check needs only these). */
  private readonly settingsMessage = computed(() => {
    if (!this.addie() && !this.domain()) {
      return 'Pick at least one review: the ADDIE checklist, the domain review, or both.'
    }
    if (this.domain() && !this.competencyId()) {
      return 'Pick a competency to judge the files against, or untick Domain review.'
    }
    if (this.domain() && !this.level()) {
      return 'The domain review needs a level. Pick one, or untick Domain review.'
    }
    return ''
  })

  /** Why the FRAC role check cannot run yet (a competency or level to pick), or ''. */
  readonly roleWaiting = computed(() => (this.domain() && this.domainStyle() === 'frac' ? this.settingsMessage() : ''))

  /** Why the review cannot start yet; '' when it can. */
  readonly validationMessage = computed(() => {
    if (!this.context() || !this.enabled()) {
      return ''
    }
    if (!this.online()) {
      return "You're offline. Reconnect to the internet to start a review."
    }
    if (!this.entries().length) {
      return 'Add the files to review: videos, PDFs, interactive HTML packages (.zip), or quiz and assessment Excel sheets.'
    }
    if (this.inFlight().length) {
      return 'Wait for the files to finish uploading and being checked.'
    }
    if (!this.ready().length) {
      return 'None of these files can be reviewed. Remove them and add others.'
    }
    if (this.ready().length > this.maxFiles()) {
      return `One review covers up to ${this.maxFiles()} files. Remove ${this.ready().length - this.maxFiles()}.`
    }
    return this.settingsMessage()
  })

  readonly isRunning = computed(() => {
    const r = this.review()
    return !!r && !AI_REVIEW_FINAL_STATUSES.has(r.status)
  })
  readonly isFinished = computed(() => {
    const r = this.review()
    return !!r && AI_REVIEW_FINAL_STATUSES.has(r.status)
  })
  readonly currentStep = computed<AiReviewStep>(() => (this.isFinished() ? 'report' : this.isRunning() ? 'review' : 'setup'))
  readonly currentStepIndex = computed(() => STEPS.findIndex(s => s.id === this.currentStep()))

  /** The settings to check the FRAC role for, or null when there is nothing to check. */
  private readonly roleRequest = computed(() =>
    !this.review() && this.enabled() && this.domain() && this.domainStyle() === 'frac' && !this.settingsMessage()
      ? JSON.stringify(this.buildOptions())
      : null,
  )

  constructor() {
    // Move focus to the new step's heading when a step replaces the section acted in.
    let shown: AiReviewStep | null = null
    effect(() => {
      const step = this.currentStep()
      if (shown !== null && step !== shown) {
        setTimeout(() => this.document.getElementById('air-step-heading')?.focus())
      }
      shown = step
    })

    toObservable(this.roleRequest)
      .pipe(
        distinctUntilChanged(),
        // Busy from the moment a setting changes, not only once it settles: otherwise the
        // panel shows the previous answer (or nothing) for the debounce.
        tap(request => this.roleChecking.set(!!request)),
        debounceTime(REUSE_CHECK_DEBOUNCE_MS),
        switchMap(request => {
          if (!request) {
            return of(null)
          }
          return this.api.uploadFracRole(JSON.parse(request) as IAiReviewOptions).pipe(
            timeout(ROLE_CHECK_TIMEOUT_MS),
            catchError(err =>
              of({
                role: null,
                roleNote:
                  err instanceof TimeoutError
                    ? 'The FRAC role data took too long to load, so the role and activity check was not done. Change the position to try again.'
                    : 'The FRAC role data could not be read just now.',
              }),
            ),
          )
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(check => {
        this.roleChecking.set(false)
        this.roleCheck.set(check)
      })

    this.destroyRef.onDestroy(() => this.uploads.forEach(s => s.unsubscribe()))
  }

  ngOnInit(): void {
    this.watchWindow()
    this.loadContext()
    this.loadHistory()
    const requested = this.route.snapshot.queryParamMap.get('review')
    if (requested) {
      this.follow(requested)
    }
  }

  /**
   * The connection (offline banner; back online retries what failed), a warning before
   * leaving while files are still uploading, and a file dropped beside the drop zone not
   * opening in the tab (which would leave the page and lose the uploads).
   */
  private watchWindow(): void {
    const win = this.document.defaultView
    if (!win) {
      return
    }
    fromEvent(win, 'offline')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.online.set(false))
    fromEvent(win, 'online')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.online.set(true)
        this.retryLoad()
        if (this.pollError()) {
          this.retryFollow()
        }
      })
    fromEvent<BeforeUnloadEvent>(win, 'beforeunload')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(e => {
        if (this.inFlight().length) {
          e.preventDefault()
          e.returnValue = ''
        }
      })
    for (const type of ['dragover', 'drop']) {
      fromEvent<DragEvent>(win, type)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(e => {
          if (e.dataTransfer?.types?.includes('Files')) {
            e.preventDefault()
          }
        })
    }
  }

  /**
   * Reloads whatever failed to load. The setup and the past reviews usually fail together (the
   * service is down, or the user went offline), so one Try again, or reconnecting, recovers both.
   */
  retryLoad(): void {
    if (this.contextError()) {
      this.loadContext()
    }
    if (this.historyError()) {
      this.loadHistory()
    }
  }

  loadContext(): void {
    this.loadingContext.set(true)
    this.contextError.set('')
    this.api
      .uploadContext()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ctx => {
          const first = !this.context()
          this.context.set(ctx)
          if (first) {
            this.audience.set(ctx.defaults.audience)
            this.language.set(ctx.defaults.language)
            this.domainStyle.set(ctx.defaults.domainStyle)
            this.domain.set(ctx.competencyCatalog.length > 0)
          }
          this.loadingContext.set(false)
          this.addEarlyFiles()
        },
        error: err => {
          this.contextError.set(AiReviewService.errorMessage(err, 'Could not load the file review just now.'))
          this.loadingContext.set(false)
          if (this.early.length) {
            this.addNote.set('The files you added are kept and will be added once the page loads. Use Try again above.')
          }
        },
      })
  }

  loadHistory(): void {
    this.loadingHistory.set(true)
    this.api
      .uploadHistory()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => {
          this.history.set(list)
          this.historyError.set('')
          this.loadingHistory.set(false)
        },
        error: err => {
          this.historyError.set(AiReviewService.errorMessage(err, 'Could not load your past reviews.'))
          this.loadingHistory.set(false)
        },
      })
  }

  // ---- adding files ----

  onPicked(event: Event): void {
    const input = event.target as HTMLInputElement
    this.addFiles(Array.from(input.files || []))
    // So picking the same file again (after removing it) fires a change.
    input.value = ''
  }

  onDragOver(event: DragEvent): void {
    if (!event.dataTransfer?.types?.includes('Files')) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    this.dragging.set(true)
  }

  onDragLeave(event: DragEvent): void {
    // Moving over a child of the zone fires dragleave too; only leaving the zone counts.
    const to = event.relatedTarget as Node | null
    if (!to || !(event.currentTarget as Node).contains(to)) {
      this.dragging.set(false)
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault()
    this.dragging.set(false)
    this.addFiles(Array.from(event.dataTransfer?.files || []))
  }

  /** Files added before the page had loaded: added now, or the user is told why not. */
  private addEarlyFiles(): void {
    const files = this.early
    this.early = []
    if (!files.length) {
      return
    }
    if (!this.enabled()) {
      this.addNote.set('Reviewing your own files is not switched on for this server, so the files were not added.')
      return
    }
    this.addFiles(files)
  }

  /** Adds files to the list (up to the limit, no duplicates) and starts sending them. */
  addFiles(picked: File[]): void {
    if (!picked.length) {
      return
    }
    // Dropped while the page is still loading: kept, and added once it knows what it accepts.
    if (!this.context()) {
      this.early = [...this.early, ...picked]
      this.addNote.set(`${picked.length === 1 ? 'Your file' : `${picked.length} files`} will be added as soon as the page has loaded.`)
      return
    }
    if (!this.enabled()) {
      return
    }
    const known = new Set([...this.files.values()].map(f => `${f.name}|${f.size}|${f.lastModified}`))
    const fresh = picked.filter(f => !known.has(`${f.name}|${f.size}|${f.lastModified}`))
    const room = Math.max(0, this.maxFiles() - this.entries().length)
    const taken = fresh.slice(0, room)
    const notes: string[] = []
    if (fresh.length < picked.length) {
      const n = picked.length - fresh.length
      notes.push(n === 1 ? '1 file was already in the list.' : `${n} files were already in the list.`)
    }
    if (taken.length < fresh.length) {
      const n = fresh.length - taken.length
      notes.push(`One review covers up to ${this.maxFiles()} files, so ${n === 1 ? '1 file was' : `${n} files were`} not added.`)
    }
    this.addNote.set(notes.join(' '))

    const accepted = this.context()?.accepted || null
    const added: UploadEntry[] = taken.map(file => {
      const key = this.nextKey++
      this.files.set(key, file)
      const problem = fileProblem(file, accepted)
      return {
        key,
        name: file.name,
        size: file.size,
        kind: kindForFile(file.name) || 'pdf',
        state: problem ? 'rejected' : 'reading',
        progress: 0,
        uploadId: null,
        problem,
        warning: null,
        checked: null,
        stored: false,
      }
    })
    this.entries.update(list => [...list, ...added])
    added.filter(e => e.state === 'reading').forEach(e => void this.prepare(e.key))
  }

  /** A sheet is read into its questions; any other file is sent as it is. Then it waits for a slot. */
  private async prepare(key: number): Promise<void> {
    const file = this.files.get(key)
    const entry = this.entry(key)
    if (!file || !entry) {
      return
    }
    if (entry.kind === 'quiz' || entry.kind === 'assessment') {
      let read: Awaited<ReturnType<typeof readQuizSheet>>
      try {
        read = await readQuizSheet(file, entry.kind)
      } catch {
        if (this.entry(key)?.state === 'reading') {
          this.patch(key, { state: 'failed', checked: null, problem: 'The sheet could not be read just now. Try again.' })
        }
        return
      }
      // Removed, or switched between quiz and assessment, while it was being read.
      if (this.entry(key)?.kind !== entry.kind || this.entry(key)?.state !== 'reading') {
        return
      }
      if (read.error) {
        this.patch(key, { state: 'rejected', checked: null, problem: read.error })
        return
      }
      this.bodies.set(key, read.body)
      this.patch(key, { state: 'waiting', warning: read.warning })
    } else {
      this.bodies.set(key, file)
      this.patch(key, { state: 'waiting' })
    }
    this.pump()
  }

  /** Starts waiting files while there are free upload slots. */
  private pump(): void {
    const active = this.entries().filter(e => e.state === 'signing' || e.state === 'uploading' || e.state === 'checking').length
    this.entries()
      .filter(e => e.state === 'waiting')
      .slice(0, Math.max(0, UPLOAD_CONCURRENCY - active))
      .forEach(e => this.send(e.key))
  }

  /** Sign, send to storage, then have the service confirm and measure it. */
  private send(key: number): void {
    const entry = this.entry(key)
    const body = this.bodies.get(key)
    if (!entry || !body) {
      return
    }
    this.patch(key, { state: 'signing', progress: 0, problem: null })
    const sub = this.api
      .signUploads([{ name: entry.name, size: body.size, kind: entry.kind }])
      .pipe(
        map(list => {
          const signed = list[0]
          if (!signed) {
            throw new Error('No upload was signed.')
          }
          return signed
        }),
        tap(signed => this.patch(key, { uploadId: signed.uploadId, state: 'uploading' })),
        switchMap(signed =>
          this.api.uploadFile(signed.upload, body).pipe(
            tap(pct => this.patch(key, { progress: pct })),
            last(),
            catchError(err => throwError(() => new StorageUploadError(err))),
            map(() => signed.uploadId),
          ),
        ),
        tap(() => this.patch(key, { state: 'checking', progress: 100, stored: true })),
        switchMap(uploadId => this.checkUntilSettled(uploadId)),
      )
      .subscribe(this.settle(key, 'This file could not be uploaded. Try again.'))
    // A call that already ended (an error before any request) has nothing left to cancel.
    if (!sub.closed) {
      this.uploads.set(key, sub)
    }
  }

  /** What to do with a file's check when it ends: ready, refused with the reason, or failed with it. */
  private settle(key: number, fallback: string) {
    return {
      next: (checked: IAiReviewCheckedUpload) =>
        this.patch(
          key,
          checked.status === 'ready'
            ? { state: 'ready', checked, problem: null }
            : { state: 'rejected', checked, problem: checked.reason || 'This file cannot be reviewed.' },
        ),
      error: (err: unknown) => {
        this.patch(key, {
          state: 'failed',
          checked: null,
          problem:
            err instanceof StorageUploadError
              ? storageMessage(err.cause)
              : err instanceof CheckPendingError
                ? err.message
                : AiReviewService.errorMessage(err, fallback),
        })
        this.uploads.delete(key)
        this.pump()
      },
      complete: () => {
        this.uploads.delete(key)
        this.pump()
      },
    }
  }

  /**
   * The service's check of one upload. Asked again, a little later each time, while the file
   * has not arrived in storage or is still being checked, and after a passing failure (no
   * connection, a gateway timeout); a refusal (403, 400) is final. When it gives up, the error
   * carries the service's own reason, which the row shows.
   */
  private checkUntilSettled(uploadId: string): Observable<IAiReviewCheckedUpload> {
    return defer(() => this.api.checkUploads([uploadId])).pipe(
      map(res => {
        const found = res.uploads.find(u => u.uploadId === uploadId)
        if (!found || found.status === 'pending') {
          throw new CheckPendingError(found?.reason || 'The file has not arrived in storage yet. Try again.')
        }
        return found
      }),
      retry({
        count: CHECK_RETRIES,
        delay: (err, attempt) =>
          err instanceof CheckPendingError || isTransient(err) ? timer(CHECK_RETRY_MS * attempt) : throwError(() => err),
      }),
    )
  }

  /**
   * Tries a failed file again. One already in storage is only checked again; one that never
   * arrived is sent again (and a sheet that could not be read is read again).
   */
  retryFile(key: number): void {
    const entry = this.entry(key)
    if (!entry || entry.state !== 'failed') {
      return
    }
    if (entry.stored && entry.uploadId) {
      const uploadId = entry.uploadId
      this.patch(key, { state: 'checking', problem: null, progress: 100 })
      const sub = this.checkUntilSettled(uploadId).subscribe(this.settle(key, 'This file could not be checked. Try again.'))
      if (!sub.closed) {
        this.uploads.set(key, sub)
      }
      return
    }
    this.patch(key, { state: this.bodies.has(key) ? 'waiting' : 'reading', problem: null, progress: 0 })
    if (this.bodies.has(key)) {
      this.pump()
    } else {
      void this.prepare(key)
    }
  }

  /** Takes a file out of the list, stopping its upload. */
  removeFile(key: number): void {
    this.uploads.get(key)?.unsubscribe()
    this.uploads.delete(key)
    this.bodies.delete(key)
    this.files.delete(key)
    this.entries.update(list => list.filter(e => e.key !== key))
    this.addNote.set('')
    this.pump()
  }

  /** Removes every file that cannot be reviewed. */
  removeUnusable(): void {
    this.unusable().forEach(e => this.removeFile(e.key))
  }

  /** Whether the Quiz/Assessment switch can be used now (not while the sheet is on its way). */
  canSwitchKind(entry: UploadEntry): boolean {
    return (
      entry.state === 'ready' || entry.state === 'waiting' || entry.state === 'failed' || (entry.state === 'rejected' && !!entry.uploadId)
    )
  }

  /**
   * A sheet is a quiz unless the user says it is an assessment. The questions sent are the
   * same either way, so the file is never uploaded again:
   * - not sent yet (waiting, or failed and to be sent again): the kind is only noted here, and
   *   the upload is signed with it;
   * - already uploaded: the service is told the new kind and checks the stored file for it.
   */
  setSheetKind(key: number, kind: 'quiz' | 'assessment'): void {
    const entry = this.entry(key)
    if (!entry || entry.kind === kind || !this.isSheet(entry) || !this.canSwitchKind(entry)) {
      return
    }
    if (entry.state === 'waiting' || entry.state === 'failed') {
      this.patch(key, { kind })
      return
    }
    const uploadId = entry.uploadId
    if (!uploadId) {
      return
    }
    // `checked` is kept, so the question count stays on screen while the service answers, and
    // so is the sheet's own warning (rows it skipped): the questions sent are the same.
    this.patch(key, { kind, state: 'checking', problem: null })
    const sub = this.api.changeUploadKind(uploadId, kind).subscribe({
      next: checked =>
        this.patch(
          key,
          checked.status === 'ready'
            ? { state: 'ready', checked, problem: null }
            : { state: 'rejected', checked, problem: checked.reason || 'This file cannot be reviewed.' },
        ),
      // Not changed: back to what it was, saying why.
      error: err => {
        this.uploads.delete(key)
        this.patch(key, {
          kind: entry.kind,
          state: entry.state,
          problem: entry.problem,
          warning: AiReviewService.errorMessage(
            err,
            `It could not be changed to ${kind === 'quiz' ? 'a quiz' : 'an assessment'} just now. Try again.`,
          ),
        })
      },
      complete: () => this.uploads.delete(key),
    })
    this.uploads.set(key, sub)
  }

  /** "12 min 30 s · 24 pages · 18 questions": what the check measured. */
  measuredLine(entry: UploadEntry): string {
    const c = entry.checked
    if (!c) {
      return ''
    }
    return [
      typeof c.durationSec === 'number' ? formatDuration(c.durationSec) : '',
      typeof c.pages === 'number' ? (c.pages === 1 ? '1 page' : `${c.pages} pages`) : '',
      typeof c.questions === 'number' ? (c.questions === 1 ? '1 question' : `${c.questions} questions`) : '',
    ]
      .filter(Boolean)
      .join(' · ')
  }

  stateLabel(entry: UploadEntry): string {
    switch (entry.state) {
      case 'reading':
        return 'Reading the questions…'
      case 'waiting':
        return 'Waiting to upload'
      case 'signing':
        return 'Preparing the upload…'
      case 'uploading':
        return `Uploading · ${entry.progress}%`
      case 'checking':
        return entry.stored ? 'Checking the file…' : 'Checking…'
      case 'ready':
        return 'Ready'
      case 'rejected':
        return "Can't be reviewed"
      default:
        return 'Upload failed'
    }
  }

  isSheet(entry: UploadEntry): boolean {
    return entry.kind === 'quiz' || entry.kind === 'assessment'
  }

  private entry(key: number): UploadEntry | undefined {
    return this.entries().find(e => e.key === key)
  }

  private patch(key: number, change: Partial<UploadEntry>): void {
    this.entries.update(list => list.map(e => (e.key === key ? { ...e, ...change } : e)))
  }

  // ---- setup ----

  selectCompetency(competencyId: string): void {
    this.competencyId.set(competencyId)
    const levels = this.catalog().find(c => c.competencyId === competencyId)?.levels || []
    // A competency with one level has nothing to choose; otherwise the user picks.
    this.level.set(levels.length === 1 ? levels[0].level : null)
  }

  setLevel(value: string): void {
    const n = Number(value)
    this.level.set(Number.isInteger(n) && n > 0 ? n : null)
  }

  buildOptions(): IAiReviewOptions {
    const domain = this.domain()
    return {
      addie: this.addie(),
      domain,
      watch: this.watch(),
      domainStyle: this.domainStyle(),
      competencyId: domain ? this.competencyId() : null,
      level: domain ? this.level() : null,
      levelMode: 'single',
      positionCode: this.position()?.code || null,
      audience: this.audience().trim(),
      language: this.language(),
      context: this.notes().trim(),
    }
  }

  start(): void {
    if (this.starting() || this.validationMessage()) {
      return
    }
    this.starting.set(true)
    this.startError.set('')
    this.joinedNote.set('')
    const ids = this.ready()
      .map(e => e.uploadId)
      .filter((id): id is string => !!id)
    const title = (this.title().trim() || this.defaultTitle()).slice(0, MAX_TITLE)
    this.api
      .startUploadReview(title, ids, this.buildOptions())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.starting.set(false)
          if (!res.created) {
            this.joinedNote.set(JOINED_FILE_REVIEW)
          }
          this.follow(res.reviewId)
          this.loadHistory()
        },
        error: err => {
          this.starting.set(false)
          this.startError.set(
            isUnclear(err)
              ? `${AiReviewService.errorMessage(err)} If it had started, it is in Past reviews below; Start again shows that review rather than starting another.`
              : AiReviewService.errorMessage(err),
          )
          // The review may have started anyway: Past reviews shows it.
          if (isUnclear(err)) {
            this.loadHistory()
          }
        },
      })
  }

  // ---- following a review ----

  follow(reviewId: string): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { review: reviewId }, queryParamsHandling: 'merge', replaceUrl: true })
    this.pollError.set('')
    this.followedId = reviewId
    this.pollSub?.unsubscribe()
    // Another review than the one on screen: clear it, so its report is never shown under the
    // new one's address while the new one loads.
    if (this.review() && this.review()?.id !== reviewId) {
      this.review.set(null)
      this.joinedNote.set('')
    }
    this.following.set(!this.review())
    this.pollSub = watchReview(
      () => this.api.get(reviewId),
      this.document,
      () => this.online(),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: review => {
          this.following.set(false)
          this.review.set(review)
          this.syncHistory(review)
          if (AI_REVIEW_FINAL_STATUSES.has(review.status)) {
            this.loadHistory()
          }
        },
        error: err => {
          this.following.set(false)
          this.pollError.set(AiReviewService.errorMessage(err, 'Lost track of this review. Try again.'))
        },
      })
  }

  retryFollow(): void {
    if (this.followedId) {
      this.follow(this.followedId)
    }
  }

  private syncHistory(review: IAiReview): void {
    const list = this.history()
    const i = list.findIndex(h => h.id === review.id)
    if (i === -1 || list[i].status === review.status) {
      return
    }
    const next = [...list]
    next[i] = { ...list[i], status: review.status, progress: review.progress, summary: review.result }
    this.history.set(next)
  }

  /**
   * Back to the setup form with the settings of the review on screen. The files added on
   * this page stay, so the same files can be reviewed again with other settings.
   */
  newReview(): void {
    this.pollSub?.unsubscribe()
    this.pollSub = null
    this.followedId = null
    const o = this.review()?.options
    if (o) {
      this.addie.set(o.addie !== false)
      this.domain.set(!!o.domain && this.canJudge())
      this.watch.set(o.watch !== false)
      if (o.domainStyle) {
        this.domainStyle.set(o.domainStyle)
      }
      if (o.competencyId) {
        this.competencyId.set(o.competencyId)
      }
      this.level.set(o.level ?? this.level())
      this.audience.set(o.audience ?? this.audience())
      if (o.language) {
        this.language.set(o.language)
      }
      this.notes.set(o.context ?? '')
    }
    this.review.set(null)
    this.pollError.set('')
    this.startError.set('')
    this.joinedNote.set('')
    this.router.navigate([], { relativeTo: this.route, queryParams: { review: null }, queryParamsHandling: 'merge', replaceUrl: true })
  }

  statusLabel(status: string): string {
    return statusLabel(status, 'files')
  }

  /** Back to My Content's drafts, where the user's own unfinished content is. */
  back(): void {
    this.router.navigate(['/author/my-content'], { queryParams: { status: 'draft' } })
  }
}
