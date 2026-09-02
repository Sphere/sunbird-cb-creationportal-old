import { of, Subject } from 'rxjs'
import { QuizComponent } from './quiz.component'

/**
 * Wave 18 — the quiz loader: `ngOnInit` (the route-data / assessment-JSON chain),
 * `parseStoredAssessmentId`, `questionType`, `ngOnDestroy` and `triggerSave`.
 * Direct instantiation, as with the sibling specs.
 */
describe('QuizComponent (loading an assessment)', () => {
  let component: QuizComponent
  let router: any
  let activateRoute: any
  let cdr: any
  let breakpointObserver: any
  let dialog: any
  let snackBar: any
  let quizStoreSvc: any
  let loaderService: any
  let metaContentService: any
  let uploadService: any
  let editorService: any
  let notificationSvc: any
  let initService: any
  let quizResolverSvc: any
  let accessControl: any

  let changeActiveCont: Subject<string>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
    ;(console.warn as jest.Mock).mockRestore()
    ;(console.error as jest.Mock).mockRestore()
  })

  const quizContent = (over: any = {}) => ({
    identifier: 'do_1',
    name: 'My assessment',
    mimeType: 'application/json',
    artifactUrl: 'https://cdn/bucket/quiz.json',
    categoryType: 'Quiz',
    duration: '300',
    ...over,
  })

  /** The resolved route data the editor hands the quiz builder. */
  const routeWith = (content: any, data?: any) => ({
    parent: { parent: { data: of({ contents: [{ content, data }] }) } },
  })

  /** Lets the async IIFE inside ngOnInit settle. */
  const settle = async () => {
    for (let i = 0; i < 8; i = i + 1) {
      await Promise.resolve()
    }
  }

  beforeEach(() => {
    sessionStorage.clear()
    changeActiveCont = new Subject<string>()

    router = { navigateByUrl: jest.fn(), url: '/author/editor/do_1/quiz' }
    activateRoute = { parent: null }
    cdr = { detach: jest.fn(), detectChanges: jest.fn(), markForCheck: jest.fn() }
    breakpointObserver = { observe: jest.fn().mockReturnValue(of({ matches: false })) }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => of(true) }) }
    snackBar = { openFromComponent: jest.fn() }
    quizStoreSvc = {
      collectiveQuiz: {},
      currentId: 'do_1',
      hasChanged: false,
      selectedQuizIndex: of(3),
      getQuizConfig: jest.fn().mockReturnValue({}),
      changeQuiz: jest.fn(),
      validateQuiz: jest.fn().mockReturnValue(null),
    }
    loaderService = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    metaContentService = {
      changeActiveCont,
      currentContent: 'do_1',
      parentContent: 'do_course',
      originalContent: { do_1: quizContent() },
      upDatedContent: { do_1: {} },
      getUpdatedMeta: jest.fn().mockReturnValue(quizContent()),
      getOriginalMeta: jest.fn().mockReturnValue(quizContent()),
      setUpdatedMeta: jest.fn(),
      resetOriginalMeta: jest.fn(),
    }
    uploadService = { upload: jest.fn().mockReturnValue(of({ artifactURL: 'a.json' })) }
    editorService = {
      readcontentV3: jest.fn().mockReturnValue(of(quizContent())),
      updateContent: jest.fn().mockReturnValue(of({ ok: true })),
      updateNewContentV3: jest.fn().mockReturnValue(of({ ok: true })),
      forwardBackward: jest.fn().mockReturnValue(of({ ok: true })),
      deleteContent: jest.fn().mockReturnValue(of({ ok: true })),
    }
    notificationSvc = { triggerPushPullNotification: jest.fn().mockReturnValue(of({ ok: true })) }
    initService = {
      uploadMessage: new Subject<any>(),
      updateAssessmentMessage: new Subject<any>(),
      isAssessmentOrQuizMessage: new Subject<any>(),
      ordinals: { subTitles: ['en', 'hi'] },
    }
    quizResolverSvc = {
      canEdit: jest.fn().mockReturnValue(true),
      getJSON: jest.fn().mockReturnValue(of({})),
      getUpdatedData: jest.fn().mockReturnValue(of([])),
    }
    accessControl = { rootOrg: 'sunbird', userId: 'u1', hasRole: jest.fn().mockReturnValue(false) }
    ;(window as any).env = { azureBucket: 'bucket' }

    component = new QuizComponent(
      router,
      activateRoute,
      cdr,
      breakpointObserver,
      dialog,
      snackBar,
      quizStoreSvc,
      loaderService,
      metaContentService,
      uploadService,
      editorService,
      notificationSvc,
      initService,
      quizResolverSvc,
      accessControl,
    )
    component.currentId = 'do_1'
    component.mediumSizeBreakpoint$ = of(false) as any
  })

  afterEach(() => {
    sessionStorage.clear()
    jest.clearAllMocks()
  })

  // ------------------------------------------------ parseStoredAssessmentId --

  describe('parseStoredAssessmentId', () => {
    const parse = (code: string | null) => (component as any).parseStoredAssessmentId(code)

    it('ignores a missing value', () => {
      expect(parse(null)).toBeNull()
      expect(parse('')).toBeNull()
    })

    it('accepts a quoted identifier', () => {
      expect(parse('"do_9"')).toBe('do_9')
    })

    it('rejects the literal add-new flag', () => {
      expect(parse('true')).toBeNull()
    })

    it('rejects a quoted blank', () => {
      expect(parse('"   "')).toBeNull()
    })

    it('rejects a parsed non-string', () => {
      expect(parse('42')).toBeNull()
    })

    it('accepts a bare identifier that is not JSON', () => {
      expect(parse('do_9')).toBe('do_9')
    })

    it('rejects a bare blank that is not JSON', () => {
      expect(parse('   ')).toBeNull()
    })
  })

  // -------------------------------------------------------------- ngOnInit --

  describe('ngOnInit', () => {
    it('drops the previous content subscription before re-subscribing', async () => {
      const unsubscribe = jest.fn()
      component.activeContentSubscription = { unsubscribe } as any
      component.ngOnInit()
      await settle()
      expect(unsubscribe).toHaveBeenCalled()
      expect(component.showSettingButtons).toBe(true)
    })

    it('records the emitted id as the active content', async () => {
      component.ngOnInit()
      await settle()
      changeActiveCont.next('do_5')
      expect(metaContentService.currentContent).toBe('do_5')
      expect(component.allLanguages).toEqual(['en', 'hi'])
    })

    it('prefers a stored assessment id over the emitted one', async () => {
      sessionStorage.setItem('assessment', '"do_stored"')
      component.ngOnInit()
      await settle()
      changeActiveCont.next('do_5')
      expect(component.isEdited).toBe(true)
      expect(metaContentService.currentContent).toBe('do_stored')
    })

    it('keeps the emitted id when the stored value is only the add-new flag', async () => {
      sessionStorage.setItem('assessment', 'true')
      component.ngOnInit()
      await settle()
      changeActiveCont.next('do_5')
      expect(metaContentService.currentContent).toBe('do_5')
    })

    it('collapses the side navigation on a small screen', async () => {
      component.mediumSizeBreakpoint$ = of(true) as any
      component.ngOnInit()
      await settle()
      changeActiveCont.next('do_1')
      expect(component.sideNavBarOpened).toBe(false)
      expect(component.showContent).toBe(false)
    })

    it('opens the side navigation on a wide screen', async () => {
      component.ngOnInit()
      await settle()
      changeActiveCont.next('do_1')
      expect(component.sideNavBarOpened).toBe(true)
      expect(component.showContent).toBe(true)
    })

    it('does nothing more without a grandparent route', async () => {
      component.ngOnInit()
      await settle()
      changeActiveCont.next('do_1')
      expect(quizResolverSvc.getUpdatedData).not.toHaveBeenCalled()
    })

    it('drops the previous route subscription before re-subscribing', async () => {
      const unsubscribe = jest.fn()
      component.routeDataSubscription = { unsubscribe } as any
      component.activateRoute = routeWith(quizContent()) as any
      component.ngOnInit()
      await settle()
      changeActiveCont.next('do_1')
      expect(unsubscribe).toHaveBeenCalled()
    })

    it('finishes loading when the route carries no content', async () => {
      component.activateRoute = { parent: { parent: { data: of({ contents: [] }) } } } as any
      component.ngOnInit()
      await settle()
      changeActiveCont.next('do_1')
      expect(component.contentLoaded).toBe(true)
      expect(component.isLoading).toBe(false)
      expect(quizResolverSvc.getUpdatedData).not.toHaveBeenCalled()
    })

    it('loads the stored questions of an existing assessment', async () => {
      component.activateRoute = routeWith(quizContent()) as any
      quizResolverSvc.getJSON.mockReturnValue(
        of({ timeLimit: 600, passPercentage: 60, randomCount: 5, questions: [{ id: 'q1' }], isAssessment: false }),
      )
      component.ngOnInit()
      await settle()
      changeActiveCont.next('do_1')
      await settle()
      expect(component.assessmentDuration).toBe(10)
      expect(component.passPercentage).toBe(60)
      expect(component.randomCount).toBe(5)
      expect(component.validPercentage).toBe(true)
      expect(component.resourceName).toBe('My assessment')
      expect(component.contentLoaded).toBe(true)
      expect(quizStoreSvc.collectiveQuiz.do_1).toEqual([{ id: 'q1' }])
    })

    it('labels a competency assessment as an Assessment', async () => {
      component.activateRoute = routeWith(quizContent({ competency: true })) as any
      editorService.readcontentV3.mockReturnValue(of(quizContent({ isAssessment: true, competency: true })))
      quizResolverSvc.getJSON.mockReturnValue(of({ isAssessment: true, questions: [], passPercentage: 60 }))
      component.ngOnInit()
      await settle()
      changeActiveCont.next('do_1')
      await settle()
      expect(component.isQuiz).toBe('Assessment')
      expect(component.courseCompetency).toBe(true)
    })

    it('labels a plain quiz as a Quiz', async () => {
      component.activateRoute = routeWith(quizContent({ competency: false })) as any
      editorService.readcontentV3.mockReturnValue(of(quizContent({ isAssessment: false })))
      quizResolverSvc.getJSON.mockReturnValue(of({ isAssessment: false, questions: [], passPercentage: 60 }))
      component.ngOnInit()
      await settle()
      changeActiveCont.next('do_1')
      await settle()
      expect(component.isQuiz).toBe('Quiz')
      expect(component.validPercentage).toBe(true)
    })

    it('starts from an empty question list when the payload carries none', async () => {
      component.activateRoute = routeWith(quizContent(), null) as any
      quizResolverSvc.getJSON.mockReturnValue(of({ timeLimit: 600, passPercentage: 60 }))
      quizResolverSvc.getUpdatedData.mockReturnValue(of([{ data: { questions: [{ id: 'resolved' }] } }]))
      component.ngOnInit()
      await settle()
      changeActiveCont.next('do_1')
      await settle()
      expect(quizStoreSvc.collectiveQuiz.do_1).toEqual([])
      expect(component.contentLoaded).toBe(true)
    })

    it('re-reads the questions for the active id as a last resort', async () => {
      component.activateRoute = routeWith(quizContent(), null) as any
      quizResolverSvc.getJSON.mockReturnValue(of({ timeLimit: 600, passPercentage: 60 }))
      quizResolverSvc.getUpdatedData.mockReturnValueOnce(of([])).mockReturnValue(of([{ data: { questions: [{ id: 'late' }] } }]))
      component.ngOnInit()
      await settle()
      changeActiveCont.next('do_1')
      await settle()
      expect(component.currentId).toBe('do_1')
      expect(quizStoreSvc.changeQuiz).toHaveBeenCalled()
    })

    it('keeps unsaved in-memory edits instead of overwriting them', async () => {
      component.activateRoute = routeWith(quizContent(), { questions: [{ id: 'fromBackend' }] }) as any
      quizStoreSvc.collectiveQuiz.do_1 = [{ id: 'unsaved' }]
      jest.spyOn(component as any, 'shouldPreserveUnsavedQuestions').mockReturnValue(true)
      quizResolverSvc.getJSON.mockReturnValue(of({ timeLimit: 600, passPercentage: 60, questions: [] }))
      component.ngOnInit()
      await settle()
      changeActiveCont.next('do_1')
      await settle()
      expect(quizStoreSvc.collectiveQuiz.do_1).toEqual([{ id: 'unsaved' }])
    })

    it('resets the settings for an all-but-empty payload', async () => {
      component.activateRoute = routeWith(quizContent()) as any
      quizResolverSvc.getJSON.mockReturnValue(of({ onlyOneKey: true }))
      component.ngOnInit()
      await settle()
      changeActiveCont.next('do_1')
      await settle()
      expect(component.assessmentDuration).toBe('')
      expect(component.passPercentage).toBe('')
      expect(component.randomCount).toBe('')
      expect(component.quizDuration).toBe('300')
      expect(component.contentLoaded).toBe(true)
      expect(quizStoreSvc.collectiveQuiz.do_1).toEqual([])
    })

    it('treats an assessment with no artifact as a fresh one', async () => {
      component.activateRoute = routeWith(quizContent()) as any
      editorService.readcontentV3.mockReturnValue(of(quizContent({ artifactUrl: undefined, downloadUrl: undefined })))
      component.ngOnInit()
      await settle()
      changeActiveCont.next('do_1')
      await settle()
      expect(quizResolverSvc.getJSON).not.toHaveBeenCalled()
      expect(component.contentLoaded).toBe(true)
    })

    it('ignores a resource that is not an assessment payload', async () => {
      component.activateRoute = routeWith(quizContent()) as any
      editorService.readcontentV3.mockReturnValue(of(quizContent({ mimeType: 'application/pdf' })))
      component.ngOnInit()
      await settle()
      changeActiveCont.next('do_1')
      await settle()
      expect(quizResolverSvc.getJSON).not.toHaveBeenCalled()
    })

    it('tracks the selected question index', async () => {
      component.activateRoute = routeWith(quizContent()) as any
      component.ngOnInit()
      await settle()
      changeActiveCont.next('do_1')
      await settle()
      expect(component.selectedQuizIndex).toBe(3)
      expect(quizStoreSvc.currentId).toBe('do_1')
    })
  })

  // --------------------------------------------------------- questionType --

  describe('questionType', () => {
    it('records the picked question type', () => {
      component.questionsArr = []
      component.questionType('mcq-mca')
      expect(component.questionTypeText).toBe('mcq-mca')
    })
  })

  // ----------------------------------------------------------- ngOnDestroy --

  describe('ngOnDestroy', () => {
    it('detaches change detection and releases every subscription', () => {
      const activeIndex = { unsubscribe: jest.fn() }
      const routeData = { unsubscribe: jest.fn() }
      const activeContent = { unsubscribe: jest.fn() }
      component.activeIndexSubscription = activeIndex as any
      component.routeDataSubscription = routeData as any
      component.activeContentSubscription = activeContent as any
      component.ngOnDestroy()
      expect(cdr.detach).toHaveBeenCalled()
      expect(activeIndex.unsubscribe).toHaveBeenCalled()
      expect(routeData.unsubscribe).toHaveBeenCalled()
      expect(activeContent.unsubscribe).toHaveBeenCalled()
    })

    it('survives with no subscriptions to release', () => {
      component.activeIndexSubscription = undefined as any
      component.routeDataSubscription = undefined as any
      component.activeContentSubscription = undefined as any
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })

  // ----------------------------------------------------------- triggerSave --

  describe('triggerSave', () => {
    beforeEach(() => {
      component.resourceDetails = { isAssessment: false } as any
    })

    it('marks the payload as an assessment when the builder is in assessment mode', async () => {
      component.isQuiz = 'Assessment'
      await component.triggerSave({ name: 'q' } as any, 'do_1').toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.isAssessment).toBe(true)
      expect(metaContentService.setUpdatedMeta).toHaveBeenCalledWith({ name: 'q' }, 'do_1')
    })

    it('marks the payload as a quiz otherwise', async () => {
      component.isQuiz = 'Quiz'
      await component.triggerSave({ name: 'q' } as any, 'do_1').toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.isAssessment).toBe(false)
    })

    it('always marks a self assessment as an assessment', async () => {
      component.isQuiz = 'Quiz'
      component.courseCompetency = true
      await component.triggerSave({ name: 'q' } as any, 'do_1').toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.isAssessment).toBe(true)
    })

    it('does nothing without a payload', async () => {
      await component.triggerSave(undefined as any, 'do_1').toPromise()
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
    })

    it('does nothing without an id', async () => {
      await component.triggerSave({ name: 'q' } as any, '').toPromise()
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
    })
  })
})
