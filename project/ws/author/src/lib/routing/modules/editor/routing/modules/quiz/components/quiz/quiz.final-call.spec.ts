import { of, Subject, throwError } from 'rxjs'
import { QuizComponent } from './quiz.component'

/**
 * Wave 18 — `finalCall`: the operation code it derives from the reviewer's verdict
 * and the org's workflow, and the success / conflict handling of the save chain.
 */
describe('QuizComponent (workflow finalCall)', () => {
  let component: QuizComponent
  let router: any
  let dialog: any
  let snackBar: any
  let quizStoreSvc: any
  let loaderService: any
  let metaContentService: any
  let editorService: any
  let notificationSvc: any
  let accessControl: any
  let changeActiveCont: Subject<string>

  const currentId = 'do_1'

  const commentsForm = (action = 'accept', comments = 'looks good') =>
    ({ controls: { comments: { value: comments }, action: { value: action } } }) as any

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

  beforeEach(() => {
    sessionStorage.clear()
    changeActiveCont = new Subject<string>()
    router = { navigateByUrl: jest.fn(), url: '/author/editor/do_1/quiz' }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => of(false) }) }
    snackBar = { openFromComponent: jest.fn() }
    quizStoreSvc = {
      collectiveQuiz: { [currentId]: [] },
      currentId,
      hasChanged: false,
      selectedQuizIndex: of(0),
      getQuizConfig: jest.fn().mockReturnValue({}),
      changeQuiz: jest.fn(),
      validateQuiz: jest.fn().mockReturnValue(null),
    }
    loaderService = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    metaContentService = {
      changeActiveCont,
      currentContent: currentId,
      parentContent: 'do_course',
      originalContent: { [currentId]: { status: 'Draft', publisherDetails: [{ id: 'u1' }] } },
      upDatedContent: {},
      getUpdatedMeta: jest.fn().mockReturnValue({ identifier: currentId, publisherDetails: [{ id: 'u1' }] }),
      getOriginalMeta: jest.fn().mockReturnValue({ identifier: currentId }),
      setUpdatedMeta: jest.fn(),
      resetOriginalMeta: jest.fn(),
    }
    editorService = {
      updateContent: jest.fn().mockReturnValue(of({})),
      updateNewContentV3: jest.fn().mockReturnValue(of({})),
      forwardBackward: jest.fn().mockReturnValue(of({ ok: true })),
      deleteContent: jest.fn().mockReturnValue(of({})),
      readcontentV3: jest.fn().mockReturnValue(of({})),
    }
    notificationSvc = { triggerPushPullNotification: jest.fn().mockReturnValue(of({ ok: true })) }
    accessControl = {
      rootOrg: 'sunbird',
      userId: 'u1',
      hasRole: jest.fn().mockReturnValue(false),
      authoringConfig: { isMultiStepFlow: false },
    }

    component = new QuizComponent(
      router,
      { parent: null } as any,
      { detach: jest.fn(), detectChanges: jest.fn(), markForCheck: jest.fn() } as any,
      { observe: jest.fn().mockReturnValue(of({ matches: false })) } as any,
      dialog,
      snackBar,
      quizStoreSvc,
      loaderService,
      metaContentService,
      { upload: jest.fn().mockReturnValue(of({})) } as any,
      editorService,
      notificationSvc,
      {
        uploadMessage: new Subject<any>(),
        updateAssessmentMessage: new Subject<any>(),
        isAssessmentOrQuizMessage: new Subject<any>(),
        ordinals: { subTitles: ['en'] },
      } as any,
      { canEdit: jest.fn().mockReturnValue(true) } as any,
      accessControl,
    )
    component.currentId = currentId
    component.allContents = [{ identifier: currentId }, { identifier: 'do_2' }] as any
    jest.spyOn(component, 'getMessage').mockImplementation((t: any) => (t === 'success' ? 'OK' : 'FAIL') as any)
  })

  afterEach(() => {
    sessionStorage.clear()
    jest.clearAllMocks()
  })

  const sentBody = () => editorService.forwardBackward.mock.calls[0][0]

  describe('the operation code', () => {
    it('moves a draft forward as operation 1', () => {
      component.finalCall(commentsForm('accept'))
      expect(sentBody()).toEqual({ comment: 'looks good', operation: 1 })
    })

    it('sends a rejection of in-review content as operation 0', () => {
      metaContentService.originalContent = { [currentId]: { status: 'InReview' } }
      component.finalCall(commentsForm('reject'))
      expect(sentBody().operation).toBe(0)
    })

    it('accepts in-review content as operation 1', () => {
      metaContentService.originalContent = { [currentId]: { status: 'InReview' } }
      component.finalCall(commentsForm('accept'))
      expect(sentBody().operation).toBe(1)
    })

    it('publishes straight through on a single-step org', () => {
      accessControl.rootOrg = 'client1'
      component.finalCall(commentsForm('accept'))
      expect(sentBody().operation).toBe(100000)
    })

    it('publishes straight through on a multi-step org when the publisher matches', () => {
      accessControl.rootOrg = 'client1'
      accessControl.authoringConfig.isMultiStepFlow = true
      component.finalCall(commentsForm('accept'))
      expect(sentBody().operation).toBe(100000)
    })

    it('keeps the normal step on a multi-step org when the publisher differs', () => {
      accessControl.rootOrg = 'client1'
      accessControl.authoringConfig.isMultiStepFlow = true
      metaContentService.getUpdatedMeta.mockReturnValue({ identifier: currentId, publisherDetails: [{ id: 'other' }] })
      component.finalCall(commentsForm('accept'))
      expect(sentBody().operation).toBe(1)
    })

    it('copes with content that lists no publishers', () => {
      metaContentService.getUpdatedMeta.mockReturnValue({ identifier: currentId })
      expect(component.isPublisherSame()).toBe(false)
    })

    it('does nothing without a comment form', () => {
      component.finalCall(undefined as any)
      expect(editorService.forwardBackward).not.toHaveBeenCalled()
    })
  })

  describe('the save chain', () => {
    it('saves the pending questions before moving the content on', () => {
      const trigger = jest.spyOn(component, 'triggerSave').mockReturnValue(of({}) as any)
      metaContentService.upDatedContent = { [currentId]: { name: 'changed' } }
      component.finalCall(commentsForm())
      expect(trigger).toHaveBeenCalled()
    })

    it('skips the save when nothing changed', () => {
      const trigger = jest.spyOn(component, 'triggerSave').mockReturnValue(of({}) as any)
      component.finalCall(commentsForm())
      expect(trigger).not.toHaveBeenCalled()
      expect(editorService.forwardBackward).toHaveBeenCalled()
    })

    it('moves to the next assessment once this one is done', () => {
      const next = jest.spyOn(changeActiveCont, 'next')
      component.finalCall(commentsForm())
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: 'OK' },
        duration: expect.any(Number),
      })
      expect(next).toHaveBeenCalledWith('do_2')
    })

    it('goes home when it was the last assessment', () => {
      component.allContents = [{ identifier: currentId }] as any
      component.finalCall(commentsForm())
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('swallows a failure from the notification service', () => {
      notificationSvc.triggerPushPullNotification.mockReturnValue(throwError(() => new Error('smtp')))
      component.finalCall(commentsForm())
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: 'OK' },
        duration: expect.any(Number),
      })
    })

    it('opens the error parser when the move conflicts', () => {
      editorService.forwardBackward.mockReturnValue(throwError(() => ({ status: 409, error: {} })))
      component.finalCall(commentsForm())
      expect(dialog.open).toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: 'FAIL' },
        duration: expect.any(Number),
      })
    })

    it('only notifies on a non-conflict failure', () => {
      editorService.forwardBackward.mockReturnValue(throwError(() => ({ status: 500 })))
      component.finalCall(commentsForm())
      expect(dialog.open).not.toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: 'FAIL' },
        duration: expect.any(Number),
      })
    })
  })

  describe('isDirectPublish', () => {
    it.each(['Draft', 'Live'])('lets a matching publisher publish %s content directly', status => {
      metaContentService.originalContent = { [currentId]: { status } }
      expect(component.isDirectPublish()).toBe(true)
    })

    it('does not offer a direct publish on in-review content', () => {
      metaContentService.originalContent = { [currentId]: { status: 'InReview' } }
      expect(component.isDirectPublish()).toBe(false)
    })

    it('does not offer a direct publish to a different publisher', () => {
      metaContentService.getUpdatedMeta.mockReturnValue({ identifier: currentId, publisherDetails: [{ id: 'other' }] })
      expect(component.isDirectPublish()).toBe(false)
    })
  })
})
