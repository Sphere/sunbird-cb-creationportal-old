import { of, Subject, throwError } from 'rxjs'

import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

import { QuizComponent } from './quiz.component'

/**
 * Covers the save / validation / preview paths the sibling quiz.direct.spec.ts leaves
 * out: save, checkValidity, validationCheck, preview, uploadJson, shuffle, the quiz
 * navigation helpers and shouldPreserveUnsavedQuestions.
 */
describe('QuizComponent (save + validation)', () => {
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

  const meta = (over: any = {}) =>
    ({
      identifier: 'do_1',
      status: 'Draft',
      categoryType: 'Quiz',
      mimeType: 'application/quiz',
      duration: '0',
      creatorContacts: [{ id: 'u1' }],
      publisherDetails: [{ id: 'u1' }],
      ...over,
    }) as any

  const question = (over: any = {}) => ({
    questionId: 'Q1',
    question: 'Q?',
    questionType: 'mcq-sca',
    options: [{ text: 'a', optionId: 'o1', isCorrect: true }],
    ...over,
  })

  const build = () =>
    new QuizComponent(
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

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    sessionStorage.clear()
    changeActiveCont = new Subject<string>()

    router = { navigateByUrl: jest.fn(), url: '/author/editor/do_1/quiz' }
    activateRoute = { parent: null }
    cdr = { detach: jest.fn(), detectChanges: jest.fn(), markForCheck: jest.fn() }
    breakpointObserver = { observe: jest.fn().mockReturnValue(of({ matches: false })) }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => of(false) }) }
    snackBar = { openFromComponent: jest.fn() }
    quizStoreSvc = {
      collectiveQuiz: {},
      currentId: 'do_1',
      hasChanged: false,
      selectedQuizIndex: of(0),
      getQuizConfig: jest.fn().mockReturnValue({ minQues: 5 }),
      changeQuiz: jest.fn(),
      validateQuiz: jest.fn().mockReturnValue(null),
    }
    loaderService = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    metaContentService = {
      changeActiveCont,
      currentContent: 'do_1',
      originalContent: { do_1: meta() },
      upDatedContent: { do_1: {} },
      getUpdatedMeta: jest.fn().mockReturnValue(meta()),
      getOriginalMeta: jest.fn().mockReturnValue(meta()),
      setUpdatedMeta: jest.fn(),
      resetOriginalMeta: jest.fn(),
      isValid: jest.fn().mockReturnValue(true),
      createInAnotherLanguage: jest.fn().mockReturnValue(of(meta({ identifier: 'do_2' }))),
    }
    uploadService = {
      upload: jest.fn().mockReturnValue(of({ artifactURL: 'a.json' })),
      encodedUploadAWS: jest.fn().mockReturnValue(of({ artifactURL: 'a.json' })),
    }
    editorService = {
      updateContent: jest.fn().mockReturnValue(of({ ok: true })),
      forwardBackward: jest.fn().mockReturnValue(of({ ok: true })),
      deleteContent: jest.fn().mockReturnValue(of({ ok: true })),
    }
    notificationSvc = { triggerPushPullNotification: jest.fn().mockReturnValue(of({ ok: true })) }
    initService = {
      uploadMessage: new Subject<any>(),
      updateAssessmentMessage: new Subject<any>(),
      isAssessmentOrQuizMessage: new Subject<any>(),
      ordinals: { subTitles: ['en'] },
    }
    quizResolverSvc = { canEdit: jest.fn().mockReturnValue(true) }
    accessControl = { rootOrg: 'sunbird', userId: 'u1', hasRole: jest.fn().mockReturnValue(false) }

    component = build()
    component.currentId = 'do_1'
    component.quizConfig = { minQues: 5 } as any
  })

  afterEach(() => jest.restoreAllMocks())

  describe('customStepper', () => {
    it('locks the cursor on step 1 rather than moving', () => {
      component.currentStep = 3
      component.customStepper(1)
      expect(component.disableCursor).toBe(true)
      expect(component.currentStep).toBe(3)
    })

    it('moves to any other step', () => {
      component.customStepper(4)
      expect(component.currentStep).toBe(4)
    })
  })

  describe('changeContent', () => {
    it('activates the chosen content', () => {
      const spy = jest.spyOn(changeActiveCont, 'next')
      component.changeContent({ identifier: 'do_9' } as any)
      expect(component.currentId).toBe('do_9')
      expect(spy).toHaveBeenCalledWith('do_9')
    })
  })

  describe('changeQuiz', () => {
    it('moves the store to the offset quiz', () => {
      component.selectedQuizIndex = 2
      component.changeQuiz(1)
      expect(quizStoreSvc.changeQuiz).toHaveBeenCalledWith(3)
    })

    it('scrolls the target quiz into view once it exists', () => {
      jest.useFakeTimers()
      const el = document.createElement('div')
      el.id = 'quiz-1'
      el.scrollIntoView = jest.fn()
      document.body.appendChild(el)
      component.selectedQuizIndex = 0

      component.changeQuiz(1)
      jest.advanceTimersByTime(200)

      expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
      document.body.removeChild(el)
      jest.useRealTimers()
    })

    it('is a no-op on scrolling when the element is absent', () => {
      component.selectedQuizIndex = 0
      expect(() => component.changeQuiz(99)).not.toThrow()
    })
  })

  describe('generateUrl', () => {
    it('returns the url untouched when it already points at the bucket', () => {
      ;(window as any).env = { azureBucket: 'my-bucket' }
      expect(component.generateUrl('https://h/my-bucket/a.json')).toBe('https://h/my-bucket/a.json')
    })

    it('returns undefined for a url outside the bucket', () => {
      ;(window as any).env = { azureBucket: 'my-bucket' }
      expect(component.generateUrl('https://h/other/a.json')).toBeUndefined()
    })
  })

  describe('shouldPreserveUnsavedQuestions', () => {
    it('is false when the store is clean', () => {
      quizStoreSvc.hasChanged = false
      quizStoreSvc.collectiveQuiz = { do_1: [question()] }
      expect(component.shouldPreserveUnsavedQuestions('do_1')).toBe(false)
    })

    it('is true when the store is dirty and holds questions', () => {
      quizStoreSvc.hasChanged = true
      quizStoreSvc.collectiveQuiz = { do_1: [question()] }
      expect(component.shouldPreserveUnsavedQuestions('do_1')).toBe(true)
    })

    it('is false when the dirty store holds no questions for that id', () => {
      quizStoreSvc.hasChanged = true
      quizStoreSvc.collectiveQuiz = { do_1: [] }
      expect(component.shouldPreserveUnsavedQuestions('do_1')).toBe(false)
    })

    it('is false when the id is unknown', () => {
      quizStoreSvc.hasChanged = true
      quizStoreSvc.collectiveQuiz = {}
      expect(component.shouldPreserveUnsavedQuestions('missing')).toBe(false)
    })
  })

  describe('shuffle', () => {
    it('keeps every element, just reordered', () => {
      const input = [1, 2, 3, 4, 5]
      const out = component.shuffle([...input])
      expect(out).toHaveLength(5)
      expect(out.slice().sort()).toEqual(input)
    })

    it('handles an empty list', () => {
      expect(component.shuffle([])).toEqual([])
    })
  })

  describe('checkValidity', () => {
    it('marks the quiz valid when every question passes', () => {
      component.questionsArr = [question(), question()]
      quizStoreSvc.validateQuiz.mockReturnValue(null)

      component.checkValidity()

      expect(component.isValid).toBe(true)
      expect(quizStoreSvc.changeQuiz).not.toHaveBeenCalled()
    })

    it('jumps to the first offending question', () => {
      component.questionsArr = [question(), question()]
      component.selectedQuizIndex = 1
      quizStoreSvc.validateQuiz.mockReturnValue('SOME_ERROR')

      component.checkValidity()

      expect(component.isValid).toBe(false)
      expect(quizStoreSvc.changeQuiz).toHaveBeenCalledWith(0)
    })

    it('notifies in place when the offending question is already selected', () => {
      component.questionsArr = [question()]
      component.selectedQuizIndex = 0
      quizStoreSvc.validateQuiz.mockReturnValue('SOME_ERROR')

      component.checkValidity()

      expect(component.isValid).toBe(false)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })
  })

  describe('uploadJson', () => {
    // jsdom's Blob has no .text(), so the serialised payload is captured as the
    // component builds it.
    let payload: any

    beforeEach(() => {
      payload = undefined
      const RealBlob = global.Blob
      jest.spyOn(global, 'Blob' as any).mockImplementation((parts: any, opts: any) => {
        payload = JSON.parse(parts[0])
        return new RealBlob(parts, opts)
      })
      component.assessmentDuration = 5
      component.passPercentage = 60
      // Normally populated by ngOnInit from the resolved content.
      component.resourceDetails = { isAssessment: false } as any
    })

    it('posts the payload under the given file name', () => {
      component.isQuiz = 'Assessment'
      component.uploadJson([question()], 'assessment.json')

      const [formdata, fileName] = uploadService.encodedUploadAWS.mock.calls[0]
      expect(fileName).toBe('assessment.json')
      expect(formdata.get('content')).toBeTruthy()
      expect(payload.questions).toHaveLength(1)
    })

    it('zeroes the pass percentage for a plain quiz', () => {
      component.isQuiz = 'Quiz'
      component.uploadJson([question()], 'quiz.json')
      expect(payload.passPercentage).toBe(0)
      expect(payload.isAssessment).toBe(false)
    })

    it('flags an assessment payload', () => {
      component.isQuiz = 'Assessment'
      component.uploadJson([question()], 'assessment.json')
      expect(payload.isAssessment).toBe(true)
      expect(payload.passPercentage).toBe(60)
    })

    it('treats a competency course as an assessment regardless of the quiz flag', () => {
      component.isQuiz = 'Quiz'
      component.courseCompetency = true
      component.uploadJson([question()], 'quiz.json')
      expect(payload.isAssessment).toBe(true)
    })

    it('converts the assessment duration into a second-based time limit', () => {
      component.assessmentDuration = 5
      component.uploadJson([question()], 'quiz.json')
      expect(payload.timeLimit).toBe(300)
    })

    it('falls back to the loaded question count when no random count is set', () => {
      component.randomCount = 0 as any
      component.questionsArr = [question(), question()]
      component.uploadJson(component.questionsArr, 'quiz.json')
      expect(payload.randomCount).toBe(2)
    })

    it('honours an explicit random count', () => {
      component.randomCount = 1 as any
      component.uploadJson([question(), question()], 'quiz.json')
      expect(payload.randomCount).toBe(1)
    })

    it('uploads against the current content id', () => {
      component.uploadJson([question()], 'quiz.json')
      expect(uploadService.encodedUploadAWS.mock.calls[0][2].contentId).toBe('do_1')
    })
  })

  describe('save', () => {
    beforeEach(() => {
      component.resourceType = 'Quiz'
      component.questionsArr = [question()]
      quizStoreSvc.hasChanged = true
      jest.spyOn(component, 'wrapperForTriggerSave').mockReturnValue(of({}) as any)
    })

    it('saves and confirms when the quiz is valid and dirty', () => {
      component.isValid = true
      component.canEditJson = false

      component.save()

      expect(component.wrapperForTriggerSave).toHaveBeenCalled()
      expect(component.canValidate).toBe(false)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('validates the json first when json editing is enabled', () => {
      component.canEditJson = true
      const spy = jest.spyOn(component, 'checkValidity').mockImplementation(() => {
        component.isValid = true
      })

      component.save()

      expect(spy).toHaveBeenCalled()
    })

    it('sends the user back to the question step when the quiz is invalid', () => {
      component.canEditJson = false
      component.isValid = false

      component.save()

      expect(component.currentStep).toBe(2)
      expect(component.wrapperForTriggerSave).not.toHaveBeenCalled()
    })

    it('reports a failed save', () => {
      component.isValid = true
      component.canEditJson = false
      ;(component.wrapperForTriggerSave as jest.Mock).mockReturnValue(throwError(() => new Error('nope')))

      component.save()

      expect(component.canValidate).toBe(false)
      expect(loaderService.changeLoad.next).toHaveBeenCalledWith(false)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('warns that a quiz needs at least one question', () => {
      component.questionsArr = []

      component.save()

      expect(component.currentStep).toBe(2)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('warns that an assessment has not met the minimum question count', () => {
      component.resourceType = 'Assessment'
      component.questionsArr = [question()]

      component.save()

      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(component.wrapperForTriggerSave).not.toHaveBeenCalled()
    })

    it('reports that nothing needs saving when the store is clean', () => {
      quizStoreSvc.hasChanged = false

      component.save()

      expect(component.wrapperForTriggerSave).not.toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })
  })

  describe('preview', () => {
    beforeEach(() => {
      component.resourceType = 'Quiz'
      component.questionsArr = [question()]
      jest.spyOn(component, 'wrapperForTriggerSave').mockReturnValue(of({}) as any)
    })

    it('previews straight away when nothing is pending', () => {
      quizStoreSvc.hasChanged = false
      metaContentService.upDatedContent = { do_1: {} }

      component.preview()

      expect(component.previewMode).toBe(true)
      expect(component.wrapperForTriggerSave).not.toHaveBeenCalled()
    })

    it('saves before previewing when there are unsaved changes', () => {
      quizStoreSvc.hasChanged = true
      component.isValid = true
      jest.spyOn(component, 'checkValidity').mockImplementation(() => undefined)

      component.preview()

      expect(component.wrapperForTriggerSave).toHaveBeenCalled()
      expect(component.previewMode).toBe(true)
    })

    it('stays out of preview when the save fails', () => {
      quizStoreSvc.hasChanged = true
      component.isValid = true
      jest.spyOn(component, 'checkValidity').mockImplementation(() => undefined)
      ;(component.wrapperForTriggerSave as jest.Mock).mockReturnValue(throwError(() => new Error('nope')))

      component.preview()

      expect(component.previewMode).toBe(false)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('does not preview an invalid quiz', () => {
      quizStoreSvc.hasChanged = true
      jest.spyOn(component, 'checkValidity').mockImplementation(() => {
        component.isValid = false
      })

      component.preview()

      expect(component.wrapperForTriggerSave).not.toHaveBeenCalled()
      expect(component.previewMode).toBe(false)
    })

    it('refuses to preview an empty assessment', () => {
      component.resourceType = 'Assessment'
      component.questionsArr = []

      component.preview()

      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(component.previewMode).toBe(false)
    })

    it('refuses to preview an assessment below the minimum question count', () => {
      component.resourceType = 'Assessment'
      component.questionsArr = [question()]

      component.preview()

      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(component.previewMode).toBe(false)
    })
  })

  describe('validationCheck', () => {
    beforeEach(() => {
      component.resourceType = 'Quiz'
      component.questionsArr = [question()]
    })

    it('passes a clean, valid quiz', done => {
      quizStoreSvc.hasChanged = false
      component.validationCheck().subscribe(v => {
        expect(v).toBe(true)
        done()
      })
    })

    it('fails an empty assessment and returns to the question step', done => {
      component.resourceType = 'Assessment'
      component.questionsArr = []

      component.validationCheck().subscribe(v => {
        expect(v).toBe(false)
        expect(component.currentStep).toBe(2)
        done()
      })
    })

    it('fails an assessment below the minimum question count', done => {
      component.resourceType = 'Assessment'
      component.questionsArr = [question()]

      component.validationCheck().subscribe(v => {
        expect(v).toBe(false)
        expect(component.currentStep).toBe(2)
        done()
      })
    })

    it('fails and jumps to the meta step when mandatory fields are missing', done => {
      metaContentService.isValid.mockReturnValue(false)

      component.validationCheck().subscribe(v => {
        expect(v).toBe(false)
        expect(component.submitPressed).toBe(true)
        expect(component.currentStep).toBe(3)
        done()
      })
    })

    it('saves first when the quiz is dirty but valid', done => {
      quizStoreSvc.hasChanged = true
      component.isValid = true
      jest.spyOn(component, 'checkValidity').mockImplementation(() => undefined)
      jest.spyOn(component, 'wrapperForTriggerSave').mockReturnValue(of({}) as any)

      component.validationCheck().subscribe(v => {
        expect(v).toBe(true)
        expect(component.wrapperForTriggerSave).toHaveBeenCalled()
        done()
      })
    })

    it('fails without saving when the dirty quiz is invalid', done => {
      quizStoreSvc.hasChanged = true
      jest.spyOn(component, 'checkValidity').mockImplementation(() => {
        component.isValid = false
      })

      component.validationCheck().subscribe(v => {
        expect(v).toBe(false)
        done()
      })
    })
  })
})
