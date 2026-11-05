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
  AiReviewLevelMode,
  IAiReview,
  IAiReviewEstimateParts,
  IAiReviewHistoryEntry,
  IAiReviewOptions,
  IAiReviewCompetency,
  IAiReviewPreview,
  IAiReviewResourceSize,
  IAiReviewRoleCheck,
} from '../../models/ai-review.model'
import { AiReviewService } from '../../services/ai-review.service'
import { formatDuration, kindFromMime, kindLine, kindMeta, pipelineProgress } from '../../utils/resource-kind'
import { estimateFor } from '../../utils/upload-files'
import { isUnclear, statusLabel, watchReview } from '../../utils/review-run'
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
export const MEASURE_TIMEOUT_MS = 120000

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

/** The Level dropdown's choice for judging each part of a self-assessment course at its own level. */
export const EACH_PART = 'each'
/** The Level dropdown's choice for judging against every level the course maps. */
export const COURSE_LEVELS = 'course'
/** The Competency dropdown's choice for judging against every competency the course maps. */
export const ALL_MAPPED = '__mapped__'

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
  selector: 'ws-auth-ai-review-page',
  templateUrl: './ai-review-page.component.html',
  styleUrls: ['./ai-review-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiReviewPageComponent implements OnInit {
  private readonly api = inject(AiReviewService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)
  private readonly document = inject(DOCUMENT)

  readonly steps = STEPS
  readonly pipelineProgress = pipelineProgress
  readonly kindMeta = kindMeta
  readonly kindLine = kindLine

  readonly languageOptions: AirSelectOption[] = LANGUAGES

  courseId = ''

  readonly preview = signal<IAiReviewPreview | null>(null)
  readonly loadingPreview = signal(true)
  readonly previewError = signal('')

  // Setup choices
  readonly addie = signal(true)
  readonly domain = signal(true)
  /** Check the content against the course's own name and description. Off until chosen. */
  readonly alignment = signal(false)
  readonly watch = signal(true)
  readonly domainStyle = signal<AiReviewDomainStyle>('plain')
  readonly competencyId = signal<string | null>(null)
  readonly level = signal<number | null>(null)
  readonly levelMode = signal<AiReviewLevelMode>('single')
  readonly audience = signal('')
  readonly language = signal<AiReviewLanguage>('auto')
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
  readonly reusedCount = computed(() => this.reviewable().filter(r => this.reused().has(r.contentId)).length)

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
  readonly notReviewable = computed(() => this.resources().filter(r => !r.reviewable))
  /** Lookups that failed: their lists are empty because they could not be read, not because there is nothing. */
  readonly lookupFailed = computed(() => new Set(this.preview()?.lookupErrors || []))
  /** The course's own competencies (the default), and every competency in the dictionary. */
  readonly competencies = computed(() => this.preview()?.competencies || [])
  readonly catalog = computed(() => this.preview()?.competencyCatalog || [])
  /** Domain review can run with the course's competency, or one picked from the dictionary. */
  readonly canJudge = computed(() => this.competencies().length > 0 || this.catalog().length > 0)
  readonly selectedCompetency = computed(() => {
    const id = this.competencyId()
    const own = this.competencies().find(c => c.competencyId === id)
    if (own) {
      return own
    }
    const other = id ? this.catalog().find(c => c.competencyId === id) : null
    return other ? { competencyId: other.competencyId, name: other.name, level: null } : this.competencies()[0] || null
  })
  /** The course's competencies that carry at least one level: what "all mapped" judges against. */
  readonly mapped = computed(() => this.competencies().filter(c => levelsOf(c).length))
  /** "Pre, intra and post-op care · Level 3", one line per competency mapped on the course. */
  readonly mappedSummary = computed(() =>
    this.mapped().map(c => {
      const levels = levelsOf(c)
      return `${c.name || c.competencyId} · ${levels.length > 1 ? 'Levels ' + levels.join(', ') : 'Level ' + levels[0]}`
    }),
  )
  /** True when every competency the course maps is judged, each at its own levels. */
  readonly allMapped = computed(() => this.levelMode() === 'courseMapping')
  /** The Competency dropdown's value. */
  readonly competencyValue = computed(() => (this.allMapped() ? ALL_MAPPED : this.selectedCompetency()?.competencyId || null))

  /**
   * The line under the Competency field, describing what is selected now: all the course's
   * competencies, the course's only one, one of several, or one the course does not map.
   */
  readonly competencyHint = computed(() => {
    const several = this.mapped().length > 1
    if (this.allMapped()) {
      const count = this.mapped().length === 2 ? 'Both competencies' : `All ${this.mapped().length} competencies`
      return `${count} on the course are used, each at the levels it is mapped at. To judge against just one, or a different competency, pick it from the list.`
    }
    const selected = this.selectedCompetency()
    if (!selected) {
      return ''
    }
    const own = this.competencies().find(c => c.competencyId === selected.competencyId)
    if (!own) {
      const back = this.competencies().length
        ? ` To go back, pick ${several ? 'one of the course\'s competencies or "All competencies on the course"' : "the course's competency"}.`
        : ''
      return `This competency is not mapped on the course, so pick the level to judge against.${back}`
    }
    // The level part follows the Level field: all the mapped levels, or the one picked.
    const levels = levelsOf(own)
    const at =
      this.levelMode() === 'courseLevels' && levels.length > 1
        ? ` at its mapped levels (${levels.join(', ')})`
        : this.level()
          ? levels.length === 1 && levels[0] === this.level()
            ? ` at its mapped level (${this.level()})`
            : ` at Level ${this.level()}`
          : ''
    if (!several && this.competencies().length === 1) {
      return `The course's competency is chosen for you${at}. Pick another to judge against a different one.`
    }
    return `Only this course competency is judged${at}. To include the others, pick "All competencies on the course".`
  })

  /**
   * "All competencies on the course" first when it maps more than one, then the course's
   * competencies, marked as such, then the rest of the dictionary.
   */
  readonly competencyOptions = computed<AirSelectOption[]>(() => {
    const own = this.competencies()
    const ownIds = new Set(own.map(c => c.competencyId))
    const all: AirSelectOption[] =
      this.mapped().length > 1
        ? [
            {
              value: ALL_MAPPED,
              label: 'All competencies on the course',
              hint: `${this.mapped().length} competencies, each at its mapped levels`,
            },
          ]
        : []
    return [
      ...all,
      ...own.map(c => {
        const levels = levelsOf(c)
        return {
          value: c.competencyId,
          label: c.name || c.competencyId,
          hint:
            levels.length > 1
              ? `On this course · Levels ${levels.join(', ')}`
              : levels.length
                ? `On this course · Level ${levels[0]}`
                : 'On this course · no level mapped',
        }
      }),
      ...this.catalog()
        .filter(c => !ownIds.has(c.competencyId))
        .map(c => ({ value: c.competencyId, label: c.name, hint: c.levels.length ? `${c.levels.length} levels` : undefined })),
    ]
  })
  /** The levels the parts of a self-assessment course carry, in order ([] for any other course). */
  readonly partLevels = computed(() =>
    [
      ...new Set(
        this.reviewable()
          .map(r => r.level)
          .filter((l): l is number => typeof l === 'number'),
      ),
    ].sort((a, b) => a - b),
  )
  /**
   * The selected competency's own levels with their names (1-5 when they are not known). A
   * self-assessment course also offers judging each part at its own level, and starts there.
   */
  readonly levelOptions = computed<AirSelectOption[]>(() => {
    const id = this.selectedCompetency()?.competencyId
    const levels = this.catalog().find(c => c.competencyId === id)?.levels || []
    const each: AirSelectOption[] = this.partLevels().length
      ? [{ value: EACH_PART, label: 'Each part at its own level', hint: `Levels ${this.partLevels().join(', ')}, from the part names` }]
      : []
    const own = this.competencies().find(c => c.competencyId === id)
    const courseLevels = levelsOf(own)
    const all: AirSelectOption[] =
      courseLevels.length > 1
        ? [{ value: COURSE_LEVELS, label: 'All course levels', hint: `Levels ${courseLevels.join(', ')}, together` }]
        : []
    return [
      ...each,
      ...all,
      ...(levels.length
        ? levels.map(l => ({ value: String(l.level), label: `Level ${l.level}`, hint: l.label || undefined }))
        : LEVELS.map(l => ({ value: String(l), label: `Level ${l}` }))),
    ]
  })
  /** Parts with no "Level N" of their own, in 'each part at its own level' mode. */
  readonly unlevelledParts = computed(() =>
    this.levelMode() === 'perResource' ? this.reviewable().filter(r => typeof r.level !== 'number') : [],
  )
  /** True when the level shown is one of the choices (a course level the dictionary lacks is not). */
  readonly levelKnown = computed(() => {
    const v = this.levelValue()
    return !!v && this.levelOptions().some(o => o.value === v)
  })
  /** The Level dropdown's value. */
  readonly levelValue = computed(() => {
    const mode = this.levelMode()
    return mode === 'perResource' ? EACH_PART : mode === 'courseLevels' ? COURSE_LEVELS : this.level() ? String(this.level()) : null
  })
  /** "Watch videos in full" only matters when there is a video to watch. */
  readonly hasVideos = computed(() => this.reviewable().some(r => this.kindOf(r) === 'video'))
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
    const all = this.reviewable()
    const reused = this.reused()
    // An unchanged resource reuses its earlier result, so it adds nothing.
    const resources = all.filter(r => !reused.has(r.contentId))
    if (all.length && !resources.length) {
      return 0
    }
    // At the measured size once known, else at the size the service assumed.
    const sizes = this.sizes()
    // A part with no level of its own and no fallback level gets no domain review, so no domain cost.
    const noDomain = new Set(this.levelMode() === 'perResource' && !this.level() ? this.unlevelledParts().map(r => r.contentId) : [])
    const parts = resources
      .map(r => {
        const p = sizes.get(r.contentId)?.estimate || r.estimate
        return p && noDomain.has(r.contentId) ? { ...p, domain: 0 } : p
      })
      .filter((p): p is IAiReviewEstimateParts => !!p)
    if (!resources.length || parts.length !== resources.length) {
      return this.preview()?.estimateUsd || 0
    }
    return estimateFor(parts, { addie: this.addie(), domain: this.domain(), watch: this.watch(), alignment: this.alignment() })
  })

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
    if (!this.audience().trim()) {
      return 'Pick the audience: who the content is for (a position from the list, or type your own).'
    }
    if (this.domain() && !this.allMapped() && !this.selectedCompetency()) {
      return 'This course has no competency set. Pick one to judge against, or untick Domain review.'
    }
    if (this.domain() && this.levelMode() === 'single' && !this.level()) {
      return 'The domain review needs a level. Pick one, or untick Domain review.'
    }
    if (!this.reviewable().length) {
      return 'This course has no resources that can be reviewed yet (videos, PDFs, quizzes or assessments with an uploaded file).'
    }
    const max = this.preview()?.limits?.maxResourcesPerReview
    if (max && this.reviewable().length > max) {
      return `This course has ${this.reviewable().length} resources to review; one review covers up to ${max}. Split the course, or ask an administrator to raise the limit.`
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

  /** The cadre the expert judges the content for: the audience, or the default when it is empty. */
  readonly judgedFor = computed(() => this.audience().trim() || 'the audience you pick above')
  /** The FRAC position the audience names, when it is one from the list (its code links its activities). */
  readonly position = computed(() => {
    const name = this.audience().trim().toLowerCase()
    return (name && (this.preview()?.positionList || []).find(p => p.name.trim().toLowerCase() === name && p.code)) || null
  })

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

  ngOnInit(): void {
    this.watchConnection()
    this.courseId = this.route.snapshot.paramMap.get('courseId') || ''
    const requested = this.route.snapshot.queryParamMap.get('review')
    this.loadPreview(requested)
    this.loadHistory()
  }

  /** Retries a failed course read. */
  reload(): void {
    this.previewError.set('')
    this.loadPreview(this.route.snapshot.queryParamMap.get('review'))
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
    if (!this.reviewable().some(r => this.kindOf(r) !== 'video')) {
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
    // The first competency the course maps at a level; a listed one with no level is a last resort.
    const first = preview.competencies.find(c => levelsOf(c).length) || preview.competencies[0] || null
    this.domain.set(!!first)
    this.competencyId.set(first ? first.competencyId : null)
    this.level.set(first ? first.level : null)
    // Each part of a self-assessment course is one level of its competency: judge it there.
    // A course mapped at several levels is judged against all of them together.
    const levelled = !!preview.course.selfAssessment && preview.resources.some(r => r.reviewable && typeof r.level === 'number')
    // A course that maps several competencies is judged against all of them, each at its levels.
    const mappedCount = preview.competencies.filter(c => levelsOf(c).length).length
    this.levelMode.set(
      levelled ? 'perResource' : mappedCount > 1 ? 'courseMapping' : levelsOf(first).length > 1 ? 'courseLevels' : 'single',
    )
    // The audience is left for the reviewer to pick: a guessed default would judge the
    // content for the wrong learners without anyone choosing it.
    this.language.set(preview.defaults.language)
    this.domainStyle.set(preview.defaults.domainStyle)
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
        },
        error: err => {
          this.historyError.set(AiReviewService.errorMessage(err, 'Could not load past reviews.'))
          this.loadingHistory.set(false)
        },
      })
  }

  /** The course's level for its own competency; for another one, the reviewer picks the level. */
  selectCompetency(competencyId: string): void {
    if (competencyId === ALL_MAPPED) {
      this.levelMode.set('courseMapping')
      this.level.set(null)
      return
    }
    if (this.levelMode() === 'courseMapping') {
      this.levelMode.set('single')
    }
    this.competencyId.set(competencyId)
    const chosen = this.competencies().find(c => c.competencyId === competencyId)
    this.level.set(chosen ? chosen.level : null)
    if (this.levelMode() !== 'perResource') {
      this.levelMode.set(levelsOf(chosen).length > 1 ? 'courseLevels' : 'single')
    }
  }

  setLevel(value: string): void {
    if (value === EACH_PART) {
      // The level already chosen stays, for parts with no level of their own (shown below).
      this.levelMode.set('perResource')
      return
    }
    if (value === COURSE_LEVELS) {
      this.levelMode.set('courseLevels')
      this.level.set(null)
      return
    }
    const n = Number(value)
    this.levelMode.set('single')
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
      competencyId: domain && !this.allMapped() ? this.selectedCompetency()?.competencyId || null : null,
      level: domain && this.levelMode() !== 'courseLevels' && !this.allMapped() ? this.level() : null,
      levelMode: domain ? this.levelMode() : 'single',
      positionCode: this.position()?.code || null,
      audience: this.audience().trim(),
      language: this.language(),
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
      .start(this.courseId, this.buildOptions())
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
      () => this.api.get(reviewId),
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
      this.watch.set(o.watch !== false)
      if (o.domainStyle) {
        this.domainStyle.set(o.domainStyle)
      }
      this.levelMode.set(o.levelMode || 'single')
      this.competencyId.set(o.competencyId ?? this.competencyId())
      this.level.set(o.level ?? null)
      this.audience.set(o.audience ?? this.audience())
      if (o.language) {
        this.language.set(o.language)
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

  statusLabel(status: string): string {
    return statusLabel(status)
  }

  formatDuration(sec: number | null): string {
    return formatDuration(sec)
  }
}
