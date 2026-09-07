import { FormBuilder } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { ModuleCreationComponent } from './module-creation.component'

/**
 * ModuleCreationComponent is the heaviest component in the repo (25 injected
 * collaborators, a very large template). Per the project testing convention it is
 * instantiated directly with mocked collaborators and exercised as a plain class;
 * a TestBed render of this component is brittle under jsdom. The sibling
 * module-creation.component.spec.ts keeps the (shallow) TestBed render test.
 */
describe('ModuleCreationComponent (direct instantiation)', () => {
  let component: ModuleCreationComponent
  let cdr: any
  let dialog: any
  let contentService: any
  let activateRoute: any
  let router: any
  let profanityService: any
  let snackBar: any
  let loader: any
  let accessService: any
  let uploadService: any
  let http: any
  let initService: any
  let editorService: any
  let storeService: any
  let configurationsService: any
  let resolverService: any
  let headerService: any
  let valueSvc: any
  let quizStoreSvc: any
  let quizResolverSvc: any
  let breakpointObserver: any
  let progressSvc: any
  let resourceDownloadSvc: any

  let changeActiveCont: Subject<string>
  let backToHomeMessage: Subject<any>
  let updateResourceMessage: Subject<any>
  let afterClosed: Subject<any>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  const course = (over: any = {}) => ({
    identifier: 'do_course',
    name: 'Course A',
    description: 'desc',
    thumbnail: 'thumb.png',
    versionKey: 'vk1',
    duration: '0',
    children: [],
    ...over,
  })

  const build = () => {
    const c = new ModuleCreationComponent(
      cdr,
      dialog,
      contentService,
      activateRoute,
      router,
      profanityService,
      snackBar,
      loader,
      accessService,
      uploadService,
      http,
      initService,
      editorService,
      storeService,
      configurationsService,
      resolverService,
      headerService,
      valueSvc,
      new FormBuilder(),
      quizStoreSvc,
      quizResolverSvc,
      breakpointObserver,
      progressSvc,
      resourceDownloadSvc,
    )
    return c
  }

  beforeEach(() => {
    changeActiveCont = new Subject<string>()
    backToHomeMessage = new Subject<any>()
    updateResourceMessage = new Subject<any>()
    afterClosed = new Subject<any>()

    cdr = { detectChanges: jest.fn() }
    dialog = {
      open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }),
      closeAll: jest.fn(),
    }
    contentService = {
      changeActiveCont,
      parentContent: 'do_course',
      upDatedContent: {},
      originalContent: { do_course: { status: 'Draft' } },
      getUpdatedMeta: jest.fn().mockReturnValue({ contentType: 'Course', mimeType: 'application/html' }),
      getOriginalMeta: jest.fn().mockReturnValue({ contentType: 'Resource', versionKey: 'vk1' }),
      setUpdatedMeta: jest.fn(),
      setOriginalMeta: jest.fn(),
      removeListOfFilesAndUpdatedIPR: jest.fn(),
      updateListOfUpdatedIPR: jest.fn(),
      resetOriginalMetaWithHierarchy: jest.fn(),
      resetStatus: jest.fn().mockReturnValue(false),
      changeStatusDraft: jest.fn(),
      getNodeModifyData: jest.fn().mockReturnValue({}),
    }
    activateRoute = { parent: null }
    router = { navigateByUrl: jest.fn(), url: '/author/editor/do_course/collection' }
    profanityService = { startProfanity: jest.fn().mockReturnValue(of({})) }
    snackBar = { open: jest.fn(), openFromComponent: jest.fn() }
    loader = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    accessService = { userId: 'u1', userName: 'User One', hasRole: jest.fn().mockReturnValue(false) }
    uploadService = { upload: jest.fn().mockReturnValue(of({ artifactUrl: 'a.pdf' })) }
    http = { post: jest.fn().mockReturnValue(of({ result: { identifier: 'asset_1' } })) }
    initService = {
      backToHomeMessage,
      updateResourceMessage,
      ordinals: { subTitles: ['en'] },
      authConfig: new Proxy({}, { get: () => ({ type: 'string', defaultValue: { Resource: [{ value: '' }] } }) }),
      collectionConfig: { childrenConfig: {}, maxDepth: 4 },
    }
    editorService = {
      readcontentV3: jest.fn().mockReturnValue(of(course())),
      updateNewContentV3: jest.fn().mockReturnValue(of({ ok: true })),
      updateContentV4: jest.fn().mockReturnValue(of({ ok: true })),
      newCreatedLexid: '',
    }
    storeService = {
      currentParentNode: 3,
      parentNode: [],
      flatNodeMap: new Map(),
      uniqueIdMap: new Map(),
      lexIdMap: new Map(),
      treeStructureChange: { next: jest.fn() },
      selectedNodeChange: { next: jest.fn() },
      getNewTreeHierarchy: jest.fn().mockReturnValue({}),
      deleteContentNode: jest.fn(),
    }
    configurationsService = {
      userProfile: { userId: 'u1' },
      instanceConfig: { logos: { defaultContent: 'default.png' } },
    }
    resolverService = { buildTreeAndMap: jest.fn(), hasAccess: jest.fn().mockReturnValue(true) }
    headerService = { showCreatorHeader: jest.fn() }
    valueSvc = { isLtMedium$: of(false) }
    quizStoreSvc = { getQuizConfig: jest.fn().mockReturnValue({}) }
    quizResolverSvc = {}
    breakpointObserver = { observe: jest.fn().mockReturnValue(of({ matches: false })) }
    progressSvc = {}
    resourceDownloadSvc = {
      downloadResource: jest.fn().mockResolvedValue(undefined),
      downloadAllAsZip: jest.fn().mockResolvedValue(undefined),
      hasDownloadableResources: jest.fn().mockReturnValue(true),
    }
    ;(window as any).env = { azureBucket: 'bucket' }

    component = build()
  })

  afterEach(() => {
    sessionStorage.clear()
    jest.clearAllMocks()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('constructor', () => {
    it('builds the resource link, pdf, module and quiz forms', () => {
      expect(component.resourceLinkForm.controls.name).toBeDefined()
      expect(component.resourcePdfForm.controls.duration).toBeDefined()
      expect(component.moduleForm.controls.appIcon).toBeDefined()
      expect(component.assessmentOrQuizForm.controls.questionType).toBeDefined()
      expect(component.fileUploadForm.controls.artifactUrl).toBeDefined()
    })

    it('requires a name and artifact URL on the link form', () => {
      expect(component.resourceLinkForm.valid).toBe(false)
      component.resourceLinkForm.patchValue({ name: 'n', artifactUrl: 'http://x', duration: 10 })
      expect(component.resourceLinkForm.valid).toBe(true)
    })

    it('returns to the builder when settings signals a back navigation', () => {
      jest.useFakeTimers()
      component.isSettingsPage = true
      backToHomeMessage.next('fromSettings')
      expect(component.isLoading).toBe(false)
      expect(loader.changeLoad.next).toHaveBeenCalledWith(true)
      jest.advanceTimersByTime(700)
      expect(component.isSettingsPage).toBe(false)
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
      jest.useRealTimers()
    })

    it('ignores an unrelated back-to-home message', () => {
      component.isSettingsPage = true
      backToHomeMessage.next('somethingElse')
      expect(component.isSettingsPage).toBe(true)
    })

    it('re-reads the course when a resource update is broadcast', async () => {
      updateResourceMessage.next(true)
      await Promise.resolve()
      expect(editorService.readcontentV3).toHaveBeenCalled()
    })

    it('ignores a falsy resource update broadcast', async () => {
      updateResourceMessage.next(false)
      await Promise.resolve()
      expect(editorService.readcontentV3).not.toHaveBeenCalled()
    })
  })

  describe('ngOnInit', () => {
    it('seeds the tree control and the parent node id', () => {
      component.ngOnInit()
      expect(component.parentNodeId).toBe(3)
      expect(component.treeControl).toBeDefined()
      expect(component.showQuizForm).toBe(true)
    })

    it('lands on the settings page when returning from a review preview', () => {
      sessionStorage.setItem('isReviewClicked', '1')
      component.clickedNext = true
      component.ngOnInit()
      expect(component.isSettingsPage).toBe(true)
      expect(sessionStorage.getItem('isReviewClicked')).toBeNull()
      expect(sessionStorage.getItem('isSettingsPage')).toBe('1')
    })

    it('stays on the builder without the review flag', () => {
      component.clickedNext = true
      component.ngOnInit()
      expect(component.isSettingsPage).toBe(false)
    })
  })

  describe('ngOnDestroy', () => {
    it('releases every subscription it owns', () => {
      component.activeIndexSubscription = { unsubscribe: jest.fn() } as any
      component.activeContentSubscription = { unsubscribe: jest.fn() } as any
      component.saveTriggerSub = { unsubscribe: jest.fn() } as any
      const backTo = component.backToModule as any
      component.ngOnDestroy()
      expect(component.activeIndexSubscription!.unsubscribe).toHaveBeenCalled()
      expect(component.activeContentSubscription!.unsubscribe).toHaveBeenCalled()
      expect(component.saveTriggerSub!.unsubscribe).toHaveBeenCalled()
      expect(backTo.closed).toBe(true)
    })
  })

  describe('ngOnChanges', () => {
    it('blocks the step change until the course has two resources', () => {
      component.courseData = course({ children: [{ contentType: 'Resource' }] })
      const spy = jest.spyOn(component, 'setSettingsPage').mockImplementation(() => {})
      component.ngOnChanges({ triggerNext: { currentValue: true } } as any)
      expect(snackBar.open).toHaveBeenCalledWith(
        'Please add at least 2 resources before proceeding to Course Settings.',
        'X',
        expect.anything(),
      )
      expect(spy).not.toHaveBeenCalled()
    })

    it('moves to the settings page once two resources exist', () => {
      component.courseData = course({
        children: [{ contentType: 'Resource' }, { contentType: 'Resource' }],
      })
      const spy = jest.spyOn(component, 'setSettingsPage').mockImplementation(() => {})
      component.ngOnChanges({ triggerNext: { currentValue: true } } as any)
      expect(spy).toHaveBeenCalled()
    })

    it('relays Next to the nested course-settings form when already there', () => {
      jest.useFakeTimers()
      component.isSettingsPage = true
      component.ngOnChanges({ triggerNext: { currentValue: true } } as any)
      expect(component.triggerCourseSettingsNext).toBe(true)
      jest.advanceTimersByTime(100)
      expect(component.triggerCourseSettingsNext).toBe(false)
      jest.useRealTimers()
    })

    it('ignores unrelated changes', () => {
      const spy = jest.spyOn(component, 'setSettingsPage').mockImplementation(() => {})
      component.ngOnChanges({ clickedNext: { currentValue: true } } as any)
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('getTotalResourceCount', () => {
    it('counts nothing for an empty course', () => {
      component.courseData = course()
      expect(component.getTotalResourceCount()).toBe(0)
    })

    it('counts resources placed directly under the course', () => {
      component.courseData = course({
        children: [{ contentType: 'Resource' }, { contentType: 'Resource' }],
      })
      expect(component.getTotalResourceCount()).toBe(2)
    })

    it('counts resources nested inside modules', () => {
      component.courseData = course({
        children: [
          {
            contentType: 'CourseUnit',
            children: [{ contentType: 'Resource' }, { contentType: 'CourseUnit' }],
          },
          { contentType: 'Resource' },
        ],
      })
      expect(component.getTotalResourceCount()).toBe(2)
    })

    it('counts nothing when there is no course data', () => {
      expect(component.getTotalResourceCount()).toBe(0)
    })

    it('emits validity to the parent whenever the course tree is replaced', () => {
      const emitted: boolean[] = []
      component.validityChange.subscribe(v => emitted.push(v))
      component.courseData = course({ children: [{ contentType: 'Resource' }] })
      component.courseData = course({
        children: [{ contentType: 'Resource' }, { contentType: 'Resource' }],
      })
      expect(emitted).toEqual([false, true])
    })
  })

  describe('trackBy helpers', () => {
    it('trackByIdentifier prefers the identifier', () => {
      expect(component.trackByIdentifier(2, { identifier: 'do_1' })).toBe('do_1')
    })

    it('trackByIdentifier falls back to the index', () => {
      expect(component.trackByIdentifier(2, {})).toBe(2)
      expect(component.trackByIdentifier(2, null)).toBe(2)
    })

    it('trackByIndex returns the index', () => {
      expect(component.trackByIndex(5)).toBe(5)
    })
  })

  describe('downloads', () => {
    it('downloadOneResource downloads and clears the loader', async () => {
      await component.downloadOneResource({ artifactUrl: 'a.pdf' })
      expect(resourceDownloadSvc.downloadResource).toHaveBeenCalled()
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('downloadOneResource stops the row click from firing', async () => {
      const event = { stopPropagation: jest.fn() } as any
      await component.downloadOneResource({ downloadUrl: 'a.pdf' }, event)
      expect(event.stopPropagation).toHaveBeenCalled()
    })

    it('downloadOneResource ignores a resource with no file', async () => {
      await component.downloadOneResource({})
      expect(resourceDownloadSvc.downloadResource).not.toHaveBeenCalled()
    })

    it('downloadOneResource ignores a missing resource', async () => {
      await component.downloadOneResource(null)
      expect(resourceDownloadSvc.downloadResource).not.toHaveBeenCalled()
    })

    it('downloadOneResource warns when the download fails', async () => {
      resourceDownloadSvc.downloadResource.mockRejectedValue('boom')
      await component.downloadOneResource({ artifactUrl: 'a.pdf' })
      expect(snackBar.open).toHaveBeenCalledWith('Could not download the resource. Please try again.', 'X', expect.anything())
    })

    it('downloadAllResources zips the whole course', async () => {
      await component.downloadAllResources()
      expect(resourceDownloadSvc.downloadAllAsZip).toHaveBeenCalled()
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('downloadAllResources stops the click from bubbling', async () => {
      const event = { stopPropagation: jest.fn() } as any
      await component.downloadAllResources(event)
      expect(event.stopPropagation).toHaveBeenCalled()
    })

    it('downloadAllResources is a no-op when nothing is downloadable', async () => {
      resourceDownloadSvc.hasDownloadableResources.mockReturnValue(false)
      await component.downloadAllResources()
      expect(resourceDownloadSvc.downloadAllAsZip).not.toHaveBeenCalled()
    })

    it('downloadAllResources warns when the zip fails', async () => {
      resourceDownloadSvc.downloadAllAsZip.mockRejectedValue('boom')
      await component.downloadAllResources()
      expect(snackBar.open).toHaveBeenCalledWith('Could not download the resources. Please try again.', 'X', expect.anything())
    })
  })

  describe('routerValuesCalls', () => {
    it('tracks the active content and resets the view mode for a collection', () => {
      component.routerValuesCalls()
      changeActiveCont.next('do_mod')
      expect(component.currentContent).toBe('do_mod')
      expect(component.currentCourseId).toBe('do_mod')
      expect(component.viewMode).toBe('meta')
    })

    it('leaves the view mode alone for a resource', () => {
      contentService.getUpdatedMeta.mockReturnValue({ contentType: 'Resource' })
      component.viewMode = 'upload'
      component.routerValuesCalls()
      changeActiveCont.next('do_res')
      expect(component.viewMode).toBe('upload')
    })

    it('does nothing extra without a parent route', () => {
      component.routerValuesCalls()
      expect(headerService.showCreatorHeader).not.toHaveBeenCalled()
    })

    it('loads the course tree and shows the creator header from the parent route', () => {
      activateRoute = {
        parent: {
          url: of([{ path: 'collection' }]),
          parent: {
            data: of({
              contents: [{ content: { identifier: 'do_course', name: 'Course A', children: [] } }],
            }),
          },
        },
      }
      const c = build()
      c.currentContent = 'do_course'
      storeService.lexIdMap.set('do_course', [7])
      c.routerValuesCalls()
      expect(c.courseName).toBe('Course A')
      expect(storeService.currentParentNode).toBe(7)
      expect(headerService.showCreatorHeader).toHaveBeenCalledWith('Course A')
      expect(resolverService.buildTreeAndMap).toHaveBeenCalled()
    })

    it('marks a competency course as a self assessment', () => {
      activateRoute = {
        parent: {
          url: of([{ path: 'other' }]),
          parent: {
            data: of({
              contents: [{ content: { identifier: 'do_course', name: 'C', children: [], competency: true } }],
            }),
          },
        },
      }
      editorService.readcontentV3.mockReturnValue(of(course({ competency: true })))
      const c = build()
      c.currentContent = 'do_course'
      storeService.lexIdMap.set('do_course', [7])
      c.routerValuesCalls()
      expect(c.isSelfAssessment).toBe(true)
      expect(headerService.showCreatorHeader).not.toHaveBeenCalled()
    })

    it('expands every module of the freshly read course', () => {
      activateRoute = {
        parent: {
          url: of([{ path: 'collection' }]),
          parent: {
            data: of({ contents: [{ content: { identifier: 'do_course', name: 'C', children: [] } }] }),
          },
        },
      }
      editorService.readcontentV3.mockReturnValue(of(course({ children: [{ identifier: 'mod_1' }, { identifier: 'mod_2' }] })))
      const c = build()
      c.currentContent = 'do_course'
      storeService.lexIdMap.set('do_course', [7])
      c.routerValuesCalls()
      expect(c.showChildrenMap).toEqual({ mod_1: true, mod_2: true })
    })
  })

  describe('subActions', () => {
    beforeEach(() => {
      jest.spyOn(changeActiveCont, 'next')
    })

    it('broadcasts the newly active content', () => {
      component.subActions({ type: 'editMeta', identifier: 'do_1' })
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_1')
      expect(component.viewMode).toBe('meta')
    })

    const uploadMimes = ['application/pdf', 'application/x-mpegURL', 'application/vnd.ekstep.html-archive', 'audio/mpeg', 'video/mp4']
    uploadMimes.forEach(mimeType => {
      it(`opens the upload view for ${mimeType}`, () => {
        contentService.getUpdatedMeta.mockReturnValue({ mimeType })
        component.subActions({ type: 'editContent', identifier: 'do_1' })
        expect(component.viewMode).toBe('upload')
      })
    })

    it('opens the curate view for a link resource', () => {
      contentService.getUpdatedMeta.mockReturnValue({ mimeType: 'text/x-url', fileType: '' })
      component.subActions({ type: 'editContent', identifier: 'do_1' })
      expect(component.viewMode).toBe('curate')
    })

    it('opens the upload view for an html resource with a file type', () => {
      contentService.getUpdatedMeta.mockReturnValue({ mimeType: 'application/html', fileType: 'x' })
      component.subActions({ type: 'editContent', identifier: 'do_1' })
      expect(component.viewMode).toBe('upload')
    })

    it('opens the assessment view for a quiz', () => {
      contentService.getUpdatedMeta.mockReturnValue({ mimeType: 'application/quiz' })
      component.subActions({ type: 'editContent', identifier: 'do_1' })
      expect(component.viewMode).toBe('assessment')
    })

    it('opens the assessment view for a json assessment', () => {
      contentService.getUpdatedMeta.mockReturnValue({ mimeType: 'application/json' })
      component.subActions({ type: 'editContent', identifier: 'do_1' })
      expect(component.viewMode).toBe('assessment')
    })

    it('opens the web-module view', () => {
      contentService.getUpdatedMeta.mockReturnValue({ mimeType: 'application/web-module' })
      component.subActions({ type: 'editContent', identifier: 'do_1' })
      expect(component.viewMode).toBe('webmodule')
    })

    it('falls back to the meta view for anything else', () => {
      contentService.getUpdatedMeta.mockReturnValue({ mimeType: 'image/png' })
      component.subActions({ type: 'editContent', identifier: 'do_1' })
      expect(component.viewMode).toBe('meta')
    })
  })

  describe('action', () => {
    it('next returns to the meta view', () => {
      component.action('next')
      expect(component.viewMode).toBe('meta')
    })

    it('scroll brings the edit-meta panel into view', () => {
      const el = document.createElement('div')
      el.id = 'edit-meta'
      ;(el as any).scrollIntoView = jest.fn()
      document.body.appendChild(el)
      component.action('scroll')
      expect((el as any).scrollIntoView).toHaveBeenCalled()
      el.remove()
    })

    it('scroll is safe when the panel is absent', () => {
      expect(() => component.action('scroll')).not.toThrow()
    })

    it('save persists and reveals the resource panel', () => {
      const spy = jest.spyOn(component, 'saves').mockResolvedValue(undefined as any)
      component.action('save')
      expect(spy).toHaveBeenCalledWith('save')
      expect(component.showResource).toBe(true)
    })

    it('saveAndNext persists and advances', () => {
      const spy = jest.spyOn(component, 'saves').mockResolvedValue(undefined as any)
      component.action('saveAndNext')
      expect(spy).toHaveBeenCalledWith('next')
    })

    it('push confirms before publishing', () => {
      contentService.originalContent = { do_course: { status: 'Reviewed' } }
      component.currentParentId = 'do_course'
      const spy = jest.spyOn(component, 'takeAction').mockResolvedValue(undefined as any)
      component.action('push')
      expect(dialog.open).toHaveBeenCalled()
      afterClosed.next(true)
      expect(spy).toHaveBeenCalledWith()
    })

    it('push does nothing when the publish confirmation is dismissed', () => {
      contentService.originalContent = { do_course: { status: 'Reviewed' } }
      component.currentParentId = 'do_course'
      const spy = jest.spyOn(component, 'takeAction').mockResolvedValue(undefined as any)
      component.action('push')
      afterClosed.next(false)
      expect(spy).not.toHaveBeenCalled()
    })

    it('push sends for review without a dialog when not publishable', () => {
      contentService.originalContent = { do_course: { status: 'Draft' } }
      component.currentParentId = 'do_course'
      const spy = jest.spyOn(component, 'takeAction').mockResolvedValue(undefined as any)
      component.action('push')
      expect(dialog.open).not.toHaveBeenCalled()
      expect(spy).toHaveBeenCalledWith('acceptConent')
    })

    it('acceptConent and rejectContent delegate to takeAction', () => {
      const spy = jest.spyOn(component, 'takeAction').mockResolvedValue(undefined as any)
      component.action('acceptConent')
      expect(spy).toHaveBeenCalledWith('acceptConent')
      component.action('rejectContent')
      expect(spy).toHaveBeenCalledWith('rejectContent')
    })

    it('ignores an unknown action', () => {
      component.viewMode = 'upload'
      component.action('nope')
      expect(component.viewMode).toBe('upload')
    })
  })

  describe('getAction', () => {
    beforeEach(() => {
      component.currentParentId = 'do_course'
    })

    it('offers review for draft and live content', () => {
      contentService.originalContent = { do_course: { status: 'Draft' } }
      expect(component.getAction()).toBe('sendForReview')
      contentService.originalContent = { do_course: { status: 'Live' } }
      expect(component.getAction()).toBe('sendForReview')
    })

    it('offers review actions while in review', () => {
      contentService.originalContent = { do_course: { status: 'InReview' } }
      expect(component.getAction()).toBe('review')
    })

    it('offers publish once reviewed with no draft children', () => {
      contentService.originalContent = { do_course: { status: 'Reviewed' } }
      expect(component.getAction()).toBe('publish')
    })

    it('drops back to review when a child is still draft', () => {
      contentService.originalContent = { do_course: { status: 'Reviewed' } }
      contentService.resetStatus.mockReturnValue(true)
      expect(component.getAction()).toBe('sendForReview')
      expect(contentService.changeStatusDraft).toHaveBeenCalled()
    })

    it('defaults to review for an unknown status', () => {
      contentService.originalContent = { do_course: { status: 'Whatever' } }
      expect(component.getAction()).toBe('sendForReview')
    })
  })

  describe('in-video quiz questions', () => {
    beforeEach(() => {
      component.addVideoQuestion()
    })

    it('addVideoQuestion appends a blank question and focuses its tab', () => {
      expect(component.videoQuestions.length).toBe(1)
      expect(component.activeTabIndex).toBe(0)
      expect(component.videoQuestions[0].question[0].options.length).toBe(1)
      component.addVideoQuestion()
      expect(component.activeTabIndex).toBe(1)
    })

    it('generateOptionId returns a number', () => {
      expect(typeof component.generateOptionId()).toBe('number')
    })

    it('setActiveTab selects the tab', () => {
      component.setActiveTab(3)
      expect(component.activeTabIndex).toBe(3)
    })

    it('addOption appends an empty option', () => {
      component.addOption(0, 0)
      expect(component.videoQuestions[0].question[0].options.length).toBe(2)
    })

    it('clearOption blanks the option text and answer info', () => {
      component.videoQuestions[0].question[0].options[0].text = 'A'
      component.videoQuestions[0].question[0].options[0].answerInfo = 'why'
      component.clearOption(0, 0, 0)
      expect(component.videoQuestions[0].question[0].options[0].text).toBe('')
      expect(component.videoQuestions[0].question[0].options[0].answerInfo).toBe('')
    })

    it('deleteOption removes the option', () => {
      component.addOption(0, 0)
      component.deleteOption(0, 0, 0)
      expect(component.videoQuestions[0].question[0].options.length).toBe(1)
    })

    it('setCorrectOption marks exactly one option correct', () => {
      component.addOption(0, 0)
      component.addOption(0, 0)
      component.setCorrectOption(0, 0, 1)
      const flags = component.videoQuestions[0].question[0].options.map(o => o.isCorrect)
      expect(flags).toEqual([false, true, false])
    })

    it('updateTimestampInSeconds folds the timestamp parts', () => {
      component.videoQuestions[0].timestamp = { hours: 1, minutes: 2, seconds: 3 }
      component.updateTimestampInSeconds(0)
      expect(component.videoQuestions[0].timestampInSeconds).toBe(3723)
    })

    it('deleteQuestion removes the question once confirmed', () => {
      component.addVideoQuestion()
      component.deleteQuestion(1)
      afterClosed.next(true)
      expect(component.videoQuestions.length).toBe(1)
      expect(component.activeTabIndex).toBe(0)
    })

    it('deleteQuestion keeps the question when dismissed', () => {
      component.deleteQuestion(0)
      afterClosed.next(false)
      expect(component.videoQuestions.length).toBe(1)
    })

    it('removeEmptyQuestions drops questions without text or enough options', () => {
      component.videoQuestions[0].question[0].text = ''
      component.removeEmptyQuestions()
      expect(component.videoQuestions.length).toBe(0)
    })

    it('removeEmptyQuestions keeps a complete question', () => {
      component.videoQuestions[0].question[0].text = 'Q?'
      component.videoQuestions[0].question[0].options[0].text = 'A'
      component.addOption(0, 0)
      component.videoQuestions[0].question[0].options[1].text = 'B'
      component.removeEmptyQuestions()
      expect(component.videoQuestions.length).toBe(1)
    })

    it('onVideoMetadataLoaded records the true clip length', () => {
      component.onVideoMetadataLoaded({ target: { duration: 95.7 } } as any)
      expect(component.videoActualDuration).toBe(95)
    })

    it('onVideoMetadataLoaded ignores a non-finite duration', () => {
      component.onVideoMetadataLoaded({ target: { duration: Infinity } } as any)
      expect(component.videoActualDuration).toBeNull()
    })

    it('isTimestampBeyondVideo is false until the length is known', () => {
      expect(component.isTimestampBeyondVideo({ timestampInSeconds: 999 })).toBe(false)
    })

    it('isTimestampBeyondVideo flags a timestamp past the end', () => {
      component.videoActualDuration = 100
      expect(component.isTimestampBeyondVideo({ timestampInSeconds: 101 })).toBe(true)
      expect(component.isTimestampBeyondVideo({ timestampInSeconds: 100 })).toBe(false)
    })

    it('hasTimestampBeyondVideo is false without a known length', () => {
      expect(component.hasTimestampBeyondVideo).toBe(false)
    })

    it('hasTimestampBeyondVideo flags any unreachable question', () => {
      component.videoActualDuration = 10
      component.videoQuestions[0].timestampInSeconds = 50
      expect(component.hasTimestampBeyondVideo).toBe(true)
    })

    it('hasTimestampBeyondVideo is false with no questions', () => {
      component.videoActualDuration = 10
      component.videoQuestions = []
      expect(component.hasTimestampBeyondVideo).toBe(false)
    })
  })

  describe('getChildrenCount', () => {
    it('hides the module panel for a non-competency course', () => {
      component.courseData = course({ children: [] })
      component.getChildrenCount()
      expect(component.hideModule).toBe(false)
      expect(component.hideResource).toBe(false)
    })

    it('hides the module panel for a competency course', () => {
      component.courseData = course({ competency: true, children: [] })
      component.getChildrenCount()
      expect(component.hideModule).toBe(true)
    })

    it('hides the resource panel once a competency course has five quizzes', () => {
      const quiz = { contentType: 'Resource', mimeType: 'application/quiz' }
      component.courseData = course({
        competency: true,
        children: [quiz, quiz, quiz, { contentType: 'CourseUnit', children: [quiz, quiz] }],
      })
      component.getChildrenCount()
      expect(component.hideResource).toBe(true)
    })

    it('keeps the resource panel below five quizzes', () => {
      const quiz = { contentType: 'Resource', mimeType: 'application/json' }
      component.courseData = course({ competency: true, children: [quiz] })
      component.getChildrenCount()
      expect(component.hideResource).toBe(false)
    })
  })

  describe('ngAfterViewInit', () => {
    it('seeds the module details from the read course', () => {
      component.ngAfterViewInit()
      expect(component.moduleName).toBe('Course A')
      expect(component.topicDescription).toBe('desc')
      expect(component.thumbnail).toBe('thumb.png')
      expect(component.isSaveModuleFormEnable).toBe(true)
    })

    it('reveals the settings step once the course has two modules', () => {
      editorService.readcontentV3.mockReturnValue(of(course({ children: [{ identifier: 'a' }, { identifier: 'b' }] })))
      component.ngAfterViewInit()
      expect(component.showSettingsPage).toBe(true)
    })

    it('sums child durations and pushes the corrected total upstream', () => {
      editorService.readcontentV3.mockReturnValue(
        of(
          course({
            children: [
              { contentType: 'Resource', duration: '60' },
              { contentType: 'CourseUnit', children: [{ duration: '30' }] },
            ],
          }),
        ),
      )
      component.ngAfterViewInit()
      expect(component.sumDuration).toBe(90)
      expect(editorService.updateNewContentV3).toHaveBeenCalled()
      expect(component.mainCourseDuration).toBe('0h 1m 30s ')
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('skips the update when the stored duration already matches', () => {
      editorService.readcontentV3.mockReturnValue(of(course({ duration: '60', children: [{ contentType: 'Resource', duration: '60' }] })))
      component.ngAfterViewInit()
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
    })

    it('clears the loader when the read fails', () => {
      editorService.readcontentV3.mockReturnValue(throwError(() => 'boom'))
      component.ngAfterViewInit()
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    })
  })

  describe('setSettingsPage', () => {
    it('switches to the course settings step', () => {
      jest.useFakeTimers()
      const emitted: string[] = []
      component.sendSteps.subscribe(v => emitted.push(v))
      component.setSettingsPage()
      jest.advanceTimersByTime(1100)
      expect(component.isSettingsPage).toBe(true)
      expect(sessionStorage.getItem('isSettingsPage')).toBe('1')
      expect(emitted).toEqual(['CourseSettings'])
      jest.useRealTimers()
    })

    it('switches to the assessment settings step for a self assessment', () => {
      jest.useFakeTimers()
      const emitted: string[] = []
      component.isSelfAssessment = true
      component.sendSteps.subscribe(v => emitted.push(v))
      component.setSettingsPage()
      jest.advanceTimersByTime(1100)
      expect(emitted).toEqual(['AssessmentSettings'])
      jest.useRealTimers()
    })
  })

  describe('moduleCreate and addModule', () => {
    it('creates a module and flips the button to Save', () => {
      const spy = jest.spyOn(component, 'setContentType').mockResolvedValue(undefined as any)
      component.moduleCreate('Module 1', 'Module 1', 'about it')
      expect(component.addResourceModule).toEqual({
        type: 'collection',
        name: 'Module 1',
        description: 'about it',
      })
      expect(component.moduleButtonName).toBe('Save')
      expect(component.isSaveModuleFormEnable).toBe(true)
      expect(spy).toHaveBeenCalled()
    })

    it('enables the resource picker on the second press', () => {
      component.moduleButtonName = 'Save'
      component.moduleCreate('Module 1', 'Module 1', '')
      expect(component.isResourceTypeEnabled).toBe(true)
    })

    it('addModule resets the form and starts a new module', () => {
      const spy = jest.spyOn(component, 'setContentType').mockResolvedValue(undefined as any)
      component.addModule()
      expect(component.moduleButtonName).toBe('Save')
      expect(component.editItem).toBe('')
      expect(spy).toHaveBeenCalled()
    })

    it('cancelResouceSelection closes the add-module form', () => {
      component.showAddModuleForm = true
      component.cancelResouceSelection()
      expect(component.showAddModuleForm).toBe(false)
    })

    it('toggleChildren flips the module expansion', () => {
      component.showChildrenMap = { mod_1: true }
      component.toggleChildren({ identifier: 'mod_1' })
      expect(component.showChildrenMap.mod_1).toBe(false)
      component.toggleChildren({ identifier: 'mod_1' }, 0)
      expect(component.showChildrenMap.mod_1).toBe(true)
    })
  })

  describe('duration helpers', () => {
    it('timeToSeconds folds hours/minutes/seconds into the link form', () => {
      component.hours = 1
      component.minutes = 2
      component.seconds = 3
      expect(component.timeToSeconds()).toBe(3723)
      expect(component.resourceLinkForm.controls.duration.value).toBe(3723)
    })

    it('timeToSeconds clamps out-of-range parts', () => {
      component.hours = 0
      component.minutes = 90
      component.seconds = 90
      expect(component.timeToSeconds()).toBe(59 * 60 + 59)
    })

    it('setDuration splits seconds into parts', () => {
      ;(component as any).setDuration(3723)
      expect(component.hours).toBe(1)
      expect(component.minutes).toBe(2)
      expect(component.seconds).toBe(3)
    })

    it('setCourseDuration formats the course length', () => {
      ;(component as any).setCourseDuration(3723)
      expect(component.mainCourseDuration).toBe('1h 2m 3s ')
    })

    it('setCourseDuration shows zero for an empty course', () => {
      ;(component as any).setCourseDuration(0)
      expect(component.mainCourseDuration).toBe('0h 0m 0s ')
    })
  })

  describe('clearForm', () => {
    it('resets both resource forms and the upload state', () => {
      component.resourceLinkForm.patchValue({ name: 'n', artifactUrl: 'http://x' })
      component.moduleName = 'M'
      component.thumbnail = 't.png'
      component.hours = 2
      component.showAddModuleForm = true
      component.clearForm()
      expect(component.resourceLinkForm.value.name).toBe('')
      expect(component.resourcePdfForm.value.name).toBe('')
      expect(component.moduleName).toBe('')
      expect(component.thumbnail).toBe('')
      expect(component.hours).toBe(0)
      expect(component.showAddModuleForm).toBe(false)
      expect(component.activeTabIndex).toBe(0)
      expect(contentService.removeListOfFilesAndUpdatedIPR).toHaveBeenCalled()
    })
  })

  describe('drag helpers', () => {
    it('dragDrop records the three drag operands', () => {
      component.dragDrop({ id: 1 }, { id: 2 }, 'below')
      expect(component.dragEle1).toEqual({ id: 1 })
      expect(component.dragEle2).toEqual({ id: 2 })
      expect(component.dragEle3).toBe('below')
    })

    it('compute finds a top-level child by identifier', () => {
      component.courseData = course({ children: [{ identifier: 'a' }, { identifier: 'b' }] })
      expect(component.compute('a')).toEqual([{ identifier: 'a' }])
    })

    it('compute walks into module children when no top-level match exists', () => {
      component.courseData = course({
        children: [{ identifier: 'mod', children: [{ identifier: 'deep' }] }],
      })
      expect(component.compute('deep')).toEqual([undefined])
    })

    it('dragEnd is safe to call', () => {
      expect(() => component.dragEnd({})).not.toThrow()
    })
  })

  describe('upload helpers', () => {
    it('generateStreamUrl points at the snapshot folder for the current content', () => {
      component.currentContent = 'do_res'
      expect(component.generateStreamUrl('index.html')).toContain('do_res-snapshot/index.html')
    })

    it('profanityCheckAPICall passes the file name through', () => {
      component.currentContent = 'do_res'
      component.file = new File(['x'], 'doc.pdf')
      component.profanityCheckAPICall('http://x')
      expect(profanityService.startProfanity).toHaveBeenCalledWith('do_res', 'http://x', 'doc.pdf')
    })

    it('profanityCheckAPICall falls back to the content id with no file', () => {
      component.currentContent = 'do_res'
      component.file = null
      component.profanityCheckAPICall('http://x')
      expect(profanityService.startProfanity).toHaveBeenCalledWith('do_res', 'http://x', 'do_res')
    })

    it('errorMessage raises the upload failure notification', () => {
      component.errorMessage()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('clearUploadedFile resets the file state', () => {
      component.currentContent = 'do_res'
      component.file = new File(['x'], 'doc.pdf')
      component.mimeType = 'application/pdf'
      component.uploadFileName = 'doc.pdf'
      component.clearUploadedFile()
      expect(contentService.removeListOfFilesAndUpdatedIPR).toHaveBeenCalledWith('do_res')
      expect(component.file).toBeNull()
      expect(component.duration).toBe('0')
      expect(component.mimeType).toBe('')
      expect(component.uploadFileName).toBe('')
    })

    it('iprChecked toggles acceptance and records it', () => {
      component.currentContent = 'do_res'
      component.iprChecked()
      expect(component.iprAccepted).toBe(true)
      expect(contentService.updateListOfUpdatedIPR).toHaveBeenCalledWith('do_res', true)
    })

    it('selectEntryPoint prefixes the entry point with a slash', () => {
      component.selectEntryPoint('assets/index.html')
      expect(component.entryPoint).toBe('/assets/index.html')
    })

    it('closeDialog closes every open dialog', () => {
      component.closeDialog()
      expect(dialog.closeAll).toHaveBeenCalled()
    })

    it('storeData sends the changed upload fields, preserving the version key', () => {
      component.currentContent = 'do_res'
      contentService.getOriginalMeta.mockReturnValue({
        contentType: 'Resource',
        versionKey: 'vk1',
        mimeType: 'application/pdf',
      })
      component.fileUploadForm.patchValue({ mimeType: 'video/mp4', artifactUrl: 'new.mp4' })
      component.storeData()
      const meta = contentService.setUpdatedMeta.mock.calls[0][0]
      expect(meta.mimeType).toBe('video/mp4')
      expect(meta.artifactUrl).toBe('new.mp4')
      expect(meta.versionKey).toBe('vk1')
    })

    it('storeData never sends the duration field', () => {
      component.currentContent = 'do_res'
      component.fileUploadForm.patchValue({ duration: 120 })
      component.storeData()
      expect(contentService.setUpdatedMeta.mock.calls[0][0].duration).toBeUndefined()
    })

    it('validateFile wires a metadata listener for the media file', () => {
      const createObjectURL = jest.fn().mockReturnValue('blob:x')
      ;(URL as any).createObjectURL = createObjectURL
      component.mimeType = 'video/mp4'
      component.validateFile(new File(['x'], 'clip.mp4'))
      expect(createObjectURL).toHaveBeenCalled()
    })

    it('getDuration wires a metadata listener for the current file', () => {
      const createObjectURL = jest.fn().mockReturnValue('blob:x')
      ;(URL as any).createObjectURL = createObjectURL
      component.mimeType = 'audio/mpeg'
      component.file = new File(['x'], 'clip.mp3')
      component.getDuration()
      expect(createObjectURL).toHaveBeenCalled()
    })
  })

  describe('tree helpers', () => {
    it('takeActions routes a delete', () => {
      const spy = jest.spyOn(component, 'delete').mockImplementation(() => {})
      component.takeActions('delete', { identifier: 'do_1' } as any)
      expect(spy).toHaveBeenCalled()
    })

    it('takeActions ignores an unknown action', () => {
      const spy = jest.spyOn(component, 'delete').mockImplementation(() => {})
      component.takeActions('somethingElse', { identifier: 'do_1' } as any)
      expect(spy).not.toHaveBeenCalled()
    })

    it('delete does nothing when the confirmation is dismissed', () => {
      component.delete({ identifier: 'do_1' } as any)
      afterClosed.next(false)
      expect(storeService.deleteContentNode).not.toHaveBeenCalled()
    })

    it('delete removes the node and pushes the new hierarchy', () => {
      component.courseData = course()
      storeService.getNewTreeHierarchy.mockReturnValue({
        do_course: { children: ['do_1'] },
        do_1: { children: [] },
      })
      component.delete({ identifier: 'do_1' } as any)
      afterClosed.next(true)
      expect(storeService.deleteContentNode).toHaveBeenCalled()
      expect(editorService.updateContentV4).toHaveBeenCalled()
    })

    it('getParentNode returns null for a root node', () => {
      component.ngOnInit()
      component.treeControl.dataNodes = []
      expect(component.getParentNode({ level: 0 } as any)).toBeNull()
    })

    it('getParentNode finds the nearest shallower node', () => {
      component.ngOnInit()
      const parent = { level: 0, id: 1 } as any
      const child = { level: 1, id: 2 } as any
      component.treeControl.dataNodes = [parent, child]
      expect(component.getParentNode(child)).toBe(parent)
    })

    it('getParentNode returns null when no shallower node exists', () => {
      component.ngOnInit()
      const child = { level: 1, id: 2 } as any
      component.treeControl.dataNodes = [{ level: 1, id: 1 } as any, child]
      expect(component.getParentNode(child)).toBeNull()
    })

    it('preserveExpandedNodes records the expanded node ids', () => {
      component.ngOnInit()
      const a = { id: 1, level: 0, expandable: true } as any
      const b = { id: 2, level: 0, expandable: true } as any
      component.treeControl.dataNodes = [a, b]
      jest.spyOn(component.treeControl, 'isExpandable').mockReturnValue(true)
      jest.spyOn(component.treeControl, 'isExpanded').mockImplementation((n: any) => n.id === 1)
      component.preserveExpandedNodes()
      expect(Array.from(component.expandedNodes)).toEqual([1])
    })
  })

  describe('small helpers', () => {
    it('click re-emits the action to the parent', () => {
      const spy = jest.fn()
      component.actions.subscribe(spy)
      component.click('save', 'meta')
      expect(spy).toHaveBeenCalledWith({ action: 'save', type: 'meta' })
    })

    it('jsonVerify accepts valid JSON and rejects the rest', () => {
      expect(component.jsonVerify('{"a":1}')).toBe(true)
      expect(component.jsonVerify('nope')).toBe(false)
    })

    it('generateUrl returns the URL when it already targets the bucket', () => {
      expect(component.generateUrl('https://host/bucket/x.png')).toBe('https://host/bucket/x.png')
      expect(component.bucket).toBe('bucket')
    })

    it('generateUrl returns nothing for a foreign URL', () => {
      expect(component.generateUrl('https://host/other/x.png')).toBeUndefined()
    })

    it('changeToDefaultImg swaps in the configured fallback thumbnail', () => {
      const target = { src: 'broken.png' }
      component.changeToDefaultImg({ target })
      expect(target.src).toBe('default.png')
    })

    it('changeToDefaultImg blanks the source with no instance config', () => {
      configurationsService.instanceConfig = null
      const target = { src: 'broken.png' }
      component.changeToDefaultImg({ target })
      expect(target.src).toBe('')
    })

    it('isAssessmentResource is true for a json assessment outside self assessment', () => {
      component.content = { mimeType: 'application/json', isAssessment: true }
      expect(component.isAssessmentResource).toBe(true)
    })

    it('isAssessmentResource is false during a self assessment', () => {
      component.content = { mimeType: 'application/json', isAssessment: true }
      component.isSelfAssessment = true
      expect(component.isAssessmentResource).toBe(false)
    })

    it('isAssessmentResource is false for other mime types', () => {
      component.content = { mimeType: 'application/pdf', isAssessment: true }
      expect(component.isAssessmentResource).toBe(false)
    })

    it('isAssessmentResource is false with no content loaded', () => {
      expect(component.isAssessmentResource).toBe(false)
    })
  })
})
