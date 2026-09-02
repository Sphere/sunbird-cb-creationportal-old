import { Subject, of, throwError } from 'rxjs'

import { UploadComponent } from './upload.component'

/**
 * UploadComponent is a heavy component (9 injected deps, large template). Per the
 * project testing guidance we instantiate the class directly with mocked
 * collaborators and exercise its public logic rather than rendering it via TestBed.
 */
describe('UploadComponent (direct instantiation)', () => {
  let component: UploadComponent
  let authInitService: any
  let contentService: any
  let snackBar: { openFromComponent: jest.Mock }
  let editorService: any
  let dialog: any
  let router: any
  let loaderService: any
  let accessService: any
  let notificationSvc: any

  const cid = 'content-1'

  beforeEach(() => {
    authInitService = { ordinals: { subTitles: [{ srclang: 'en' }], canTransCode: [true] } }
    contentService = {
      changeActiveCont: new Subject<string>(),
      upDatedContent: {},
      originalContent: { [cid]: { status: 'Draft', contentType: 'Resource', creatorContacts: [{ id: 'u1' }] } },
      getOriginalMeta: jest.fn().mockReturnValue({ isContentEditingDisabled: false, artifactUrl: 'a' }),
      getUpdatedMeta: jest.fn().mockReturnValue({ artifactUrl: 'a', status: 'Draft', publisherDetails: [{ id: 'u1' }] }),
      isValid: jest.fn().mockReturnValue(true),
      resetOriginalMeta: jest.fn(),
      createInAnotherLanguage: jest.fn().mockReturnValue(of({ identifier: 'content-2' })),
    }
    snackBar = { openFromComponent: jest.fn() }
    editorService = {
      updateContent: jest.fn().mockReturnValue(of({})),
      deleteContent: jest.fn().mockReturnValue(of({})),
      forwardBackward: jest.fn().mockReturnValue(of({})),
    }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => of(false) }) }
    router = { navigateByUrl: jest.fn() }
    loaderService = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    accessService = {
      rootOrg: 'client1',
      userId: 'u1',
      authoringConfig: { isMultiStepFlow: false },
      hasRole: jest.fn().mockReturnValue(true),
    }
    notificationSvc = { triggerPushPullNotification: jest.fn().mockReturnValue(of({})) }

    component = new UploadComponent(
      authInitService,
      contentService,
      snackBar as any,
      editorService,
      dialog,
      router,
      loaderService,
      accessService,
      notificationSvc,
    )
    component.currentContent = cid
  })

  it('creates', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('initialises languages, transcode flag and step from artifact url', () => {
      contentService.originalContent = { [cid]: { artifactUrl: 'a', status: 'Draft' } }
      component.ngOnInit()
      expect(component.showSettingButtons).toBe(true)
      expect(component.allLanguages.length).toBe(1)
      expect(component.canTransCode).toBe(true)
      expect(component.currentStep).toBe(3)
      expect(loaderService.changeLoadState).toHaveBeenCalledWith(true)
    })

    it('moves to step 3 when editing is disabled on active content', () => {
      component.ngOnInit()
      contentService.getOriginalMeta.mockReturnValue({ isContentEditingDisabled: true })
      contentService.changeActiveCont.next(cid)
      expect(component.currentContent).toBe(cid)
      expect(component.currentStep).toBe(3)
    })
  })

  it('ngOnDestroy stops the loader', () => {
    component.ngOnDestroy()
    expect(loaderService.changeLoad.next).toHaveBeenCalledWith(false)
  })

  describe('customStepper', () => {
    it('does nothing on step 2 when editing disabled', () => {
      contentService.getOriginalMeta.mockReturnValue({ isContentEditingDisabled: true })
      component.currentStep = 3
      component.customStepper(2)
      expect(component.currentStep).toBe(3)
    })

    it('sets disableCursor on step 1', () => {
      component.customStepper(1)
      expect(component.disableCursor).toBe(true)
    })

    it('warns when leaving step 2 without an artifact url', () => {
      component.currentStep = 2
      contentService.getOriginalMeta.mockReturnValue({ isContentEditingDisabled: false })
      contentService.getUpdatedMeta.mockReturnValue({ artifactUrl: '' })
      component.customStepper(3)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(component.currentStep).toBe(2)
    })

    it('advances when an artifact url is present', () => {
      component.currentStep = 2
      contentService.getOriginalMeta.mockReturnValue({ isContentEditingDisabled: false })
      contentService.getUpdatedMeta.mockReturnValue({ artifactUrl: 'a' })
      component.customStepper(3)
      expect(component.currentStep).toBe(3)
    })
  })

  it('changeContent switches the active content', () => {
    const spy = jest.spyOn(contentService.changeActiveCont, 'next')
    component.changeContent({ identifier: 'content-9' } as any)
    expect(spy).toHaveBeenCalledWith('content-9')
  })

  it('triggerSave calls updateContent and resets original meta', done => {
    component.triggerSave({ identifier: cid } as any, cid).subscribe(() => {
      expect(editorService.updateContent).toHaveBeenCalled()
      expect(contentService.resetOriginalMeta).toHaveBeenCalled()
      done()
    })
  })

  describe('save', () => {
    it('shows up-to-date when nothing changed', () => {
      contentService.upDatedContent = {}
      component.save()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(editorService.updateContent).not.toHaveBeenCalled()
    })

    it('saves and shows success when content changed', () => {
      contentService.upDatedContent = { [cid]: { title: 'x' } }
      component.save()
      expect(component.isChanged).toBe(true)
      expect(editorService.updateContent).toHaveBeenCalled()
    })

    it('runs the next action after saving', () => {
      contentService.upDatedContent = { [cid]: { title: 'x' } }
      const spy = jest.spyOn(component, 'action').mockImplementation(() => {})
      component.save('next')
      expect(spy).toHaveBeenCalledWith('next')
    })
  })

  describe('validationCheck getter', () => {
    it('returns true when valid and artifact present', () => {
      contentService.isValid.mockReturnValue(true)
      contentService.getUpdatedMeta.mockReturnValue({ artifactUrl: 'a' })
      expect(component.validationCheck).toBe(true)
    })

    it('returns false and warns when invalid', () => {
      contentService.isValid.mockReturnValue(false)
      contentService.getUpdatedMeta.mockReturnValue({ artifactUrl: '' })
      expect(component.validationCheck).toBe(false)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })
  })

  it('takeAction shows up-to-date when nothing needs saving and status Live', () => {
    contentService.upDatedContent = {}
    contentService.getUpdatedMeta.mockReturnValue({ status: 'Live', artifactUrl: 'a' })
    component.isChanged = false
    component.takeAction()
    expect(snackBar.openFromComponent).toHaveBeenCalled()
    expect(dialog.open).not.toHaveBeenCalled()
  })

  it('takeAction opens the comments dialog when validation passes', () => {
    contentService.upDatedContent = { [cid]: { title: 'x' } }
    dialog.open.mockReturnValue({ afterClosed: () => of(null) })
    jest.spyOn(component, 'finalCall').mockImplementation(() => {})
    component.takeAction()
    expect(dialog.open).toHaveBeenCalled()
  })

  it('finalCall does nothing without a comments form', () => {
    component.finalCall(null as any)
    expect(editorService.forwardBackward).not.toHaveBeenCalled()
  })

  it('finalCall submits forward/backward action on success', () => {
    const commentsForm: any = { controls: { comments: { value: 'ok' }, action: { value: 'accept' } } }
    contentService.upDatedContent = {}
    component.finalCall(commentsForm)
    expect(editorService.forwardBackward).toHaveBeenCalled()
    expect(notificationSvc.triggerPushPullNotification).toHaveBeenCalled()
    expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
  })

  it('preview enters preview mode after an optional save', () => {
    contentService.upDatedContent = {}
    component.preview()
    expect(component.previewMode).toBe(true)
    expect(component.mimeTypeRoute).toBeDefined()
  })

  it('preview handles a 409 conflict', () => {
    contentService.upDatedContent = { [cid]: { title: 'x' } }
    jest.spyOn(component, 'triggerSave').mockReturnValue(throwError(() => ({ status: 409, error: {} })) as any)
    component.preview()
    expect(dialog.open).toHaveBeenCalled()
  })

  it('closePreview exits preview mode', () => {
    component.previewMode = true
    component.closePreview()
    expect(component.previewMode).toBe(false)
  })

  it('toggleSettingButtons flips the flag', () => {
    component.showSettingButtons = false
    component.toggleSettingButtons()
    expect(component.showSettingButtons).toBe(true)
  })

  describe('getMessage', () => {
    it('returns a success message by status', () => {
      contentService.originalContent[cid].status = 'InReview'
      expect(component.getMessage('success')).toBeTruthy()
    })
    it('returns a failure message by status', () => {
      contentService.originalContent[cid].status = 'Reviewed'
      expect(component.getMessage('failure')).toBeTruthy()
    })
  })

  describe('action', () => {
    it('next increments the step', () => {
      component.currentStep = 2
      component.action('next')
      expect(component.currentStep).toBe(3)
    })
    it('close navigates home', () => {
      component.action('close')
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })
    it('preview delegates to preview()', () => {
      const spy = jest.spyOn(component, 'preview').mockImplementation(() => {})
      component.action('preview')
      expect(spy).toHaveBeenCalled()
    })
    it('save delegates to save()', () => {
      const spy = jest.spyOn(component, 'save').mockImplementation(() => {})
      component.action('save')
      expect(spy).toHaveBeenCalled()
    })
    it('push with publish action opens confirm dialog first', () => {
      jest.spyOn(component, 'getAction').mockReturnValue('publish')
      dialog.open.mockReturnValue({ afterClosed: () => of(false) })
      component.action('push')
      expect(dialog.open).toHaveBeenCalled()
    })
    it('push without publish delegates to takeAction', () => {
      jest.spyOn(component, 'getAction').mockReturnValue('sendForReview')
      const spy = jest.spyOn(component, 'takeAction').mockImplementation(() => {})
      component.action('push')
      expect(spy).toHaveBeenCalled()
    })
    it('delete opens the delete dialog', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(false) })
      component.action('delete')
      expect(dialog.open).toHaveBeenCalled()
    })
  })

  it('isDirectPublish combines status and publisher checks', () => {
    contentService.originalContent[cid].status = 'Draft'
    jest.spyOn(component, 'isPublisherSame').mockReturnValue(true)
    expect(component.isDirectPublish()).toBe(true)
  })

  it('isPublisherSame checks the publisher list', () => {
    contentService.getUpdatedMeta.mockReturnValue({ publisherDetails: [{ id: 'u1' }] })
    expect(component.isPublisherSame()).toBe(true)
    contentService.getUpdatedMeta.mockReturnValue({ publisherDetails: [{ id: 'x' }] })
    expect(component.isPublisherSame()).toBe(false)
  })

  it('delete removes content and navigates home', () => {
    component.contents = [{ identifier: cid } as any]
    component.delete()
    expect(editorService.deleteContent).toHaveBeenCalledWith(cid)
    expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
  })

  describe('getAction', () => {
    it('returns publish for client1 non-multistep flow', () => {
      accessService.rootOrg = 'client1'
      accessService.authoringConfig = { isMultiStepFlow: false }
      expect(component.getAction()).toBe('publish')
    })
    it('returns publish for Knowledge Artifact', () => {
      accessService.rootOrg = 'other'
      contentService.originalContent[cid].contentType = 'Knowledge Artifact'
      expect(component.getAction()).toBe('publish')
    })
    it('maps status to sendForReview by default', () => {
      accessService.rootOrg = 'other'
      contentService.originalContent[cid].contentType = 'Resource'
      contentService.originalContent[cid].status = 'Draft'
      expect(component.getAction()).toBe('sendForReview')
    })
  })

  it('canDelete returns true for privileged roles', () => {
    accessService.hasRole.mockReturnValue(true)
    expect(component.canDelete()).toBe(true)
  })

  it('createInAnotherLanguage adds created content on success', () => {
    component.contents = []
    component.createInAnotherLanguage('hi')
    expect(contentService.createInAnotherLanguage).toHaveBeenCalled()
    expect(component.contents.length).toBe(1)
  })

  it('createInAnotherLanguage handles a 409 conflict', () => {
    contentService.createInAnotherLanguage.mockReturnValue(throwError(() => ({ status: 409, error: {} })))
    component.createInAnotherLanguage('hi')
    expect(dialog.open).toHaveBeenCalled()
  })
})
