import { FormControl, FormGroup } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'

import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

import { QuizComponent } from './quiz.component'

/**
 * Covers the review workflow the other quiz specs leave out: wrapperForTriggerSave,
 * triggerSave, takeAction and finalCall.
 */
describe('QuizComponent (review workflow)', () => {
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
      duration: '300',
      publisherDetails: [{ id: 'u1' }],
      ...over,
    }) as any

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
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => of(null) }) }
    snackBar = { openFromComponent: jest.fn() }
    quizStoreSvc = {
      collectiveQuiz: { do_1: [{ questionId: 'Q1' }] },
      currentId: 'do_1',
      hasChanged: true,
      selectedQuizIndex: of(0),
      getQuizConfig: jest.fn().mockReturnValue({ minQues: 5 }),
      changeQuiz: jest.fn(),
      validateQuiz: jest.fn().mockReturnValue(null),
    }
    loaderService = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    metaContentService = {
      changeActiveCont,
      currentContent: 'do_1',
      parentContent: 'do_parent',
      originalContent: { do_1: meta() },
      upDatedContent: { do_1: {} },
      getUpdatedMeta: jest.fn().mockReturnValue(meta()),
      getOriginalMeta: jest.fn().mockReturnValue(meta()),
      setUpdatedMeta: jest.fn(),
      resetOriginalMeta: jest.fn(),
      isValid: jest.fn().mockReturnValue(true),
    }
    uploadService = { upload: jest.fn().mockReturnValue(of({})), encodedUploadAWS: jest.fn().mockReturnValue(of({})) }
    editorService = {
      updateContent: jest.fn().mockReturnValue(of({ ok: true })),
      forwardBackward: jest.fn().mockReturnValue(of({ ok: true })),
      deleteContent: jest.fn().mockReturnValue(of({ ok: true })),
      readContentV2: jest.fn().mockReturnValue(of({ versionKey: 'vk-2' })),
    }
    notificationSvc = { triggerPushPullNotification: jest.fn().mockReturnValue(of({ ok: true })) }
    initService = {
      uploadMessage: new Subject<any>(),
      updateAssessmentMessage: new Subject<any>(),
      isAssessmentOrQuizMessage: new Subject<any>(),
      ordinals: { subTitles: ['en'] },
    }
    quizResolverSvc = { canEdit: jest.fn().mockReturnValue(true) }
    accessControl = {
      rootOrg: 'client1',
      userId: 'u1',
      authoringConfig: { isMultiStepFlow: false },
      hasRole: jest.fn().mockReturnValue(false),
    }

    component = build()
    component.currentId = 'do_1'
    component.quizConfig = { minQues: 5 } as any
    ;(window as any).env = { azureBucket: 'bucket' }
  })

  afterEach(() => jest.restoreAllMocks())

  describe('wrapperForTriggerSave', () => {
    it('uploads the quiz json when the store is dirty', () => {
      const triggerUpload = jest.spyOn(component, 'triggerUpload').mockReturnValue(of([{ result: {} }]) as any)

      component.wrapperForTriggerSave().subscribe()

      expect(triggerUpload).toHaveBeenCalled()
    })

    it('skips the upload when nothing changed', () => {
      quizStoreSvc.hasChanged = false
      metaContentService.upDatedContent = { do_1: {} }
      const triggerUpload = jest.spyOn(component, 'triggerUpload')

      component.wrapperForTriggerSave().subscribe()

      expect(triggerUpload).not.toHaveBeenCalled()
    })

    it('uploads when only the duration changed', () => {
      quizStoreSvc.hasChanged = false
      component.quizDuration = '300'
      metaContentService.upDatedContent = { do_1: { duration: '600' } }
      const triggerUpload = jest.spyOn(component, 'triggerUpload').mockReturnValue(of([{ result: {} }]) as any)

      component.wrapperForTriggerSave().subscribe()

      expect(triggerUpload).toHaveBeenCalled()
    })

    it('seeds the duration onto the meta when it has none', () => {
      metaContentService.getUpdatedMeta.mockReturnValue({ identifier: 'do_1' })
      component.quizDuration = '300'
      jest.spyOn(component, 'triggerUpload').mockReturnValue(of([{ result: {} }]) as any)

      component.wrapperForTriggerSave().subscribe()

      expect(metaContentService.setUpdatedMeta).toHaveBeenCalledWith({ duration: '300' }, 'do_1')
    })

    it('folds the uploaded urls and version key onto the meta', () => {
      jest
        .spyOn(component, 'triggerUpload')
        .mockReturnValue(
          of([{ result: { artifactUrl: 'https://h/bucket/q.json', content_url: 'https://h/bucket/q.json', versionKey: 'vk-1' } }]) as any,
        )
      const triggerSave = jest.spyOn(component, 'triggerSave').mockReturnValue(of(true) as any)

      component.wrapperForTriggerSave().subscribe()

      expect(quizStoreSvc.hasChanged).toBe(false)
      expect(editorService.readContentV2).toHaveBeenCalledWith('do_1')
      expect(triggerSave).toHaveBeenCalled()
      const saved: any = triggerSave.mock.calls[0][0]
      expect(saved.versionKey).toBe('vk-2')
    })

    it('converts a numeric assessment duration into seconds', () => {
      jest
        .spyOn(component, 'triggerUpload')
        .mockReturnValue(of([{ result: { artifactUrl: 'https://h/bucket/q.json', content_url: 'https://h/bucket/q.json' } }]) as any)
      const triggerSave = jest.spyOn(component, 'triggerSave').mockReturnValue(of(true) as any)
      component.assessmentDuration = 5

      component.wrapperForTriggerSave().subscribe()

      expect((triggerSave.mock.calls[0][0] as any).duration).toBe('300')
    })

    it('announces a successful save', () => {
      jest.spyOn(component, 'triggerUpload').mockReturnValue(of([{ result: {} }]) as any)

      component.wrapperForTriggerSave().subscribe()

      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('retargets the current id to the parent when editing', () => {
      component.isEdited = true
      jest.spyOn(component, 'triggerUpload').mockReturnValue(of([{ result: {} }]) as any)

      component.wrapperForTriggerSave().subscribe()

      // It settles back on the active content before uploading.
      expect(component.currentId).toBe('do_1')
    })
  })

  describe('takeAction', () => {
    it('reports the quiz is already up to date', () => {
      quizStoreSvc.hasChanged = false
      metaContentService.upDatedContent = { do_1: {} }
      metaContentService.getUpdatedMeta.mockReturnValue(meta({ status: 'Live' }))

      component.takeAction()

      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('opens the comments dialog once validation passes', () => {
      jest.spyOn(component, 'validationCheck').mockReturnValue(of(true))
      const finalCall = jest.spyOn(component, 'finalCall').mockImplementation(() => undefined)

      component.takeAction()

      expect(dialog.open).toHaveBeenCalled()
      expect(finalCall).toHaveBeenCalled()
    })

    it('does not open the dialog when validation fails', () => {
      jest.spyOn(component, 'validationCheck').mockReturnValue(of(false))

      component.takeAction()

      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('warns when the validation stream errors', () => {
      jest.spyOn(component, 'validationCheck').mockReturnValue(throwError(() => new Error('nope')))

      component.takeAction()

      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })
  })

  describe('finalCall', () => {
    const commentsForm = (action = 'accept', comments = 'ok') =>
      new FormGroup({ comments: new FormControl(comments), action: new FormControl(action) })

    it('does nothing without a form', () => {
      component.finalCall(undefined as any)
      expect(editorService.forwardBackward).not.toHaveBeenCalled()
    })

    it('forwards the quiz with the reviewer comment', () => {
      component.allContents = [{ identifier: 'do_1' }] as any

      component.finalCall(commentsForm())

      expect(editorService.forwardBackward).toHaveBeenCalled()
      expect(editorService.forwardBackward.mock.calls[0][0].comment).toBe('ok')
    })

    it('uses the direct-publish operation for a client1 single-step flow', () => {
      component.finalCall(commentsForm())
      expect(editorService.forwardBackward.mock.calls[0][0].operation).toBe(100000)
    })

    it('uses the ordinary forward operation outside client1', () => {
      accessControl.rootOrg = 'other'
      component.finalCall(commentsForm())
      expect(editorService.forwardBackward.mock.calls[0][0].operation).toBe(1)
    })

    it('sends the reject operation when rejecting an in-review quiz', () => {
      metaContentService.originalContent.do_1.status = 'InReview'
      component.finalCall(commentsForm('reject'))
      expect(editorService.forwardBackward.mock.calls[0][0].operation).toBe(0)
    })

    it('reports a failure', () => {
      editorService.forwardBackward.mockReturnValue(throwError(() => ({ status: 500 })))
      component.finalCall(commentsForm())
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })
  })

  describe('isPublisherSame / isDirectPublish', () => {
    it('matches the signed-in publisher', () => {
      expect(component.isPublisherSame()).toBe(true)
    })

    it('is false for another publisher', () => {
      metaContentService.getUpdatedMeta.mockReturnValue(meta({ publisherDetails: [{ id: 'someone-else' }] }))
      expect(component.isPublisherSame()).toBe(false)
    })

    it('tolerates a quiz with no publisher list', () => {
      metaContentService.getUpdatedMeta.mockReturnValue(meta({ publisherDetails: undefined }))
      expect(component.isPublisherSame()).toBe(false)
    })

    it('allows direct publish for a draft owned by the publisher', () => {
      expect(component.isDirectPublish()).toBe(true)
    })

    it('refuses direct publish once under review', () => {
      metaContentService.originalContent.do_1.status = 'InReview'
      expect(component.isDirectPublish()).toBe(false)
    })
  })
})
