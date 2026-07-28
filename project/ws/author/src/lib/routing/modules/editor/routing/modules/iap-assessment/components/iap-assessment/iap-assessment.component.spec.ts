import { FormControl, FormGroup } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { IapAssessmentComponent } from './iap-assessment.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

describe('IapAssessmentComponent', () => {
  let component: IapAssessmentComponent
  let accessService: any
  let authInitService: any
  let contentService: any
  let dialog: any
  let editorService: any
  let loaderService: any
  let router: any
  let service: any
  let snackBar: any
  let changeActiveCont: Subject<string>
  let afterClosed: Subject<any>

  const meta = (over: any = {}) =>
    ({
      identifier: 'do_1',
      name: 'Assessment A',
      status: 'Draft',
      contentType: 'Resource',
      mimeType: 'application/json',
      artifactUrl: 'a.json',
      duration: 1800,
      ...over,
    }) as any

  const lastNotify = () => {
    const calls = snackBar.openFromComponent.mock.calls
    return calls[calls.length - 1][1].data.type
  }

  const build = () =>
    new IapAssessmentComponent(
      accessService,
      authInitService,
      contentService,
      dialog,
      editorService,
      loaderService,
      router,
      service,
      snackBar,
    )

  beforeEach(() => {
    changeActiveCont = new Subject<string>()
    afterClosed = new Subject<any>()
    accessService = { rootOrg: 'sunbird' }
    authInitService = { ordinals: { subTitles: ['en', 'hi'] } }
    contentService = {
      changeActiveCont,
      originalContent: { do_1: meta() },
      upDatedContent: {},
      getUpdatedMeta: jest.fn().mockReturnValue(meta()),
      getOriginalMeta: jest.fn().mockReturnValue(meta()),
      getIapContent: jest.fn().mockReturnValue({ testName: 'Assessment A' }),
      setUpdatedMeta: jest.fn(),
      setIapContent: jest.fn(),
      resetOriginalMeta: jest.fn(),
      isValid: jest.fn().mockReturnValue(true),
    }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }) }
    editorService = {
      updateContent: jest.fn().mockReturnValue(of({ ok: true })),
      forwardBackward: jest.fn().mockReturnValue(of({ ok: true })),
      deleteContent: jest.fn().mockReturnValue(of({ ok: true })),
    }
    loaderService = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    router = { navigateByUrl: jest.fn() }
    service = {
      saveContestDetails: jest.fn().mockReturnValue(of({ status: 'done' })),
      reviewContestFlow: jest.fn().mockReturnValue(of({ status: 'done' })),
      publishContest: jest.fn().mockReturnValue(of({ status: 'done' })),
    }
    snackBar = { open: jest.fn(), openFromComponent: jest.fn() }

    component = build()
    component.currentContent = 'do_1'
    component._id = 'test_1'
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('collects the languages and known contents', () => {
      component.ngOnInit()
      expect(component.allLanguages).toEqual(['en', 'hi'])
      expect(component.contents.length).toBe(1)
      expect(loaderService.changeLoadState).toHaveBeenCalledWith(true)
    })

    it('shows the setting buttons only for Siemens', () => {
      component.ngOnInit()
      expect(component.showSettingButtons).toBe(false)
      accessService.rootOrg = 'Siemens'
      const c = build()
      c.ngOnInit()
      expect(c.showSettingButtons).toBe(true)
    })

    it('tracks the active content', () => {
      component.ngOnInit()
      changeActiveCont.next('do_9')
      expect(component.currentContent).toBe('do_9')
    })
  })

  describe('customStepper', () => {
    it('locks the cursor on step 1', () => {
      component.customStepper(1)
      expect(component.disableCursor).toBe(true)
      expect(component.currentStep).toBe(1)
    })

    it('moves to any other step', () => {
      component.customStepper(3)
      expect(component.disableCursor).toBe(false)
      expect(component.currentStep).toBe(3)
    })
  })

  it('toggleSettingButtons flips the settings panel', () => {
    component.showSettingButtons = false
    component.toggleSettingButtons()
    expect(component.showSettingButtons).toBe(true)
  })

  it('saveId records the assessment id', () => {
    component.saveId('test_9')
    expect(component._id).toBe('test_9')
  })

  it('setDataSourceAttributes wires the paginator to the table', () => {
    const paginator: any = { pageSize: 10 }
    component.matPaginator = paginator
    expect(component.paginator).toBe(paginator)
    expect(component.objDataSource.paginator).toBe(paginator)
  })

  describe('saveCallIap', () => {
    it('pushes the assessment metadata into the IAP store', () => {
      component.saveCallIap()
      expect(contentService.setUpdatedMeta).toHaveBeenCalledWith({ contentIdAtSource: 'test_1' }, 'do_1')
      expect(contentService.setIapContent).toHaveBeenCalledWith({ testName: 'Assessment A' }, 'do_1')
      expect(contentService.setIapContent).toHaveBeenCalledWith({ duration: 30 }, 'do_1')
      expect(contentService.setIapContent).toHaveBeenCalledWith({ security: 'public' }, 'do_1')
      expect(service.saveContestDetails).toHaveBeenCalledWith({ testName: 'Assessment A' })
    })

    it('records the contest artifact URL', () => {
      component.saveCallIap()
      expect(contentService.setUpdatedMeta).toHaveBeenCalledWith(
        { artifactUrl: 'https://lex-deviap.infosysapps.com/contest/contest_test_1' },
        'do_1',
      )
    })

    it('falls back to an hour when the assessment has no duration', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ duration: 0 }))
      component.saveCallIap()
      expect(contentService.setIapContent).toHaveBeenCalledWith({ duration: 60 }, 'do_1')
    })
  })

  describe('action', () => {
    it('next advances the stepper', () => {
      component.currentStep = 1
      component.action('next')
      expect(component.currentStep).toBe(2)
    })

    it('save persists the contest then the content', () => {
      const spy = jest.spyOn(component, 'save').mockImplementation(() => {})
      component.action('save')
      expect(service.saveContestDetails).toHaveBeenCalled()
      expect(spy).toHaveBeenCalled()
    })

    it('save stops when the contest save is not confirmed', () => {
      service.saveContestDetails.mockReturnValue(of({ status: 'pending' }))
      const spy = jest.spyOn(component, 'save').mockImplementation(() => {})
      component.action('save')
      expect(spy).not.toHaveBeenCalled()
    })

    it('push sends the assessment for review after saving', () => {
      const spy = jest.spyOn(component, 'takeAction').mockImplementation(() => {})
      component.action('push')
      expect(spy).toHaveBeenCalled()
    })

    it('push stops when the contest save is not confirmed', () => {
      service.saveContestDetails.mockReturnValue(of({ status: 'pending' }))
      const spy = jest.spyOn(component, 'takeAction').mockImplementation(() => {})
      component.action('push')
      expect(spy).not.toHaveBeenCalled()
    })

    it('preview runs the review flow and opens the preview', () => {
      const spy = jest.spyOn(component, 'preview').mockImplementation(() => {})
      component.action('preview')
      expect(service.reviewContestFlow).toHaveBeenCalledWith({ testId: 'test_1' })
      expect(spy).toHaveBeenCalled()
    })

    it('preview surfaces the review error instead of opening', () => {
      service.reviewContestFlow.mockReturnValue(of({ status: 'notDone', list: ['no questions'] }))
      const spy = jest.spyOn(component, 'preview').mockImplementation(() => {})
      component.action('preview')
      expect(spy).not.toHaveBeenCalled()
      expect(snackBar.open).toHaveBeenCalledWith('no questions')
    })

    it('delete confirms before deleting', () => {
      const spy = jest.spyOn(component, 'delete').mockImplementation(() => {})
      component.action('delete')
      afterClosed.next(true)
      expect(spy).toHaveBeenCalled()
    })

    it('delete does nothing when dismissed', () => {
      const spy = jest.spyOn(component, 'delete').mockImplementation(() => {})
      component.action('delete')
      afterClosed.next(false)
      expect(spy).not.toHaveBeenCalled()
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

  describe('preview', () => {
    it('enters preview mode and resolves the viewer route', () => {
      component.preview()
      expect(component.previewMode).toBe(true)
      expect(component.mimeTypeRoute).toBeTruthy()
    })

    it('saves pending changes before previewing', () => {
      contentService.upDatedContent = { do_1: { name: 'New' } }
      component.preview()
      expect(editorService.updateContent).toHaveBeenCalled()
      expect(component.previewMode).toBe(true)
    })

    it('opens the error parser on a 409 conflict', () => {
      contentService.upDatedContent = { do_1: { name: 'New' } }
      editorService.updateContent.mockReturnValue(throwError(() => ({ status: 409, error: 'x' })))
      component.preview()
      expect(dialog.open).toHaveBeenCalled()
      expect(component.previewMode).toBe(false)
      expect(lastNotify()).toBe(Notify.SAVE_FAIL)
    })

    it('only notifies on a non-conflict failure', () => {
      contentService.upDatedContent = { do_1: { name: 'New' } }
      editorService.updateContent.mockReturnValue(throwError(() => ({ status: 500 })))
      component.preview()
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('closePreview leaves preview mode', () => {
      component.previewMode = true
      component.closePreview()
      expect(component.previewMode).toBe(false)
    })
  })

  describe('save', () => {
    it('reports an up-to-date assessment when nothing changed', () => {
      component.save()
      expect(editorService.updateContent).not.toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.UP_TO_DATE)
    })

    it('persists the pending changes', () => {
      contentService.upDatedContent = { do_1: { name: 'New' } }
      component.save()
      expect(editorService.updateContent).toHaveBeenCalled()
      expect(component.isChanged).toBe(true)
      expect(lastNotify()).toBe(Notify.SAVE_SUCCESS)
      expect(contentService.resetOriginalMeta).toHaveBeenCalled()
    })

    it('reports a failed save', () => {
      contentService.upDatedContent = { do_1: { name: 'New' } }
      editorService.updateContent.mockReturnValue(throwError(() => 'boom'))
      component.save()
      expect(lastNotify()).toBe(Notify.SAVE_FAIL)
    })
  })

  describe('delete', () => {
    it('removes the assessment and returns home', () => {
      component.contents = [meta()]
      component.delete()
      expect(editorService.deleteContent).toHaveBeenCalledWith('do_1')
      expect(component.contents).toEqual([])
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('activates the next assessment when others remain', () => {
      jest.spyOn(changeActiveCont, 'next')
      component.contents = [meta(), meta({ identifier: 'do_2' })]
      component.delete()
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_2')
    })

    it('reports a failed delete', () => {
      editorService.deleteContent.mockReturnValue(throwError(() => 'boom'))
      component.delete()
      expect(lastNotify()).toBe(Notify.CONTENT_FAIL)
    })
  })

  describe('validationCheck', () => {
    it('passes for a valid assessment with an artifact', () => {
      expect(component.validationCheck).toBe(true)
    })

    it('fails when mandatory fields are missing', () => {
      contentService.isValid.mockReturnValue(false)
      expect(component.validationCheck).toBe(false)
      expect(lastNotify()).toBe(Notify.MANDATORY_FIELD_ERROR)
    })

    it('fails when neither a body nor a URL is present', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ artifactUrl: '', body: '' }))
      expect(component.validationCheck).toBe(false)
      expect(lastNotify()).toBe(Notify.BODY_OR_URL)
    })
  })

  describe('takeAction', () => {
    it('reports an up-to-date live assessment with no pending change', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ status: 'Live' }))
      component.takeAction()
      expect(service.reviewContestFlow).not.toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.UP_TO_DATE)
    })

    it('collects a comment once the review flow succeeds', () => {
      const spy = jest.spyOn(component, 'publishCall').mockImplementation(() => {})
      component.takeAction()
      expect(dialog.open).toHaveBeenCalled()
      afterClosed.next(null)
      expect(spy).toHaveBeenCalled()
    })

    it('surfaces the review error instead of collecting a comment', () => {
      service.reviewContestFlow.mockReturnValue(of({ status: 'notDone', list: ['no questions'] }))
      component.takeAction()
      expect(dialog.open).not.toHaveBeenCalled()
      expect(snackBar.open).toHaveBeenCalledWith('no questions')
    })

    it('stays quiet when the review flow reports nothing usable', () => {
      service.reviewContestFlow.mockReturnValue(of({ status: 'notDone' }))
      component.takeAction()
      expect(snackBar.open).not.toHaveBeenCalled()
    })
  })

  describe('publishCall', () => {
    const commentsForm = () => new FormGroup({ comments: new FormControl('ok'), action: new FormControl('accept') })

    it('publishes the contest first when the action is publish', () => {
      contentService.originalContent = { do_1: meta({ status: 'Review' }) }
      const spy = jest.spyOn(component, 'finalCall').mockImplementation(() => {})
      component.publishCall(commentsForm())
      expect(service.publishContest).toHaveBeenCalledWith({ testId: 'test_1' })
      expect(spy).toHaveBeenCalled()
    })

    it('stops when the contest publish is not confirmed', () => {
      contentService.originalContent = { do_1: meta({ status: 'Review' }) }
      service.publishContest.mockReturnValue(of({ status: 'pending' }))
      const spy = jest.spyOn(component, 'finalCall').mockImplementation(() => {})
      component.publishCall(commentsForm())
      expect(spy).not.toHaveBeenCalled()
    })

    it('goes straight to the forward call for a review action', () => {
      const spy = jest.spyOn(component, 'finalCall').mockImplementation(() => {})
      component.publishCall(commentsForm())
      expect(service.publishContest).not.toHaveBeenCalled()
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('finalCall', () => {
    const commentsForm = (action = 'accept') => new FormGroup({ comments: new FormControl('looks good'), action: new FormControl(action) })

    it('does nothing without a comments form', () => {
      component.finalCall(null as any)
      expect(editorService.forwardBackward).not.toHaveBeenCalled()
    })

    it('forwards the assessment and returns to the author home', () => {
      component.contents = [meta()]
      component.finalCall(commentsForm())
      expect(editorService.forwardBackward).toHaveBeenCalledWith({ comment: 'looks good', operation: 1 }, 'do_1')
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
      expect(lastNotify()).toBe(Notify.SEND_FOR_REVIEW_SUCCESS)
    })

    it('sends operation -1 when the reviewer rejects an in-review assessment', () => {
      contentService.originalContent = { do_1: meta({ status: 'InReview' }) }
      component.finalCall(commentsForm('reject'))
      expect(editorService.forwardBackward.mock.calls[0][0].operation).toBe(-1)
    })

    it('saves pending changes before forwarding', () => {
      contentService.upDatedContent = { do_1: { name: 'New' } }
      component.finalCall(commentsForm())
      expect(editorService.updateContent).toHaveBeenCalled()
    })

    it('activates the next assessment when others remain', () => {
      jest.spyOn(changeActiveCont, 'next')
      component.contents = [meta(), meta({ identifier: 'do_2' })]
      component.finalCall(commentsForm())
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_2')
    })

    it('opens the error parser on a 409 conflict', () => {
      editorService.forwardBackward.mockReturnValue(throwError(() => ({ status: 409, error: 'x' })))
      component.finalCall(commentsForm())
      expect(dialog.open).toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.SEND_FOR_REVIEW_FAIL)
    })

    it('only notifies on a non-conflict failure', () => {
      editorService.forwardBackward.mockReturnValue(throwError(() => ({ status: 500 })))
      component.finalCall(commentsForm())
      expect(dialog.open).not.toHaveBeenCalled()
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
        contentService.originalContent = { do_1: meta({ status }) }
        expect(component.getMessage('success')).toBe(success)
        expect(component.getMessage('failure')).toBe(failure)
      })
    })

    it('returns an empty message for an unknown status', () => {
      contentService.originalContent = { do_1: meta({ status: 'Nope' }) }
      expect(component.getMessage('success')).toBe('')
      expect(component.getMessage('failure')).toBe('')
    })
  })

  describe('getAction', () => {
    it('publishes a knowledge artifact directly', () => {
      contentService.originalContent = { do_1: meta({ contentType: 'Knowledge Artifact' }) }
      expect(component.getAction()).toBe('publish')
    })

    it('offers review for draft and live assessments', () => {
      expect(component.getAction()).toBe('sendForReview')
      contentService.originalContent = { do_1: meta({ status: 'Live' }) }
      expect(component.getAction()).toBe('sendForReview')
    })

    it('offers review actions while under review', () => {
      contentService.originalContent = { do_1: meta({ status: 'InReview' }) }
      expect(component.getAction()).toBe('review')
    })

    it('offers publish once reviewed', () => {
      contentService.originalContent = { do_1: meta({ status: 'Review' }) }
      expect(component.getAction()).toBe('publish')
    })

    it('defaults to review for an unknown status', () => {
      contentService.originalContent = { do_1: meta({ status: 'Nope' }) }
      expect(component.getAction()).toBe('sendForReview')
    })
  })

  describe('fullScreenToggle', () => {
    let el: HTMLElement

    beforeEach(() => {
      el = document.createElement('div')
      el.id = 'whole-container'
      document.body.appendChild(el)
    })

    afterEach(() => el.remove())

    it('requests fullscreen when nothing is fullscreen yet', () => {
      const requestFullscreen = jest.fn()
      ;(el as any).requestFullscreen = requestFullscreen
      ;(document as any).fullscreenElement = null
      component.fullScreenToggle()
      expect(requestFullscreen).toHaveBeenCalled()
    })

    it('exits fullscreen when already fullscreen', () => {
      ;(el as any).requestFullscreen = jest.fn()
      ;(document as any).fullscreenElement = el
      ;(document as any).exitFullscreen = jest.fn()
      component.fullScreenToggle()
      expect((document as any).exitFullscreen).toHaveBeenCalled()
      ;(document as any).fullscreenElement = null
    })

    it('falls back to the webkit API', () => {
      const webkitRequestFullscreen = jest.fn()
      ;(el as any).webkitRequestFullscreen = webkitRequestFullscreen
      component.fullScreenToggle()
      expect(webkitRequestFullscreen).toHaveBeenCalled()
    })
  })
})
