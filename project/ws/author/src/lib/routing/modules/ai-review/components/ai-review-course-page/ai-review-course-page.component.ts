import { AI_REVIEW_FRAC_ENABLED } from '../../utils/features'
import { fixFor, jumpTo } from '../../utils/jump-to'
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
  distinctUntilChanged,
  fromEvent,
  of,
  switchMap,
  timeout,
  tap,
} from 'rxjs'
import {
  AI_REVIEW_FINAL_STATUSES,
  AiReviewDomainStyle,
  AiReviewLanguage,
  AiReviewReportLanguage,
  IAiReview,
  IAiReviewEstimateParts,
  IAiReviewResource,
  IAiReviewHistoryEntry,
  IAiReviewOptions,
  IAiReviewCompetency,
  IAiReviewPreview,
  IAiReviewResourceSize,
  IAiReviewRoleCheck,
} from '../../models/ai-review.model'
import { AiReviewService } from '../../services/ai-review.service'
import { formatDuration, kindFromMime, kindLine, kindMeta, pipelineProgress } from '../../utils/resource-kind'
import { estimateFor, partsCost } from '../../utils/upload-files'
import { AIR_VIEWER, isUnclear, requesterName, statusLabel, watchReview } from '../../utils/review-run'
import { AirSelectOption } from '../air-select/air-select.component'

export { pipelineProgress } from '../../utils/resource-kind'
export { POLL_FAST_MS, POLL_SLOW_MS, nextPollDelay } from '../../utils/review-run'

/** How long the setup screen waits for the FRAC role check, and for the page and question count. */
/**
 * Longer than uiproxy waits for the FRAC role check (45 s), which is longer than the service
 * takes at most (two 20 s tries): the service's own answer, or uiproxy's, always comes first.
 */
export const ROLE_CHECK_TIMEOUT_MS = 50000

/** Start found this course already being reviewed (by anyone): that review is shown. */
export const JOINED_COURSE_REVIEW = 'This course was already being reviewed, so you are following that review instead of starting another.'
/** Start's answer was lost, but the review had started: it is shown. */
export const STARTED_AFTER_ALL = 'The review had started after all; here it is.'
/** Longer than the gateways wait for measuring (Kong 130 s, uiproxy 150 s), so their answer always arrives first. */
export const MEASURE_TIMEOUT_MS = 155000

/** Settle time before asking which resources are unchanged, so typing does not fire a call per key. */
export const REUSE_CHECK_DEBOUNCE_MS = 400

export const LANGUAGES: { value: AiReviewLanguage; label: string }[] = [
  { value: 'auto', label: 'Detect automatically' },
  { value: 'hi', label: 'Hindi' },
  { value: 'en', label: 'English' },
  { value: 'mr', label: 'Marathi' },
  { value: 'bn', label: 'Bengali' },
]

export const LEVELS = [1, 2, 3, 4, 5]

/**
 * Said for a course mapped to more than one competency, or to one at more than one level: AI
 * review judges one competency at one level (as the service says, ONE_LEVEL_ONLY), so such a
 * course gets the checklist and alignment reviews only.
 */
export const ONE_LEVEL_ONLY =
  'AI review judges one competency at one level. This course is mapped to more than one, so the domain review is off: the CBP checklist and course alignment reviews still run.'

/** The levels the course maps a competency at (older services send only `level`). */
const levelsOf = (c: IAiReviewCompetency | null | undefined): number[] => (c ? c.levels || (c.level ? [c.level] : []) : [])

export type AiReviewStep = 'setup' | 'review' | 'report'
export const STEPS: { id: AiReviewStep; label: string }[] = [
  { id: 'setup', label: 'Set up' },
  { id: 'review', label: 'Review' },
  { id: 'report', label: 'Report' },
]

/**
 * AI review of one course: set up, follow progress, read the report, and see past reviews.
 *
 * The review id lives in the URL (`?review=`), so a reload, or a colleague opening the same
 * link, picks up the same review. Opening the page while the course is already being reviewed
 * follows that review instead of offering to start a second one.
 *
 * The review is advisory: nothing here touches the course or its review workflow.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-ai-review-course-page',
  templateUrl: './ai-review-course-page.component.html',
  styleUrls: ['./ai-review-course-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiReviewCoursePageComponent implements OnInit {
  private readonly api = inject(AiReviewService)
  private readonly viewer = inject(AIR_VIEWER, { optional: true })
  /** Who started a past review: their name, "You" for your own, or nothing when unknown. */
  readonly startedBy = (h: Pick<IAiReviewHistoryEntry, 'requestedBy'>): string => {
    const v = this.viewer?.() ?? null
    return h.requestedBy?.id && v && h.requestedBy.id === v.id ? 'You' : requesterName(h, v)
  }
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)
  private readonly document = inject(DOCUMENT)

  readonly steps = STEPS
  readonly pipelineProgress = pipelineProgress
  readonly kindMeta = kindMeta
  readonly kindLine = kindLine

  courseId = ''

  readonly preview = signal<IAiReviewPreview | null>(null)
  readonly loadingPreview = signal(true)
  readonly previewError = signal('')

  // Setup choices
  readonly addie = signal(true)
  readonly domain = signal(true)
  /** Check the content against the course's own name and description. Off until chosen. */
  readonly alignment = signal(false)
  /** Videos are always watched in full (no longer a choice); kept as the request's option. */
  readonly watch = signal(true)
  /** Whether the Plain/FRAC choice is offered (utils/features.ts); hidden, every review is Plain. */
  readonly fracEnabled = AI_REVIEW_FRAC_ENABLED
  readonly domainStyle = signal<AiReviewDomainStyle>('plain')
  readonly competencyId = signal<string | null>(null)
  /** The one level judged at. */
  readonly level = signal<number | null>(null)
  readonly language = signal<AiReviewLanguage>('auto')
  /** The language the review is written in: English for now, whatever the content's language. */
  readonly reportLanguage = signal<AiReviewReportLanguage>('en')
  readonly context = signal('')

  readonly starting = signal(false)
  readonly startError = signal('')
  /** Said when Start joined a review already running, instead of starting (and paying for) another. */
  readonly joinedNote = signal('')

  readonly review = signal<IAiReview | null>(null)
  readonly pollError = signal('')

  readonly history = signal<IAiReviewHistoryEntry[]>([])
  readonly historyError = signal('')
  readonly loadingHistory = signal(false)
  /** False while the browser is offline: a banner says so, Start waits, and polling pauses. */
  readonly online = signal(typeof navigator === 'undefined' || navigator.onLine !== false)
  /** The review last followed, so "Try again" can pick it up after a failed read. */
  private followedId: string | null = null
  /** Pages and questions per resource, measured after the preview; empty until then. */
  readonly sizes = signal<ReadonlyMap<string, IAiReviewResourceSize>>(new Map())
  readonly measuring = signal(false)
  /**
   * Resources unchanged since a review with the settings now chosen, by content id, with when
   * that review was made. Their earlier result is reused: not reviewed again, and free.
   */
  readonly reused = signal<ReadonlyMap<string, string>>(new Map())
  readonly reusedCount = computed(() => this.selected().filter(r => this.reused().has(r.contentId)).length)

  /** The settings to check for reuse, or null while there is nothing that could start. */
  /** The FRAC role check for the settings now: the position's activities, or why none. */
  readonly roleCheck = signal<IAiReviewRoleCheck | null>(null)
  readonly roleChecking = signal(false)
  /** The settings to check the role for, or null outside the FRAC style. */
  private readonly roleRequest = computed(() =>
    !this.review() && this.preview() && this.domain() && this.domainStyle() === 'frac' && !this.validationMessage()
      ? JSON.stringify(this.buildOptions())
      : null,
  )

  private readonly reuseRequest = computed(() =>
    !this.review() && this.preview() && !this.validationMessage() ? JSON.stringify(this.buildOptions()) : null,
  )
  /** Opening a review by its link: true until its first read, so the setup form does not flash. */
  readonly following = signal(false)

  private pollSub: Subscription | null = null

  /** The course's resources, with any the measuring found past a size limit marked not reviewed. */
  readonly resources = computed(() =>
    (this.preview()?.resources || []).map(r => {
      const tooBig = this.sizes().get(r.contentId)?.skipReason
      return tooBig && r.reviewable ? { ...r, reviewable: false, skipReason: tooBig } : r
    }),
  )
  readonly reviewable = computed(() => this.resources().filter(r => r.reviewable))
  /** Resources the user unticked: listed, but left out of this review. All are in by default. */
  readonly excluded = signal<ReadonlySet<string>>(new Set())
  /** The resources this review will cover. */
  readonly selected = computed(() => this.reviewable().filter(r => !this.excluded().has(r.contentId)))
  readonly allSelected = computed(() => this.selected().length === this.reviewable().length)
  readonly notReviewable = computed(() => this.resources().filter(r => !r.reviewable))
  /** Videos found to have no sound: still reviewed, on what they show, and the creator told so. */
  readonly silentVideos = computed(() => this.reviewable().filter(r => this.sizes().get(r.contentId)?.audio === false))
  /** Lookups that failed: their lists are empty because they could not be read, not because there is nothing. */
  readonly lookupFailed = computed(() => new Set(this.preview()?.lookupErrors || []))
  /** The course's own competencies (the default), and every competency in the dictionary. */
  readonly competencies = computed(() => this.preview()?.competencies || [])
  readonly catalog = computed(() => this.preview()?.competencyCatalog || [])
  /** Why the domain review is off for a course mapped to several competencies or levels. */
  readonly oneLevelOnly = ONE_LEVEL_ONLY
  /** The course's competencies that carry at least one level. */
  readonly mapped = computed(() => this.competencies().filter(c => levelsOf(c).length))
  /**
   * True when the course is mapped to more than one competency, or to one at more than one
   * level. AI review judges one competency at one level, so such a course gets no domain review
   * (the checklist and alignment reviews still run), and the page says why.
   */
  readonly severalLevels = computed(() => this.mapped().length > 1 || this.mapped().some(c => levelsOf(c).length > 1))
  /** "Pre, intra and post-op care · Level 3", one line per competency mapped on the course. */
  readonly mappedSummary = computed(() =>
    this.mapped().map(c => {
      const levels = levelsOf(c)
      return `${c.name || c.competencyId} · ${levels.length > 1 ? 'Levels ' + levels.join(', ') : 'Level ' + levels[0]}`
    }),
  )
  /**
   * Domain review can run with the course's one competency at its one level, or, for a course
   * with none, one picked from the dictionary. Never for a course mapped to several.
   */
  readonly canJudge = computed(() => !this.severalLevels() && (this.competencies().length > 0 || this.catalog().length > 0))
  readonly selectedCompetency = computed(() => {
    const id = this.competencyId()
    const own = this.competencies().find(c => c.competencyId === id)
    if (own) {
      return own
    }
    const other = id ? this.catalog().find(c => c.competencyId === id) : null
    return other ? { competencyId: other.competencyId, name: other.name, level: null } : this.competencies()[0] || null
  })
  /** The Competency dropdown's value. */
  readonly competencyValue = computed(() => this.selectedCompetency()?.competencyId || null)

  /** The line under the Competency field: the course's own competency, or one it does not map. */
  readonly competencyHint = computed(() => {
    const selected = this.selectedCompetency()
    if (!selected) {
      return ''
    }
    const own = this.competencies().find(c => c.competencyId === selected.competencyId)
    if (!own) {
      return this.competencies().length
        ? "This competency is not mapped on the course, so pick the level to judge against. To go back, pick the course's competency."
        : 'This course has no competency set, so pick one and its level to judge against.'
    }
    const levels = levelsOf(own)
    const at = this.level()
      ? levels.length === 1 && levels[0] === this.level()
        ? ` at its mapped level (${this.level()})`
        : ` at Level ${this.level()}`
      : ''
    return `The course's competency is chosen for you${at}. Pick another to judge against a different one.`
  })

  /** The course's competencies, marked as such, then the rest of the dictionary. */
  readonly competencyOptions = computed<AirSelectOption[]>(() => {
    const own = this.competencies()
    const ownIds = new Set(own.map(c => c.competencyId))
    return [
      ...own.map(c => {
        const levels = levelsOf(c)
        return {
          value: c.competencyId,
          label: c.name || c.competencyId,
          hint: levels.length ? `On this course · Level ${levels[0]}` : 'On this course · no level mapped',
        }
      }),
      ...this.catalog()
        .filter(c => !ownIds.has(c.competencyId))
        .map(c => ({ value: c.competencyId, label: c.name, hint: c.levels.length ? `${c.levels.length} levels` : undefined })),
    ]
  })
  /** The selected competency's own levels with their names (1-5 when they are not known). One is judged. */
  readonly levelOptions = computed<AirSelectOption[]>(() => {
    const id = this.selectedCompetency()?.competencyId
    const levels = this.catalog().find(c => c.competencyId === id)?.levels || []
    return levels.length
      ? levels.map(l => ({ value: String(l.level), label: `Level ${l.level}`, hint: l.label || undefined }))
      : LEVELS.map(l => ({ value: String(l), label: `Level ${l}` }))
  })
  /** The Level dropdown's value. */
  readonly levelValue = computed(() => (this.level() ? String(this.level()) : null))
  /** True when the level shown is one of the choices (a course level the dictionary lacks is not). */
  readonly levelKnown = computed(() => {
    const v = this.levelValue()
    return !!v && this.levelOptions().some(o => o.value === v)
  })
  /** "Watch videos in full" only matters when there is a video to watch. */
  readonly hasVideos = computed(() => this.selected().some(r => this.kindOf(r) === 'video'))
  /** Reviewable resources grouped by kind, for the summary chips: "2 Videos · 1 PDF". */
  readonly kindCounts = computed(() => {
    const counts = new Map<string, number>()
    this.reviewable().forEach(r => {
      const kind = this.kindOf(r)
      counts.set(kind, (counts.get(kind) || 0) + 1)
    })
    return [...counts.entries()].map(([kind, count]) => ({ kind, count, meta: kindMeta(kind) }))
  })

  /**
   * The cost of the review as set up now: each reviewable resource's base, plus the parts
   * for the options switched on. Follows every tick. Falls back to the service's single
   * figure for a service that sends no breakdown.
   */
  readonly estimateUsd = computed(() => {
    const all = this.selected()
    const reused = this.reused()
    // An unchanged resource reuses its earlier result, so it adds nothing.
    const resources = all.filter(r => !reused.has(r.contentId))
    if (!all.length || !resources.length) {
      return 0
    }
    const parts = resources.map(r => this.partsOf(r)).filter((p): p is IAiReviewEstimateParts => !!p)
    if (parts.length !== resources.length) {
      return this.preview()?.estimateUsd || 0
    }
    return estimateFor(parts, this.costOptions())
  })

  /** The reviews switched on, as the estimate counts them. */
  private readonly costOptions = computed(() => ({
    addie: this.addie(),
    domain: this.domain(),
    watch: this.watch(),
    alignment: this.alignment(),
    domainStyle: this.domainStyle(),
  }))

  /**
   * A resource's cost parts: at its measured size once known, else at the size the service assumed.
   */
  private partsOf(r: IAiReviewResource): IAiReviewEstimateParts | null {
    return this.sizes().get(r.contentId)?.estimate || r.estimate || null
  }

  /** One resource's estimated cost with the reviews switched on now; 0 when its earlier result is reused; null when unknown. */
  resourceCost(r: IAiReviewResource): number | null {
    if (this.reused().has(r.contentId)) {
      return 0
    }
    const p = this.partsOf(r)
    return p ? partsCost(p, this.costOptions()) : null
  }

  isSelected(contentId: string): boolean {
    return !this.excluded().has(contentId)
  }

  /** Puts a resource in or out of this review. */
  toggleResource(contentId: string, on: boolean): void {
    const next = new Set(this.excluded())
    if (on) {
      next.delete(contentId)
    } else {
      next.add(contentId)
    }
    this.excluded.set(next)
  }

  selectAll(on: boolean): void {
    this.excluded.set(on ? new Set() : new Set(this.reviewable().map(r => r.contentId)))
  }

  /** What the alignment check judges against: the course's name, subtitle and description. */
  readonly brief = computed(() => this.preview()?.course.brief || null)
  /** Why the alignment check cannot run for this course, or ''. */
  readonly briefProblem = computed(() => {
    const preview = this.preview()
    if (!preview) {
      return ''
    }
    if (!preview.course.brief) {
      return 'This server cannot check alignment with the course description yet.'
    }
    return preview.course.briefProblem || ''
  })
  readonly canAlign = computed(() => !!this.preview() && !this.briefProblem())

  /** The per-resource limits, as one line: "Videos up to 30 min · PDFs up to 320 pages · …". */
  readonly limitsNote = computed(() => {
    const l = this.preview()?.limits
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

  /** Why the review cannot start yet, worded as the spec words it; '' when it can. */
  readonly validationMessage = computed(() => {
    if (!this.preview()) {
      return ''
    }
    if (!this.online()) {
      return "You're offline. Reconnect to the internet to start a review."
    }
    if (!this.addie() && !this.domain() && !this.alignment()) {
      return 'Pick at least one review: the ADDIE checklist, the domain review or the course alignment check.'
    }
    if (this.alignment() && !this.canAlign()) {
      return this.briefProblem()
    }
    if (this.domain() && this.severalLevels()) {
      return ONE_LEVEL_ONLY
    }
    if (this.domain() && !this.selectedCompetency()) {
      return 'This course has no competency set. Pick one to judge against, or untick Domain review.'
    }
    if (this.domain() && !this.level()) {
      return 'The domain review needs a level. Pick one, or untick Domain review.'
    }
    if (!this.reviewable().length) {
      return 'This course has no resources that can be reviewed yet (videos, PDFs, quizzes or assessments with an uploaded file).'
    }
    if (!this.selected().length) {
      return 'Tick at least one resource to review.'
    }
    const max = this.preview()?.limits?.maxResourcesPerReview
    if (max && this.selected().length > max) {
      return `${this.selected().length} resources are chosen; one review covers up to ${max}. Untick some, or ask an administrator to raise the limit.`
    }
    return ''
  })

  /** Why the FRAC role check cannot run yet (a competency or level to pick), or ''. */
  readonly roleWaiting = computed(() => (this.domain() && this.domainStyle() === 'frac' ? this.validationMessage() : ''))

  readonly isRunning = computed(() => {
    const r = this.review()
    return !!r && !AI_REVIEW_FINAL_STATUSES.has(r.status)
  })
  readonly isFinished = computed(() => {
    const r = this.review()
    return !!r && AI_REVIEW_FINAL_STATUSES.has(r.status)
  })
  /** Where the user is: setting up, watching a review run, or reading its report. */
  readonly currentStep = computed<AiReviewStep>(() => (this.isFinished() ? 'report' : this.isRunning() ? 'review' : 'setup'))
  readonly currentStepIndex = computed(() => STEPS.findIndex(s => s.id === this.currentStep()))

  constructor() {
    // When a step replaces the section the user acted in (Start, Cancel, Review again),
    // move focus to the new step's heading instead of letting it fall back to the page.
    let shown: AiReviewStep | null = null
    effect(() => {
      const step = this.currentStep()
      if (shown !== null && step !== shown) {
        setTimeout(() => this.document.getElementById('air-step-heading')?.focus())
      }
      shown = step
    })

    // Ask which resources are unchanged each time the settings settle (they decide the
    // match, as much as the content does). Best-effort: if the check fails, nothing is
    // marked reused and the estimate simply counts every resource.
    toObservable(this.reuseRequest)
      .pipe(
        debounceTime(REUSE_CHECK_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap(request =>
          request ? this.api.reuse(this.courseId, JSON.parse(request) as IAiReviewOptions).pipe(catchError(() => of([]))) : of([]),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(list => this.reused.set(new Map(list.map(r => [r.contentId, r.reviewedAt]))))

    // The FRAC role check follows the position, competency and level as they settle.
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
          return this.api.fracRole(this.courseId, JSON.parse(request) as IAiReviewOptions).pipe(
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
  }

  /**
   * Follows the browser's connection: offline shows the banner; back online retries what
   * failed while offline (the course read, a lost review), so nobody has to reload the page.
   */
  private watchConnection(): void {
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
        if (this.previewError() && !this.review()) {
          this.reload()
        }
        if (this.pollError()) {
          this.retryFollow()
        }
      })
  }

  /** After a failed read of the review on screen: try following it again. */
  retryFollow(): void {
    if (this.followedId) {
      this.follow(this.followedId)
    }
  }

  /**
   * Opened with no review named: the course's current report is shown once its past reviews are
   * read (one report per course), instead of the setup form. A review still running takes its
   * place (the preview follows it); "Review again" goes to the form as before.
   */
  private openCurrentReport = false

  ngOnInit(): void {
    this.watchConnection()
    this.courseId = this.route.snapshot.paramMap.get('courseId') || ''
    const requested = this.route.snapshot.queryParamMap.get('review')
    this.openCurrentReport = !requested
    this.loadPreview(requested)
    this.loadHistory()
  }

  /** Retries a failed course read. */
  reload(): void {
    this.previewError.set('')
    const requested = this.route.snapshot.queryParamMap.get('review')
    this.openCurrentReport = !requested && !this.followedId
    this.loadPreview(requested)
    this.loadHistory()
  }

  private loadPreview(requestedReviewId: string | null): void {
    this.loadingPreview.set(true)
    this.api
      .preview(this.courseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: preview => {
          this.preview.set(preview)
          this.applyDefaults(preview)
          this.loadingPreview.set(false)
          this.loadSizes()
          const followId = requestedReviewId || preview.activeReviewId
          if (followId) {
            this.follow(followId)
          }
        },
        error: err => {
          this.previewError.set(AiReviewService.errorMessage(err, 'Could not load this course for review.'))
          this.loadingPreview.set(false)
          // A finished review can still be opened by its link even if the course read fails.
          if (requestedReviewId) {
            this.follow(requestedReviewId)
          }
        },
      })
  }

  /**
   * Counts pages and questions after the preview has shown the list, so the list does not
   * wait on it. Best-effort: without it, the list shows no counts and the estimate stays at
   * the assumed size.
   */
  private loadSizes(): void {
    // Every course: a PDF's pages, a quiz's questions, and whether each video has sound.
    if (!this.reviewable().length) {
      return
    }
    this.measuring.set(true)
    this.api
      .measure(this.courseId)
      .pipe(timeout(MEASURE_TIMEOUT_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => {
          this.sizes.set(new Map(list.map(s => [s.contentId, s])))
          this.measuring.set(false)
        },
        error: () => this.measuring.set(false),
      })
  }

  /** True when counting this resource failed (its estimate then assumes a typical size). */
  sizeUnknown(contentId: string): boolean {
    return !!this.sizes().get(contentId)?.error
  }

  /** "24 pages", "1 question", or '' when not measured. */
  sizeLabel(contentId: string): string {
    const s = this.sizes().get(contentId)
    if (!s) {
      return ''
    }
    if (typeof s.pages === 'number') {
      return s.pages === 1 ? '1 page' : `${s.pages} pages`
    }
    if (typeof s.questions === 'number') {
      return s.questions === 1 ? '1 question' : `${s.questions} questions`
    }
    return ''
  }

  private applyDefaults(preview: IAiReviewPreview): void {
    // The course's one competency at its one level. A course mapped to several gets no domain
    // review (AI review judges one competency at one level): the checklist still runs.
    const mapped = preview.competencies.filter(c => levelsOf(c).length)
    const several = mapped.length > 1 || mapped.some(c => levelsOf(c).length > 1)
    const first = mapped[0] || preview.competencies[0] || null
    this.domain.set(!!first && !several)
    this.competencyId.set(first && !several ? first.competencyId : null)
    this.level.set(first && !several ? first.level : null)
    this.language.set(preview.defaults.language)
    this.domainStyle.set(AI_REVIEW_FRAC_ENABLED ? preview.defaults.domainStyle : 'plain')
  }

  loadHistory(): void {
    this.loadingHistory.set(true)
    this.api
      .history(this.courseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => {
          this.history.set(list)
          this.historyError.set('')
          this.loadingHistory.set(false)
          // The course already has a report: show it, unless another review is already on screen.
          if (this.openCurrentReport) {
            this.openCurrentReport = false
            const current = list.find(h => h.status === 'done' || h.status === 'partial')
            if (current && !this.followedId) {
              this.follow(current.id)
            }
          }
        },
        error: err => {
          this.openCurrentReport = false
          this.historyError.set(AiReviewService.errorMessage(err, 'Could not load past reviews.'))
          this.loadingHistory.set(false)
        },
      })
  }

  /** The course's level for its own competency; for another one, the reviewer picks the level. */
  selectCompetency(competencyId: string): void {
    this.competencyId.set(competencyId)
    const chosen = this.competencies().find(c => c.competencyId === competencyId)
    this.level.set(chosen ? chosen.level : null)
  }

  /** The one level judged at. */
  setLevel(value: string): void {
    const n = Number(value)
    this.level.set(Number.isInteger(n) && n > 0 ? n : null)
  }

  buildOptions(): IAiReviewOptions {
    const domain = this.domain()
    return {
      addie: this.addie(),
      domain,
      alignment: this.alignment(),
      watch: this.watch(),
      domainStyle: this.domainStyle(),
      // One competency at one level.
      competencyId: domain ? this.selectedCompetency()?.competencyId || null : null,
      level: domain ? this.level() : null,
      levelMode: 'single',
      positionCode: null,
      // No audience is chosen: the service judges for the health workers the level is meant for.
      audience: '',
      language: this.language(),
      reportLanguage: this.reportLanguage(),
      context: this.context().trim(),
    }
  }

  start(): void {
    if (this.starting() || this.validationMessage()) {
      return
    }
    this.starting.set(true)
    this.startError.set('')
    this.joinedNote.set('')
    this.api
      .start(this.courseId, this.buildOptions(), this.allSelected() ? null : this.selected().map(r => r.contentId))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.starting.set(false)
          if (!res.created) {
            this.joinedNote.set(JOINED_COURSE_REVIEW)
          }
          this.follow(res.reviewId)
          this.loadHistory()
        },
        error: err => {
          this.starting.set(false)
          this.startError.set(AiReviewService.errorMessage(err))
          if (isUnclear(err)) {
            this.findStartedReview()
          }
        },
      })
  }

  /**
   * After Start failed with no clear answer (the connection dropped, a gateway timed out), the
   * review may have started anyway. The course's running review, if there is one, is followed,
   * and Past reviews is read again, so the user never starts (and pays for) a second one. The
   * settings on the form are left as they are.
   */
  private findStartedReview(): void {
    this.loadHistory()
    this.api
      .preview(this.courseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: preview => {
          if (preview.activeReviewId && !this.review()) {
            this.startError.set('')
            this.joinedNote.set(STARTED_AFTER_ALL)
            this.follow(preview.activeReviewId)
          }
        },
        error: () => undefined,
      })
  }

  /** Shows a review and keeps it current until it finishes; puts its id in the URL. */
  follow(reviewId: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { review: reviewId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    })
    this.pollError.set('')
    this.followedId = reviewId
    if (this.pollSub) {
      this.pollSub.unsubscribe()
    }
    // Another review than the one on screen: clear it, so its report is never shown under the
    // new one's address while the new one loads.
    if (this.review() && this.review()?.id !== reviewId) {
      this.review.set(null)
      this.joinedNote.set('')
    }
    this.following.set(!this.review())
    this.pollSub = this.poll(reviewId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: review => {
          this.following.set(false)
          // A link to another course's review (or to a file review): never show it under this
          // course's name, settings and history.
          if (this.courseId && review.courseId !== this.courseId) {
            this.pollSub?.unsubscribe()
            this.followedId = null
            this.review.set(null)
            this.pollError.set(
              review.courseId
                ? "That review is of a different course. Open it from that course's AI review page, or from Past reviews."
                : 'That is a review of uploaded files, not of this course. Open it from Past reviews.',
            )
            return
          }
          this.review.set(review)
          this.syncHistory(review)
          if (AI_REVIEW_FINAL_STATUSES.has(review.status)) {
            this.loadHistory()
          }
        },
        error: err => {
          this.following.set(false)
          this.pollError.set(AiReviewService.errorMessage(err, 'Lost track of this review. Reload to try again.'))
        },
      })
  }

  /** Keeps the review's line in Past reviews in step with what the page is showing. */
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
   * Reads the review now, then again after each delay, until it reaches a final state:
   * paused while the tab is hidden or the browser is offline, a failed read retried (the
   * same polling the file review uses).
   */
  poll(reviewId: string): Observable<IAiReview> {
    return watchReview(
      // One report per course: a replaced review opens the one that replaced it.
      () => this.api.get(reviewId).pipe(switchMap(r => (r.supersededBy ? this.api.get(r.supersededBy) : of(r)))),
      this.document,
      () => this.online(),
    )
  }

  /**
   * Back to the setup form, starting from the settings of the review on screen (opened from
   * Past reviews or a link, it may not be what the form showed), to run it again or change them.
   */
  newReview(): void {
    if (this.pollSub) {
      this.pollSub.unsubscribe()
      this.pollSub = null
    }
    this.followedId = null
    this.pollError.set('')
    this.joinedNote.set('')
    const o = this.review()?.options
    if (o) {
      this.addie.set(o.addie !== false)
      this.domain.set(!!o.domain && this.canJudge())
      this.alignment.set(!!o.alignment && this.canAlign())
      // Videos are always watched in full now, even when the earlier review had it off.
      this.watch.set(true)
      // The resources it left out stay left out.
      const reviewed = new Set((this.review()?.items || []).map(i => i.contentId))
      if (reviewed.size) {
        this.excluded.set(
          new Set(
            this.reviewable()
              .map(r => r.contentId)
              .filter(id => !reviewed.has(id)),
          ),
        )
      }
      if (o.domainStyle) {
        this.domainStyle.set(AI_REVIEW_FRAC_ENABLED ? o.domainStyle : 'plain')
      }
      // An older review judged several levels at once: Review again keeps the course's defaults.
      if ((o.levelMode || 'single') === 'single') {
        this.competencyId.set(o.competencyId ?? this.competencyId())
        this.level.set(o.level ?? this.level())
      }
      if (o.language) {
        this.language.set(o.language)
      }
      if (o.reportLanguage) {
        this.reportLanguage.set(o.reportLanguage)
      }
      this.context.set(o.context ?? '')
    }
    this.review.set(null)
    this.startError.set('')
    this.router.navigate([], { relativeTo: this.route, queryParams: { review: null }, queryParamsHandling: 'merge', replaceUrl: true })
  }

  /** The kind of a resource: what the service said, or else what its mimetype says. */
  kindOf(resource: { kind: string | null; mimeType?: string }): string {
    return resource.kind || kindFromMime(resource.mimeType)
  }

  backToCourse(): void {
    this.router.navigate(['/author/toc', this.courseId, 'overview'])
  }

  /** Where a blocked Start can take the user to fix it, or null. */
  readonly fix = computed(() => fixFor(this.validationMessage(), 'air-resources', 'resource'))

  /** Scrolls to a section and puts the focus in it (the resource list, the audience). */
  goTo(id: string): void {
    jumpTo(this.document, id)
  }

  statusLabel(status: string): string {
    return statusLabel(status)
  }

  formatDuration(sec: number | null): string {
    return formatDuration(sec)
  }
}
