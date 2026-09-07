import { FormBuilder } from '@angular/forms'
import { BehaviorSubject, Subject, of } from 'rxjs'

import { ModuleCreationComponent } from './module-creation.component'

/**
 * Logic-level suite for ModuleCreationComponent.
 *
 * The component has 24 injected collaborators and a ~5.4k-line template, so per
 * CLAUDE.md it is instantiated directly with mocked collaborators rather than
 * rendered through TestBed (the sibling module-creation.component.spec.ts keeps
 * the small TestBed suite for the render path).
 */
describe('ModuleCreationComponent (logic)', () => {
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

  const build = () =>
    new ModuleCreationComponent(
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

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)

    cdr = { detectChanges: jest.fn(), markForCheck: jest.fn(), detach: jest.fn(), reattach: jest.fn(), checkNoChanges: jest.fn() }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => of(false) }), closeAll: jest.fn() }
    contentService = {
      changeActiveCont: new BehaviorSubject<string>('id1'),
      upDatedContent: {},
      originalContent: { id1: { status: 'Draft' } },
      parentContent: 'parent1',
      getUpdatedMeta: jest.fn().mockReturnValue({ contentType: 'Resource', mimeType: 'application/pdf', fileType: '' }),
      getOriginalMeta: jest.fn().mockReturnValue({ contentType: 'Resource', versionKey: 'vk-1' }),
      setOriginalMeta: jest.fn(),
      setUpdatedMeta: jest.fn(),
      resetStatus: jest.fn().mockReturnValue(false),
      changeStatusDraft: jest.fn(),
      updateListOfUpdatedIPR: jest.fn(),
      removeListOfFilesAndUpdatedIPR: jest.fn(),
    }
    activateRoute = { parent: null, snapshot: { params: {} } }
    router = { navigateByUrl: jest.fn(), navigate: jest.fn() }
    profanityService = { startProfanity: jest.fn().mockReturnValue(of({})) }
    snackBar = { open: jest.fn(), openFromComponent: jest.fn() }
    loader = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    accessService = { authoringConfig: {}, hasRole: jest.fn().mockReturnValue(true) }
    uploadService = { upload: jest.fn().mockReturnValue(of({})) }
    http = { get: jest.fn().mockReturnValue(of({})), post: jest.fn().mockReturnValue(of({})) }
    initService = {
      backToHomeMessage: new Subject<any>(),
      updateResourceMessage: new Subject<any>(),
      ordinals: { subTitles: ['en'] },
      authConfig: {},
    }
    editorService = { readcontentV3: jest.fn().mockReturnValue(of({})), newCreatedLexid: '' }
    storeService = {
      currentParentNode: 7,
      currentSelectedNode: 7,
      parentNode: [],
      flatNodeMap: new Map(),
      uniqueIdMap: new Map(),
      lexIdMap: new Map(),
      treeStructureChange: { next: jest.fn() },
      selectedNodeChange: { next: jest.fn() },
    }
    configurationsService = { userProfile: { userId: 'u1' } }
    resolverService = { buildTreeAndMap: jest.fn() }
    headerService = { showCreatorHeader: jest.fn() }
    valueSvc = { isLtMedium$: of(false) }
    quizStoreSvc = {
      getQuizConfig: jest.fn().mockReturnValue({}),
      collectiveQuiz: {},
      addQuestion: jest.fn(),
      getQuiz: jest.fn().mockReturnValue({ options: [{ text: 'a' }], question: 'q' }),
      updateQuiz: jest.fn(),
      validateQuiz: jest.fn().mockReturnValue(''),
    }
    quizResolverSvc = {}
    breakpointObserver = { observe: jest.fn().mockReturnValue(of({ matches: false })) }
    progressSvc = { setProgress: jest.fn() }
    resourceDownloadSvc = {
      downloadResource: jest.fn().mockResolvedValue(undefined),
      downloadAllAsZip: jest.fn().mockResolvedValue(undefined),
      hasDownloadableResources: jest.fn().mockReturnValue(true),
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('constructs and wires up the four reactive forms', () => {
    const comp = build()
    expect(comp).toBeTruthy()
    expect(Object.keys(comp.resourceLinkForm.controls)).toEqual(
      expect.arrayContaining(['name', 'instructions', 'artifactUrl', 'appIcon', 'duration']),
    )
    expect(Object.keys(comp.resourcePdfForm.controls)).toEqual(expect.arrayContaining(['name', 'appIcon', 'duration']))
    expect(Object.keys(comp.fileUploadForm.controls)).toEqual(expect.arrayContaining(['artifactUrl', 'mimeType', 'entryPoint']))
    expect(Object.keys(comp.assessmentOrQuizForm.controls)).toEqual(expect.arrayContaining(['name', 'duration', 'questionType']))
  })

  describe('backToHomeMessage subscription', () => {
    it('shows the loader then reveals the builder on "fromSettings"', () => {
      jest.useFakeTimers()
      const comp = build()
      comp.isSettingsPage = true
      comp.isLoading = true

      initService.backToHomeMessage.next('fromSettings')

      expect(comp.isLoading).toBe(false)
      expect(loader.changeLoad.next).toHaveBeenCalledWith(true)
      expect(comp.isSettingsPage).toBe(true)

      jest.advanceTimersByTime(600)
      expect(comp.isSettingsPage).toBe(false)
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
      jest.useRealTimers()
    })

    it('ignores any other message', () => {
      const comp = build()
      comp.isSettingsPage = true
      initService.backToHomeMessage.next('somethingElse')
      expect(comp.isSettingsPage).toBe(true)
    })
  })

  describe('updateResourceMessage subscription', () => {
    it('re-runs ngAfterViewInit when a truthy message arrives', async () => {
      const comp = build()
      const spy = jest.spyOn(comp, 'ngAfterViewInit').mockResolvedValue(undefined as any)
      initService.updateResourceMessage.next(true)
      await Promise.resolve()
      expect(spy).toHaveBeenCalled()
    })

    it('does nothing for a falsy message', async () => {
      const comp = build()
      const spy = jest.spyOn(comp, 'ngAfterViewInit').mockResolvedValue(undefined as any)
      initService.updateResourceMessage.next(false)
      await Promise.resolve()
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('getTotalResourceCount', () => {
    it('is 0 when there is no course data', () => {
      const comp = build()
      expect(comp.getTotalResourceCount()).toBe(0)
    })

    it('counts resources directly under the course', () => {
      const comp = build()
      comp.courseData = { children: [{ contentType: 'Resource' }, { contentType: 'Resource' }] }
      expect(comp.getTotalResourceCount()).toBe(2)
    })

    it('counts resources nested inside modules', () => {
      const comp = build()
      comp.courseData = {
        children: [{ contentType: 'CourseUnit', children: [{ contentType: 'Resource' }, { contentType: 'CourseUnit' }] }],
      }
      expect(comp.getTotalResourceCount()).toBe(1)
    })

    it('counts a mix of top-level and nested resources', () => {
      const comp = build()
      comp.courseData = {
        children: [{ contentType: 'Resource' }, { contentType: 'CourseUnit', children: [{ contentType: 'Resource' }] }],
      }
      expect(comp.getTotalResourceCount()).toBe(2)
    })

    it('treats an empty module as contributing nothing', () => {
      const comp = build()
      comp.courseData = { children: [{ contentType: 'CourseUnit', children: [] }, { contentType: 'CourseUnit' }] }
      expect(comp.getTotalResourceCount()).toBe(0)
    })
  })

  describe('courseData setter', () => {
    it('emits validityChange true once the course has 2+ resources', () => {
      const comp = build()
      const emitted: boolean[] = []
      comp.validityChange.subscribe(v => emitted.push(v))
      comp.courseData = { children: [{ contentType: 'Resource' }, { contentType: 'Resource' }] }
      expect(emitted).toEqual([true])
      expect(comp.courseData.children).toHaveLength(2)
    })

    it('emits false when the course has fewer than 2 resources', () => {
      const comp = build()
      const emitted: boolean[] = []
      comp.validityChange.subscribe(v => emitted.push(v))
      comp.courseData = { children: [{ contentType: 'Resource' }] }
      expect(emitted).toEqual([false])
    })
  })

  describe('trackBy helpers', () => {
    it('trackByIdentifier prefers the identifier', () => {
      const comp = build()
      expect(comp.trackByIdentifier(3, { identifier: 'do_1' })).toBe('do_1')
    })

    it('trackByIdentifier falls back to the index', () => {
      const comp = build()
      expect(comp.trackByIdentifier(3, {})).toBe(3)
      expect(comp.trackByIdentifier(4, null)).toBe(4)
    })

    it('trackByIndex returns the index', () => {
      const comp = build()
      expect(comp.trackByIndex(9)).toBe(9)
    })
  })

  describe('ngOnChanges', () => {
    it('does nothing when triggerNext is not true', () => {
      const comp = build()
      const spy = jest.spyOn(comp, 'setSettingsPage').mockImplementation(() => undefined)
      comp.ngOnChanges({ triggerNext: { currentValue: false } } as any)
      expect(spy).not.toHaveBeenCalled()
      expect(snackBar.open).not.toHaveBeenCalled()
    })

    it('does nothing when triggerNext is absent', () => {
      const comp = build()
      const spy = jest.spyOn(comp, 'setSettingsPage').mockImplementation(() => undefined)
      comp.ngOnChanges({} as any)
      expect(spy).not.toHaveBeenCalled()
    })

    it('pulses triggerCourseSettingsNext when already on the settings page', () => {
      jest.useFakeTimers()
      const comp = build()
      comp.isSettingsPage = true
      comp.ngOnChanges({ triggerNext: { currentValue: true } } as any)
      expect(comp.triggerCourseSettingsNext).toBe(true)
      jest.advanceTimersByTime(50)
      expect(comp.triggerCourseSettingsNext).toBe(false)
      jest.useRealTimers()
    })

    it('blocks advancing with fewer than 2 resources and warns the user', () => {
      const comp = build()
      const spy = jest.spyOn(comp, 'setSettingsPage').mockImplementation(() => undefined)
      comp.isSettingsPage = false
      comp.courseData = { children: [{ contentType: 'Resource' }] }
      comp.ngOnChanges({ triggerNext: { currentValue: true } } as any)
      expect(snackBar.open).toHaveBeenCalledWith(
        'Please add at least 2 resources before proceeding to Course Settings.',
        'X',
        expect.any(Object),
      )
      expect(spy).not.toHaveBeenCalled()
    })

    it('moves to the settings page when 2+ resources exist', () => {
      const comp = build()
      const spy = jest.spyOn(comp, 'setSettingsPage').mockImplementation(() => undefined)
      comp.isSettingsPage = false
      comp.courseData = { children: [{ contentType: 'Resource' }, { contentType: 'Resource' }] }
      comp.ngOnChanges({ triggerNext: { currentValue: true } } as any)
      expect(snackBar.open).not.toHaveBeenCalled()
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('downloadOneResource', () => {
    it('stops propagation and downloads a resource with an artifactUrl', async () => {
      const comp = build()
      const event = { stopPropagation: jest.fn() } as any
      await comp.downloadOneResource({ artifactUrl: 'a.pdf' }, event)
      expect(event.stopPropagation).toHaveBeenCalled()
      expect(resourceDownloadSvc.downloadResource).toHaveBeenCalledWith({ artifactUrl: 'a.pdf' })
      expect(loader.changeLoad.next).toHaveBeenCalledWith(true)
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('accepts a resource that only has a downloadUrl', async () => {
      const comp = build()
      await comp.downloadOneResource({ downloadUrl: 'a.zip' })
      expect(resourceDownloadSvc.downloadResource).toHaveBeenCalled()
    })

    it('bails out for a resource with no url', async () => {
      const comp = build()
      await comp.downloadOneResource({ name: 'x' })
      expect(resourceDownloadSvc.downloadResource).not.toHaveBeenCalled()
      expect(loader.changeLoad.next).not.toHaveBeenCalled()
    })

    it('bails out when the resource is missing entirely', async () => {
      const comp = build()
      await comp.downloadOneResource(null)
      expect(resourceDownloadSvc.downloadResource).not.toHaveBeenCalled()
    })

    it('surfaces a snackbar and still clears the loader when the download fails', async () => {
      resourceDownloadSvc.downloadResource.mockRejectedValue(new Error('nope'))
      const comp = build()
      await comp.downloadOneResource({ artifactUrl: 'a.pdf' })
      expect(snackBar.open).toHaveBeenCalledWith('Could not download the resource. Please try again.', 'X', expect.any(Object))
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })
  })

  describe('downloadAllResources', () => {
    it('zips every resource in the course', async () => {
      const comp = build()
      comp.courseData = { children: [] }
      const event = { stopPropagation: jest.fn() } as any
      await comp.downloadAllResources(event)
      expect(event.stopPropagation).toHaveBeenCalled()
      expect(resourceDownloadSvc.downloadAllAsZip).toHaveBeenCalledWith(comp.courseData)
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('does nothing when there is nothing downloadable', async () => {
      resourceDownloadSvc.hasDownloadableResources.mockReturnValue(false)
      const comp = build()
      await comp.downloadAllResources()
      expect(resourceDownloadSvc.downloadAllAsZip).not.toHaveBeenCalled()
    })

    it('surfaces a snackbar when zipping fails', async () => {
      resourceDownloadSvc.downloadAllAsZip.mockRejectedValue(new Error('boom'))
      const comp = build()
      await comp.downloadAllResources()
      expect(snackBar.open).toHaveBeenCalledWith('Could not download the resources. Please try again.', 'X', expect.any(Object))
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })
  })

  describe('ngOnInit', () => {
    beforeEach(() => sessionStorage.clear())

    it('seeds the tree control and parent node, and leaves the settings page closed', () => {
      const comp = build()
      comp.ngOnInit()
      expect(comp.parentNodeId).toBe(7)
      expect(comp.treeControl).toBeTruthy()
      expect(comp.showQuizForm).toBe(true)
      expect(comp.isSettingsPage).toBe(false)
    })

    it('reopens the settings page when returning from a review preview', () => {
      sessionStorage.setItem('isReviewClicked', '1')
      const comp = build()
      comp.clickedNext = true
      comp.ngOnInit()
      expect(comp.isSettingsPage).toBe(true)
      expect(sessionStorage.getItem('isReviewClicked')).toBeNull()
      expect(sessionStorage.getItem('isSettingsPage')).toBe('1')
      expect(sessionStorage.getItem('isSettingsPageFromPreview')).toBe('1')
    })

    it('stays on the builder when isReviewClicked is set but Next was not clicked', () => {
      sessionStorage.setItem('isReviewClicked', '1')
      const comp = build()
      comp.clickedNext = false
      comp.ngOnInit()
      expect(comp.isSettingsPage).toBe(false)
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes every subscription it owns', () => {
      const comp = build()
      const activeIndex = { unsubscribe: jest.fn() }
      const activeContent = { unsubscribe: jest.fn() }
      const saveTrigger = { unsubscribe: jest.fn() }
      comp.activeIndexSubscription = activeIndex as any
      comp.activeContentSubscription = activeContent as any
      comp.saveTriggerSub = saveTrigger as any

      comp.ngOnDestroy()

      expect(activeIndex.unsubscribe).toHaveBeenCalled()
      expect(activeContent.unsubscribe).toHaveBeenCalled()
      expect(saveTrigger.unsubscribe).toHaveBeenCalled()
    })

    it('is safe when no optional subscription was ever created', () => {
      const comp = build()
      comp.activeIndexSubscription = undefined
      comp.activeContentSubscription = undefined
      comp.saveTriggerSub = undefined
      comp.backToModule = undefined
      expect(() => comp.ngOnDestroy()).not.toThrow()
    })
  })

  describe('routerValuesCalls', () => {
    it('tracks the active content and forces meta view for non-Resource content', () => {
      contentService.getUpdatedMeta.mockReturnValue({ contentType: 'Collection' })
      const comp = build()
      comp.routerValuesCalls()
      expect(comp.currentContent).toBe('id1')
      expect(comp.currentCourseId).toBe('id1')
      expect(comp.viewMode).toBe('meta')
    })

    it('leaves the view mode alone for Resource content', () => {
      contentService.getUpdatedMeta.mockReturnValue({ contentType: 'Resource' })
      const comp = build()
      comp.routerValuesCalls()
      expect(comp.viewMode).toBeUndefined()
    })

    it('builds the course tree from the resolved route data', () => {
      const courseContent = {
        identifier: 'course1',
        name: 'My Course',
        competency: true,
        children: [{ identifier: 'mod1' }],
      }
      const readContent = { identifier: 'course1', children: [{ identifier: 'mod1' }, { identifier: 'mod2' }] }
      editorService.readcontentV3.mockReturnValue(of(readContent))
      storeService.lexIdMap = new Map([['id1', [42]]])
      storeService.flatNodeMap = new Map([[42, { id: 42 }]])
      activateRoute = {
        parent: {
          parent: { data: of({ contents: [{ content: courseContent, data: {} }] }) },
          url: of([{ path: 'collection' }]),
        },
        snapshot: { params: {} },
      }

      const comp = build()
      const subActionsSpy = jest.spyOn(comp, 'subActions').mockImplementation(() => undefined)
      comp.routerValuesCalls()

      expect(comp.courseName).toBe('My Course')
      expect(comp.isSelfAssessment).toBe(true)
      expect(editorService.readcontentV3).toHaveBeenCalledWith('parent1')
      expect(comp.showChildrenMap['mod1']).toBe(true)
      expect(comp.showChildrenMap['mod2']).toBe(true)
      expect(resolverService.buildTreeAndMap).toHaveBeenCalled()
      expect(storeService.parentNode).toContain('course1')
      expect(storeService.currentParentNode).toBe(42)
      expect(storeService.treeStructureChange.next).toHaveBeenCalledWith({ id: 42 })
      expect(subActionsSpy).toHaveBeenCalledWith({ type: 'editContent', identifier: 'course1', nodeClicked: true })
      expect(headerService.showCreatorHeader).toHaveBeenCalledWith('My Course')
    })

    it('clears self-assessment when the course is not a competency course', () => {
      const courseContent = { identifier: 'course1', name: 'C', competency: false, children: [] }
      editorService.readcontentV3.mockReturnValue(of({ identifier: 'course1' }))
      storeService.lexIdMap = new Map([['id1', [1]]])
      activateRoute = {
        parent: {
          parent: { data: of({ contents: [{ content: courseContent, data: {} }] }) },
          url: of([{ path: 'other' }]),
        },
        snapshot: { params: {} },
      }
      const comp = build()
      comp.routerValuesCalls()
      expect(comp.isSelfAssessment).toBe(false)
      expect(headerService.showCreatorHeader).not.toHaveBeenCalled()
    })

    it('selects the freshly created node when the editor reports one', () => {
      const courseContent = { identifier: 'course1', name: 'C', children: [] }
      editorService.readcontentV3.mockReturnValue(of({ identifier: 'course1' }))
      editorService.newCreatedLexid = 'newLex'
      storeService.lexIdMap = new Map<any, any>([
        ['id1', [1]],
        ['newLex', [99]],
      ])
      activateRoute = {
        parent: {
          parent: { data: of({ contents: [{ content: courseContent, data: {} }] }) },
          url: of([{ path: 'collection' }]),
        },
        snapshot: { params: {} },
      }
      const comp = build()
      comp.routerValuesCalls()
      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(99)
    })
  })

  describe('subActions', () => {
    const cases: Array<[string, any, string]> = [
      ['application/pdf', { mimeType: 'application/pdf' }, 'upload'],
      ['application/x-mpegURL', { mimeType: 'application/x-mpegURL' }, 'upload'],
      ['html-archive', { mimeType: 'application/vnd.ekstep.html-archive' }, 'upload'],
      ['audio/mpeg', { mimeType: 'audio/mpeg' }, 'upload'],
      ['video/mp4', { mimeType: 'video/mp4' }, 'upload'],
      ['youtube link', { mimeType: 'video/x-youtube', fileType: '' }, 'curate'],
      ['url link', { mimeType: 'text/x-url', fileType: '' }, 'curate'],
      ['application/quiz', { mimeType: 'application/quiz' }, 'assessment'],
      ['application/json', { mimeType: 'application/json' }, 'assessment'],
      ['web-module', { mimeType: 'application/web-module' }, 'webmodule'],
      ['unknown', { mimeType: 'text/plain' }, 'meta'],
    ]

    it.each(cases)('maps %s to the %s view', (_label, meta, expected) => {
      contentService.getUpdatedMeta.mockReturnValue(meta)
      const comp = build()
      comp.subActions({ type: 'editContent', identifier: 'x1' })
      expect(comp.viewMode).toBe(expected)
    })

    it('maps application/html with a non-empty fileType to the upload view', () => {
      contentService.getUpdatedMeta.mockReturnValue({ mimeType: 'application/html', fileType: 'upload' })
      const comp = build()
      comp.subActions({ type: 'editContent', identifier: 'x1' })
      expect(comp.viewMode).toBe('upload')
    })

    it('handles the editMeta type', () => {
      const comp = build()
      comp.subActions({ type: 'editMeta', identifier: 'x1' })
      expect(comp.viewMode).toBe('meta')
    })

    it('broadcasts the newly active content id', () => {
      const comp = build()
      const spy = jest.spyOn(contentService.changeActiveCont, 'next')
      comp.subActions({ type: 'editMeta', identifier: 'x9' })
      expect(spy).toHaveBeenCalledWith('x9')
    })

    it('covers the nodeClicked===false branch', () => {
      contentService.getUpdatedMeta.mockReturnValue({ mimeType: 'text/plain' })
      const comp = build()
      comp.subActions({ type: 'editContent', identifier: 'x1', nodeClicked: false })
      expect(comp.viewMode).toBe('meta')
    })
  })

  describe('action', () => {
    it('"next" switches to the meta view', () => {
      const comp = build()
      comp.action('next')
      expect(comp.viewMode).toBe('meta')
    })

    it('"scroll" scrolls the edit-meta element into view', () => {
      const el = document.createElement('div')
      el.id = 'edit-meta'
      el.scrollIntoView = jest.fn()
      document.body.appendChild(el)
      const comp = build()
      comp.action('scroll')
      expect(el.scrollIntoView).toHaveBeenCalled()
      document.body.removeChild(el)
    })

    it('"scroll" is a no-op when the element is absent', () => {
      const comp = build()
      expect(() => comp.action('scroll')).not.toThrow()
    })

    it('"save" saves and reveals the resource panel', () => {
      const comp = build()
      const spy = jest.spyOn(comp, 'saves').mockResolvedValue(undefined as any)
      comp.action('save')
      expect(spy).toHaveBeenCalledWith('save')
      expect(comp.showResource).toBe(true)
    })

    it('"saveAndNext" saves with the next action', () => {
      const comp = build()
      const spy = jest.spyOn(comp, 'saves').mockResolvedValue(undefined as any)
      comp.action('saveAndNext')
      expect(spy).toHaveBeenCalledWith('next')
    })

    it('"push" confirms before publishing', () => {
      contentService.originalContent = { p1: { status: 'Reviewed' } }
      dialog.open.mockReturnValue({ afterClosed: () => of(true) })
      const comp = build()
      comp.currentParentId = 'p1'
      const spy = jest.spyOn(comp, 'takeAction').mockImplementation(() => undefined as any)
      comp.action('push')
      expect(dialog.open).toHaveBeenCalled()
      expect(spy).toHaveBeenCalledWith()
    })

    it('"push" does not publish when the confirm dialog is dismissed', () => {
      contentService.originalContent = { p1: { status: 'Reviewed' } }
      dialog.open.mockReturnValue({ afterClosed: () => of(false) })
      const comp = build()
      comp.currentParentId = 'p1'
      const spy = jest.spyOn(comp, 'takeAction').mockImplementation(() => undefined as any)
      comp.action('push')
      expect(spy).not.toHaveBeenCalled()
    })

    it('"push" accepts content directly when the action is not publish', () => {
      contentService.originalContent = { p1: { status: 'Draft' } }
      const comp = build()
      comp.currentParentId = 'p1'
      const spy = jest.spyOn(comp, 'takeAction').mockImplementation(() => undefined as any)
      comp.action('push')
      expect(dialog.open).not.toHaveBeenCalled()
      expect(spy).toHaveBeenCalledWith('acceptConent')
    })

    it('"acceptConent" and "rejectContent" delegate to takeAction', () => {
      const comp = build()
      const spy = jest.spyOn(comp, 'takeAction').mockImplementation(() => undefined as any)
      comp.action('acceptConent')
      comp.action('rejectContent')
      expect(spy).toHaveBeenNthCalledWith(1, 'acceptConent')
      expect(spy).toHaveBeenNthCalledWith(2, 'rejectContent')
    })

    it('ignores an unknown action', () => {
      const comp = build()
      expect(() => comp.action('somethingElse')).not.toThrow()
    })
  })

  describe('getAction', () => {
    const build2 = (status: string) => {
      contentService.originalContent = { p1: { status } }
      const comp = build()
      comp.currentParentId = 'p1'
      return comp
    }

    it('returns sendForReview for Draft and Live', () => {
      expect(build2('Draft').getAction()).toBe('sendForReview')
      expect(build2('Live').getAction()).toBe('sendForReview')
    })

    it('returns review for InReview', () => {
      expect(build2('InReview').getAction()).toBe('review')
    })

    it('returns publish for Reviewed when no child is still a draft', () => {
      contentService.resetStatus.mockReturnValue(false)
      expect(build2('Reviewed').getAction()).toBe('publish')
    })

    it('resets everything to draft when Reviewed but a child is a draft', () => {
      contentService.resetStatus.mockReturnValue(true)
      const comp = build2('Reviewed')
      expect(comp.getAction()).toBe('sendForReview')
      expect(contentService.changeStatusDraft).toHaveBeenCalled()
    })

    it('falls back to sendForReview for an unknown status', () => {
      expect(build2('Whatever').getAction()).toBe('sendForReview')
    })
  })

  describe('in-video quiz questions', () => {
    const question = (overrides: any = {}) => ({
      timestamp: { hours: 0, minutes: 0, seconds: 10 },
      timestampInSeconds: 10,
      question: [{ text: 'Q', options: [{ text: 'a', optionId: 1, isCorrect: true, answerInfo: 'x' }] }],
      ...overrides,
    })

    it('addVideoQuestion appends a blank question and activates its tab', () => {
      const comp = build()
      comp.addVideoQuestion()
      expect(comp.videoQuestions).toHaveLength(1)
      expect(comp.activeTabIndex).toBe(0)
      expect(comp.showQuizForm).toBe(true)
      comp.addVideoQuestion()
      expect(comp.activeTabIndex).toBe(1)
      expect(cdr.detectChanges).toHaveBeenCalled()
    })

    it('deleteQuestion removes the question once confirmed', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(true) })
      const comp = build()
      comp.videoQuestions = [question(), question()] as any
      comp.activeTabIndex = 1
      comp.deleteQuestion(1)
      expect(comp.videoQuestions).toHaveLength(1)
      expect(comp.activeTabIndex).toBe(0)
    })

    it('deleteQuestion keeps the question when the dialog is dismissed', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(false) })
      const comp = build()
      comp.videoQuestions = [question()] as any
      comp.deleteQuestion(0)
      expect(comp.videoQuestions).toHaveLength(1)
    })

    it('removeEmptyQuestions drops questions without text or with <2 filled options', () => {
      const comp = build()
      comp.videoQuestions = [
        { question: [{ text: 'good', options: [{ text: 'a' }, { text: 'b' }] }] },
        { question: [{ text: '', options: [{ text: 'a' }, { text: 'b' }] }] },
        { question: [{ text: 'lonely', options: [{ text: 'a' }, { text: '' }] }] },
      ] as any
      comp.removeEmptyQuestions()
      expect(comp.videoQuestions).toHaveLength(1)
      expect(comp.videoQuestions[0].question[0].text).toBe('good')
    })

    it('deleteOption removes one option', () => {
      const comp = build()
      comp.videoQuestions = [question()] as any
      comp.videoQuestions[0].question[0].options.push({ text: 'b', optionId: 2, isCorrect: false, answerInfo: '' } as any)
      comp.deleteOption(0, 0, 0)
      expect(comp.videoQuestions[0].question[0].options).toHaveLength(1)
      expect(comp.videoQuestions[0].question[0].options[0].text).toBe('b')
    })

    it('setCorrectOption marks exactly one option correct', () => {
      const comp = build()
      comp.videoQuestions = [question()] as any
      comp.videoQuestions[0].question[0].options = [
        { text: 'a', optionId: 1, isCorrect: true, answerInfo: '' },
        { text: 'b', optionId: 2, isCorrect: false, answerInfo: '' },
      ] as any
      comp.setCorrectOption(0, 0, 1)
      expect(comp.videoQuestions[0].question[0].options.map((o: any) => o.isCorrect)).toEqual([false, true])
    })

    it('updateTimestampInSeconds converts h/m/s to seconds', () => {
      const comp = build()
      comp.videoQuestions = [question({ timestamp: { hours: 1, minutes: 2, seconds: 3 } })] as any
      comp.updateTimestampInSeconds(0)
      expect(comp.videoQuestions[0].timestampInSeconds).toBe(3723)
    })

    it('addOption appends a blank option', () => {
      const comp = build()
      comp.videoQuestions = [question()] as any
      comp.addOption(0, 0)
      expect(comp.videoQuestions[0].question[0].options).toHaveLength(2)
      expect(comp.videoQuestions[0].question[0].options[1].text).toBe('')
    })

    it('clearOption blanks the option text and answer info', () => {
      const comp = build()
      comp.videoQuestions = [question()] as any
      comp.clearOption(0, 0, 0)
      expect(comp.videoQuestions[0].question[0].options[0].text).toBe('')
      expect(comp.videoQuestions[0].question[0].options[0].answerInfo).toBe('')
    })

    it('generateOptionId returns an integer id', () => {
      const comp = build()
      const id = comp.generateOptionId()
      expect(Number.isInteger(id)).toBe(true)
      expect(id).toBeGreaterThanOrEqual(0)
      expect(id).toBeLessThan(1000000)
    })

    it('setActiveTab sets the active index', () => {
      const comp = build()
      comp.setActiveTab(4)
      expect(comp.activeTabIndex).toBe(4)
    })
  })

  describe('video duration validation', () => {
    it('onVideoMetadataLoaded records a floored duration', () => {
      const comp = build()
      comp.onVideoMetadataLoaded({ target: { duration: 42.7 } } as any)
      expect(comp.videoActualDuration).toBe(42)
    })

    it('onVideoMetadataLoaded ignores a non-finite or zero duration', () => {
      const comp = build()
      comp.onVideoMetadataLoaded({ target: { duration: Infinity } } as any)
      expect(comp.videoActualDuration).toBeNull()
      comp.onVideoMetadataLoaded({ target: { duration: 0 } } as any)
      expect(comp.videoActualDuration).toBeNull()
    })

    it('isTimestampBeyondVideo is false until the real duration is known', () => {
      const comp = build()
      expect(comp.isTimestampBeyondVideo({ timestampInSeconds: 999 })).toBe(false)
    })

    it('isTimestampBeyondVideo compares against the real duration', () => {
      const comp = build()
      comp.videoActualDuration = 100
      expect(comp.isTimestampBeyondVideo({ timestampInSeconds: 101 })).toBe(true)
      expect(comp.isTimestampBeyondVideo({ timestampInSeconds: 100 })).toBe(false)
    })

    it('hasTimestampBeyondVideo is false with no duration or no questions', () => {
      const comp = build()
      expect(comp.hasTimestampBeyondVideo).toBe(false)
      comp.videoActualDuration = 50
      comp.videoQuestions = []
      expect(comp.hasTimestampBeyondVideo).toBe(false)
    })

    it('hasTimestampBeyondVideo is true when any question sits past the end', () => {
      const comp = build()
      comp.videoActualDuration = 50
      comp.videoQuestions = [{ timestampInSeconds: 10 }, { timestampInSeconds: 60 }] as any
      expect(comp.hasTimestampBeyondVideo).toBe(true)
    })
  })

  describe('duration helpers', () => {
    it('timeToSeconds sums h/m/s and writes it to the link form', () => {
      const comp = build()
      comp.hours = 1
      comp.minutes = 2
      comp.seconds = 3
      expect(comp.timeToSeconds()).toBe(3723)
      expect(comp.resourceLinkForm.controls.duration.value).toBe(3723)
    })

    it('timeToSeconds clamps minutes and seconds to 59', () => {
      const comp = build()
      comp.hours = 0
      comp.minutes = 90
      comp.seconds = 90
      expect(comp.timeToSeconds()).toBe(59 * 60 + 59)
    })

    it('timeToSeconds is 0 when nothing is set', () => {
      const comp = build()
      comp.hours = 0
      comp.minutes = 0
      comp.seconds = 0
      expect(comp.timeToSeconds()).toBe(0)
    })

    it('setDuration splits seconds into h/m/s', () => {
      const comp = build()
      ;(comp as any).setDuration(3723)
      expect([comp.hours, comp.minutes, comp.seconds]).toEqual([1, 2, 3])
    })

    it('setDuration handles a sub-minute value', () => {
      const comp = build()
      ;(comp as any).setDuration(45)
      expect([comp.hours, comp.minutes, comp.seconds]).toEqual([0, 0, 45])
    })

    it('setCourseDuration formats a readable course duration', () => {
      const comp = build()
      ;(comp as any).setCourseDuration(3723)
      expect(comp.mainCourseDuration).toBe('1h 2m 3s ')
    })

    it('setCourseDuration falls back to zeroes when there is no duration', () => {
      const comp = build()
      ;(comp as any).setCourseDuration(0)
      expect(comp.mainCourseDuration).toBe('0h 0m 0s ')
    })
  })

  describe('getChildrenCount', () => {
    it('flags a competency course as module-hidden', () => {
      const comp = build()
      comp.courseData = { competency: true, children: [] }
      comp.getChildrenCount()
      expect(comp.hideModule).toBe(true)
      expect(comp.hideResource).toBe(false)
    })

    it('hides resources once a competency course has 5 assessments', () => {
      const comp = build()
      comp.courseData = {
        competency: true,
        children: new Array(5).fill(0).map(() => ({ contentType: 'Resource', mimeType: 'application/quiz' })),
      }
      comp.getChildrenCount()
      expect(comp.hideResource).toBe(true)
    })

    it('counts assessments nested inside modules', () => {
      const comp = build()
      comp.courseData = {
        competency: true,
        children: [
          {
            contentType: 'CourseUnit',
            children: new Array(5).fill(0).map(() => ({ contentType: 'Resource', mimeType: 'application/json' })),
          },
        ],
      }
      comp.getChildrenCount()
      expect(comp.hideResource).toBe(true)
    })

    it('leaves both flags off for a normal course', () => {
      const comp = build()
      comp.courseData = { competency: false, children: [{ contentType: 'Resource', mimeType: 'application/pdf' }] }
      comp.getChildrenCount()
      expect(comp.hideModule).toBe(false)
      expect(comp.hideResource).toBe(false)
    })
  })

  describe('moduleCreate', () => {
    it('builds the module payload and switches the button to Save', () => {
      const comp = build()
      const setContentType = jest.spyOn(comp, 'setContentType').mockResolvedValue(undefined as any)
      const clearForm = jest.spyOn(comp, 'clearForm').mockImplementation(() => undefined)
      comp.moduleButtonName = 'Create'
      comp.moduleCreate('mod', 'Name', 'Desc')
      expect(comp.addResourceModule).toEqual({ type: 'collection', name: 'Name', description: 'Desc' })
      expect(comp.moduleName).toBe('mod')
      expect(comp.isSaveModuleFormEnable).toBe(true)
      expect(comp.moduleButtonName).toBe('Save')
      expect(loader.changeLoad.next).toHaveBeenCalledWith(true)
      expect(setContentType).toHaveBeenCalled()
      expect(clearForm).toHaveBeenCalled()
      expect(comp.editItem).toBe('')
    })

    it('enables the resource-type picker on the second press', () => {
      const comp = build()
      comp.moduleButtonName = 'Save'
      comp.moduleCreate('mod', 'Name', 'Desc')
      expect(comp.isResourceTypeEnabled).toBe(true)
    })
  })

  describe('small helpers', () => {
    it('toggleChildren flips the flag for that module only', () => {
      const comp = build()
      comp.showChildrenMap = { a: true, b: false }
      comp.toggleChildren({ identifier: 'a' })
      expect(comp.showChildrenMap).toEqual({ a: false, b: false })
    })

    it('jsonVerify accepts valid JSON and rejects garbage', () => {
      const comp = build()
      expect(comp.jsonVerify('{"a":1}')).toBe(true)
      expect(comp.jsonVerify('not json')).toBe(false)
    })

    it('generateUrl returns the url when it already points at the bucket', () => {
      ;(window as any).env = { azureBucket: 'my-bucket' }
      const comp = build()
      expect(comp.generateUrl('https://host/my-bucket/file.pdf')).toBe('https://host/my-bucket/file.pdf')
      expect(comp.generateUrl('https://other/file.pdf')).toBeUndefined()
    })

    it('addModule resets the form and creates a fresh module', () => {
      const comp = build()
      const moduleCreate = jest.spyOn(comp, 'moduleCreate').mockImplementation(() => undefined)
      const clearForm = jest.spyOn(comp, 'clearForm').mockImplementation(() => undefined)
      comp.addModule()
      expect(clearForm).toHaveBeenCalled()
      expect(comp.showAddModuleForm).toBe(false)
      expect(comp.moduleButtonName).toBe('Create')
      expect(moduleCreate).toHaveBeenCalledWith('Module Name', 'Module Name', '')
      expect(comp.editItem).toBe('')
    })

    it('changeToDefaultImg swaps in the configured fallback image', () => {
      configurationsService.instanceConfig = { logos: { defaultContent: 'default.png' } }
      const comp = build()
      const target = { src: 'broken.png' }
      comp.changeToDefaultImg({ target } as any)
      expect(target.src).toBe('default.png')
    })

    it('changeToDefaultImg blanks the image when there is no instance config', () => {
      configurationsService.instanceConfig = undefined
      const comp = build()
      const target = { src: 'broken.png' }
      comp.changeToDefaultImg({ target } as any)
      expect(target.src).toBe('')
    })

    it('iprChecked toggles the flag and records it', () => {
      const comp = build()
      comp.currentContent = 'c1'
      comp.iprChecked()
      expect(comp.iprAccepted).toBe(true)
      expect(contentService.updateListOfUpdatedIPR).toHaveBeenCalledWith('c1', true)
      comp.iprChecked()
      expect(comp.iprAccepted).toBe(false)
    })

    it('selectEntryPoint prefixes the file with a slash', () => {
      const comp = build()
      comp.selectEntryPoint('index.html')
      expect(comp.entryPoint).toBe('/index.html')
    })

    it('dragDrop records the three drag operands', () => {
      const comp = build()
      comp.dragDrop({ parent: 'p' }, 'two', 'three')
      expect(comp.dragEle1).toEqual({ parent: 'p' })
      expect(comp.dragEle2).toBe('two')
      expect(comp.dragEle3).toBe('three')
    })

    it('generateStreamUrl builds a snapshot url for the active content', () => {
      const comp = build()
      comp.currentContent = 'c9'
      expect(comp.generateStreamUrl('index.html')).toContain('/c9-snapshot/index.html')
    })

    it('errorMessage raises the upload-failure notification', () => {
      const comp = build()
      comp.errorMessage()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('profanityCheckAPICall passes the file name when a file is present', () => {
      const comp = build()
      comp.currentContent = 'c1'
      comp.file = new File(['x'], 'doc.pdf')
      comp.profanityCheckAPICall('http://url')
      expect(profanityService.startProfanity).toHaveBeenCalledWith('c1', 'http://url', 'doc.pdf')
    })

    it('profanityCheckAPICall falls back to the content id with no file', () => {
      const comp = build()
      comp.currentContent = 'c1'
      comp.file = null
      comp.profanityCheckAPICall('http://url')
      expect(profanityService.startProfanity).toHaveBeenCalledWith('c1', 'http://url', 'c1')
    })

    it('clearUploadedFile resets the upload state', () => {
      const comp = build()
      comp.currentContent = 'c1'
      comp.uploadFileName = 'a.pdf'
      comp.file = new File(['x'], 'a.pdf')
      comp.mimeType = 'application/pdf'
      comp.clearUploadedFile()
      expect(contentService.removeListOfFilesAndUpdatedIPR).toHaveBeenCalledWith('c1')
      expect(comp.uploadFileName).toBe('')
      expect(comp.file).toBeNull()
      expect(comp.duration).toBe('0')
      expect(comp.mimeType).toBe('')
    })

    it('cancelResouceSelection closes the add-module form', () => {
      const comp = build()
      comp.showAddModuleForm = true
      comp.cancelResouceSelection()
      expect(comp.showAddModuleForm).toBe(false)
    })
  })

  describe('clearForm', () => {
    it('resets both resource forms and the h/m/s fields', () => {
      const comp = build()
      comp.showAddModuleForm = true
      comp.hours = 5
      comp.minutes = 5
      comp.seconds = 5
      comp.moduleName = 'x'
      comp.topicDescription = 'y'
      comp.editResourceLinks = 'z'
      comp.thumbnail = 't'

      comp.clearForm()

      expect(comp.showAddModuleForm).toBe(false)
      expect(comp.activeTabIndex).toBe(0)
      expect(comp.resourceLinkForm.controls.name.value).toBe('')
      expect(comp.resourcePdfForm.controls.name.value).toBe('')
      expect(comp.moduleName).toBe('')
      expect(comp.topicDescription).toBe('')
      expect(comp.editResourceLinks).toBe('')
      expect(comp.thumbnail).toBe('')
      expect([comp.hours, comp.minutes, comp.seconds]).toEqual([0, 0, 0])
      expect(comp.isNewTab).toBe(false)
      expect(comp.isShowBtn).toBe(false)
      expect(comp.isGating).toBe(false)
    })
  })

  describe('compute', () => {
    it('returns the matching top-level child', () => {
      const comp = build()
      comp.courseData = { children: [{ identifier: 'a' }, { identifier: 'b' }] }
      expect(comp.compute('a')).toEqual([{ identifier: 'a' }])
    })

    it('walks into module children when there is no top-level match', () => {
      const comp = build()
      comp.courseData = { children: [{ identifier: 'm', children: [{ identifier: 'deep' }] }] }
      const result = comp.compute('deep')
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(1)
    })

    it('tolerates modules without children', () => {
      const comp = build()
      comp.courseData = { children: [{ identifier: 'm' }] }
      expect(() => comp.compute('missing')).not.toThrow()
    })
  })

  describe('getParentNode', () => {
    it('returns null for a root-level node', () => {
      const comp = build()
      comp.ngOnInit()
      comp.treeControl.dataNodes = []
      expect(comp.getParentNode({ level: 0 } as any)).toBeNull()
    })

    it('finds the nearest shallower ancestor', () => {
      const comp = build()
      comp.ngOnInit()
      const parent = { level: 0, id: 1 } as any
      const child = { level: 1, id: 2 } as any
      comp.treeControl.dataNodes = [parent, child]
      expect(comp.getParentNode(child)).toBe(parent)
    })

    it('returns null when no shallower ancestor exists', () => {
      const comp = build()
      comp.ngOnInit()
      const a = { level: 2, id: 1 } as any
      const b = { level: 2, id: 2 } as any
      comp.treeControl.dataNodes = [a, b]
      expect(comp.getParentNode(b)).toBeNull()
    })
  })

  describe('preserveExpandedNodes', () => {
    it('collects the ids of every expanded expandable node', () => {
      const comp = build()
      comp.ngOnInit()
      const nodes = [
        { id: 1, level: 0, expandable: true },
        { id: 2, level: 0, expandable: true },
        { id: 3, level: 0, expandable: false },
      ] as any[]
      comp.treeControl.dataNodes = nodes
      jest.spyOn(comp.treeControl, 'isExpandable').mockImplementation((n: any) => n.expandable)
      jest.spyOn(comp.treeControl, 'isExpanded').mockImplementation((n: any) => n.id === 1)

      comp.preserveExpandedNodes()

      expect(Array.from(comp.expandedNodes)).toEqual([1])
    })
  })

  describe('findInvalidEntriesIndices', () => {
    const good = {
      timestampInSeconds: 10,
      question: [
        {
          text: 'Q',
          options: [
            { text: 'a', isCorrect: true, answerInfo: 'i' },
            { text: 'b', isCorrect: false, answerInfo: 'i' },
          ],
        },
      ],
    }

    it('returns undefined when every entry is valid', () => {
      const comp = build()
      comp.videoActualDuration = 100
      expect(comp.findInvalidEntriesIndices([good])).toBeUndefined()
    })

    it('flags a timestamp past the real video duration', () => {
      const comp = build()
      comp.videoActualDuration = 5
      expect(comp.findInvalidEntriesIndices([good]).invalidTime).toBe(true)
    })

    it('falls back to the typed duration when the real one is unknown', () => {
      const comp = build()
      comp.videoActualDuration = null
      comp.hours = 0
      comp.minutes = 0
      comp.seconds = 5
      expect(comp.findInvalidEntriesIndices([good]).invalidTime).toBe(true)
    })

    it('flags a zero timestamp', () => {
      const comp = build()
      comp.videoActualDuration = 100
      expect(comp.findInvalidEntriesIndices([{ ...good, timestampInSeconds: 0 }]).invalidSec).toBe(true)
    })

    it('flags duplicate timestamps', () => {
      const comp = build()
      comp.videoActualDuration = 100
      const result = comp.findInvalidEntriesIndices([good, { ...good }])
      expect(result.duplicateTimestamp).toBe(true)
      expect(result.index).toBe(1)
    })

    it('flags an empty question text', () => {
      const comp = build()
      comp.videoActualDuration = 100
      expect(comp.findInvalidEntriesIndices([{ ...good, question: [{ ...good.question[0], text: '' }] }]).invalidQuestion).toBe(true)
    })

    it('flags an option with empty text', () => {
      const comp = build()
      comp.videoActualDuration = 100
      const entry = { ...good, question: [{ text: 'Q', options: [{ text: '', isCorrect: true, answerInfo: 'i' }] }] }
      expect(comp.findInvalidEntriesIndices([entry]).invalidOption).toBe(true)
    })

    it('flags fewer than two options', () => {
      const comp = build()
      comp.videoActualDuration = 100
      const entry = { ...good, question: [{ text: 'Q', options: [{ text: 'a', isCorrect: true, answerInfo: 'i' }] }] }
      expect(comp.findInvalidEntriesIndices([entry]).invalidMinOption).toBe(true)
    })

    it('flags a question with no correct option', () => {
      const comp = build()
      comp.videoActualDuration = 100
      const entry = {
        ...good,
        question: [
          {
            text: 'Q',
            options: [
              { text: 'a', isCorrect: false, answerInfo: 'i' },
              { text: 'b', isCorrect: false, answerInfo: 'i' },
            ],
          },
        ],
      }
      expect(comp.findInvalidEntriesIndices([entry]).invalidIsCorrect).toBe(true)
    })

    it('flags a missing answer explanation', () => {
      const comp = build()
      comp.videoActualDuration = 100
      const entry = {
        ...good,
        question: [
          {
            text: 'Q',
            options: [
              { text: 'a', isCorrect: true, answerInfo: '' },
              { text: 'b', isCorrect: false, answerInfo: 'i' },
            ],
          },
        ],
      }
      expect(comp.findInvalidEntriesIndices([entry]).invalidAnswerInfo).toBe(true)
    })
  })

  describe('storeData', () => {
    it('writes changed fields and preserves the original versionKey', () => {
      initService.authConfig = {
        artifactUrl: { type: 'text', defaultValue: { Resource: [{ value: '' }] } },
        isExternal: { type: 'boolean', defaultValue: { Resource: [{ value: false }] } },
        mimeType: { type: 'text', defaultValue: { Resource: [{ value: '' }] } },
        size: { type: 'text', defaultValue: { Resource: [{ value: 0 }] } },
        duration: { type: 'text', defaultValue: { Resource: [{ value: 0 }] } },
        downloadUrl: { type: 'text', defaultValue: { Resource: [{ value: '' }] } },
        transcoding: { type: 'text', defaultValue: { Resource: [{ value: '' }] } },
        streamingUrl: { type: 'text', defaultValue: { Resource: [{ value: '' }] } },
        entryPoint: { type: 'text', defaultValue: { Resource: [{ value: '' }] } },
      }
      const comp = build()
      comp.currentContent = 'c1'
      comp.fileUploadForm.patchValue({ artifactUrl: 'a.pdf', mimeType: 'application/pdf' })

      comp.storeData()

      expect(contentService.setUpdatedMeta).toHaveBeenCalledTimes(1)
      const [meta, id] = contentService.setUpdatedMeta.mock.calls[0]
      expect(id).toBe('c1')
      expect(meta.artifactUrl).toBe('a.pdf')
      expect(meta.mimeType).toBe('application/pdf')
      expect(meta.versionKey).toBe('vk-1')
      expect(meta.duration).toBeUndefined()
    })
  })

  describe('takeActions', () => {
    it('routes the delete action to delete()', () => {
      const comp = build()
      const spy = jest.spyOn(comp, 'delete').mockImplementation(() => undefined as any)
      const node = { id: 1 } as any
      comp.takeActions('delete', node)
      expect(spy).toHaveBeenCalledWith(node)
    })

    it('ignores an unknown action', () => {
      const comp = build()
      const spy = jest.spyOn(comp, 'delete').mockImplementation(() => undefined as any)
      comp.takeActions('somethingElse', { id: 1 } as any)
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('quiz assessment helpers', () => {
    it('addQuestion delegates to the quiz store and refreshes the local data', () => {
      quizStoreSvc.collectiveQuiz = { c1: [{ q: 1 }] }
      const comp = build()
      comp.currentContent = 'c1'
      comp.assessmentOrQuizForm.patchValue({ questionType: 'mcq' })
      comp.addQuestion()
      expect(quizStoreSvc.addQuestion).toHaveBeenCalledWith('mcq')
      expect(comp.assessmentData).toEqual([{ q: 1 }])
    })

    it('updateSelectedQuiz merges option-level edits', () => {
      quizStoreSvc.getQuiz.mockReturnValue({ options: [{ text: 'old', id: 1 }], question: 'q' })
      const comp = build()
      comp.updateSelectedQuiz({ options: [{ text: 'new' }] })
      expect(quizStoreSvc.updateQuiz).toHaveBeenCalledWith(0, expect.objectContaining({ options: [{ text: 'new', id: 1 }] }))
    })

    it('updateSelectedQuiz replaces the question text when type is "question"', () => {
      const comp = build()
      comp.updateSelectedQuiz('new question', 'question')
      expect(quizStoreSvc.updateQuiz).toHaveBeenCalledWith(0, expect.objectContaining({ question: 'new question' }))
    })

    it('updateSelectedQuiz validates when the merged quiz is invalid', () => {
      quizStoreSvc.getQuiz.mockReturnValue({ options: [], isInValid: true })
      const comp = build()
      comp.updateSelectedQuiz({ options: [] })
      expect(quizStoreSvc.validateQuiz).toHaveBeenCalled()
    })

    it('validateNdShowError stays quiet unless asked to show errors', () => {
      quizStoreSvc.validateQuiz.mockReturnValue('SOME_ERROR')
      const comp = build()
      comp.validateNdShowError(false)
      expect(snackBar.openFromComponent).not.toHaveBeenCalled()
    })

    it('validateNdShowError raises a notification for a real error', () => {
      quizStoreSvc.validateQuiz.mockReturnValue('SOME_ERROR')
      const comp = build()
      comp.validateNdShowError(true)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('validateNdShowError stays quiet when the quiz is valid', () => {
      quizStoreSvc.validateQuiz.mockReturnValue('')
      const comp = build()
      comp.validateNdShowError(true)
      expect(snackBar.openFromComponent).not.toHaveBeenCalled()
    })
  })

  describe('extractFile', () => {
    it('collects entry names from the zip and shows the result', () => {
      const entries = [{ filename: 'index.html' }, { filename: 'assets/app.js' }]
      ;(global as any).zip = {
        useWebWorkers: true,
        BlobReader: function BlobReader(this: any) {
          /* stub */
        },
        createReader: (_reader: any, cb: any) => cb({ getEntries: (fn: any) => fn(entries) }),
      }
      const comp = build()
      const spy = jest.spyOn(comp, 'processAndShowResult').mockImplementation(() => undefined)
      comp.file = new File(['x'], 'a.zip')

      comp.extractFile()

      expect(comp.fileList).toEqual(['index.html', 'assets/app.js'])
      expect(comp.errorFileList).toEqual([])
      expect(spy).toHaveBeenCalled()
      delete (global as any).zip
    })
  })

  describe('processAndShowResult', () => {
    it('opens the error dialog when there are bad file names', () => {
      jest.useFakeTimers()
      const comp = build()
      comp.errorFileList = ['bad name.html']
      comp.file = new File(['x'], 'a.zip')
      comp.processAndShowResult()
      expect(comp.file).toBeNull()
      expect(dialog.open).toHaveBeenCalled()
      jest.runAllTimers()
      jest.useRealTimers()
    })

    it('opens the entry-point picker and uploads once every condition is met', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(true) })
      const comp = build()
      const trigger = jest.spyOn(comp, 'triggerUpload').mockResolvedValue(undefined as any)
      comp.errorFileList = []
      comp.selectedEntryFile = true
      comp.fileUploaded = { name: 'my app!.zip' }
      comp.fileUploadCondition = {
        fileName: true,
        eval: true,
        externalReference: true,
        iframe: true,
        isSubmitPressed: false,
        preview: true,
        url: 'http://x',
      }

      comp.processAndShowResult()

      expect(comp.uploadFileName).toBe('myapp.zip')
      expect(trigger).toHaveBeenCalled()
    })

    it('does not upload when a condition is unmet', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(true) })
      const comp = build()
      const trigger = jest.spyOn(comp, 'triggerUpload').mockResolvedValue(undefined as any)
      comp.errorFileList = []
      comp.selectedEntryFile = false
      comp.processAndShowResult()
      expect(trigger).not.toHaveBeenCalled()
    })
  })

  describe('getDuration / validateFile', () => {
    it('getDuration reads the duration off a generated media element', () => {
      const comp = build()
      comp.mimeType = 'video/mp4'
      comp.file = new File(['x'], 'a.mp4')
      const el: any = { preload: '', src: '', duration: 12.4 }
      jest.spyOn(document, 'createElement').mockReturnValue(el)
      ;(URL as any).createObjectURL = jest.fn().mockReturnValue('blob:1')
      ;(window.URL as any).revokeObjectURL = jest.fn()

      comp.getDuration()
      el.onloadedmetadata()

      expect(comp.duration).toBe('12')
    })

    it('validateFile pushes the measured duration into the pdf form', () => {
      const comp = build()
      comp.mimeType = 'audio/mpeg'
      const el: any = { preload: '', src: '', duration: 65 }
      jest.spyOn(document, 'createElement').mockReturnValue(el)
      ;(URL as any).createObjectURL = jest.fn().mockReturnValue('blob:1')
      ;(window.URL as any).revokeObjectURL = jest.fn()

      comp.validateFile(new File(['x'], 'a.mp3'))
      el.onloadedmetadata()

      expect(comp.resourcePdfForm.controls.duration.value).toBe(65)
    })
  })

  describe('closeDialog', () => {
    it('closes every open dialog', () => {
      const comp = build()
      comp.closeDialog()
      expect(dialog.closeAll).toHaveBeenCalled()
    })
  })

  describe('addResModule', () => {
    it('opens the resource picker for a module and refreshes the version key', async () => {
      editorService.readContentV2 = jest.fn().mockReturnValue(of({ versionKey: 'vk-9' }))
      const comp = build()
      jest.spyOn(comp, 'clearForm').mockImplementation(() => undefined)
      comp.courseData = { identifier: 'course1', children: [] }

      await comp.addResModule('mod1', 'course1')

      expect(comp.addResourceModule).toEqual({ module: true, modID: 'mod1', courseID: 'course1' })
      expect(comp.showAddModuleForm).toBe(true)
      expect(comp.isResourceTypeEnabled).toBe(true)
      expect(editorService.readContentV2).toHaveBeenCalledWith('course1')
      expect(comp.updatedVersionKey).toBe('vk-9')
    })
  })

  describe('mediumSizeBreakpoint$', () => {
    it('maps the breakpoint state to a boolean', done => {
      breakpointObserver.observe.mockReturnValue(of({ matches: true }))
      const comp = build()
      comp.mediumSizeBreakpoint$.subscribe(v => {
        expect(v).toBe(true)
        done()
      })
    })
  })
})
