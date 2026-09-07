import { FormControl, FormGroup } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { CurateComponent } from './curate.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

describe('CurateComponent', () => {
  let component: CurateComponent
  let contentService: any
  let snackBar: any
  let editorService: any
  let dialog: any
  let router: any
  let loaderService: any
  let authInitService: any
  let accessService: any
  let notificationSvc: any
  let changeActiveCont: Subject<string>
  let afterClosed: Subject<any>

  const meta = (over: any = {}) => ({
    identifier: 'do_1',
    status: 'Draft',
    mimeType: 'application/html',
    artifactUrl: 'a.html',
    creatorContacts: [{ id: 'u1' }],
    publisherDetails: [{ id: 'u1' }],
    ...over,
  })

  /** The last notification type handed to the snackbar. */
  const lastNotify = () => {
    const calls = snackBar.openFromComponent.mock.calls
    return calls[calls.length - 1][1].data.type
  }

  beforeEach(() => {
    changeActiveCont = new Subject<string>()
    afterClosed = new Subject<any>()
    contentService = {
      changeActiveCont,
      originalContent: { do_1: meta() },
      upDatedContent: {},
      getOriginalMeta: jest.fn().mockReturnValue(meta()),
      getUpdatedMeta: jest.fn().mockReturnValue(meta()),
      resetOriginalMeta: jest.fn(),
      isValid: jest.fn().mockReturnValue(true),
      createInAnotherLanguage: jest.fn().mockReturnValue(of(meta({ identifier: 'do_2' }))),
    }
    snackBar = { openFromComponent: jest.fn() }
    editorService = {
      updateContent: jest.fn().mockReturnValue(of({ ok: true })),
      forwardBackward: jest.fn().mockReturnValue(of({ ok: true })),
      deleteContent: jest.fn().mockReturnValue(of({ ok: true })),
    }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }) }
    router = { navigateByUrl: jest.fn() }
    loaderService = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    authInitService = { ordinals: { subTitles: ['en', 'hi'] } }
    accessService = {
      rootOrg: 'sunbird',
      userId: 'u1',
      hasRole: jest.fn().mockReturnValue(false),
      authoringConfig: { isMultiStepFlow: false },
    }
    notificationSvc = { triggerPushPullNotification: jest.fn().mockReturnValue(of({ ok: true })) }

    component = new CurateComponent(
      contentService,
      snackBar,
      editorService,
      dialog,
      router,
      loaderService,
      authInitService,
      accessService,
      notificationSvc,
    )
    component.currentContent = 'do_1'
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('collects the known contents and the language list', () => {
      component.ngOnInit()
      expect(component.contents.length).toBe(1)
      expect(component.allLanguages).toEqual(['en', 'hi'])
      expect(loaderService.changeLoadState).toHaveBeenCalledWith(true)
    })

    it('shows the setting buttons only for client1', () => {
      component.ngOnInit()
      expect(component.showSettingButtons).toBe(false)
      accessService.rootOrg = 'client1'
      component.ngOnInit()
      expect(component.showSettingButtons).toBe(true)
    })

    it('jumps to the last step when content editing is disabled', () => {
      contentService.getOriginalMeta.mockReturnValue(meta({ isContentEditingDisabled: true }))
      component.ngOnInit()
      changeActiveCont.next('do_1')
      expect(component.currentStep).toBe(3)
    })

    it('keeps the current step when editing is allowed', () => {
      component.ngOnInit()
      changeActiveCont.next('do_1')
      expect(component.currentStep).toBe(2)
    })
  })

  it('ngOnDestroy hides the loader', () => {
    component.ngOnDestroy()
    expect(loaderService.changeLoad.next).toHaveBeenCalledWith(false)
  })

  describe('customStepper', () => {
    it('refuses to go back to step 2 when editing is disabled', () => {
      contentService.getOriginalMeta.mockReturnValue(meta({ isContentEditingDisabled: true }))
      component.currentStep = 3
      component.customStepper(2)
      expect(component.currentStep).toBe(3)
    })

    it('locks the cursor on step 1', () => {
      component.customStepper(1)
      expect(component.disableCursor).toBe(true)
    })

    it('submits the URL form when moving from step 2 to 3', () => {
      component.urlComponent = { isSubmitPressed: false, submit: jest.fn() } as any
      component.currentStep = 2
      component.customStepper(3)
      expect(component.urlComponent.isSubmitPressed).toBe(true)
      expect(component.urlComponent.submit).toHaveBeenCalled()
    })

    it('moves freely between other steps', () => {
      component.currentStep = 3
      component.customStepper(2)
      expect(component.currentStep).toBe(2)
    })
  })

  describe('createInAnotherLanguage', () => {
    it('adds and activates the new translation', () => {
      jest.spyOn(changeActiveCont, 'next')
      component.createInAnotherLanguage('hi')
      expect(component.contents.length).toBe(1)
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_2')
      expect(lastNotify()).toBe(Notify.CONTENT_CREATE_SUCCESS)
    })

    it('reports that the translation already exists', () => {
      contentService.createInAnotherLanguage.mockReturnValue(of(true))
      component.createInAnotherLanguage('hi')
      expect(lastNotify()).toBe(Notify.DATA_PRESENT)
    })

    it('opens the error parser on a 409 conflict', () => {
      contentService.createInAnotherLanguage.mockReturnValue(throwError(() => ({ status: 409, error: 'x' })))
      component.createInAnotherLanguage('hi')
      expect(dialog.open).toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.CONTENT_FAIL)
    })

    it('only notifies on a non-conflict failure', () => {
      contentService.createInAnotherLanguage.mockReturnValue(throwError(() => ({ status: 500 })))
      component.createInAnotherLanguage('hi')
      expect(dialog.open).not.toHaveBeenCalled()
    })
  })

  it('changeContent broadcasts the newly active content', () => {
    jest.spyOn(changeActiveCont, 'next')
    component.changeContent(meta({ identifier: 'do_9' }) as any)
    expect(changeActiveCont.next).toHaveBeenCalledWith('do_9')
  })

  describe('save', () => {
    it('reports an up-to-date document when nothing changed', () => {
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

    it('opens the error parser on a 409 conflict', () => {
      contentService.upDatedContent = { do_1: { name: 'New' } }
      editorService.updateContent.mockReturnValue(throwError(() => ({ status: 409, error: 'x' })))
      component.save()
      expect(dialog.open).toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.SAVE_FAIL)
    })

    it('only notifies on a non-conflict failure', () => {
      contentService.upDatedContent = { do_1: { name: 'New' } }
      editorService.updateContent.mockReturnValue(throwError(() => ({ status: 500 })))
      component.save()
      expect(dialog.open).not.toHaveBeenCalled()
    })
  })

  describe('validationCheck', () => {
    it('passes for a valid document with an artifact', () => {
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

    it('passes when a body stands in for the URL', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ artifactUrl: '', body: '<p/>' }))
      expect(component.validationCheck).toBe(true)
    })
  })

  describe('takeAction', () => {
    it('reports an up-to-date live document with no pending change', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ status: 'Live' }))
      component.takeAction()
      expect(dialog.open).not.toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.UP_TO_DATE)
    })

    it('collects a comment before acting', () => {
      const spy = jest.spyOn(component, 'finalCall').mockImplementation(() => {})
      component.takeAction()
      expect(dialog.open).toHaveBeenCalled()
      afterClosed.next(null)
      expect(spy).toHaveBeenCalled()
    })

    it('does not open the dialog when validation fails', () => {
      contentService.isValid.mockReturnValue(false)
      component.takeAction()
      expect(dialog.open).not.toHaveBeenCalled()
    })
  })

  describe('finalCall', () => {
    const commentsForm = (action = 'accept') =>
      new FormGroup({
        comments: new FormControl('looks good'),
        action: new FormControl(action),
      })

    it('does nothing without a comments form', () => {
      component.finalCall(null as any)
      expect(editorService.forwardBackward).not.toHaveBeenCalled()
    })

    it('forwards the content and notifies the watchers', () => {
      component.contents = [meta() as any]
      component.finalCall(commentsForm())
      expect(editorService.forwardBackward).toHaveBeenCalledWith({ comment: 'looks good', operation: 1 }, 'do_1', 'Draft')
      expect(notificationSvc.triggerPushPullNotification).toHaveBeenCalled()
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('sends operation 0 when the reviewer rejects an in-review document', () => {
      contentService.originalContent = { do_1: meta({ status: 'InReview' }) }
      component.finalCall(commentsForm('reject'))
      expect(editorService.forwardBackward.mock.calls[0][0].operation).toBe(0)
    })

    it('uses the direct-publish operation for client1', () => {
      accessService.rootOrg = 'CLIENT1'
      component.finalCall(commentsForm())
      expect(editorService.forwardBackward.mock.calls[0][0].operation).toBe(100000)
    })

    it('saves pending changes before forwarding', () => {
      contentService.upDatedContent = { do_1: { name: 'New' } }
      component.finalCall(commentsForm())
      expect(editorService.updateContent).toHaveBeenCalled()
      expect(editorService.forwardBackward).toHaveBeenCalled()
    })

    it('activates the next document when others remain', () => {
      jest.spyOn(changeActiveCont, 'next')
      component.contents = [meta() as any, meta({ identifier: 'do_2' }) as any]
      component.finalCall(commentsForm())
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_2')
      expect(router.navigateByUrl).not.toHaveBeenCalled()
    })

    it('tolerates a failing notification hook', () => {
      notificationSvc.triggerPushPullNotification.mockReturnValue(throwError(() => 'boom'))
      component.finalCall(commentsForm())
      expect(lastNotify()).toBe(Notify.SEND_FOR_REVIEW_SUCCESS)
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

  it('toggleSettingButtons flips the settings panel', () => {
    component.showSettingButtons = false
    component.toggleSettingButtons()
    expect(component.showSettingButtons).toBe(true)
  })

  describe('getMessage', () => {
    const cases: Array<[string, string, string]> = [
      ['Draft', Notify.SEND_FOR_REVIEW_SUCCESS, Notify.SEND_FOR_REVIEW_FAIL],
      ['Live', Notify.SEND_FOR_REVIEW_SUCCESS, Notify.SEND_FOR_REVIEW_FAIL],
      ['InReview', Notify.REVIEW_SUCCESS, Notify.REVIEW_FAIL],
      ['Reviewed', Notify.PUBLISH_SUCCESS, Notify.PUBLISH_FAIL],
      ['Review', Notify.PUBLISH_SUCCESS, Notify.PUBLISH_FAIL],
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

  describe('action', () => {
    it('next advances the stepper', () => {
      component.currentStep = 1
      component.action('next')
      expect(component.currentStep).toBe(2)
    })

    it('preview and save delegate to their handlers', () => {
      const preview = jest.spyOn(component, 'preview').mockImplementation(() => {})
      const save = jest.spyOn(component, 'save').mockImplementation(() => {})
      component.action('preview')
      expect(preview).toHaveBeenCalled()
      component.action('save')
      expect(save).toHaveBeenCalled()
    })

    it('push confirms before publishing', () => {
      contentService.originalContent = { do_1: meta({ status: 'Reviewed' }) }
      const spy = jest.spyOn(component, 'takeAction').mockImplementation(() => {})
      component.action('push')
      expect(dialog.open).toHaveBeenCalled()
      afterClosed.next(true)
      expect(spy).toHaveBeenCalled()
    })

    it('push does nothing when the publish confirmation is dismissed', () => {
      contentService.originalContent = { do_1: meta({ status: 'Reviewed' }) }
      const spy = jest.spyOn(component, 'takeAction').mockImplementation(() => {})
      component.action('push')
      afterClosed.next(false)
      expect(spy).not.toHaveBeenCalled()
    })

    it('push acts immediately when the document is not publishable', () => {
      const spy = jest.spyOn(component, 'takeAction').mockImplementation(() => {})
      component.action('push')
      expect(dialog.open).not.toHaveBeenCalled()
      expect(spy).toHaveBeenCalled()
    })

    it('delete drops the content and returns home once confirmed', () => {
      component.contents = [meta() as any]
      component.action('delete')
      afterClosed.next(true)
      expect(component.contents).toEqual([])
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('delete activates the next document when others remain', () => {
      jest.spyOn(changeActiveCont, 'next')
      component.contents = [meta() as any, meta({ identifier: 'do_2' }) as any]
      component.action('delete')
      afterClosed.next(true)
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_2')
    })

    it('delete keeps the content when dismissed', () => {
      component.contents = [meta() as any]
      component.action('delete')
      afterClosed.next(false)
      expect(component.contents.length).toBe(1)
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
    it('removes the content and returns home', () => {
      component.contents = [meta() as any]
      component.delete()
      expect(editorService.deleteContent).toHaveBeenCalledWith('do_1')
      expect(component.contents).toEqual([])
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('activates the next document when others remain', () => {
      jest.spyOn(changeActiveCont, 'next')
      component.contents = [meta() as any, meta({ identifier: 'do_2' }) as any]
      component.delete()
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_2')
    })

    it('opens the error parser on a 409 conflict', () => {
      editorService.deleteContent.mockReturnValue(throwError(() => ({ status: 409, error: 'x' })))
      component.delete()
      expect(dialog.open).toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.CONTENT_FAIL)
    })

    it('only notifies on a non-conflict failure', () => {
      editorService.deleteContent.mockReturnValue(throwError(() => ({ status: 500 })))
      component.delete()
      expect(dialog.open).not.toHaveBeenCalled()
    })
  })

  describe('getAction', () => {
    it('offers review for a draft', () => {
      expect(component.getAction()).toBe('sendForReview')
    })

    it('offers review actions while under review', () => {
      contentService.originalContent = { do_1: meta({ status: 'InReview' }) }
      expect(component.getAction()).toBe('review')
      contentService.originalContent = { do_1: meta({ status: 'QualityReview' }) }
      expect(component.getAction()).toBe('review')
    })

    it('offers publish once reviewed', () => {
      contentService.originalContent = { do_1: meta({ status: 'Reviewed' }) }
      expect(component.getAction()).toBe('publish')
    })

    it('offers publish directly for client1', () => {
      accessService.rootOrg = 'client1'
      expect(component.getAction()).toBe('publish')
    })

    it('requires direct-publish rights under the multi-step flow', () => {
      accessService.rootOrg = 'client1'
      accessService.authoringConfig.isMultiStepFlow = true
      contentService.getUpdatedMeta.mockReturnValue(meta({ publisherDetails: [{ id: 'other' }] }))
      expect(component.getAction()).toBe('sendForReview')
    })

    it('defaults to review for an unknown status', () => {
      contentService.originalContent = { do_1: meta({ status: 'Nope' }) }
      expect(component.getAction()).toBe('sendForReview')
    })
  })

  describe('publisher and delete permissions', () => {
    it('isPublisherSame matches the signed-in publisher', () => {
      expect(component.isPublisherSame()).toBe(true)
    })

    it('isPublisherSame is false for another publisher', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ publisherDetails: [{ id: 'other' }] }))
      expect(component.isPublisherSame()).toBe(false)
    })

    it('isPublisherSame tolerates a document with no publishers', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ publisherDetails: undefined }))
      expect(component.isPublisherSame()).toBe(false)
    })

    it('isDirectPublish is true for a draft owned by the publisher', () => {
      expect(component.isDirectPublish()).toBe(true)
    })

    it('isDirectPublish is false once under review', () => {
      contentService.originalContent = { do_1: meta({ status: 'InReview' }) }
      expect(component.isDirectPublish()).toBe(false)
    })

    it('canDelete allows an editor or admin', () => {
      accessService.hasRole.mockReturnValue(true)
      expect(component.canDelete()).toBeTruthy()
    })

    it('canDelete allows the creator of a draft', () => {
      expect(component.canDelete()).toBeTruthy()
    })

    it('canDelete refuses another author', () => {
      contentService.originalContent = { do_1: meta({ creatorContacts: [{ id: 'other' }] }) }
      expect(component.canDelete()).toBeFalsy()
    })

    it('canDelete refuses once the content is under review', () => {
      contentService.originalContent = { do_1: meta({ status: 'InReview' }) }
      expect(component.canDelete()).toBeFalsy()
    })
  })

  describe('fullScreenToggle', () => {
    let el: HTMLElement

    beforeEach(() => {
      el = document.createElement('div')
      el.id = 'curate-container'
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
