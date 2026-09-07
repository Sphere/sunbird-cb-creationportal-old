import { Subject, of } from 'rxjs'

import { WebModuleEditorComponent } from './web-module-editor.component'

/**
 * Wave 18 — the content-load chain of WebModuleEditorComponent: how it turns a
 * stored web module into the editable page list, including the asset-url rewriting
 * for images and audio.
 */
describe('WebModuleEditorComponent (loading a module)', () => {
  let component: WebModuleEditorComponent
  let dialog: any
  let snackBar: any
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
  let changeActiveCont: Subject<string>

  const currentId = 'lex-1'

  /** The stored web module payload for a single page with one audio clip. */
  const moduleData = (over: any = {}) => ({
    pageJson: [{ URL: '/assets/index1.html', title: 'p1', audio: [{ URL: 'clip.mp3', title: 'clip' }] }],
    pages: ['<html><body><p>Hello <img src="pic.png"></p></body></html>'],
    ...over,
  })

  beforeEach(() => {
    changeActiveCont = new Subject<string>()
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => of(false) }) }
    snackBar = { openFromComponent: jest.fn() }
    router = { url: '/author/web/lex-1/page', navigateByUrl: jest.fn() }
    activateRoute = { parent: { parent: {} } }
    breakpointObserver = { observe: jest.fn().mockReturnValue(of({ matches: false })) }
    loaderService = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    metaContentService = {
      changeActiveCont,
      upDatedContent: {},
      originalContent: { [currentId]: { status: 'Draft', creatorContacts: [{ id: 'u1' }] } },
      getUpdatedMeta: jest.fn().mockReturnValue({ locale: 'en', status: 'Draft', mimeType: 'application/web-module' }),
      getOriginalMeta: jest.fn().mockReturnValue({ status: 'Draft' }),
      isValid: jest.fn().mockReturnValue(true),
      resetOriginalMeta: jest.fn(),
      createInAnotherLanguage: jest.fn().mockReturnValue(of({ identifier: 'lex-2' })),
    }
    uploadService = { encodedUpload: jest.fn().mockReturnValue(of({ code: 'ok' })) }
    editorService = {
      getDataForContent: jest.fn(),
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
      snackBar,
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

  afterEach(() => jest.clearAllMocks())

  /**
   * Answers the two reads the loader makes: first the course (whose children point
   * at the web modules), then the module payload itself.
   */
  const answerWith = (children: any[], payload: any = moduleData(), artifactUrl = 'https://cdn/host/x/manifest.json') => {
    editorService.getDataForContent
      .mockReturnValueOnce(of([{ content: { children, artifactUrl, identifier: currentId } }]))
      .mockReturnValue(of(payload))
  }

  const webModuleChild = (identifier = currentId) => ({ identifier, mimeType: 'application/web-module' })

  describe('the load chain', () => {
    it('turns the stored payload into an editable page list', () => {
      answerWith([webModuleChild()])
      component.ngOnInit()
      const data = component.userData[currentId]
      expect(data).toBeTruthy()
      expect(data.pages).toHaveLength(1)
      expect(data.pages[0].fileIndex).toBe(1)
      expect(data.pages[0].body).toContain('Hello')
    })

    it('rewrites the image sources onto the asset folder', () => {
      answerWith([webModuleChild()])
      component.ngOnInit()
      expect(component.imagesUrlbase).toBe('https://cdn/host/x/assets/')
      expect(component.userData[currentId].pages[0].body).toContain('assets/')
    })

    it('rewrites the audio urls to a host-relative path', () => {
      answerWith([webModuleChild()])
      component.ngOnInit()
      const [page] = component.userData[currentId].pageJson
      expect(page.audio[0].URL).toBe('/host/x/assets/clip.mp3')
    })

    it('leaves a page with no audio alone', () => {
      answerWith([webModuleChild()], moduleData({ pageJson: [{ URL: '/assets/index1.html', title: 'p1', audio: [] }] }))
      component.ngOnInit()
      expect(component.userData[currentId].pageJson[0].audio).toEqual([])
    })

    it('keeps a page that has no body tag as-is', () => {
      answerWith([webModuleChild()], moduleData({ pages: ['<p>no body wrapper</p>'] }))
      component.ngOnInit()
      expect(component.userData[currentId].pages[0].body).toBe('<p>no body wrapper</p>')
    })

    it('remembers the course the module belongs to', () => {
      answerWith([webModuleChild()])
      component.ngOnInit()
      expect(component.allContents).toHaveLength(1)
    })

    it('ignores a child that is not a web module', () => {
      answerWith([{ identifier: 'do_other', mimeType: 'application/pdf' }])
      component.ngOnInit()
      expect(component.userData[currentId]).toBeUndefined()
      expect(editorService.getDataForContent).toHaveBeenCalledTimes(1)
    })

    it('copes with a course that has no children yet', () => {
      answerWith([])
      component.ngOnInit()
      expect(editorService.getDataForContent).toHaveBeenCalledTimes(1)
    })
  })
})
