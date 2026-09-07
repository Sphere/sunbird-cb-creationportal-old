import { of, Subject, throwError } from 'rxjs'
import { QuizComponent } from './quiz.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

/**
 * QuizComponent has 15 injected collaborators and a very large template, so it is
 * instantiated directly with mocked collaborators per the project house rule. The
 * sibling quiz.component.spec.ts keeps the shallow TestBed render test.
 */
describe('QuizComponent (direct instantiation)', () => {
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
  let uploadMessage: Subject<any>
  let updateAssessmentMessage: Subject<any>
  let isAssessmentOrQuizMessage: Subject<any>
  let changeActiveCont: Subject<string>
  let afterClosed: Subject<any>

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

  const meta = (over: any = {}) =>
    ({
      identifier: 'do_1',
      status: 'Draft',
      categoryType: 'Quiz',
      creatorContacts: [{ id: 'u1' }],
      publisherDetails: [{ id: 'u1' }],
      ...over,
    }) as any

  /** A single answered MCQ. */
  const question = (over: any = {}) => ({
    questionId: 'Q100',
    question: 'What is 2+2?',
    questionType: 'mcq-sca',
    multiSelection: false,
    options: [
      { text: '4', optionId: 'Q100-a', isCorrect: true },
      { text: '5', optionId: 'Q100-b', isCorrect: false },
    ],
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
    sessionStorage.clear()
    uploadMessage = new Subject<any>()
    updateAssessmentMessage = new Subject<any>()
    isAssessmentOrQuizMessage = new Subject<any>()
    changeActiveCont = new Subject<string>()
    afterClosed = new Subject<any>()

    router = { navigateByUrl: jest.fn(), url: '/author/editor/do_1/quiz' }
    activateRoute = { parent: null }
    cdr = { detach: jest.fn(), detectChanges: jest.fn(), markForCheck: jest.fn() }
    breakpointObserver = { observe: jest.fn().mockReturnValue(of({ matches: false })) }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }) }
    snackBar = { openFromComponent: jest.fn() }
    quizStoreSvc = {
      collectiveQuiz: {},
      currentId: 'do_1',
      hasChanged: false,
      selectedQuizIndex: of(0),
      getQuizConfig: jest.fn().mockReturnValue({}),
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
      createInAnotherLanguage: jest.fn().mockReturnValue(of(meta({ identifier: 'do_2' }))),
    }
    uploadService = { upload: jest.fn().mockReturnValue(of({ artifactURL: 'a.json' })) }
    editorService = {
      updateContent: jest.fn().mockReturnValue(of({ ok: true })),
      forwardBackward: jest.fn().mockReturnValue(of({ ok: true })),
      deleteContent: jest.fn().mockReturnValue(of({ ok: true })),
    }
    notificationSvc = { triggerPushPullNotification: jest.fn().mockReturnValue(of({ ok: true })) }
    initService = {
      uploadMessage,
      updateAssessmentMessage,
      isAssessmentOrQuizMessage,
      ordinals: { subTitles: ['en', 'hi'] },
    }
    quizResolverSvc = { canEdit: jest.fn().mockReturnValue(true) }
    accessControl = { rootOrg: 'sunbird', userId: 'u1', hasRole: jest.fn().mockReturnValue(false) }

    component = build()
    component.currentId = 'do_1'
  })

  afterEach(() => {
    sessionStorage.clear()
    jest.clearAllMocks()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('constructor wiring', () => {
    it('saves on any upload message other than "save"', () => {
      const spy = jest.spyOn(component, 'save').mockImplementation(() => {})
      uploadMessage.next('upload')
      expect(spy).toHaveBeenCalled()
    })

    it('does not re-save on the "save" message', () => {
      const spy = jest.spyOn(component, 'save').mockImplementation(() => {})
      uploadMessage.next('save')
      expect(spy).not.toHaveBeenCalled()
    })

    it('reloads when an assessment update arrives', () => {
      const spy = jest.spyOn(component, 'ngOnInit').mockImplementation(() => {})
      updateAssessmentMessage.next({ identifier: 'do_9' })
      expect(metaContentService.currentContent).toBe('do_9')
      expect(spy).toHaveBeenCalled()
    })

    it('ignores a falsy assessment update', () => {
      const spy = jest.spyOn(component, 'ngOnInit').mockImplementation(() => {})
      updateAssessmentMessage.next(null)
      expect(spy).not.toHaveBeenCalled()
    })

    // isAssessment is the server's flag: true is an assessment, false is a quiz.
    // This previously asserted the mapping the other way round, pinning the
    // inversion that showed quizzes as assessments in the player and the TOC.
    it('switches the label between Quiz and Assessment', () => {
      isAssessmentOrQuizMessage.next(false)
      expect(component.isQuiz).toBe('Quiz')
      isAssessmentOrQuizMessage.next(true)
      expect(component.isQuiz).toBe('Assessment')
    })
  })

  it('ngOnDestroy detaches change detection and releases subscriptions', () => {
    component.activeIndexSubscription = { unsubscribe: jest.fn() } as any
    component.activeContentSubscription = { unsubscribe: jest.fn() } as any
    component.ngOnDestroy()
    expect(cdr.detach).toHaveBeenCalled()
    expect(component.activeIndexSubscription!.unsubscribe).toHaveBeenCalled()
    expect(component.activeContentSubscription!.unsubscribe).toHaveBeenCalled()
  })

  it('ngOnDestroy is safe with nothing subscribed', () => {
    expect(() => component.ngOnDestroy()).not.toThrow()
  })

  it('ngOnChanges clears the assessment settings', () => {
    component.assessmentDuration = '300'
    component.passPercentage = 60
    component.randomCount = 5
    component.ngOnChanges()
    expect(component.assessmentDuration).toBe('')
    expect(component.passPercentage).toBe('')
    expect(component.randomCount).toBe('')
  })

  describe('isAtLeastOneQuestionPresent', () => {
    it('is false for an empty quiz', () => {
      component.questionsArr = []
      expect(component.isAtLeastOneQuestionPresent()).toBe(false)
    })

    it('is false when the question text is blank', () => {
      component.questionsArr = [question({ question: '   ' })]
      expect(component.isAtLeastOneQuestionPresent()).toBe(false)
    })

    it('is false when no option carries text', () => {
      component.questionsArr = [question({ options: [{ text: '  ', optionId: 'a', isCorrect: false }] })]
      expect(component.isAtLeastOneQuestionPresent()).toBe(false)
    })

    it('is true for a filled-in question', () => {
      component.questionsArr = [question()]
      expect(component.isAtLeastOneQuestionPresent()).toBe(true)
    })

    it('questionType records the chosen type', () => {
      component.questionsArr = []
      component.questionType('mcq-mca')
      expect(component.questionTypeText).toBe('mcq-mca')
    })
  })

  describe('uploadFileModal', () => {
    beforeEach(() => {
      component.uploadFile = { nativeElement: { click: jest.fn() } } as any
    })

    it('opens the file picker directly for an empty quiz', () => {
      component.questionsArr = []
      component.uploadFileModal()
      expect(dialog.open).not.toHaveBeenCalled()
      expect(component.uploadFile.nativeElement.click).toHaveBeenCalled()
    })

    it('warns before replacing existing questions', () => {
      component.questionsArr = [question()]
      component.uploadFileModal()
      expect(dialog.open).toHaveBeenCalled()
      afterClosed.next(true)
      expect(component.uploadFile.nativeElement.click).toHaveBeenCalled()
    })

    it('does nothing when the replace warning is dismissed', () => {
      component.questionsArr = [question()]
      component.uploadFileModal()
      afterClosed.next(false)
      expect(component.uploadFile.nativeElement.click).not.toHaveBeenCalled()
    })
  })

  describe('convertExcelToJson', () => {
    it('rejects a non-Excel file', () => {
      component.convertExcelToJson(new File(['x'], 'notes.txt'))
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: { type: Notify.UPLOAD_EXCEL_FILE } }),
      )
    })

    it('rejects a file with no extension', () => {
      component.convertExcelToJson(new File(['x'], 'notes'))
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('accepts an xlsx file and starts reading it', () => {
      const readAsArrayBuffer = jest.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(() => {})
      component.convertExcelToJson(new File(['x'], 'questions.xlsx'))
      expect(readAsArrayBuffer).toHaveBeenCalled()
      readAsArrayBuffer.mockRestore()
    })
  })

  describe('generateQuizJson', () => {
    const headers = ['Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5', 'Option 6', 'Correct Answer']

    beforeEach(() => {
      component.resourceDetails = { isAssessment: true } as any
    })

    it('builds a single-answer question from a sheet row', () => {
      const json = component.generateQuizJson([headers, ['2+2?', '4', '5', '', '', '', '', '1']])
      expect(json.questions.length).toBe(1)
      expect(json.questions[0]).toEqual({
        questionId: 'Q100',
        question: '2+2?',
        questionType: 'mcq-sca',
        multiSelection: false,
        options: [
          { text: '4', optionId: 'Q100-a', isCorrect: true },
          { text: '5', optionId: 'Q100-b', isCorrect: false },
        ],
      })
    })

    it('marks a row with several correct answers as multi-select', () => {
      const json = component.generateQuizJson([headers, ['Pick two', 'a', 'b', 'c', '', '', '', '1,3']])
      expect(json.questions[0].questionType).toBe('mcq-mca')
      expect(json.questions[0].multiSelection).toBe(true)
      expect(json.questions[0].options.map((o: any) => o.isCorrect)).toEqual([true, false, true])
    })

    it('keeps only the options up to the last filled one', () => {
      const json = component.generateQuizJson([headers, ['Q', 'a', 'b', '', '', '', '', '1']])
      expect(json.questions[0].options.length).toBe(2)
    })

    it('skips a row with no question text', () => {
      const json = component.generateQuizJson([headers, ['', 'a', 'b', '', '', '', '', '1']])
      expect(json.questions).toEqual([])
    })

    it('skips a row with no correct answer', () => {
      const json = component.generateQuizJson([headers, ['Q', 'a', 'b', '', '', '', '', '']])
      expect(json.questions).toEqual([])
    })

    it('skips an empty row', () => {
      const json = component.generateQuizJson([headers, [], ['Q', 'a', 'b', '', '', '', '', '1']])
      expect(json.questions.length).toBe(1)
    })

    it('caps the import at 500 questions', () => {
      const rows = Array.from({ length: 600 }, (_, i) => [`Q${i}`, 'a', 'b', '', '', '', '', '1'])
      const json = component.generateQuizJson([headers, ...rows])
      expect(json.questions.length).toBe(500)
    })

    it('carries the assessment flag and resets the settings', () => {
      component.assessmentDuration = '300'
      const json = component.generateQuizJson([headers, ['Q', 'a', 'b', '', '', '', '', '1']])
      expect(json.isAssessment).toBe(true)
      expect(component.assessmentDuration).toBe('')
      expect(component.passPercentage).toBe('')
      expect(component.randomCount).toBe('')
    })
  })

  describe('downloads', () => {
    it('downloadTemplate triggers the sample workbook download', () => {
      const click = jest.fn()
      const anchor = { href: '', download: '', click } as any
      jest.spyOn(document, 'createElement').mockReturnValueOnce(anchor)
      component.downloadTemplate()
      expect(anchor.download).toBe('Sample_Bulk_Upload_Template.xlsx')
      expect(click).toHaveBeenCalled()
    })

    it('downloadUploadedQuestion exports the current questions', () => {
      const click = jest.fn()
      const anchor = { href: '', download: '', click } as any
      jest.spyOn(document, 'createElement').mockReturnValueOnce(anchor)
      ;(URL as any).createObjectURL = jest.fn().mockReturnValue('blob:x')
      ;(URL as any).revokeObjectURL = jest.fn()
      component.questionsArr = [question({ question: '<p>2+2?</p>' })]
      component.downloadUploadedQuestion()
      expect(anchor.download).toBe('Uploaded_Questions.xlsx')
      expect(click).toHaveBeenCalled()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x')
    })
  })

  describe('addTodo', () => {
    it('records the pass percentage and marks the quiz dirty', () => {
      component.addTodo(60, 'passPercentage')
      expect(component.passPercentage).toBe(60)
      expect(component.validPercentage).toBe(true)
      expect(quizStoreSvc.hasChanged).toBe(true)
      expect(metaContentService.setUpdatedMeta).toHaveBeenCalledWith({ passPercentage: 60 }, 'do_1', true)
    })

    it('clamps a pass percentage above 100', () => {
      component.addTodo(150, 'passPercentage')
      expect(component.passPercentage).toBe(100)
      expect(metaContentService.setUpdatedMeta).toHaveBeenCalledWith({ passPercentage: 100 }, 'do_1', true)
    })

    it('marks a null pass percentage invalid', () => {
      component.addTodo(null, 'passPercentage')
      expect(component.validPercentage).toBe(false)
    })

    it('marks a negative pass percentage invalid', () => {
      component.addTodo(-1, 'passPercentage')
      expect(component.validPercentage).toBe(false)
    })

    it('always accepts the pass percentage for a plain quiz', () => {
      component.isQuiz = 'Quiz'
      component.addTodo(null, 'passPercentage')
      expect(component.validPercentage).toBe(true)
    })

    it('records the random question count', () => {
      component.addTodo(5, 'randomCount')
      expect(component.randomCount).toBe(5)
      expect(metaContentService.setUpdatedMeta).toHaveBeenCalledWith({ randomCount: 5 }, 'do_1', true)
    })

    it('records the assessment duration for any other field', () => {
      component.addTodo(90, 'assessmentDuration')
      expect(component.assessmentDuration).toBe(90)
      expect(metaContentService.setUpdatedMeta).toHaveBeenCalledWith({ assessmentDuration: 90 }, 'do_1', true)
    })

    it('applies the 100 clamp to every field, not just the pass percentage', () => {
      component.addTodo(300, 'assessmentDuration')
      expect(component.assessmentDuration).toBe(100)
    })
  })

  it('OpenUploadIntro opens the image upload guide', () => {
    component.OpenUploadIntro()
    expect(dialog.open).toHaveBeenCalled()
    afterClosed.next(true)
  })

  describe('navigation', () => {
    it('customStepper locks the cursor on step 1', () => {
      component.customStepper(1)
      expect(component.disableCursor).toBe(true)
    })

    it('customStepper moves to any other step', () => {
      component.customStepper(3)
      expect(component.currentStep).toBe(3)
    })

    it('changeContent activates the chosen quiz', () => {
      jest.spyOn(changeActiveCont, 'next')
      component.changeContent(meta({ identifier: 'do_9' }))
      expect(component.currentId).toBe('do_9')
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_9')
    })

    it('changeQuiz moves the selection by the given number of steps', () => {
      component.selectedQuizIndex = 2
      component.changeQuiz(1)
      expect(quizStoreSvc.changeQuiz).toHaveBeenCalledWith(3)
    })

    it('changeQuiz scrolls the newly selected quiz into view', () => {
      jest.useFakeTimers()
      const el = document.createElement('div')
      el.id = 'quiz-1'
      ;(el as any).scrollIntoView = jest.fn()
      document.body.appendChild(el)
      component.selectedQuizIndex = 0
      component.changeQuiz(1)
      jest.advanceTimersByTime(300)
      expect((el as any).scrollIntoView).toHaveBeenCalled()
      el.remove()
      jest.useRealTimers()
    })
  })

  describe('shuffle', () => {
    it('keeps every element', () => {
      const result = component.shuffle([1, 2, 3, 4])
      expect(result.sort()).toEqual([1, 2, 3, 4])
    })

    it('handles an empty list', () => {
      expect(component.shuffle([])).toEqual([])
    })
  })

  describe('shouldPreserveUnsavedQuestions', () => {
    it('is false when the store is clean', () => {
      quizStoreSvc.collectiveQuiz = { do_1: [question()] }
      expect(component.shouldPreserveUnsavedQuestions('do_1')).toBe(false)
    })

    it('is true when the store is dirty and holds questions', () => {
      quizStoreSvc.hasChanged = true
      quizStoreSvc.collectiveQuiz = { do_1: [question()] }
      expect(component.shouldPreserveUnsavedQuestions('do_1')).toBe(true)
    })

    it('is false when the store is dirty but empty for this id', () => {
      quizStoreSvc.hasChanged = true
      quizStoreSvc.collectiveQuiz = { do_1: [] }
      expect(component.shouldPreserveUnsavedQuestions('do_1')).toBe(false)
    })

    it('is false when the id is unknown', () => {
      quizStoreSvc.hasChanged = true
      expect(component.shouldPreserveUnsavedQuestions('do_nope')).toBe(false)
    })
  })

  describe('checkValidity', () => {
    it('marks the quiz valid when nothing fails', () => {
      component.questionsArr = [question()]
      component.checkValidity()
      expect(component.isValid).toBe(true)
    })

    it('notifies about the first failure on the visible quiz', () => {
      component.questionsArr = [question()]
      component.selectedQuizIndex = 0
      quizStoreSvc.validateQuiz.mockReturnValue('questionMissing')
      component.checkValidity()
      expect(component.isValid).toBe(false)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('navigates to the first failing quiz when it is not visible', () => {
      component.questionsArr = [question(), question()]
      component.selectedQuizIndex = 1
      quizStoreSvc.validateQuiz.mockReturnValue('questionMissing')
      component.checkValidity()
      expect(quizStoreSvc.changeQuiz).toHaveBeenCalledWith(0)
      expect(component.isValid).toBe(false)
    })
  })

  describe('action', () => {
    it('next advances the stepper', () => {
      component.currentStep = 1
      component.action('next')
      expect(component.currentStep).toBe(2)
    })

    it('preview, save and push delegate to their handlers', () => {
      const preview = jest.spyOn(component, 'preview').mockImplementation(() => {})
      const save = jest.spyOn(component, 'save').mockImplementation(() => {})
      const take = jest.spyOn(component, 'takeAction').mockImplementation(() => {})
      component.action('preview')
      expect(preview).toHaveBeenCalled()
      component.action('save')
      expect(save).toHaveBeenCalled()
      component.action('push')
      expect(take).toHaveBeenCalled()
    })

    it('delete drops the quiz and returns home once confirmed', () => {
      component.allContents = [meta()]
      component.action('delete')
      afterClosed.next(true)
      expect(component.allContents).toEqual([])
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('delete activates the next quiz when others remain', () => {
      jest.spyOn(changeActiveCont, 'next')
      component.allContents = [meta(), meta({ identifier: 'do_2' })]
      component.action('delete')
      afterClosed.next(true)
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_2')
    })

    it('delete keeps the quiz when dismissed', () => {
      component.allContents = [meta()]
      component.action('delete')
      afterClosed.next(false)
      expect(component.allContents.length).toBe(1)
    })

    it('close returns to the author home', () => {
      component.action('close')
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('ignores an unknown action', () => {
      component.currentStep = 2
      component.action('nope')
      expect(component.currentStep).toBe(2)
    })
  })

  describe('delete', () => {
    it('removes the quiz and returns home once confirmed', () => {
      component.allContents = [meta()]
      component.delete()
      afterClosed.next(true)
      expect(editorService.deleteContent).toHaveBeenCalledWith('do_1')
      expect(component.allContents).toEqual([])
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('activates the next quiz when others remain', () => {
      jest.spyOn(changeActiveCont, 'next')
      component.allContents = [meta(), meta({ identifier: 'do_2' })]
      component.delete()
      afterClosed.next(true)
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_2')
    })

    it('does nothing when the confirmation is dismissed', () => {
      component.delete()
      afterClosed.next(false)
      expect(editorService.deleteContent).not.toHaveBeenCalled()
    })

    it('reports a failed delete', () => {
      editorService.deleteContent.mockReturnValue(throwError(() => 'boom'))
      component.delete()
      afterClosed.next(true)
      expect(loaderService.changeLoad.next).toHaveBeenCalledWith(false)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })
  })

  describe('getMessage', () => {
    const cases: Array<[string, string, string]> = [
      ['Draft', Notify.SEND_FOR_REVIEW_SUCCESS, Notify.SEND_FOR_REVIEW_FAIL],
      ['Live', Notify.SEND_FOR_REVIEW_SUCCESS, Notify.SEND_FOR_REVIEW_FAIL],
      ['InReview', Notify.REVIEW_SUCCESS, Notify.REVIEW_FAIL],
      ['Reviewed', Notify.PUBLISH_SUCCESS, Notify.PUBLISH_FAIL],
    ]

    cases.forEach(([status, success, failure]) => {
      it(`maps ${status} to its success and failure messages`, () => {
        metaContentService.originalContent = { do_1: meta({ status }) }
        expect(component.getMessage('success')).toBe(success)
        expect(component.getMessage('failure')).toBe(failure)
      })
    })

    it('returns an empty message for an unknown status', () => {
      metaContentService.originalContent = { do_1: meta({ status: 'Nope' }) }
      expect(component.getMessage('success')).toBe('')
      expect(component.getMessage('failure')).toBe('')
    })
  })

  describe('getAction', () => {
    it('offers review for draft and live quizzes', () => {
      expect(component.getAction()).toBe('sendForReview')
      metaContentService.originalContent = { do_1: meta({ status: 'Live' }) }
      expect(component.getAction()).toBe('sendForReview')
    })

    it('offers review actions while under review', () => {
      metaContentService.originalContent = { do_1: meta({ status: 'InReview' }) }
      expect(component.getAction()).toBe('review')
      metaContentService.originalContent = { do_1: meta({ status: 'QualityReview' }) }
      expect(component.getAction()).toBe('review')
    })

    it('offers publish once reviewed', () => {
      metaContentService.originalContent = { do_1: meta({ status: 'Reviewed' }) }
      expect(component.getAction()).toBe('publish')
    })

    it('defaults to review for an unknown status', () => {
      metaContentService.originalContent = { do_1: meta({ status: 'Nope' }) }
      expect(component.getAction()).toBe('sendForReview')
    })
  })

  describe('permissions and small helpers', () => {
    it('isPublisherSame matches the signed-in publisher', () => {
      expect(component.isPublisherSame()).toBe(true)
    })

    it('isPublisherSame is false for another publisher', () => {
      metaContentService.getUpdatedMeta.mockReturnValue(meta({ publisherDetails: [{ id: 'other' }] }))
      expect(component.isPublisherSame()).toBe(false)
    })

    it('isDirectPublish is true for a draft owned by the publisher', () => {
      expect(component.isDirectPublish()).toBe(true)
    })

    it('isDirectPublish is false once under review', () => {
      metaContentService.originalContent = { do_1: meta({ status: 'InReview' }) }
      expect(component.isDirectPublish()).toBe(false)
    })

    it('canDelete allows an editor or admin', () => {
      accessControl.hasRole.mockReturnValue(true)
      expect(component.canDelete()).toBeTruthy()
    })

    it('canDelete allows the creator of a draft', () => {
      expect(component.canDelete()).toBeTruthy()
    })

    it('canDelete refuses another author', () => {
      metaContentService.originalContent = { do_1: meta({ creatorContacts: [{ id: 'other' }] }) }
      expect(component.canDelete()).toBeFalsy()
    })

    it('canDelete refuses once the quiz is under review', () => {
      metaContentService.originalContent = { do_1: meta({ status: 'InReview' }) }
      expect(component.canDelete()).toBeFalsy()
    })

    it('showNotification raises a snackbar of the given type', () => {
      component.showNotification(Notify.SUCCESS)
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: { type: Notify.SUCCESS } }),
      )
    })

    it('closePreview leaves preview mode', () => {
      component.previewMode = true
      component.closePreview()
      expect(component.previewMode).toBe(false)
    })

    it('toggleSettingButtons flips the settings panel', () => {
      component.showSettingButtons = false
      component.toggleSettingButtons()
      expect(component.showSettingButtons).toBe(true)
    })
  })

  describe('triggerUpload', () => {
    it('uploads the answer key alongside the blind copy for an assessment', () => {
      metaContentService.getUpdatedMeta.mockReturnValue(meta({ categoryType: 'Assessment' }))
      const spy = jest.spyOn(component, 'uploadJson').mockReturnValue(of({ ok: true }) as any)
      component.triggerUpload([question()]).subscribe()
      expect(spy).toHaveBeenCalledTimes(2)
    })

    it('uploads a single file for a plain quiz', () => {
      const spy = jest.spyOn(component, 'uploadJson').mockReturnValue(of({ ok: true }) as any)
      component.triggerUpload([question()]).subscribe()
      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('strips the answers from the blind copy of an assessment', () => {
      metaContentService.getUpdatedMeta.mockReturnValue(meta({ categoryType: 'Assessment' }))
      const spy = jest.spyOn(component, 'uploadJson').mockReturnValue(of({ ok: true }) as any)
      component.triggerUpload([question()]).subscribe()
      const blind = spy.mock.calls[0][0] as any[]
      expect(blind[0].options.every((o: any) => o.isCorrect === false)).toBe(true)
    })

    it('blanks the option text for a fill-in-the-blanks question', () => {
      metaContentService.getUpdatedMeta.mockReturnValue(meta({ categoryType: 'Assessment' }))
      const spy = jest.spyOn(component, 'uploadJson').mockReturnValue(of({ ok: true }) as any)
      component.triggerUpload([question({ questionType: 'fitb' })]).subscribe()
      const blind = spy.mock.calls[0][0] as any[]
      expect(blind[0].options.every((o: any) => o.text === '')).toBe(true)
    })

    it('reshuffles the matches for a match-the-following question', () => {
      metaContentService.getUpdatedMeta.mockReturnValue(meta({ categoryType: 'Assessment' }))
      const spy = jest.spyOn(component, 'uploadJson').mockReturnValue(of({ ok: true }) as any)
      component
        .triggerUpload([
          question({
            questionType: 'mtf',
            options: [
              { text: 'a', match: 'A', isCorrect: true },
              { text: 'b', match: 'B', isCorrect: true },
            ],
          }),
        ])
        .subscribe()
      const blind = spy.mock.calls[0][0] as any[]
      expect(blind[0].options.map((o: any) => o.match).sort()).toEqual(['A', 'B'])
    })

    it('keeps the answers in the saved copy', () => {
      const spy = jest.spyOn(component, 'uploadJson').mockReturnValue(of({ ok: true }) as any)
      component.triggerUpload([question()]).subscribe()
      const saved = spy.mock.calls[0][0] as any[]
      expect(saved[0].options[0].isCorrect).toBe(true)
    })
  })

  describe('createInAnotherLanguage', () => {
    it('adds and activates the new translation', () => {
      jest.spyOn(changeActiveCont, 'next')
      component.createInAnotherLanguage('hi')
      expect(component.allContents.length).toBe(1)
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_2')
    })

    it('reports that the translation already exists', () => {
      metaContentService.createInAnotherLanguage.mockReturnValue(of(true))
      component.createInAnotherLanguage('hi')
      expect(component.allContents.length).toBe(0)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('reports a failed translation', () => {
      metaContentService.createInAnotherLanguage.mockReturnValue(throwError(() => ({ status: 500 })))
      component.createInAnotherLanguage('hi')
      expect(loaderService.changeLoad.next).toHaveBeenCalledWith(false)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })
  })
})
