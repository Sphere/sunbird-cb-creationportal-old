import { HttpErrorResponse } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router'
import { NEVER, Subject, of, throwError } from 'rxjs'
import { IAiReview, IAiReviewHistoryEntry, IAiReviewPreview } from '../../models/ai-review.model'
import { AiReviewService } from '../../services/ai-review.service'
import {
  AiReviewPageComponent,
  JOINED_COURSE_REVIEW,
  STARTED_AFTER_ALL,
  MEASURE_TIMEOUT_MS,
  POLL_FAST_MS,
  POLL_SLOW_MS,
  REUSE_CHECK_DEBOUNCE_MS,
  ROLE_CHECK_TIMEOUT_MS,
  nextPollDelay,
  pipelineProgress,
} from './ai-review-page.component'

jest.mock('file-saver', () => ({ saveAs: jest.fn() }))
jest.mock('xlsx', () => ({
  utils: { book_new: jest.fn(() => ({ SheetNames: [] })), aoa_to_sheet: jest.fn(rows => ({ rows })), book_append_sheet: jest.fn() },
  write: jest.fn(() => new ArrayBuffer(8)),
}))

const preview = (over: Partial<IAiReviewPreview> = {}): IAiReviewPreview => ({
  course: { id: 'do_1', name: 'Eclampsia care', status: 'Draft', versionKey: '1' },
  resources: [
    {
      contentId: 'do_v',
      name: 'BP video',
      kind: 'video',
      mimeType: 'video/mp4',
      durationSec: 36,
      path: [],
      reviewable: true,
      skipReason: null,
    },
    {
      contentId: 'do_p',
      name: 'Notes',
      kind: null,
      mimeType: 'application/pdf',
      durationSec: null,
      path: [],
      reviewable: false,
      skipReason: 'PDFs come next',
    },
  ],
  competencies: [
    { competencyId: 'C1', name: 'Eclampsia', level: 2 },
    { competencyId: 'C2', name: 'Anaemia', level: null },
  ],
  positions: ['ANM'],
  defaults: { audience: 'ANM / ASHA frontline health workers', language: 'auto', domainStyle: 'plain' },
  estimateUsd: 0.12,
  activeReviewId: null,
  limits: { maxVideoMinutes: 30, maxActivePerUser: 2 },
  ...over,
})

const review = (over: Partial<IAiReview> = {}): IAiReview =>
  ({
    id: 'r1',
    courseId: 'do_1',
    courseName: 'Eclampsia care',
    status: 'running',
    requestedBy: { id: 'u1', name: 'Asha' },
    options: {} as IAiReview['options'],
    progress: { done: 0, total: 1 },
    queuePosition: 0,
    latestLog: '',
    log: [],
    items: [],
    result: null,
    error: null,
    costUsd: 0,
    estimateUsd: 0.12,
    createdAt: '2026-10-31T10:00:00Z',
    finishedAt: null,
    ...over,
  }) as IAiReview

describe('AiReviewPageComponent', () => {
  let api: Record<string, jest.Mock>
  let router: { navigate: jest.Mock }
  let query: Record<string, string>
  let hidden: boolean

  /** The page as a user finds it, with an audience picked (it starts empty, and Start needs one). */
  const create = (pickAudience = true): AiReviewPageComponent => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AiReviewService, useValue: api },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ courseId: 'do_1' }), queryParamMap: convertToParamMap(query) } },
        },
      ],
    })
    const c = TestBed.runInInjectionContext(() => new AiReviewPageComponent())
    if (pickAudience) {
      c.audience.set('ANM / ASHA frontline health workers')
    }
    return c
  }

  beforeEach(() => {
    jest.useFakeTimers()
    query = {}
    hidden = false
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
    api = {
      preview: jest.fn().mockReturnValue(of(preview())),
      history: jest.fn().mockReturnValue(of([])),
      start: jest.fn().mockReturnValue(of({ reviewId: 'r1', created: true, estimateUsd: 0.12 })),
      get: jest.fn().mockReturnValue(of(review({ status: 'done' }))),
      cancel: jest.fn().mockReturnValue(of({ cancelled: true })),
      reuse: jest.fn().mockReturnValue(of([])),
      measure: jest.fn().mockReturnValue(of([])),
      fracRole: jest.fn().mockReturnValue(of({ role: null, roleNote: null })),
    }
    router = { navigate: jest.fn() }
  })

  afterEach(() => {
    jest.useRealTimers()
    TestBed.resetTestingModule()
  })

  it('polls fast while running and slower deep in the queue', () => {
    expect(nextPollDelay({ status: 'running', queuePosition: 0 })).toBe(POLL_FAST_MS)
    expect(nextPollDelay({ status: 'queued', queuePosition: 1 })).toBe(POLL_FAST_MS)
    expect(nextPollDelay({ status: 'queued', queuePosition: 5 })).toBe(POLL_SLOW_MS)
  })

  it("maps the worker's stage onto the three pipeline steps", () => {
    expect(pipelineProgress({ status: 'queued', stage: null })).toBe(-1)
    expect(pipelineProgress({ status: 'running', stage: 'Downloading the video…' })).toBe(0)
    expect(pipelineProgress({ status: 'running', stage: 'Taking frames, transcribing and watching the video…' })).toBe(1)
    expect(pipelineProgress({ status: 'running', stage: 'Scoring 47 indicators…' })).toBe(2)
    expect(pipelineProgress({ status: 'running', stage: 'Judging against the competency level…' })).toBe(2)
    expect(pipelineProgress({ status: 'running', stage: null })).toBe(0)
    expect(pipelineProgress({ status: 'done', stage: null })).toBe(3)
    expect(pipelineProgress({ status: 'failed', stage: 'Scoring' })).toBe(-1)
  })

  describe('steps and live state', () => {
    it('moves from set up to review to report', () => {
      api.get.mockReturnValueOnce(of(review({ status: 'running' }))).mockReturnValue(of(review({ status: 'done' })))
      const c = create()
      expect(c.currentStep()).toBe('setup')
      c.follow('r1')
      expect(c.currentStep()).toBe('review')
      expect(c.currentStepIndex()).toBe(1)
      jest.advanceTimersByTime(POLL_FAST_MS)
      expect(c.currentStep()).toBe('report')
    })

    it("keeps the review's line in Past reviews current while it runs", () => {
      api.history.mockReturnValue(
        of([
          {
            id: 'r1',
            status: 'queued',
            requestedBy: { id: 'u1', name: 'Asha' },
            progress: { done: 0, total: 2 },
            summary: null,
            costUsd: 0,
            createdAt: '',
            finishedAt: null,
          },
        ]),
      )
      api.get.mockReturnValue(of(review({ status: 'running', progress: { done: 1, total: 2 } })))
      const c = create()
      c.ngOnInit()
      c.follow('r1')
      expect(c.history()[0].status).toBe('running')
      expect(c.history()[0].progress).toEqual({ done: 1, total: 2 })
    })
  })

  describe('setup', () => {
    it('loads the course and fills the defaults from it', () => {
      const c = create(false)
      c.ngOnInit()

      expect(api.preview).toHaveBeenCalledWith('do_1')
      expect(c.loadingPreview()).toBe(false)
      expect(c.domain()).toBe(true)
      expect(c.competencyId()).toBe('C1')
      expect(c.level()).toBe(2)
      // Left for the reviewer to pick, never guessed.
      expect(c.audience()).toBe('')
      expect(c.reviewable().map(r => r.contentId)).toEqual(['do_v'])
      expect(c.notReviewable().map(r => r.contentId)).toEqual(['do_p'])
      // Nothing is missing but the audience, which the reviewer picks.
      expect(c.validationMessage()).toMatch(/^Pick the audience/)
    })

    it('turns Domain review off on a course with no competency', () => {
      api.preview.mockReturnValue(of(preview({ competencies: [] })))
      const c = create()
      c.ngOnInit()
      expect(c.domain()).toBe(false)

      c.domain.set(true)
      expect(c.validationMessage()).toMatch(/no competency set/)
      expect(c.canJudge()).toBe(false)
    })

    it('lets a course with no competency be judged against one picked from the dictionary, at its own levels', () => {
      const catalog = [
        {
          competencyId: 'K9',
          name: 'Birth planning',
          levels: [
            { level: 1, label: 'Aware' },
            { level: 2, label: 'Plans with the family' },
          ],
        },
      ]
      api.preview.mockReturnValue(of(preview({ competencies: [], competencyCatalog: catalog })))
      const c = create()
      c.ngOnInit()
      expect(c.canJudge()).toBe(true)
      c.domain.set(true)
      expect(c.selectedCompetency()).toBeNull()

      c.selectCompetency('K9')
      expect(c.selectedCompetency()).toEqual({ competencyId: 'K9', name: 'Birth planning', level: null })
      expect(c.levelOptions()).toEqual([
        { value: '1', label: 'Level 1', hint: 'Aware' },
        { value: '2', label: 'Level 2', hint: 'Plans with the family' },
      ])
      expect(c.validationMessage()).toMatch(/domain review needs a level/)
      c.setLevel('2')
      expect(c.validationMessage()).toBe('')
      expect(c.buildOptions()).toMatchObject({ competencyId: 'K9', level: 2 })
    })

    it("chooses the course's competency and level by default, and lists the rest after it", () => {
      const catalog = [
        { competencyId: 'C1', name: 'Eclampsia', levels: [] },
        { competencyId: 'K9', name: 'Birth planning', levels: [] },
      ]
      api.preview.mockReturnValue(of(preview({ competencyCatalog: catalog })))
      const c = create()
      c.ngOnInit()
      expect(c.buildOptions()).toMatchObject({ competencyId: 'C1', level: 2 })
      expect(c.competencyOptions().map(o => [o.value, o.hint])).toEqual([
        ['C1', 'On this course · Level 2'],
        ['C2', 'On this course · no level mapped'],
        ['K9', undefined],
      ])
    })

    it('judges each part of a self-assessment course at its own level by default', () => {
      api.preview.mockReturnValue(
        of(
          preview({
            course: { id: 'do_1', name: 'Self assessment', status: 'Draft', versionKey: '1', selfAssessment: true },
            competencies: [{ competencyId: 'C1', name: 'Eclampsia', level: null }],
            resources: [
              {
                contentId: 'q1',
                name: 'Level 1 : Aware',
                kind: 'quiz',
                mimeType: 'application/json',
                durationSec: null,
                path: [],
                reviewable: true,
                skipReason: null,
                level: 1,
              },
              {
                contentId: 'q2',
                name: 'Level 2 : Plans',
                kind: 'quiz',
                mimeType: 'application/json',
                durationSec: null,
                path: [],
                reviewable: true,
                skipReason: null,
                level: 2,
              },
            ],
          }),
        ),
      )
      const c = create()
      c.ngOnInit()
      expect(c.levelMode()).toBe('perResource')
      expect(c.levelValue()).toBe('each')
      expect(c.levelOptions()[0]).toEqual({ value: 'each', label: 'Each part at its own level', hint: 'Levels 1, 2, from the part names' })
      expect(c.validationMessage()).toBe('')
      expect(c.buildOptions()).toMatchObject({ competencyId: 'C1', level: null, levelMode: 'perResource' })

      // One level for the whole course instead.
      c.setLevel('2')
      expect(c.levelMode()).toBe('single')
      expect(c.buildOptions()).toMatchObject({ level: 2, levelMode: 'single' })
      c.setLevel('each')
      expect(c.levelValue()).toBe('each')
    })

    it('judges a course mapped at several levels against all of them by default', () => {
      api.preview.mockReturnValue(
        of(preview({ competencies: [{ competencyId: 'P1', name: 'Pregnancy Identification', level: 1, levels: [1, 2] }] })),
      )
      const c = create()
      c.ngOnInit()
      expect(c.competencyOptions()[0]).toMatchObject({ value: 'P1', hint: 'On this course · Levels 1, 2' })
      expect(c.levelMode()).toBe('courseLevels')
      expect(c.levelValue()).toBe('course')
      expect(c.levelOptions()[0]).toEqual({ value: 'course', label: 'All course levels', hint: 'Levels 1, 2, together' })
      expect(c.validationMessage()).toBe('')
      expect(c.buildOptions()).toMatchObject({ competencyId: 'P1', level: null, levelMode: 'courseLevels' })

      c.setLevel('2')
      expect(c.buildOptions()).toMatchObject({ level: 2, levelMode: 'single' })
      c.setLevel('course')
      expect(c.levelMode()).toBe('courseLevels')
    })

    it('judges a course that maps several competencies against all of them, each at its levels, by default', () => {
      api.preview.mockReturnValue(
        of(
          preview({
            competencies: [
              { competencyId: '254', name: 'Pre, intra and post-op care', level: 3, levels: [3] },
              { competencyId: 'UP-C2', name: 'गर्भावस्था की पहचान', level: 1, levels: [1, 2, 3, 4] },
            ],
          }),
        ),
      )
      const c = create()
      c.ngOnInit()
      expect(c.allMapped()).toBe(true)
      expect(c.competencyValue()).toBe('__mapped__')
      expect(c.competencyOptions()[0]).toMatchObject({ value: '__mapped__', label: 'All competencies on the course' })
      expect(c.mappedSummary()).toEqual(['Pre, intra and post-op care · Level 3', 'गर्भावस्था की पहचान · Levels 1, 2, 3, 4'])
      expect(c.validationMessage()).toBe('')
      expect(c.buildOptions()).toMatchObject({ competencyId: null, level: null, levelMode: 'courseMapping' })

      // One competency on its own: its mapped levels together.
      c.selectCompetency('UP-C2')
      expect(c.allMapped()).toBe(false)
      expect(c.levelMode()).toBe('courseLevels')
      expect(c.buildOptions()).toMatchObject({ competencyId: 'UP-C2', levelMode: 'courseLevels' })

      c.selectCompetency('__mapped__')
      expect(c.buildOptions()).toMatchObject({ competencyId: null, levelMode: 'courseMapping' })
    })

    it('keeps one level for an ordinary course, with no per-part choice', () => {
      const c = create()
      c.ngOnInit()
      expect(c.levelMode()).toBe('single')
      expect(c.levelOptions().some(o => o.value === 'each')).toBe(false)
      expect(c.buildOptions()).toMatchObject({ level: 2, levelMode: 'single' })
    })

    it('offers "watch videos in full" only when the course has a video', () => {
      const c = create()
      c.ngOnInit()
      expect(c.hasVideos()).toBe(true)
      c.preview.update(p => p && { ...p, resources: p.resources.map(r => ({ ...r, kind: 'pdf', mimeType: 'application/pdf' })) })
      expect(c.hasVideos()).toBe(false)
    })

    it('words each reason the review cannot start', () => {
      const c = create()
      c.ngOnInit()

      c.addie.set(false)
      c.domain.set(false)
      expect(c.validationMessage()).toMatch(/Pick at least one review:/)

      c.domain.set(true)
      c.selectCompetency('C2')
      expect(c.level()).toBeNull()
      expect(c.validationMessage()).toMatch(/domain review needs a level/)

      c.setLevel('3')
      expect(c.validationMessage()).toBe('')
      c.setLevel('')
      expect(c.level()).toBeNull()
    })

    it('says so when nothing can be reviewed', () => {
      api.preview.mockReturnValue(of(preview({ resources: [] })))
      const c = create()
      c.ngOnInit()
      expect(c.validationMessage()).toMatch(/no resources that can be reviewed/)
    })

    it('stops a course with more resources than one review covers', () => {
      const c = create()
      c.ngOnInit()
      c.preview.update(p => p && { ...p, limits: { ...p.limits, maxResourcesPerReview: 0 } })
      expect(c.validationMessage()).toBe('')
      const many = Array.from({ length: 3 }, (_, i) => ({ ...c.reviewable()[0], contentId: `do_v${i}` }))
      c.preview.update(p => p && { ...p, resources: many, limits: { ...p.limits, maxResourcesPerReview: 2 } })
      expect(c.validationMessage()).toMatch(/3 resources are chosen; one review covers up to 2/)
    })

    it('lists the per-resource limits the service sends, and only those', () => {
      const c = create()
      c.ngOnInit()
      expect(c.limitsNote()).toBe('videos up to 30 min')
      c.preview.update(p => p && { ...p, limits: { ...p.limits, maxPdfPages: 320, maxQuizQuestions: 500 } })
      expect(c.limitsNote()).toBe('videos up to 30 min · PDFs up to 320 pages · quizzes and assessments up to 500 questions')
      c.preview.set(null)
      expect(c.limitsNote()).toBe('')
    })

    it('shows the error when the course cannot be read, and retries', () => {
      api.preview.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403 })))
      const c = create()
      c.ngOnInit()
      expect(c.previewError()).toMatch(/creator, reviewers and publishers/)

      c.reload()
      expect(c.previewError()).toBe('')
      expect(c.preview()).not.toBeNull()
    })

    it('when offline: says so, does not let a review start, and recovers by itself when back online', () => {
      api.preview.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })))
      const c = create()
      c.ngOnInit()
      window.dispatchEvent(new Event('offline'))
      expect(c.online()).toBe(false)
      expect(c.previewError()).toBeTruthy()

      window.dispatchEvent(new Event('online'))
      expect(c.online()).toBe(true)
      // The failed course read was retried without a reload.
      expect(c.previewError()).toBe('')
      expect(c.preview()).not.toBeNull()

      window.dispatchEvent(new Event('offline'))
      expect(c.validationMessage()).toMatch(/You're offline/)
      window.dispatchEvent(new Event('online'))
      expect(c.validationMessage()).toBe('')
    })

    it('lets a lost review be picked up again with Try again', () => {
      api.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })))
      const c = create()
      c.follow('r1')
      jest.advanceTimersByTime(2000 * 4)
      expect(c.pollError()).toMatch(/not available right now/)

      api.get.mockReturnValue(of(review({ status: 'done' })))
      c.retryFollow()
      expect(c.pollError()).toBe('')
      expect(c.review()?.status).toBe('done')
    })

    it('pauses following a running review while offline, and carries on when back', () => {
      const c = create()
      c.ngOnInit()
      api.get.mockReturnValueOnce(of(review({ status: 'running' }))).mockReturnValue(of(review({ status: 'done' })))
      c.follow('r1')
      window.dispatchEvent(new Event('offline'))
      jest.advanceTimersByTime(POLL_FAST_MS * 3)
      expect(api.get).toHaveBeenCalledTimes(1)
      expect(c.review()?.status).toBe('running')
      window.dispatchEvent(new Event('online'))
      expect(c.review()?.status).toBe('done')
    })

    it('still opens a linked review when the course read fails', () => {
      query = { review: 'r9' }
      api.preview.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })))
      const c = create()
      c.ngOnInit()
      expect(api.get).toHaveBeenCalledWith('r9')
    })

    it('updates the estimate as options are switched', () => {
      const est = { base: 0.01, addie: 0.04, domain: 0.09, watch: 0.03 }
      api.preview.mockReturnValue(
        of(preview({ estimateUsd: 9.99, resources: preview().resources.map(r => (r.reviewable ? { ...r, estimate: est } : r)) })),
      )
      const c = create()
      c.ngOnInit()
      expect(c.estimateUsd()).toBe(0.17)
      c.watch.set(false)
      expect(c.estimateUsd()).toBe(0.14)
      c.domain.set(false)
      expect(c.estimateUsd()).toBe(0.05)
      c.addie.set(false)
      expect(c.estimateUsd()).toBe(0)
    })

    it("falls back to the service's figure when it sends no breakdown", () => {
      const c = create()
      c.ngOnInit()
      expect(c.estimateUsd()).toBe(0.12)
    })

    it('names each resource kind, from the service or its mimetype', () => {
      const c = create()
      c.ngOnInit()
      expect(c.kindOf({ kind: 'assessment', mimeType: 'application/json' })).toBe('assessment')
      expect(c.kindOf({ kind: null, mimeType: 'application/pdf' })).toBe('pdf')
      expect(c.kindCounts().map(k => `${k.count} ${k.meta.label}`)).toEqual(['1 Video'])
      expect(c.competencyOptions()).toEqual([
        { value: 'C1', label: 'Eclampsia', hint: 'On this course · Level 2' },
        { value: 'C2', label: 'Anaemia', hint: 'On this course · no level mapped' },
      ])
      expect(c.levelOptions()[1]).toEqual({ value: '2', label: 'Level 2' })
    })

    it('builds the options, leaving the competency out without Domain review', () => {
      const c = create()
      c.ngOnInit()
      c.context.set('  rural clinics  ')
      expect(c.buildOptions()).toEqual({
        addie: true,
        domain: true,
        alignment: false,
        watch: true,
        domainStyle: 'plain',
        competencyId: 'C1',
        level: 2,
        levelMode: 'single',
        positionCode: null,
        audience: 'ANM / ASHA frontline health workers',
        language: 'auto',
        reportLanguage: 'en',
        context: 'rural clinics',
      })

      c.domain.set(false)
      expect(c.buildOptions().competencyId).toBeNull()
      expect(c.buildOptions().level).toBeNull()
    })
  })

  describe('choosing the resources', () => {
    const two = () =>
      preview({
        resources: [
          {
            contentId: 'do_v',
            name: 'BP video',
            kind: 'video',
            mimeType: 'video/mp4',
            durationSec: 36,
            path: [],
            reviewable: true,
            skipReason: null,
            estimate: { base: 0.01, addie: 0.05, domain: 0.1, watch: 0.02 },
          },
          {
            contentId: 'do_q',
            name: 'Quiz',
            kind: 'quiz',
            mimeType: 'application/json',
            durationSec: null,
            path: [],
            reviewable: true,
            skipReason: null,
            estimate: { base: 0.12, addie: 0.04, domain: 0.08, watch: 0 },
          },
        ],
      })

    it("reviews everything by default, and shows each resource's cost with the reviews chosen", () => {
      api.preview.mockReturnValue(of(two()))
      const c = create()
      c.ngOnInit()
      expect(c.allSelected()).toBe(true)
      expect(c.resourceCost(c.reviewable()[0])).toBe(0.18)
      expect(c.estimateUsd()).toBe(0.42)
      c.watch.set(false)
      expect(c.resourceCost(c.reviewable()[0])).toBe(0.16)
    })

    it('leaves a resource out of the total and of Start, and sends only the chosen ones', () => {
      api.preview.mockReturnValue(of(two()))
      const c = create()
      c.ngOnInit()
      c.toggleResource('do_q', false)
      expect(c.selected().map(r => r.contentId)).toEqual(['do_v'])
      expect(c.estimateUsd()).toBe(0.18)
      c.start()
      expect(api.start).toHaveBeenCalledWith('do_1', c.buildOptions(), ['do_v'])
    })

    it('sends no list when everything is chosen, and needs at least one', () => {
      api.preview.mockReturnValue(of(two()))
      const c = create()
      c.ngOnInit()
      c.selectAll(false)
      expect(c.validationMessage()).toBe('Tick at least one resource to review.')
      c.selectAll(true)
      c.start()
      expect(api.start).toHaveBeenCalledWith('do_1', c.buildOptions(), null)
    })
  })

  describe('audience', () => {
    it('starts empty and must be picked before the review can start', () => {
      const c = create(false)
      c.ngOnInit()
      expect(c.audience()).toBe('')
      expect(c.validationMessage()).toBe('Pick the audience: who the content is for (a position from the list, or type your own).')
      expect(c.judgedFor()).toBe('the audience you pick above')
      c.audience.set('ANM')
      expect(c.validationMessage()).toBe('')
    })
  })

  describe('course alignment', () => {
    const brief = {
      name: 'Eclampsia care',
      subtitle: 'For ANMs',
      description: 'Teaches ANMs to manage severe pre-eclampsia and eclampsia, and to refer the same day.',
    }

    it('is off until chosen, and can be the only review', () => {
      api.preview.mockReturnValue(
        of(preview({ course: { id: 'do_1', name: 'Eclampsia care', status: 'Draft', versionKey: '1', brief, briefProblem: null } })),
      )
      const c = create()
      c.ngOnInit()
      expect(c.alignment()).toBe(false)
      expect(c.canAlign()).toBe(true)
      c.addie.set(false)
      c.domain.set(false)
      expect(c.validationMessage()).toBe('Pick at least one review: the ADDIE checklist, the domain review or the course alignment check.')
      c.alignment.set(true)
      expect(c.validationMessage()).toBe('')
      expect(c.buildOptions()).toMatchObject({ addie: false, domain: false, alignment: true })
      expect(c.brief()).toEqual(brief)
    })

    it('cannot be chosen for a course without a description, and says where to add one', () => {
      const problem =
        'Add the course description in Course Details (its objectives, audience and key learning outcomes) to check the content against it.'
      api.preview.mockReturnValue(
        of(
          preview({
            course: {
              id: 'do_1',
              name: 'Eclampsia care',
              status: 'Draft',
              versionKey: '1',
              brief: { ...brief, description: '' },
              briefProblem: problem,
            },
          }),
        ),
      )
      const c = create()
      c.ngOnInit()
      expect(c.canAlign()).toBe(false)
      expect(c.briefProblem()).toBe(problem)
      c.alignment.set(true)
      expect(c.validationMessage()).toBe(problem)
    })

    it('says so on a server that cannot check it yet', () => {
      const c = create()
      c.ngOnInit()
      expect(c.canAlign()).toBe(false)
      expect(c.briefProblem()).toMatch(/cannot check alignment/)
    })
  })

  describe('start', () => {
    it('starts the review, follows it and puts its id in the URL', () => {
      const c = create()
      c.ngOnInit()
      c.start()

      expect(api.start).toHaveBeenCalledWith('do_1', c.buildOptions(), null)
      expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { review: 'r1' }, replaceUrl: true }))
      expect(api.get).toHaveBeenCalledWith('r1')
      expect(c.review()?.status).toBe('done')
      expect(c.starting()).toBe(false)
    })

    it("shows the service's refusal", () => {
      api.start.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({ status: 429, error: { error: { code: 'DAILY_LIMIT', message: "You have reached today's limit." } } }),
        ),
      )
      const c = create()
      c.ngOnInit()
      c.start()
      expect(c.startError()).toBe("You have reached today's limit.")
      expect(c.starting()).toBe(false)
    })

    it('does nothing while invalid or already starting', () => {
      const c = create()
      c.ngOnInit()
      c.addie.set(false)
      c.domain.set(false)
      c.start()
      expect(api.start).not.toHaveBeenCalled()

      c.addie.set(true)
      c.starting.set(true)
      c.start()
      expect(api.start).not.toHaveBeenCalled()
    })

    it('says so when Start joined a review already running, instead of starting another', () => {
      api.start.mockReturnValue(of({ reviewId: 'r9', created: false, estimateUsd: 0.12 }))
      const c = create()
      c.ngOnInit()
      c.start()
      expect(c.joinedNote()).toBe(JOINED_COURSE_REVIEW)
      expect(api.get).toHaveBeenCalledWith('r9')
    })

    it('after an unclear failure, follows the review if it had started after all, keeping the form as it was', () => {
      const c = create()
      c.ngOnInit()
      c.context.set('rural PHC')
      api.start.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 504 })))
      api.preview.mockReturnValue(of(preview({ activeReviewId: 'r7' })))
      api.history.mockClear()
      c.start()
      expect(api.history).toHaveBeenCalled()
      expect(api.get).toHaveBeenCalledWith('r7')
      expect(c.startError()).toBe('')
      expect(c.joinedNote()).toBe(STARTED_AFTER_ALL)
      expect(c.context()).toBe('rural PHC')
    })

    it('after a clear refusal, looks for nothing', () => {
      const c = create()
      c.ngOnInit()
      api.preview.mockClear()
      api.start.mockReturnValue(
        throwError(
          () => new HttpErrorResponse({ status: 400, error: { error: { code: 'NOTHING_TO_REVIEW', message: 'Nothing to review.' } } }),
        ),
      )
      c.start()
      expect(api.preview).not.toHaveBeenCalled()
      expect(c.startError()).toBe('Nothing to review.')
    })

    it('follows a review already running on the course instead of offering a new one', () => {
      api.preview.mockReturnValue(of(preview({ activeReviewId: 'r5' })))
      const c = create()
      c.ngOnInit()
      expect(api.get).toHaveBeenCalledWith('r5')
    })
  })

  describe('polling', () => {
    it('reads again after each delay until the review finishes', () => {
      api.get
        .mockReturnValueOnce(of(review({ status: 'queued', queuePosition: 1 })))
        .mockReturnValueOnce(of(review({ status: 'running', progress: { done: 1, total: 2 } })))
        .mockReturnValueOnce(of(review({ status: 'done', progress: { done: 2, total: 2 } })))
      const c = create()
      c.follow('r1')
      expect(c.isRunning()).toBe(true)
      expect(api.get).toHaveBeenCalledTimes(1)

      jest.advanceTimersByTime(POLL_FAST_MS)
      expect(c.review()?.progress).toEqual({ done: 1, total: 2 })

      api.history.mockClear()
      jest.advanceTimersByTime(POLL_FAST_MS)
      expect(c.isFinished()).toBe(true)
      expect(api.history).toHaveBeenCalled()

      jest.advanceTimersByTime(POLL_FAST_MS * 5)
      expect(api.get).toHaveBeenCalledTimes(3)
    })

    it('pauses while the tab is hidden', () => {
      api.get.mockReturnValueOnce(of(review({ status: 'running' }))).mockReturnValue(of(review({ status: 'done' })))
      const c = create()
      c.follow('r1')

      hidden = true
      jest.advanceTimersByTime(POLL_FAST_MS * 3)
      expect(api.get).toHaveBeenCalledTimes(1)

      hidden = false
      document.dispatchEvent(new Event('visibilitychange'))
      expect(api.get).toHaveBeenCalledTimes(2)
      expect(c.isFinished()).toBe(true)
    })

    it("does not ask again for a review that is gone or not the user's", () => {
      api.get.mockReturnValue(
        throwError(
          () => new HttpErrorResponse({ status: 404, error: { error: { code: 'NOT_FOUND', message: 'This review could not be found.' } } }),
        ),
      )
      const c = create()
      c.follow('r1')
      jest.advanceTimersByTime(2000 * 4)
      expect(api.get).toHaveBeenCalledTimes(1)
      expect(c.pollError()).toBe('This review could not be found.')
    })

    it('clears the review on screen when another is opened, so its report never shows under the new one', () => {
      const next = new Subject<IAiReview>()
      const c = create()
      c.follow('r1')
      expect(c.review()?.id).toBe('r1')
      api.get.mockReturnValue(next)
      c.follow('r2')
      expect(c.review()).toBeNull()
      expect(c.following()).toBe(true)
      next.next(review({ id: 'r2', status: 'done' }))
      expect(c.review()?.id).toBe('r2')
    })

    it('retries a failed read before giving up', () => {
      api.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 502 })))
      const c = create()
      c.follow('r1')
      jest.advanceTimersByTime(2000 * 4)
      expect(api.get).toHaveBeenCalledTimes(4)
      // The reason, not a vague "lost track": the service is down.
      expect(c.pollError()).toMatch(/not available right now/)
    })
  })

  describe('actions', () => {
    it('goes back to the setup form for another review', () => {
      const c = create()
      c.follow('r1')
      c.pollError.set('Lost track of this review.')
      c.newReview()
      expect(c.review()).toBeNull()
      expect(c.pollError()).toBe('')
      // Nothing left to follow: reconnecting does not reopen the old review.
      api.get.mockClear()
      c.retryFollow()
      expect(api.get).not.toHaveBeenCalled()
      expect(router.navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { review: null } }))
    })

    it('goes back to the course page', () => {
      const c = create()
      c.ngOnInit()
      c.backToCourse()
      expect(router.navigate).toHaveBeenCalledWith(['/author/toc', 'do_1', 'overview'])
    })

    it('shows a history error', () => {
      api.history.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })))
      const c = create()
      c.ngOnInit()
      expect(c.historyError()).toBe('Could not load past reviews.')

      api.history.mockReturnValue(of([]))
      c.loadHistory()
      expect(c.historyError()).toBe('')
    })

    it('shows past reviews as loading until they arrive, not as empty', () => {
      const list = new Subject<IAiReviewHistoryEntry[]>()
      api.history.mockReturnValue(list)
      const c = create()
      c.loadHistory()
      expect(c.loadingHistory()).toBe(true)
      list.next([])
      expect(c.loadingHistory()).toBe(false)
    })
  })

  describe('a review opened by its link', () => {
    it('shows the loading card, not the setup form, until the review is read', () => {
      const read = new Subject<IAiReview>()
      api.get.mockReturnValue(read)
      const c = create()
      c.follow('r1')
      expect(c.following()).toBe(true)
      read.next(review({ status: 'running' }))
      expect(c.following()).toBe(false)
      expect(c.currentStep()).toBe('review')
    })

    it('shows a failure on the very first read', () => {
      api.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })))
      const c = create()
      c.follow('r1')
      jest.advanceTimersByTime(10_000)
      expect(c.following()).toBe(false)
      expect(c.review()).toBeNull()
      expect(c.pollError()).toBeTruthy()
    })
  })

  describe('unchanged resources', () => {
    const settle = () => {
      TestBed.tick()
      jest.advanceTimersByTime(REUSE_CHECK_DEBOUNCE_MS)
    }

    it('asks once the settings settle, marks the unchanged resource, and leaves it out of the cost', () => {
      const c = create()
      c.ngOnInit()
      const before = c.estimateUsd()
      api.reuse.mockReturnValue(of([{ contentId: 'do_v', reviewedAt: '2026-10-30T09:00:00Z' }]))
      settle()

      expect(api.reuse).toHaveBeenCalledWith('do_1', expect.objectContaining({ addie: true, competencyId: 'C1', level: 2 }))
      expect(c.reused().get('do_v')).toBe('2026-10-30T09:00:00Z')
      expect(c.reusedCount()).toBe(1)
      // The only reviewable resource is unchanged, so nothing is spent.
      expect(before).toBeGreaterThan(0)
      expect(c.estimateUsd()).toBe(0)
    })

    it('asks again when a setting that decides the match changes, but not per keystroke', () => {
      const c = create()
      c.ngOnInit()
      settle()
      api.reuse.mockClear()
      c.audience.set('A')
      TestBed.tick()
      c.audience.set('AS')
      TestBed.tick()
      c.audience.set('ASHA')
      settle()
      expect(api.reuse).toHaveBeenCalledTimes(1)
      expect(api.reuse).toHaveBeenLastCalledWith('do_1', expect.objectContaining({ audience: 'ASHA' }))
    })

    it('does not ask while the settings cannot start a review, and treats a failed check as none reused', () => {
      const c = create()
      c.ngOnInit()
      c.addie.set(false)
      c.domain.set(false)
      settle()
      expect(api.reuse).not.toHaveBeenCalled()

      api.reuse.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })))
      c.addie.set(true)
      settle()
      expect(c.reused().size).toBe(0)
    })
  })

  describe('what the setup screen claims', () => {
    it('leaves out a resource measured past a size limit, saying why', () => {
      api.preview.mockReturnValue(
        of(
          preview({
            resources: [
              {
                contentId: 'do_p',
                name: 'Big',
                kind: 'pdf',
                mimeType: 'application/pdf',
                durationSec: null,
                path: [],
                reviewable: true,
                skipReason: null,
              },
            ],
          }),
        ),
      )
      api.measure.mockReturnValue(
        of([
          {
            contentId: 'do_p',
            pages: 400,
            estimate: { base: 0, addie: 0.24, domain: 3.35, watch: 0 },
            skipReason: 'This PDF has 400 pages',
          },
        ]),
      )
      const c = create()
      c.ngOnInit()
      expect(c.reviewable()).toEqual([])
      expect(c.notReviewable()[0]).toMatchObject({ contentId: 'do_p', skipReason: 'This PDF has 400 pages' })
      expect(c.validationMessage()).toMatch(/no resources that can be reviewed/)
    })

    it('chooses the competency the course maps at a level, not one listed without a level', () => {
      api.preview.mockReturnValue(
        of(
          preview({
            competencies: [
              { competencyId: 'A', name: 'A', level: null, levels: [] },
              { competencyId: 'B', name: 'B', level: 2, levels: [2] },
            ],
          }),
        ),
      )
      const c = create()
      c.ngOnInit()
      expect(c.buildOptions()).toMatchObject({ competencyId: 'B', level: 2 })
    })

    it('says when the competency or position lists could not be loaded', () => {
      api.preview.mockReturnValue(of(preview({ lookupErrors: ['positions'] })))
      const c = create()
      c.ngOnInit()
      expect(c.lookupFailed().has('positions')).toBe(true)
      expect(c.lookupFailed().has('competencies')).toBe(false)
    })

    it("flags a level that is not one of the competency's levels", () => {
      const c = create()
      c.ngOnInit()
      expect(c.levelKnown()).toBe(true)
      c.setLevel('9')
      expect(c.levelKnown()).toBe(false)
    })

    it('shows parts with no level of their own, and prices no domain review for them without a fallback level', () => {
      api.preview.mockReturnValue(
        of(
          preview({
            course: { id: 'do_1', name: 'SA', status: 'Draft', versionKey: '1', selfAssessment: true },
            competencies: [{ competencyId: 'C1', name: 'E', level: null, levels: [] }],
            resources: [
              {
                contentId: 'q1',
                name: 'Level 1 : A',
                kind: 'quiz',
                mimeType: 'application/json',
                durationSec: null,
                path: [],
                reviewable: true,
                skipReason: null,
                level: 1,
                estimate: { base: 0.2, addie: 0.04, domain: 0.15, watch: 0 },
              },
              {
                contentId: 'q0',
                name: 'Intro quiz',
                kind: 'quiz',
                mimeType: 'application/json',
                durationSec: null,
                path: [],
                reviewable: true,
                skipReason: null,
                level: null,
                estimate: { base: 0.2, addie: 0.04, domain: 0.15, watch: 0 },
              },
            ],
          }),
        ),
      )
      const c = create()
      c.ngOnInit()
      expect(c.levelMode()).toBe('perResource')
      expect(c.unlevelledParts().map(r => r.contentId)).toEqual(['q0'])
      // No fallback level: the intro quiz gets no domain review, so no domain cost.
      expect(c.estimateUsd()).toBe(0.63)
      c.setLevel('2')
      c.setLevel('each')
      expect(c.level()).toBe(2)
      expect(c.estimateUsd()).toBe(0.78)
    })
  })

  describe('the line under the Competency field', () => {
    const twoMapped = () =>
      preview({
        competencies: [
          { competencyId: '254', name: 'Pre, intra and post-op care', level: 3, levels: [3] },
          { competencyId: 'UP-C2', name: 'Pregnancy identification', level: 1, levels: [1, 2, 3, 4] },
        ],
        competencyCatalog: [{ competencyId: 'AM', name: 'AMTSL', levels: [{ level: 2, label: 'Applies' }] }],
      })

    it('describes every choice as it is', () => {
      api.preview.mockReturnValue(of(twoMapped()))
      const c = create()
      c.ngOnInit()
      expect(c.competencyHint()).toBe(
        'Both competencies on the course are used, each at the levels it is mapped at. To judge against just one, or a different competency, pick it from the list.',
      )

      c.selectCompetency('UP-C2')
      expect(c.competencyHint()).toBe(
        'Only this course competency is judged at its mapped levels (1, 2, 3, 4). To include the others, pick "All competencies on the course".',
      )
      c.setLevel('2')
      expect(c.competencyHint()).toBe(
        'Only this course competency is judged at Level 2. To include the others, pick "All competencies on the course".',
      )

      c.selectCompetency('AM')
      expect(c.competencyHint()).toBe(
        'This competency is not mapped on the course, so pick the level to judge against. To go back, pick one of the course\'s competencies or "All competencies on the course".',
      )
    })

    it("says the course's only competency was chosen for you", () => {
      const c = create()
      c.ngOnInit()
      // The default fixture: one course competency at Level 2.
      c.preview.update(p => p && { ...p, competencies: [{ competencyId: 'C1', name: 'Eclampsia', level: 2, levels: [2] }] })
      expect(c.competencyHint()).toBe(
        "The course's competency is chosen for you at its mapped level (2). Pick another to judge against a different one.",
      )
    })
  })

  describe('FRAC role check', () => {
    const settle = () => {
      TestBed.tick()
      jest.advanceTimersByTime(REUSE_CHECK_DEBOUNCE_MS)
    }
    const role = {
      positionCode: 'ANM',
      positionName: 'ANM',
      totalActivities: 12,
      activities: [
        {
          role: 'Antenatal care provider',
          activity: 'Identify pregnancy at first visit',
          description: '',
          competency: 'Eclampsia',
          levels: [1, 2],
        },
      ],
    }
    const withPositions = () =>
      preview({
        positionList: [
          { code: 'ANM', name: 'ANM' },
          { code: 'SN', name: 'Staff Nurse' },
        ],
      })

    it('takes the position code from the audience picked, and only from the list', () => {
      api.preview.mockReturnValue(of(withPositions()))
      const c = create()
      c.ngOnInit()
      c.audience.set(' anm ')
      expect(c.position()).toEqual({ code: 'ANM', name: 'ANM' })
      expect(c.buildOptions().positionCode).toBe('ANM')
      c.audience.set('Block health officer')
      expect(c.position()).toBeNull()
      expect(c.buildOptions().positionCode).toBeNull()
    })

    it("reads the position's activities in the FRAC style only, as settings settle", () => {
      api.preview.mockReturnValue(of(withPositions()))
      api.fracRole.mockReturnValue(of({ role, roleNote: null }))
      const c = create()
      c.ngOnInit()
      c.audience.set('ANM')
      settle()
      expect(api.fracRole).not.toHaveBeenCalled()

      c.domainStyle.set('frac')
      settle()
      expect(api.fracRole).toHaveBeenCalledWith('do_1', expect.objectContaining({ domainStyle: 'frac', positionCode: 'ANM' }))
      expect(c.roleCheck()).toEqual({ role, roleNote: null })
      expect(c.roleChecking()).toBe(false)
    })

    it('names the setting still missing in the role panel, only in the FRAC style', () => {
      api.preview.mockReturnValue(of(withPositions()))
      const c = create()
      c.ngOnInit()
      c.domainStyle.set('frac')
      c.levelMode.set('single')
      c.level.set(null)
      expect(c.roleWaiting()).toMatch(/needs a level/)
      c.domainStyle.set('plain')
      expect(c.roleWaiting()).toBe('')
    })

    it('gives up on a slow FRAC read with a note, instead of waiting forever', () => {
      api.preview.mockReturnValue(of(withPositions()))
      api.fracRole.mockReturnValue(NEVER)
      const c = create()
      c.ngOnInit()
      c.audience.set('ANM')
      c.domainStyle.set('frac')
      settle()
      expect(c.roleChecking()).toBe(true)
      jest.advanceTimersByTime(ROLE_CHECK_TIMEOUT_MS)
      expect(c.roleChecking()).toBe(false)
      expect(c.roleCheck()?.roleNote).toMatch(/took too long to load/)
    })

    it('says why there are no activities, and treats a failed read as a note, not as none', () => {
      api.preview.mockReturnValue(of(withPositions()))
      api.fracRole.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 502 })))
      const c = create()
      c.ngOnInit()
      c.audience.set('ANM')
      c.domainStyle.set('frac')
      settle()
      expect(c.roleCheck()).toEqual({ role: null, roleNote: 'The FRAC role data could not be read just now.' })
    })
  })

  describe('review again', () => {
    it('starts from the settings of the review on screen', () => {
      const c = create()
      c.ngOnInit()
      c.review.set(
        review({
          status: 'done',
          options: {
            addie: false,
            domain: true,
            watch: false,
            domainStyle: 'frac',
            competencyId: 'C1',
            level: 3,
            levelMode: 'single',
            audience: 'Staff Nurse',
            language: 'hi',
            context: 'rural',
            competency: null,
          } as IAiReview['options'],
        }),
      )
      c.newReview()
      expect(c.review()).toBeNull()
      expect(c.buildOptions()).toMatchObject({
        addie: false,
        domain: true,
        // Videos are always watched in full now, even when the earlier review had it off.
        watch: true,
        // FRAC is hidden for now (utils/features.ts): an earlier FRAC review runs again as Plain.
        domainStyle: 'plain',
        competencyId: 'C1',
        level: 3,
        audience: 'Staff Nurse',
        language: 'hi',
        context: 'rural',
      })
    })
  })

  describe('pages and questions', () => {
    const withDocs = () =>
      preview({
        resources: [
          {
            contentId: 'do_p',
            name: 'Notes',
            kind: 'pdf',
            mimeType: 'application/pdf',
            durationSec: 600,
            path: [],
            reviewable: true,
            skipReason: null,
            estimate: { base: 0, addie: 0.055, domain: 0.39, watch: 0 },
          },
          {
            contentId: 'do_q',
            name: 'Quiz',
            kind: 'quiz',
            mimeType: 'application/json',
            durationSec: 600,
            path: [],
            reviewable: true,
            skipReason: null,
            estimate: { base: 0.2, addie: 0.04, domain: 0.15, watch: 0 },
          },
        ],
      })

    it('keeps a video with no sound in the review, and says above the list that it is judged on what it shows', () => {
      api.measure.mockReturnValue(
        of([
          {
            contentId: 'do_v',
            durationSec: 36,
            audio: false,
            estimate: { base: 0, addie: 0.03, domain: 0.08, watch: 0.01 },
          },
        ]),
      )
      const c = create()
      c.ngOnInit()
      expect(c.reviewable().map(r => r.contentId)).toEqual(['do_v'])
      expect(c.selected().map(r => r.contentId)).toEqual(['do_v'])
      expect(c.silentVideos().map(r => r.contentId)).toEqual(['do_v'])
      expect(c.silentVideos().map(r => r.name)).toEqual(['BP video'])
    })

    it('counts them after the preview, and prices the review at those sizes', () => {
      api.preview.mockReturnValue(of(withDocs()))
      api.measure.mockReturnValue(
        of([
          { contentId: 'do_p', pages: 1, estimate: { base: 0, addie: 0.04, domain: 0.1, watch: 0 } },
          { contentId: 'do_q', questions: 12, estimate: { base: 0.2, addie: 0.04, domain: 0.15, watch: 0 } },
        ]),
      )
      const c = create()
      c.ngOnInit()
      expect(api.measure).toHaveBeenCalledWith('do_1')
      expect(c.sizeLabel('do_p')).toBe('1 page')
      expect(c.sizeLabel('do_q')).toBe('12 questions')
      expect(c.sizeLabel('do_unknown')).toBe('')
      expect(c.measuring()).toBe(false)
      expect(c.estimateUsd()).toBe(0.53)
    })

    it('keeps the assumed estimate when counting fails', () => {
      api.preview.mockReturnValue(of(withDocs()))
      api.measure.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 504 })))
      const c = create()
      c.ngOnInit()
      expect(c.measuring()).toBe(false)
      expect(c.estimateUsd()).toBe(0.84)
    })

    it('stops counting after a while, keeping the assumed estimate', () => {
      api.preview.mockReturnValue(of(withDocs()))
      api.measure.mockReturnValue(NEVER)
      const c = create()
      c.ngOnInit()
      expect(c.measuring()).toBe(true)
      jest.advanceTimersByTime(MEASURE_TIMEOUT_MS)
      expect(c.measuring()).toBe(false)
      expect(c.estimateUsd()).toBe(0.84)
    })

    it('checks a course of videos only too, for whether each video has sound', () => {
      create().ngOnInit()
      expect(api.measure).toHaveBeenCalledWith('do_1')
    })
  })

  it('judges for the audience picked, and never shows a guessed one while it is empty', () => {
    const c = create()
    c.ngOnInit()
    expect(c.judgedFor()).toBe('ANM / ASHA frontline health workers')
    c.audience.set('ANM')
    expect(c.judgedFor()).toBe('ANM')
    c.audience.set('  ')
    expect(c.judgedFor()).toBe('the audience you pick above')
  })

  it('labels statuses and durations for people', () => {
    const c = create()
    expect(c.statusLabel('queued')).toBe('Waiting to start')
    expect(c.statusLabel('mystery')).toBe('mystery')
    expect(c.formatDuration(36)).toBe('36 s')
    expect(c.formatDuration(125)).toBe('2 min 5 s')
    expect(c.formatDuration(600)).toBe('10 min')
    expect(c.formatDuration(null)).toBe('')
  })
})

describe('the AI Studio look of the review pages', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs') as typeof import('fs')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path') as typeof import('path')
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, rel), 'utf8')
  const pages = ['ai-review-page.component.html', '../ai-review-files-page/ai-review-files-page.component.html']

  it.each(pages)('shows past reviews as AI Studio history rows (%s)', file => {
    const html = read(file)
    expect(html).toContain('class="air-history-ico"')
    expect(html).toContain('class="air-history-body"')
    expect(html).toContain('<span class="air-history-go" aria-hidden="true"><ws-auth-air-icon name="arrowRight" [size]="16" /></span>')
    expect(html).toContain('>CBP {{ h.summary.addie.scorePct }}%<')
    expect(html).toContain('>Domain {{ d.yes }}/{{ d.applicable }}<')
    expect(html).not.toContain('>ADDIE {{')
  })

  it.each(pages)('has the light AI Studio masthead, without the old orb (%s)', file => {
    const html = read(file)
    expect(html).toContain('class="air-hero"')
    expect(html).not.toContain('air-hero-art')
  })

  it.each(pages)('draws the step tick at the size its dot centres (%s)', file => {
    expect(read(file)).toMatch(
      /<span class="air-step-dot">\s*@if \(i < currentStepIndex\(\)\) \{\s*<ws-auth-air-icon name="check" \[size\]="13" \/>/,
    )
  })

  it.each(pages)('no longer asks for the spoken language or whether to watch videos (%s)', file => {
    const html = read(file)
    expect(html).not.toContain('Spoken language')
    expect(html).not.toContain('Watch videos in full')
    expect(html).not.toContain('air-switch')
  })

  it.each(pages)('says plainly what Plain and FRAC each check (%s)', file => {
    const html = read(file)
    expect(html).toContain('<b>Is it correct?</b> A senior clinician checks it teaches what this level describes')
    // Plain judges depth and work setting against the audience (D5, D6), not just tone.
    expect(html).toContain('at the right depth for your audience and in their real work setting.')
    expect(html).not.toContain('tone only')
    expect(html).toContain('<b>Is it pitched right for the role?</b> A FRAC expert checks it sits at this level')
    // Without activities for this competency, D5 and D6 fall back to the audience.
    expect(html).toContain('prepares the position for its FRAC activities (when it has none for this competency: suits your audience).')
    // FRAC checks clinical accuracy itself (D7), so it is covered with the checklist off.
    expect(html).toContain('Says which level it really fits. It also checks protocols, thresholds and doses are correct.')
    expect(html).not.toContain('does not check clinical accuracy')
  })

  it.each(pages)('hides the Plain/FRAC choice while FRAC is not offered, keeping it behind the switch (%s)', file => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AI_REVIEW_FRAC_ENABLED } = require('../../utils/features') as typeof import('../../utils/features')
    expect(AI_REVIEW_FRAC_ENABLED).toBe(false)
    const html = read(file)
    expect(html).toMatch(/@if \(fracEnabled\) \{\s*<fieldset class="air-segment">/)
    expect(html).toContain('} @else if (position() && fracEnabled) {')
  })

  it('points to Course Details, where the course name, description and competencies are edited', () => {
    const html = read('ai-review-page.component.html')
    expect(html).not.toContain('Course Settings')
    expect(html).toContain('From Course Details: the name and subtitle (Basic Information) and the Course Description.')
    expect(html).toContain('Add a competency in Course Details (the Competencies card) to turn this on.')
  })

  it('keeps the page from scrolling sideways, and repaints nothing on scroll', () => {
    const scss = read('ai-review-page.component.scss')
    expect(scss).toContain('overflow-x: clip;')
    expect(scss).not.toContain('background-attachment: fixed')
    expect(scss).toContain('inset: -40px 0 auto;')
  })

  it('gives the gradient title room for Devanagari letters that rise above the line', () => {
    const title = read('ai-review-page.component.scss').split('.air-title {')[1].split('\n}')[0]
    expect(title).toContain('background-clip: text;')
    expect(title).toContain('line-height: 1.4;')
    expect(title).toContain('padding: 0.12em 0 0.08em;')
  })
})
