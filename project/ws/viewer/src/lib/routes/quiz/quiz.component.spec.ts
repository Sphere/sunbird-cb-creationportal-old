import { of, throwError, Subject } from 'rxjs'
import { QuizComponent } from './quiz.component'

describe('QuizComponent', () => {
  let component: QuizComponent
  let activatedRoute: any
  let data$: Subject<any>
  let http: any
  let contentSvc: any
  let eventSvc: any
  let viewSvc: any
  let cdr: any

  const build = () => new QuizComponent(activatedRoute, http, contentSvc, eventSvc, viewSvc, cdr)

  beforeEach(() => {
    data$ = new Subject<any>()
    activatedRoute = {
      data: data$,
      snapshot: { queryParams: {} },
    }
    http = {
      get: jest.fn().mockReturnValue(of({ timeLimit: 0, questions: [], isAssessment: false })),
    }
    contentSvc = {
      continueLearning: jest.fn().mockResolvedValue(undefined),
      setS3Cookie: jest.fn().mockReturnValue(of(null)),
    }
    eventSvc = { dispatchEvent: jest.fn() }
    viewSvc = {
      getAuthoringUrl: jest.fn((u: string) => `/auth${u}`),
      replaceToAuthUrl: jest.fn((json: any) => json),
    }
    cdr = { detectChanges: jest.fn() }

    component = build()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
    expect(component.isFetchingDataComplete).toBe(false)
  })

  describe('raiseEvent', () => {
    it('dispatches a telemetry event when not previewing', () => {
      component.forPreview = false
      const data = { identifier: 'do_1', artifactUrl: 'http://x/quiz.json' } as any

      component.raiseEvent('loaded' as any, data)

      expect(eventSvc.dispatchEvent).toHaveBeenCalledTimes(1)
      const evt = eventSvc.dispatchEvent.mock.calls[0][0]
      expect(evt.data.identifier).toBe('do_1')
      expect(evt.data.url).toBe('http://x/quiz.json')
    })

    it('does nothing in preview mode', () => {
      component.forPreview = true

      component.raiseEvent('loaded' as any, { identifier: 'x' } as any)

      expect(eventSvc.dispatchEvent).not.toHaveBeenCalled()
    })
  })

  describe('transformQuiz', () => {
    it('assigns mcq-mca and mcq-sca question types by default', async () => {
      http.get.mockReturnValue(
        of({
          timeLimit: 10,
          isAssessment: false,
          questions: [{ multiSelection: true }, { multiSelection: false }, { multiSelection: false, questionType: 'fitb' }],
        }),
      )
      component.forPreview = false

      const result = await (component as any).transformQuiz({ artifactUrl: 'http://x/q.json' })

      expect(result.questions[0].questionType).toBe('mcq-mca')
      expect(result.questions[1].questionType).toBe('mcq-sca')
      expect(result.questions[2].questionType).toBe('fitb')
    })

    it('returns a safe empty quiz when the fetch fails', async () => {
      http.get.mockReturnValue(throwError(() => new Error('network')))
      component.forPreview = false

      const result = await (component as any).transformQuiz({ artifactUrl: 'http://x/q.json' })

      expect(result).toEqual({ timeLimit: 0, questions: [], isAssessment: false })
    })

    it('rewrites relative urls through the authoring service in preview', async () => {
      http.get.mockReturnValue(of({ timeLimit: 0, questions: [], isAssessment: false }))
      component.forPreview = true

      await (component as any).transformQuiz({ artifactUrl: '/relative/q.json' })

      expect(viewSvc.getAuthoringUrl).toHaveBeenCalledWith('/relative/q.json')
      expect(viewSvc.replaceToAuthUrl).toHaveBeenCalled()
    })

    it('leaves absolute urls untouched in preview', async () => {
      http.get.mockReturnValue(of({ timeLimit: 0, questions: [], isAssessment: false }))
      component.forPreview = true

      await (component as any).transformQuiz({ artifactUrl: 'http://x/q.json' })

      expect(viewSvc.getAuthoringUrl).not.toHaveBeenCalled()
    })
  })

  describe('setS3Cookie', () => {
    it('calls the content service to set the cookie', async () => {
      await (component as any).setS3Cookie('do_1')
      expect(contentSvc.setS3Cookie).toHaveBeenCalledWith('do_1')
    })

    it('swallows cookie errors', async () => {
      contentSvc.setS3Cookie.mockReturnValue(throwError(() => new Error('cookie')))
      await expect((component as any).setS3Cookie('do_1')).resolves.toBeUndefined()
    })
  })

  describe('ngOnInit', () => {
    it('transforms the quiz and marks fetching complete', async () => {
      component.forPreview = false
      http.get.mockReturnValue(of({ timeLimit: 5, questions: [], isAssessment: true }))

      component.ngOnInit()
      data$.next({
        content: { data: { identifier: 'do_9', artifactUrl: 'http://x/q.json' } },
      })
      await Promise.resolve()
      await Promise.resolve()

      expect(component.quizData).toEqual({ identifier: 'do_9', artifactUrl: 'http://x/q.json' })
      expect(component.isFetchingDataComplete).toBe(true)
      expect(component.alreadyRaised).toBe(true)
      expect(cdr.detectChanges).toHaveBeenCalled()
    })

    it('sets the S3 cookie for content-store artifacts', async () => {
      component.forPreview = false

      component.ngOnInit()
      data$.next({
        content: { data: { identifier: 'do_5', artifactUrl: 'https://content-store/q.json' } },
      })
      await Promise.resolve()
      await Promise.resolve()

      expect(contentSvc.setS3Cookie).toHaveBeenCalledWith('do_5')
    })
  })

  describe('ngOnDestroy', () => {
    it('records continue-learning with the collection context and unloads', async () => {
      component.forPreview = false
      component.quizData = { identifier: 'do_1', artifactUrl: 'http://x' } as any
      activatedRoute.snapshot.queryParams = { collectionId: 'c1', collectionType: 'course' }

      await (component as any).onDestroyAsync()

      expect(contentSvc.continueLearning).toHaveBeenCalledWith('do_1', 'c1', 'course')
      expect(eventSvc.dispatchEvent).toHaveBeenCalled()
    })

    it('records continue-learning without a collection context', async () => {
      component.forPreview = false
      component.quizData = { identifier: 'do_2', artifactUrl: 'http://x' } as any

      await (component as any).onDestroyAsync()

      expect(contentSvc.continueLearning).toHaveBeenCalledWith('do_2')
    })

    it('unsubscribes from the data subscription', async () => {
      const unsubscribe = jest.fn()
      ;(component as any).dataSubscription = { unsubscribe }
      component.quizData = null

      await (component as any).onDestroyAsync()

      expect(unsubscribe).toHaveBeenCalled()
      expect(contentSvc.continueLearning).not.toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy delegation', () => {
    it('fires the async teardown and returns void, since Angular never awaits lifecycle hooks', () => {
      const c = build()
      const spy = jest.spyOn(c as any, 'onDestroyAsync').mockResolvedValue(undefined as never)
      expect(c.ngOnDestroy()).toBeUndefined()
      expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
