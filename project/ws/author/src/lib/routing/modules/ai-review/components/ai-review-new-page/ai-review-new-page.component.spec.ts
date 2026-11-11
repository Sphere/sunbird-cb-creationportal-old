import { HttpErrorResponse } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router'
import { NEVER, Observable, Subject, of, throwError } from 'rxjs'
import { IAiReview, IAiReviewCheckedUpload, IAiReviewSignedFile, IAiReviewUploadContext } from '../../models/ai-review.model'
import { AiReviewService } from '../../services/ai-review.service'
import { readQuizSheet } from '../../utils/upload-files'
import { REUSE_CHECK_DEBOUNCE_MS } from '../ai-review-course-page/ai-review-course-page.component'
import {
  AiReviewNewPageComponent,
  CHECK_RETRIES,
  CHECK_RETRY_MS,
  JOINED_FILE_REVIEW,
  StorageUploadError,
  UPLOAD_CONCURRENCY,
  storageMessage,
} from './ai-review-new-page.component'

/** Every wait of the check's retries, which grow by CHECK_RETRY_MS each time. */
const ALL_CHECK_RETRIES_MS = (CHECK_RETRY_MS * CHECK_RETRIES * (CHECK_RETRIES + 1)) / 2

jest.mock('file-saver', () => ({ saveAs: jest.fn() }))
jest.mock('xlsx', () => ({ utils: {}, read: jest.fn() }))
jest.mock('../../utils/upload-files', () => ({
  ...jest.requireActual('../../utils/upload-files'),
  readQuizSheet: jest.fn(),
}))

const MB = 1024 * 1024

const context = (over: Partial<IAiReviewUploadContext> = {}): IAiReviewUploadContext => ({
  enabled: true,
  competencyCatalog: [
    { competencyId: 'C1', name: 'Eclampsia', levels: [{ level: 2, label: 'Manages severe pre-eclampsia' }] },
    {
      competencyId: 'C2',
      name: 'Anaemia',
      levels: [
        { level: 1, label: 'Knows' },
        { level: 2, label: 'Does' },
      ],
    },
  ],
  positionList: [{ code: 'ANM', name: 'ANM' }],
  lookupErrors: [],
  defaults: { audience: 'ANM / ASHA frontline health workers', language: 'auto', domainStyle: 'plain' },
  accepted: {
    video: { extensions: ['.mp4'], maxBytes: 300 * MB },
    pdf: { extensions: ['.pdf'], maxBytes: 300 * MB },
    quiz: { extensions: ['.xlsx'], maxBytes: 5 * MB },
    assessment: { extensions: ['.xlsx'], maxBytes: 5 * MB },
    html: { extensions: ['.zip'], maxBytes: 200 * MB },
  },
  limits: { maxVideoMinutes: 30, maxActivePerUser: 2, maxUploadFiles: 4 },
  ...over,
})

const signed = (uploadId: string, kind: IAiReviewSignedFile['kind'] = 'video'): IAiReviewSignedFile => ({
  uploadId,
  fileName: 'f',
  kind,
  contentType: 'video/mp4',
  maxBytes: 300 * MB,
  upload: { method: 'POST', url: 'https://bucket/', fields: {}, headers: {}, expiresAt: '' },
})

const checked = (uploadId: string, over: Partial<IAiReviewCheckedUpload> = {}): IAiReviewCheckedUpload => ({
  uploadId,
  fileName: 'f',
  kind: 'video',
  status: 'ready',
  reason: null,
  bytes: 3,
  durationSec: 36,
  estimate: { base: 0.01, addie: 0.05, domain: 0.1, watch: 0.2 },
  ...over,
})

const review = (over: Partial<IAiReview> = {}): IAiReview =>
  ({
    id: 'r1',
    source: 'upload',
    title: 'BP drafts',
    courseId: null,
    courseName: 'BP drafts',
    status: 'done',
    requestedBy: { id: 'u1', name: 'Asha' },
    options: {
      addie: true,
      domain: true,
      watch: false,
      domainStyle: 'frac',
      competencyId: 'C2',
      level: 1,
      audience: 'ANM',
      language: 'hi',
      context: 'rural PHC',
      competency: null,
    },
    progress: { done: 1, total: 1 },
    queuePosition: 0,
    latestLog: '',
    log: [],
    items: [],
    result: null,
    error: null,
    costUsd: 0,
    estimateUsd: 0,
    createdAt: '2026-11-03T10:00:00Z',
    finishedAt: null,
    ...over,
  }) as IAiReview

const file = (name: string, size = 3): File => {
  const f = new File(['x'.repeat(size)], name)
  return f
}

const flush = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('AiReviewNewPageComponent', () => {
  let api: Record<string, jest.Mock>
  let router: { navigate: jest.Mock }
  let query: Record<string, string>
  let n: number

  const create = (pickAudience = true): AiReviewNewPageComponent => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AiReviewService, useValue: api },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
      ],
    })
    const c = TestBed.runInInjectionContext(() => new AiReviewNewPageComponent())
    c.ngOnInit()
    // The audience starts empty and Start needs one: picked here as a user would.
    if (pickAudience) {
      c.audience.set('ANM / ASHA frontline health workers')
    }
    return c
  }

  beforeEach(() => {
    jest.useFakeTimers()
    query = {}
    n = 0
    api = {
      uploadContext: jest.fn().mockReturnValue(of(context())),
      uploadHistory: jest.fn().mockReturnValue(of([])),
      signUploads: jest.fn().mockImplementation((files: { kind: IAiReviewSignedFile['kind'] }[]) => of([signed(`u${++n}`, files[0].kind)])),
      uploadFile: jest.fn().mockReturnValue(of(40, 100)),
      checkUploads: jest.fn().mockImplementation((ids: string[]) => of({ uploads: [checked(ids[0])], estimateUsd: 0 })),
      uploadFracRole: jest.fn().mockReturnValue(of({ role: null, roleNote: null })),
      changeUploadKind: jest
        .fn()
        .mockImplementation((id: string, kind: IAiReviewSignedFile['kind']) => of({ ...checked(id), kind, questions: 14 })),
      startUploadReview: jest.fn().mockReturnValue(of({ reviewId: 'r1', created: true, estimateUsd: 0.36 })),
      get: jest.fn().mockReturnValue(of(review())),
    }
    router = { navigate: jest.fn() }
    ;(readQuizSheet as jest.Mock).mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
    TestBed.resetTestingModule()
  })

  describe('opening the page', () => {
    it('loads the setup and the past reviews, taking the defaults', () => {
      const c = create(false)
      expect(c.enabled()).toBe(true)
      expect(c.audience()).toBe('')
      expect(c.domain()).toBe(true)
      expect(c.maxFiles()).toBe(4)
      expect(api.uploadHistory).toHaveBeenCalled()
      expect(c.currentStep()).toBe('setup')
    })

    it('says when the file review is switched off, and takes no files', () => {
      api.uploadContext.mockReturnValue(of(context({ enabled: false })))
      const c = create()
      expect(c.enabled()).toBe(false)
      c.addFiles([file('bp.mp4')])
      expect(c.entries()).toEqual([])
      expect(c.validationMessage()).toBe('')
    })

    it('turns the domain review off when the competency list could not be read', () => {
      api.uploadContext.mockReturnValue(of(context({ competencyCatalog: [], lookupErrors: ['competencies'] })))
      const c = create()
      expect(c.domain()).toBe(false)
      expect(c.canJudge()).toBe(false)
    })

    it('shows a failed load with a retry, and retries when back online', () => {
      api.uploadContext.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })))
      const c = create()
      expect(c.contextError()).toMatch(/not available right now/)
      window.dispatchEvent(new Event('online'))
      expect(c.contextError()).toBe('')
      expect(c.context()).not.toBeNull()
    })

    it('reloads the setup and the past reviews together when both failed', () => {
      const down = (): Observable<never> => throwError(() => new HttpErrorResponse({ status: 404 }))
      api.uploadContext.mockReturnValueOnce(down())
      api.uploadHistory.mockReturnValueOnce(down())
      const c = create()
      expect(c.contextError()).toMatch(/not available on this server yet/)
      expect(c.historyError()).toMatch(/not available on this server yet/)
      c.retryLoad()
      expect(c.contextError()).toBe('')
      expect(c.historyError()).toBe('')
      expect(c.context()).not.toBeNull()
    })

    it('follows the review named in the link', () => {
      query = { review: 'r9' }
      const c = create()
      expect(api.get).toHaveBeenCalledWith('r9')
      expect(c.review()?.id).toBe('r1')
      expect(c.currentStep()).toBe('report')
    })
  })

  describe('adding files', () => {
    it('uploads each file, then shows it ready with what the check measured', () => {
      const c = create()
      c.addFiles([file('bp.mp4')])
      const [e] = c.entries()
      expect(api.signUploads).toHaveBeenCalledWith([{ name: 'bp.mp4', size: 3, kind: 'video' }])
      expect(api.uploadFile).toHaveBeenCalledWith(signed('u1').upload, expect.any(File))
      expect(api.checkUploads).toHaveBeenCalledWith(['u1'])
      expect(e).toMatchObject({ state: 'ready', uploadId: 'u1', progress: 100, problem: null })
      expect(c.measuredLine(e)).toBe('36 s')
      expect(c.stateLabel(e)).toBe('Ready')
      expect(c.uploadStatus()).toBe('1 of 1 file ready')
    })

    it('refuses a file the review does not take, without uploading it', () => {
      const c = create()
      c.addFiles([file('deck.pptx'), file('empty.pdf', 0)])
      expect(c.entries().map(e => [e.state, e.problem?.slice(0, 20)])).toEqual([
        ['rejected', 'Not a file the revie'],
        ['rejected', 'This file is empty.'],
      ])
      expect(api.signUploads).not.toHaveBeenCalled()
      expect(c.validationMessage()).toBe('None of these files can be reviewed. Remove them and add others.')
    })

    it('skips a file already in the list and stops at the limit, saying so', () => {
      const c = create()
      const bp = file('bp.mp4')
      c.addFiles([bp])
      c.addFiles([bp, file('a.pdf'), file('b.pdf'), file('c.pdf'), file('d.pdf')])
      expect(c.entries().map(e => e.name)).toEqual(['bp.mp4', 'a.pdf', 'b.pdf', 'c.pdf'])
      expect(c.addNote()).toBe('1 file was already in the list. One review covers up to 4 files, so 1 file was not added.')
    })

    it(`sends ${UPLOAD_CONCURRENCY} files at a time, starting the next as one finishes`, () => {
      api.uploadContext.mockReturnValue(of(context({ limits: { maxVideoMinutes: 30, maxActivePerUser: 2, maxUploadFiles: 10 } })))
      const pending = Array.from({ length: 5 }, () => new Subject<number>())
      let i = 0
      api.uploadFile.mockImplementation(() => pending[i++])
      const c = create()
      c.addFiles(['a', 'b', 'c', 'd', 'e'].map(x => file(`${x}.mp4`)))
      expect(api.signUploads).toHaveBeenCalledTimes(UPLOAD_CONCURRENCY)
      expect(c.entries().filter(e => e.state === 'waiting')).toHaveLength(2)
      expect(c.validationMessage()).toBe('Wait for the files to finish uploading and being checked.')

      pending[0].next(50)
      expect(c.entries()[0]).toMatchObject({ state: 'uploading', progress: 50 })
      expect(c.stateLabel(c.entries()[0])).toBe('Uploading · 50%')
      pending[0].next(100)
      pending[0].complete()
      expect(c.entries()[0].state).toBe('ready')
      expect(api.signUploads).toHaveBeenCalledTimes(4)
    })

    it('marks a file storage refused as failed, and sends it again on retry', () => {
      api.uploadFile.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403 })))
      const c = create()
      c.addFiles([file('bp.mp4')])
      const [e] = c.entries()
      expect(e.state).toBe('failed')
      expect(e.problem).toMatch(/upload link may have expired/)
      expect(c.stateLabel(e)).toBe('Upload failed')

      c.retryFile(e.key)
      expect(c.entries()[0].state).toBe('ready')
      expect(api.signUploads).toHaveBeenCalledTimes(2)
    })

    it("shows the service's own words when it refuses to sign (a daily limit)", () => {
      api.signUploads.mockReturnValueOnce(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 429,
              error: { error: { code: 'UPLOAD_DAILY_LIMIT', message: 'You can upload up to 100 files a day.' } },
            }),
        ),
      )
      const c = create()
      c.addFiles([file('bp.mp4')])
      expect(c.entries()[0]).toMatchObject({ state: 'failed', problem: 'You can upload up to 100 files a day.' })
    })

    it('shows why the service cannot review a file it checked', () => {
      api.checkUploads.mockReturnValue(
        of({ uploads: [checked('u1', { status: 'rejected', reason: 'Longer than 30 minutes.' })], estimateUsd: 0 }),
      )
      const c = create()
      c.addFiles([file('long.mp4')])
      expect(c.entries()[0]).toMatchObject({ state: 'rejected', problem: 'Longer than 30 minutes.' })
    })

    it('checks again while storage has not shown the file yet', () => {
      api.checkUploads
        .mockReturnValueOnce(of({ uploads: [checked('u1', { status: 'pending' })], estimateUsd: 0 }))
        .mockReturnValueOnce(of({ uploads: [], estimateUsd: 0 }))
      const c = create()
      c.addFiles([file('bp.mp4')])
      expect(c.entries()[0].state).toBe('checking')
      expect(c.stateLabel(c.entries()[0])).toBe('Checking the file…')
      // A little longer each time: 1.5 s, then 3 s.
      jest.advanceTimersByTime(CHECK_RETRY_MS * 3)
      expect(c.entries()[0].state).toBe('ready')
    })

    it(`gives up after ${CHECK_RETRIES} more checks, saying why in the service's words`, () => {
      api.checkUploads.mockReturnValue(
        of({
          uploads: [checked('u1', { status: 'pending', reason: 'Still being checked. This takes a moment for a large file.' })],
          estimateUsd: 0,
        }),
      )
      const c = create()
      c.addFiles([file('bp.mp4')])
      jest.advanceTimersByTime(ALL_CHECK_RETRIES_MS)
      expect(api.checkUploads).toHaveBeenCalledTimes(CHECK_RETRIES + 1)
      expect(c.entries()[0]).toMatchObject({ state: 'failed', problem: 'Still being checked. This takes a moment for a large file.' })
    })

    it('does not ask again after a refusal that will not change (403)', () => {
      api.checkUploads.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 403, error: { error: { code: 'FORBIDDEN', message: 'Not your file.' } } })),
      )
      const c = create()
      c.addFiles([file('bp.mp4')])
      jest.advanceTimersByTime(ALL_CHECK_RETRIES_MS)
      expect(api.checkUploads).toHaveBeenCalledTimes(1)
      expect(c.entries()[0]).toMatchObject({ state: 'failed', problem: 'Not your file.' })
    })

    it('asks again after a gateway timeout, which may pass', () => {
      api.checkUploads
        .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 504 })))
        .mockImplementation((ids: string[]) => of({ uploads: [checked(ids[0])], estimateUsd: 0 }))
      const c = create()
      c.addFiles([file('bp.mp4')])
      jest.advanceTimersByTime(CHECK_RETRY_MS)
      expect(c.entries()[0].state).toBe('ready')
    })

    it('tries a file already in storage again by checking it, never by sending it again', () => {
      api.checkUploads.mockReturnValue(of({ uploads: [checked('u1', { status: 'pending' })], estimateUsd: 0 }))
      const c = create()
      c.addFiles([file('big.mp4')])
      jest.advanceTimersByTime(ALL_CHECK_RETRIES_MS)
      expect(c.entries()[0]).toMatchObject({ state: 'failed', stored: true, uploadId: 'u1' })
      api.checkUploads.mockImplementation((ids: string[]) => of({ uploads: [checked(ids[0])], estimateUsd: 0 }))
      c.retryFile(c.entries()[0].key)
      expect(c.entries()[0].state).toBe('ready')
      expect(api.signUploads).toHaveBeenCalledTimes(1)
      expect(api.uploadFile).toHaveBeenCalledTimes(1)
    })

    it('sends a file again when it never reached storage', () => {
      api.uploadFile.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })))
      const c = create()
      c.addFiles([file('bp.mp4')])
      expect(c.entries()[0]).toMatchObject({ state: 'failed', stored: false })
      c.retryFile(c.entries()[0].key)
      expect(api.uploadFile).toHaveBeenCalledTimes(2)
      expect(c.entries()[0].state).toBe('ready')
    })

    it('stops an upload when its file is removed, and starts the next', () => {
      let unsubscribed = false
      api.uploadContext.mockReturnValue(of(context({ limits: { maxVideoMinutes: 30, maxActivePerUser: 2, maxUploadFiles: 10 } })))
      api.uploadFile.mockReturnValueOnce(new Observable<number>(() => () => (unsubscribed = true)))
      api.uploadFile.mockReturnValueOnce(NEVER).mockReturnValueOnce(NEVER).mockReturnValue(of(100))
      const c = create()
      c.addFiles(['a', 'b', 'c', 'd'].map(x => file(`${x}.mp4`)))
      expect(c.entries()[3].state).toBe('waiting')
      c.removeFile(c.entries()[0].key)
      expect(unsubscribed).toBe(true)
      expect(c.entries().map(e => e.name)).toEqual(['b.mp4', 'c.mp4', 'd.mp4'])
      expect(c.entries()[2].state).toBe('ready')
    })

    it('removes every file that cannot be reviewed at once', () => {
      const c = create()
      c.addFiles([file('bp.mp4'), file('deck.pptx'), file('x.doc')])
      expect(c.unusable()).toHaveLength(2)
      c.removeUnusable()
      expect(c.entries().map(e => e.name)).toEqual(['bp.mp4'])
    })

    it('warns before leaving while files are still uploading', () => {
      api.uploadFile.mockReturnValue(NEVER)
      const c = create()
      const idle = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(idle)
      expect(idle.defaultPrevented).toBe(false)
      c.addFiles([file('bp.mp4')])
      const busy = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(busy)
      expect(busy.defaultPrevented).toBe(true)
    })
  })

  describe('files added before the page has loaded', () => {
    it('keeps them and adds them once it knows what it accepts', () => {
      const ctx = new Subject<IAiReviewUploadContext>()
      api.uploadContext.mockReturnValue(ctx)
      const c = create()
      c.addFiles([file('bp.mp4')])
      expect(c.entries()).toHaveLength(0)
      expect(c.addNote()).toBe('Your file will be added as soon as the page has loaded.')
      ctx.next(context())
      expect(c.entries()).toHaveLength(1)
      expect(c.entries()[0].state).toBe('ready')
    })

    it('says so when file review turns out to be switched off', () => {
      const ctx = new Subject<IAiReviewUploadContext>()
      api.uploadContext.mockReturnValue(ctx)
      const c = create()
      c.addFiles([file('a.mp4'), file('b.pdf')])
      expect(c.addNote()).toBe('2 files will be added as soon as the page has loaded.')
      ctx.next(context({ enabled: false }))
      expect(c.entries()).toHaveLength(0)
      expect(c.addNote()).toMatch(/not switched on for this server/)
    })
  })

  describe('drag and drop', () => {
    const dragEvent = (files: File[] = [], related: Node | null = null) =>
      ({
        preventDefault: jest.fn(),
        dataTransfer: { types: ['Files'], files, dropEffect: 'none' },
        relatedTarget: related,
        currentTarget: document.body,
      }) as unknown as DragEvent

    it('highlights the zone while files are over it, and adds what is dropped', () => {
      const c = create()
      const over = dragEvent()
      c.onDragOver(over)
      expect(over.preventDefault).toHaveBeenCalled()
      expect(c.dragging()).toBe(true)
      // Moving onto a child of the zone is not leaving it.
      c.onDragLeave(dragEvent([], document.body.appendChild(document.createElement('span'))))
      expect(c.dragging()).toBe(true)
      c.onDragLeave(dragEvent())
      expect(c.dragging()).toBe(false)
      c.onDrop(dragEvent([file('bp.mp4')]))
      expect(c.entries()).toHaveLength(1)
    })

    it('ignores a drag that carries no files', () => {
      const c = create()
      const text = { preventDefault: jest.fn(), dataTransfer: { types: ['text/plain'] } } as unknown as DragEvent
      c.onDragOver(text)
      expect(text.preventDefault).not.toHaveBeenCalled()
      expect(c.dragging()).toBe(false)
    })

    it('clears the picker so the same file can be picked again', () => {
      const c = create()
      const input = { files: [file('bp.mp4')], value: 'C:\\fakepath\\bp.mp4' }
      c.onPicked({ target: input } as unknown as Event)
      expect(c.entries()).toHaveLength(1)
      expect(input.value).toBe('')
    })
  })

  describe('quiz and assessment sheets', () => {
    const sheet = (error: string | null = null, warning: string | null = null) => ({
      sheet: { questions: [] },
      body: new Blob(['{"questions":[]}'], { type: 'application/json' }),
      error,
      warning,
    })

    it('reads the sheet into its questions and sends those as a quiz', async () => {
      ;(readQuizSheet as jest.Mock).mockResolvedValue(sheet(null, 'Only the first 500 rows are read.'))
      const c = create()
      c.addFiles([file('quiz.xlsx', 9000)])
      expect(c.stateLabel(c.entries()[0])).toBe('Reading the questions…')
      await flush()
      expect(readQuizSheet).toHaveBeenCalledWith(expect.any(File), 'quiz')
      expect(api.signUploads).toHaveBeenCalledWith([{ name: 'quiz.xlsx', size: 16, kind: 'quiz' }])
      expect(c.entries()[0]).toMatchObject({ state: 'ready', warning: 'Only the first 500 rows are read.' })
      expect(c.isSheet(c.entries()[0])).toBe(true)
    })

    it('switches an uploaded sheet to an assessment without reading or uploading it again', async () => {
      ;(readQuizSheet as jest.Mock).mockResolvedValue(sheet())
      const c = create()
      c.addFiles([file('final.xlsx')])
      await flush()
      const before = c.entries()[0]
      expect(before.state).toBe('ready')
      ;(readQuizSheet as jest.Mock).mockClear()
      api.signUploads.mockClear()
      api.uploadFile.mockClear()

      c.setSheetKind(before.key, 'assessment')
      expect(api.changeUploadKind).toHaveBeenCalledWith(before.uploadId, 'assessment')
      expect(c.entries()[0]).toMatchObject({ kind: 'assessment', state: 'ready', uploadId: before.uploadId })
      expect(c.measuredLine(c.entries()[0])).toContain('14 questions')
      expect(readQuizSheet).not.toHaveBeenCalled()
      expect(api.signUploads).not.toHaveBeenCalled()
      expect(api.uploadFile).not.toHaveBeenCalled()
    })

    it('keeps the question count on screen while the service answers', async () => {
      ;(readQuizSheet as jest.Mock).mockResolvedValue(sheet())
      const c = create()
      c.addFiles([file('final.xlsx')])
      await flush()
      const before = c.measuredLine(c.entries()[0])
      const answer = new Subject<IAiReviewCheckedUpload>()
      api.changeUploadKind.mockReturnValueOnce(answer)
      c.setSheetKind(c.entries()[0].key, 'assessment')
      expect(c.entries()[0].state).toBe('checking')
      expect(c.measuredLine(c.entries()[0])).toBe(before)
      expect(c.canSwitchKind(c.entries()[0])).toBe(false)
      answer.next({ ...checked(c.entries()[0].uploadId!), kind: 'assessment' })
      answer.complete()
      expect(c.entries()[0].state).toBe('ready')
    })

    it('puts the kind back, saying why, when the service cannot change it', async () => {
      ;(readQuizSheet as jest.Mock).mockResolvedValue(sheet())
      const c = create()
      c.addFiles([file('final.xlsx')])
      await flush()
      api.changeUploadKind.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })))
      c.setSheetKind(c.entries()[0].key, 'assessment')
      expect(c.entries()[0]).toMatchObject({ kind: 'quiz', state: 'ready' })
      expect(c.entries()[0].warning).toBeTruthy()
    })

    it('only notes the kind for a sheet not sent yet, so it is signed with it', async () => {
      ;(readQuizSheet as jest.Mock).mockResolvedValue(sheet())
      api.signUploads.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })))
      const c = create()
      c.addFiles([file('final.xlsx')])
      await flush()
      expect(c.entries()[0].state).toBe('failed')
      c.setSheetKind(c.entries()[0].key, 'assessment')
      expect(api.changeUploadKind).not.toHaveBeenCalled()
      expect(c.entries()[0].kind).toBe('assessment')
      c.retryFile(c.entries()[0].key)
      await flush()
      expect(api.signUploads).toHaveBeenLastCalledWith([{ name: 'final.xlsx', size: 16, kind: 'assessment' }])
    })

    it('refuses a sheet with no questions', async () => {
      ;(readQuizSheet as jest.Mock).mockResolvedValue(sheet('No questions were found.'))
      const c = create()
      c.addFiles([file('blank.xlsx')])
      await flush()
      expect(c.entries()[0]).toMatchObject({ state: 'rejected', problem: 'No questions were found.' })
      expect(api.signUploads).not.toHaveBeenCalled()
    })

    it('lets a sheet that could not be read be tried again', async () => {
      ;(readQuizSheet as jest.Mock).mockRejectedValueOnce(new Error('chunk failed')).mockResolvedValue(sheet())
      const c = create()
      c.addFiles([file('quiz.xlsx')])
      await flush()
      expect(c.entries()[0]).toMatchObject({ state: 'failed', problem: 'The sheet could not be read just now. Try again.' })
      c.retryFile(c.entries()[0].key)
      await flush()
      expect(c.entries()[0].state).toBe('ready')
    })

    it("keeps the sheet's own warning when it is switched between quiz and assessment", async () => {
      ;(readQuizSheet as jest.Mock).mockResolvedValue({
        sheet: {},
        body: new Blob(['{}']),
        error: null,
        warning: '2 rows had no question and were skipped.',
      })
      api.checkUploads.mockImplementation((ids: string[]) =>
        of({ uploads: [checked(ids[0], { kind: 'quiz', questions: 14 })], estimateUsd: 0 }),
      )
      const c = create()
      c.addFiles([file('mcq.xlsx')])
      await flush()
      expect(c.entries()[0]).toMatchObject({ state: 'ready', warning: '2 rows had no question and were skipped.' })
      c.setSheetKind(c.entries()[0].key, 'assessment')
      expect(c.entries()[0]).toMatchObject({ kind: 'assessment', state: 'ready', warning: '2 rows had no question and were skipped.' })
    })
  })

  describe('setting up and starting', () => {
    it('says what is missing, in order', () => {
      const c = create()
      expect(c.validationMessage()).toBe(
        'Add the files to review: videos, PDFs, interactive HTML packages (.zip), or quiz and assessment Excel sheets.',
      )
      c.addFiles([file('bp.mp4')])
      expect(c.validationMessage()).toBe('Pick a competency to judge the files against, or untick Domain review.')
      c.selectCompetency('C2')
      expect(c.validationMessage()).toBe('The domain review needs a level. Pick one, or untick Domain review.')
      c.setLevel('1')
      expect(c.levelLabel()).toBe('Knows')
      expect(c.validationMessage()).toBe('')
      c.addie.set(false)
      c.domain.set(false)
      expect(c.validationMessage()).toBe('Pick at least one review: the ADDIE checklist, the domain review or the course alignment check.')
      c.online.set(false)
      expect(c.validationMessage()).toBe("You're offline. Reconnect to the internet to start a review.")
    })

    it('picks the level for a competency that has only one', () => {
      const c = create()
      c.selectCompetency('C1')
      expect(c.level()).toBe(2)
      c.selectCompetency('C2')
      expect(c.level()).toBeNull()
      c.setLevel('nonsense')
      expect(c.level()).toBeNull()
    })

    it('estimates the cost of the ready files with the reviews switched on', () => {
      const c = create()
      c.addFiles([file('bp.mp4')])
      expect(c.estimateUsd()).toBe(0.36)
      c.watch.set(false)
      expect(c.estimateUsd()).toBe(0.16)
      c.domain.set(false)
      expect(c.estimateUsd()).toBe(0.06)
    })

    it('starts the review with the ready files, named after them when not named', () => {
      const c = create()
      c.addFiles([file('bp.mp4'), file('notes.pdf'), file('deck.pptx')])
      c.selectCompetency('C1')
      c.audience.set('ANM')
      c.notes.set('  rural PHC  ')
      expect(c.defaultTitle()).toBe('bp and 1 more')
      c.start()
      expect(api.startUploadReview).toHaveBeenCalledWith('bp and 1 more', ['u1', 'u2'], {
        addie: true,
        domain: true,
        alignment: false,
        brief: null,
        watch: true,
        domainStyle: 'plain',
        competencyId: 'C1',
        level: 2,
        levelMode: 'single',
        positionCode: 'ANM',
        audience: 'ANM',
        language: 'auto',
        reportLanguage: 'en',
        context: 'rural PHC',
      })
      expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { review: 'r1' } }))
      expect(c.review()?.id).toBe('r1')
      expect(api.uploadHistory).toHaveBeenCalledTimes(3)
    })

    it('says so when Start joined a review of the same files already running', () => {
      api.startUploadReview.mockReturnValue(of({ reviewId: 'r4', created: false, estimateUsd: 0.36 }))
      const c = create()
      c.domain.set(false)
      c.addFiles([file('bp.mp4')])
      c.start()
      expect(c.joinedNote()).toBe(JOINED_FILE_REVIEW)
      // Opening another review later clears the note.
      c.newReview()
      expect(c.joinedNote()).toBe('')
    })

    it('after an unclear failure, reads Past reviews again and says where a started review would be', () => {
      api.startUploadReview.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })))
      const c = create()
      c.domain.set(false)
      c.addFiles([file('bp.mp4')])
      api.uploadHistory.mockClear()
      c.start()
      expect(api.uploadHistory).toHaveBeenCalled()
      expect(c.startError()).toMatch(/If it had started, it is in Past reviews below/)
    })

    it('after a clear refusal, says only the reason', () => {
      api.startUploadReview.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 429, error: { error: { code: 'DAILY_LIMIT', message: 'Limit reached.' } } })),
      )
      const c = create()
      c.domain.set(false)
      c.addFiles([file('bp.mp4')])
      c.start()
      expect(c.startError()).toBe('Limit reached.')
    })

    it('checks the files against the course they are for, which the user must describe', () => {
      const c = create()
      c.addie.set(false)
      c.domain.set(false)
      c.addFiles([file('bp.mp4')])
      c.alignment.set(true)
      expect(c.validationMessage()).toBe('Enter the name of the course these files are for, or untick Course alignment.')
      c.briefName.set('  Eclampsia care  ')
      c.briefDescription.set('Too short.')
      expect(c.validationMessage()).toMatch(/at least 30 characters/)
      c.briefDescription.set('Teaches ANMs to manage severe pre-eclampsia and eclampsia, and to refer the same day.')
      expect(c.validationMessage()).toBe('')
      c.start()
      expect(api.startUploadReview.mock.calls[0][2]).toMatchObject({
        addie: false,
        domain: false,
        alignment: true,
        brief: {
          name: 'Eclampsia care',
          subtitle: '',
          description: 'Teaches ANMs to manage severe pre-eclampsia and eclampsia, and to refer the same day.',
        },
      })
    })

    it('adds the alignment reads and the course verdict to the estimate only when chosen', () => {
      api.checkUploads.mockImplementation((ids: string[]) =>
        of({
          uploads: [checked(ids[0], { estimate: { base: 0.01, addie: 0.05, domain: 0.1, watch: 0.2, alignment: 0.02 } })],
          estimateUsd: 0,
        }),
      )
      const c = create()
      c.addFiles([file('bp.mp4')])
      const without = c.estimateUsd()
      c.alignment.set(true)
      expect(c.estimateUsd()).toBe(Math.round((without + 0.02 + 0.05) * 100) / 100)
    })

    it('reviews only the ticked files; an unticked one stays uploaded and adds no cost', () => {
      const c = create()
      c.domain.set(false)
      c.addFiles([file('a.mp4'), file('b.mp4')])
      const both = c.estimateUsd()
      const second = c.entries()[1]
      expect(c.fileCost(second)).toBe(0.26)
      c.toggleFile(second.key, false)
      expect(c.chosen().map(e => e.name)).toEqual(['a.mp4'])
      expect(c.estimateUsd()).toBeLessThan(both)
      expect(c.entries()).toHaveLength(2)
      c.start()
      expect(api.startUploadReview.mock.calls[0][1]).toEqual(['u1'])
    })

    it('needs at least one ticked file, and forgets the tick of a removed file', () => {
      const c = create()
      c.domain.set(false)
      c.addFiles([file('a.mp4')])
      c.chooseAll(false)
      expect(c.validationMessage()).toBe('Tick at least one file to review.')
      c.removeFile(c.entries()[0].key)
      expect(c.excluded().size).toBe(0)
    })

    it("uses the user's title, cut to the service's limit", () => {
      const c = create()
      c.domain.set(false)
      c.addFiles([file('bp.mp4')])
      c.title.set('x'.repeat(200))
      c.start()
      expect(api.startUploadReview.mock.calls[0][0]).toHaveLength(150)
    })

    it("shows the service's refusal and lets the user try again", () => {
      api.startUploadReview.mockReturnValueOnce(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { error: { code: 'FILES_NOT_READY', message: 'These files cannot be reviewed: bp.mp4.' } },
            }),
        ),
      )
      const c = create()
      c.domain.set(false)
      c.addFiles([file('bp.mp4')])
      c.start()
      expect(c.startError()).toBe('These files cannot be reviewed: bp.mp4.')
      expect(c.starting()).toBe(false)
      expect(c.review()).toBeNull()
    })

    it('does not start while something is missing', () => {
      const c = create()
      c.start()
      expect(api.startUploadReview).not.toHaveBeenCalled()
    })

    it('checks the FRAC role once the settings settle', () => {
      const c = create()
      c.domainStyle.set('frac')
      c.selectCompetency('C1')
      c.audience.set('ANM')
      TestBed.tick()
      // Busy at once, before the settings settle, so the panel never sits empty.
      expect(c.roleChecking()).toBe(true)
      expect(api.uploadFracRole).not.toHaveBeenCalled()
      jest.advanceTimersByTime(REUSE_CHECK_DEBOUNCE_MS)
      expect(api.uploadFracRole).toHaveBeenCalledWith(
        expect.objectContaining({ domainStyle: 'frac', competencyId: 'C1', level: 2, positionCode: 'ANM' }),
      )
      expect(c.roleChecking()).toBe(false)
    })

    it('says what to pick before the role check can run', () => {
      const c = create()
      c.domainStyle.set('frac')
      c.audience.set('ANM')
      expect(c.roleWaiting()).toMatch(/Pick a competency/)
      c.selectCompetency('C1')
      expect(c.roleWaiting()).toBe('')
      c.domainStyle.set('plain')
      c.competencyId.set('')
      expect(c.roleWaiting()).toBe('')
    })

    it('says when the FRAC role data could not be read', () => {
      api.uploadFracRole.mockReturnValue(throwError(() => new Error('down')))
      const c = create()
      c.domainStyle.set('frac')
      c.selectCompetency('C1')
      TestBed.tick()
      jest.advanceTimersByTime(REUSE_CHECK_DEBOUNCE_MS)
      expect(c.roleCheck()).toEqual({ role: null, roleNote: 'The FRAC role data could not be read just now.' })
    })
  })

  describe('after a review', () => {
    it('goes back to the setup with its settings, keeping the files', () => {
      const c = create()
      c.domain.set(false)
      c.addFiles([file('bp.mp4')])
      c.start()
      expect(c.currentStep()).toBe('report')
      c.newReview()
      expect(c.review()).toBeNull()
      expect(c.entries()).toHaveLength(1)
      // FRAC is hidden for now (utils/features.ts): an earlier FRAC review runs again as Plain.
      expect(c.domainStyle()).toBe('plain')
      expect(c.competencyId()).toBe('C2')
      expect(c.level()).toBe(1)
      expect(c.language()).toBe('hi')
      expect(c.notes()).toBe('rural PHC')
      // Videos are always watched in full now, even when the earlier review had it off.
      expect(c.watch()).toBe(true)
      expect(router.navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { review: null } }))
    })

    it('shows a lost review with a retry', () => {
      api.get.mockReturnValue(
        throwError(
          () => new HttpErrorResponse({ status: 404, error: { error: { code: 'NOT_FOUND', message: 'This review could not be found.' } } }),
        ),
      )
      query = { review: 'gone' }
      const c = create()
      jest.advanceTimersByTime(2000 * 3)
      expect(c.pollError()).toBe('This review could not be found.')
      api.get.mockReturnValue(of(review()))
      c.retryFollow()
      expect(c.pollError()).toBe('')
      expect(c.review()?.id).toBe('r1')
    })

    it("keeps the review's line in the history current", () => {
      api.uploadHistory.mockReturnValue(
        of([
          {
            id: 'r1',
            title: 'BP drafts',
            status: 'queued',
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
      c.follow('r1')
      expect(c.history()[0]).toMatchObject({ status: 'running', progress: { done: 1, total: 2 } })
    })

    it('words statuses for files and goes back to My Workspace', () => {
      const c = create()
      expect(c.statusLabel('partial')).toBe('Done — some files could not be reviewed')
      c.back()
      expect(router.navigate).toHaveBeenCalledWith(['/author/ai-review'])
    })

    it('shows a failed history read', () => {
      api.uploadHistory.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })))
      const c = create()
      expect(c.historyError()).toBe('Could not load your past reviews.')
    })
  })

  it('words storage failures for people', () => {
    const offline = jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(storageMessage({ status: 0 })).toMatch(/offline/)
    offline.mockRestore()
    expect(storageMessage({ status: 0 })).toMatch(/interrupted/)
    expect(storageMessage(null)).toMatch(/interrupted/)
    expect(storageMessage({ status: 403 })).toMatch(/expired/)
    expect(storageMessage({ status: 400 })).toMatch(/wrong type or larger/)
    expect(storageMessage({ status: 500 })).toBe('The file could not be uploaded (storage answered 500). Try again.')
    expect(new StorageUploadError('x').cause).toBe('x')
  })
})
