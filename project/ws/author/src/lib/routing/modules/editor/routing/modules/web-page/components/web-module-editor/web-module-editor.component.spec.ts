import { Subject, of, throwError } from 'rxjs'

import { WebModuleEditorComponent } from './web-module-editor.component'
import { Page, ModuleObj, WebModuleData } from '../web-module.class'

/**
 * WebModuleEditorComponent is a heavy component (12 injected deps, large template,
 * ViewChild ckEditor). Per the project testing guidance we instantiate the class
 * directly with mocked collaborators and exercise its public logic rather than
 * rendering it via TestBed.
 */
describe('WebModuleEditorComponent (direct instantiation)', () => {
  let component: WebModuleEditorComponent
  let dialog: any
  let snackBar: { openFromComponent: jest.Mock }
  let router: any
  let activateRoute: any
  let breakpointObserver: any
  let loaderService: any
  let metaContentService: any
  let uploadService: any
  let editorService: any
  let authInitService: any
  let accessService: any
  let notificationSvc: any

  const currentId = 'lex-1'

  const seedUserData = () => {
    const data = new WebModuleData({
      pageJson: [new ModuleObj({ URL: '/assets/index1.html', title: 'p1' })],
      pages: [new Page({ fileIndex: 1, body: '<p>hi</p>' })],
    })
    component.userData[currentId] = data
    component.currentId = currentId
    component.selectedPage = 0
  }

  beforeEach(() => {
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => of(false) }) }
    snackBar = { openFromComponent: jest.fn() }
    router = { url: '/author/web/lex-1/page', navigateByUrl: jest.fn() }
    activateRoute = { parent: { parent: {} } }
    breakpointObserver = { observe: jest.fn().mockReturnValue(of({ matches: false })) }
    loaderService = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    metaContentService = {
      changeActiveCont: new Subject<string>(),
      upDatedContent: {},
      originalContent: { [currentId]: { status: 'Draft', creatorContacts: [{ id: 'u1' }] } },
      getUpdatedMeta: jest.fn().mockReturnValue({ locale: 'en', status: 'Draft', mimeType: 'application/web-module' }),
      getOriginalMeta: jest.fn().mockReturnValue({ status: 'Draft' }),
      isValid: jest.fn().mockReturnValue(true),
      resetOriginalMeta: jest.fn(),
      createInAnotherLanguage: jest.fn().mockReturnValue(of({ identifier: 'lex-2' })),
    }
    uploadService = {
      encodedUpload: jest.fn().mockReturnValue(of({ code: 'ok', authArtifactURL: 'a', downloadURL: 'd' })),
    }
    editorService = {
      getDataForContent: jest.fn().mockReturnValue(of([{ content: { children: [], artifactUrl: 'x/y/z.json', identifier: currentId } }])),
      updateContent: jest.fn().mockReturnValue(of({})),
      deleteContent: jest.fn().mockReturnValue(of({})),
      forwardBackward: jest.fn().mockReturnValue(of({})),
    }
    authInitService = { ordinals: { subTitles: [{ srclang: 'en' }, { srclang: 'hi' }] } }
    accessService = {
      rootOrg: 'client1',
      userId: 'u1',
      authoringConfig: { isMultiStepFlow: false },
      hasRole: jest.fn().mockReturnValue(true),
    }
    notificationSvc = { triggerPushPullNotification: jest.fn().mockReturnValue(of({})) }

    component = new WebModuleEditorComponent(
      dialog,
      snackBar as any,
      router,
      activateRoute,
      breakpointObserver,
      loaderService,
      metaContentService,
      uploadService,
      editorService,
      authInitService,
      accessService,
      notificationSvc,
    )
  })

  it('creates', () => {
    expect(component).toBeTruthy()
  })

  it('ngOnInit sets settings buttons and subscribes to active content', () => {
    component.ngOnInit()
    expect(component.showSettingButtons).toBe(true)
    expect(component.contentLoaded).toBe(true)
    expect(loaderService.changeLoadState).toHaveBeenCalledWith(true)
    metaContentService.changeActiveCont.next(currentId)
    expect(component.currentId).toBe(currentId)
    expect(component.userData[currentId]).toBeTruthy()
  })

  it('ngOnDestroy unsubscribes from active content', () => {
    const unsub = jest.fn()
    component.activeContentSubscription = { unsubscribe: unsub } as any
    component.ngOnDestroy()
    expect(unsub).toHaveBeenCalled()
  })

  it('drop reorders pages and updates the selected page', () => {
    seedUserData()
    component.userData[currentId].pages.push(new Page({ fileIndex: 2, body: '<p>two</p>' }))
    component.selectedPage = 0
    component.drop({ previousIndex: 0, currentIndex: 1 } as any)
    expect(component.selectedPage).toBe(1)
    expect(component.changedContent).toBe(true)
  })

  it('deleteAudio removes an audio entry', () => {
    seedUserData()
    component.userData[currentId].pageJson[0].audio = [{ srclang: 'en' } as any, { srclang: 'hi' } as any]
    component.deleteAudio(0)
    expect(component.userData[currentId].pageJson[0].audio.length).toBe(1)
    expect(component.changedContent).toBe(true)
  })

  it('checkValidity flags empty pages and returns false', () => {
    seedUserData()
    component.userData[currentId].pages[0].body = ''
    const result = component.checkValidity(currentId)
    expect(result).toBe(false)
    expect(component.userData[currentId].pages[0].isInvalid).toBe(true)
  })

  it('checkValidity returns true when all pages have a body', () => {
    seedUserData()
    expect(component.checkValidity(currentId)).toBe(true)
  })

  it('forTitle updates the page title', () => {
    seedUserData()
    component.forTitle('New Title')
    expect(component.userData[currentId].pageJson[0].title).toBe('New Title')
    expect(component.changedContent).toBe(true)
  })

  it('addPage appends a new page and page json', () => {
    seedUserData()
    const before = component.userData[currentId].pages.length
    component.addPage()
    expect(component.userData[currentId].pages.length).toBe(before + 1)
    expect(component.userData[currentId].pageJson.length).toBe(before + 1)
    expect(component.changedContent).toBe(true)
  })

  it('onBodyChange stores body and clears invalid flag', () => {
    seedUserData()
    component.userData[currentId].pages[0].isInvalid = true
    component.onBodyChange('<p>updated</p>')
    expect(component.userData[currentId].pages[0].body).toBe('<p>updated</p>')
    expect(component.userData[currentId].pages[0].isInvalid).toBe(false)
    expect(component.changedContent).toBe(true)
  })

  it('changePage sets selectedPage and notifies for invalid pages', () => {
    seedUserData()
    component.userData[currentId].pages[0].isInvalid = true
    const spy = jest.spyOn(component, 'showNotification')
    component.changePage(0)
    expect(component.selectedPage).toBe(0)
    expect(spy).toHaveBeenCalled()
    expect(component.showAudioCard).toBe(false)
  })

  it('onDelete removes a page after confirmation', () => {
    seedUserData()
    dialog.open.mockReturnValue({ afterClosed: () => of(true) })
    const event = { stopPropagation: jest.fn() } as any
    component.onDelete(0, event)
    expect(event.stopPropagation).toHaveBeenCalled()
    expect(component.userData[currentId].pages.length).toBe(0)
    expect(component.changedContent).toBe(true)
  })

  it('audioADD opens the upload dialog and appends the result', () => {
    seedUserData()
    component.allLanguages = [{ srclang: 'en' }, { srclang: 'hi' }]
    dialog.open.mockReturnValue({ afterClosed: () => of({ srclang: 'en', title: 'aud' } as any) })
    component.audioADD()
    expect(dialog.open).toHaveBeenCalled()
    expect(component.showAudioCard).toBe(true)
    expect(component.userData[currentId].pageJson[0].audio.length).toBe(1)
  })

  it('audioADD notifies when all languages already present', () => {
    seedUserData()
    component.allLanguages = [{ srclang: 'en' }]
    component.userData[currentId].pageJson[0].audio = [{ srclang: 'en' } as any]
    const spy = jest.spyOn(component, 'showNotification')
    component.audioADD()
    expect(spy).toHaveBeenCalled()
  })

  it('uploadJson wraps html content and delegates to upload service', () => {
    component.currentId = currentId
    component.uploadJson('<p>x</p>', 'index1.html', '/web-hosted/assets')
    expect(uploadService.encodedUpload).toHaveBeenCalled()
    const [content, fileName] = uploadService.encodedUpload.mock.calls[0]
    expect(fileName).toBe('index1.html')
    expect(content).toContain('<body>')
  })

  it('triggerUpload uploads changed pages then the module json', done => {
    seedUserData()
    component.userData[currentId].pages[0].isBdchanged = true
    component.triggerUpload().subscribe(() => {
      expect(uploadService.encodedUpload).toHaveBeenCalled()
      done()
    })
  })

  it('triggerSave calls updateContent and resets original meta', done => {
    component.triggerSave({ identifier: currentId } as any, currentId).subscribe(() => {
      expect(editorService.updateContent).toHaveBeenCalled()
      expect(metaContentService.resetOriginalMeta).toHaveBeenCalled()
      done()
    })
  })

  describe('getMessage', () => {
    it('returns review-related success messages by status', () => {
      metaContentService.originalContent[currentId].status = 'Draft'
      component.currentId = currentId
      expect(component.getMessage('success')).toBeTruthy()
    })
    it('returns failure messages by status', () => {
      metaContentService.originalContent[currentId].status = 'InReview'
      component.currentId = currentId
      expect(component.getMessage('failure')).toBeTruthy()
    })
  })

  describe('getAction', () => {
    it.each([
      ['Draft', 'sendForReview'],
      ['InReview', 'review'],
      ['Reviewed', 'publish'],
    ])('maps status %s -> %s', (status, expected) => {
      metaContentService.originalContent[currentId].status = status
      component.currentId = currentId
      expect(component.getAction()).toBe(expected)
    })
  })

  it('isPublisherSame checks the publisher list', () => {
    component.currentId = currentId
    metaContentService.getUpdatedMeta.mockReturnValue({ publisherDetails: [{ id: 'u1' }] })
    expect(component.isPublisherSame()).toBe(true)
    metaContentService.getUpdatedMeta.mockReturnValue({ publisherDetails: [{ id: 'other' }] })
    expect(component.isPublisherSame()).toBe(false)
  })

  it('isDirectPublish combines status and publisher checks', () => {
    component.currentId = currentId
    metaContentService.originalContent[currentId].status = 'Draft'
    jest.spyOn(component, 'isPublisherSame').mockReturnValue(true)
    expect(component.isDirectPublish()).toBe(true)
  })

  it('canDelete returns true for privileged roles', () => {
    component.currentId = currentId
    accessService.hasRole.mockReturnValue(true)
    expect(component.canDelete()).toBe(true)
  })

  it('toggleSettingButtons flips the flag', () => {
    component.showSettingButtons = false
    component.toggleSettingButtons()
    expect(component.showSettingButtons).toBe(true)
  })

  it('closePreview turns off preview mode', () => {
    component.previewMode = true
    component.closePreview()
    expect(component.previewMode).toBe(false)
  })

  it('customStepper sets the current step', () => {
    component.customStepper(4)
    expect(component.currentStep).toBe(4)
  })

  it('changeContent switches the active content', () => {
    const spy = jest.spyOn(metaContentService.changeActiveCont, 'next')
    component.changeContent({ identifier: 'lex-9' } as any)
    expect(component.currentId).toBe('lex-9')
    expect(component.selectedPage).toBe(0)
    expect(spy).toHaveBeenCalledWith('lex-9')
  })

  it('showNotification opens a snackbar', () => {
    component.showNotification('some-type')
    expect(snackBar.openFromComponent).toHaveBeenCalled()
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
  })

  it('delete removes content after confirmation', () => {
    seedUserData()
    dialog.open.mockReturnValue({ afterClosed: () => of(true) })
    component.allContents = [{ identifier: currentId } as any]
    component.delete()
    expect(editorService.deleteContent).toHaveBeenCalledWith(currentId)
    expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
  })

  it('validationCheck notifies when metadata is invalid', done => {
    component.currentId = currentId
    metaContentService.isValid.mockReturnValue(false)
    const spy = jest.spyOn(component, 'showNotification')
    component.validationCheck().subscribe(valid => {
      expect(valid).toBe(false)
      expect(spy).toHaveBeenCalled()
      done()
    })
  })

  it('preview shows a message when there are no pages', () => {
    component.userData[currentId] = new WebModuleData({ pages: [], pageJson: [] })
    component.currentId = currentId
    const spy = jest.spyOn(component, 'showNotification')
    component.preview()
    expect(spy).toHaveBeenCalled()
  })

  it('save warns when there are no pages', () => {
    component.userData[currentId] = new WebModuleData({ pages: [], pageJson: [] })
    component.currentId = currentId
    const spy = jest.spyOn(component, 'showNotification')
    component.save()
    expect(spy).toHaveBeenCalled()
  })

  it('createInAnotherLanguage adds the created content on success', () => {
    component.currentId = currentId
    component.allContents = []
    component.createInAnotherLanguage('hi')
    expect(metaContentService.createInAnotherLanguage).toHaveBeenCalled()
    expect(component.allContents.length).toBe(1)
  })

  it('createInAnotherLanguage handles a 409 conflict', () => {
    component.currentId = currentId
    metaContentService.createInAnotherLanguage.mockReturnValue(throwError(() => ({ status: 409, error: {} })))
    component.createInAnotherLanguage('hi')
    expect(dialog.open).toHaveBeenCalled()
  })
})
