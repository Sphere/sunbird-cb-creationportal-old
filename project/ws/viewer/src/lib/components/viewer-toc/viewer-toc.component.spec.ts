import { Subject, of, throwError } from 'rxjs'
import { NsContent } from '@ws-widget/collection'
import { ViewerTocComponent } from './viewer-toc.component'

describe('ViewerTocComponent', () => {
  let component: ViewerTocComponent
  let activatedRoute: any
  let domSanitizer: any
  let contentSvc: any
  let utilitySvc: any
  let viewerDataSvc: any
  let viewSvc: any
  let configSvc: any
  let contentProgressSvc: any
  let playerStateService: any
  let editorService: any
  let scormAdapterService: any
  let cdr: any
  let ngZone: any
  let queryParams$: Subject<any>
  let changed$: Subject<any>

  /** Drain the promise chain the queryParamMap handler awaits. */
  const flush = async () => {
    for (let i = 0; i < 12; i += 1) {
      await Promise.resolve()
    }
  }

  const paramMap = (params: Record<string, string | null>) => ({
    get: (key: string) => params[key] ?? null,
  })

  const content = (over: any = {}) => ({
    identifier: 'do_res1',
    name: 'Intro',
    appIcon: 'icon.png',
    artifactUrl: 'artifact.pdf',
    duration: 120,
    mimeType: 'application/pdf',
    contentType: 'Resource',
    complexityLevel: 'Beginner',
    displayContentType: NsContent.EDisplayContentTypes.COURSE,
    ...over,
  })

  /** Course > [modA > [leaf1, leaf2]] */
  const hierarchy = () =>
    content({
      identifier: 'do_course',
      name: 'Course',
      children: [
        content({
          identifier: 'do_modA',
          name: 'Module A',
          displayContentType: NsContent.EDisplayContentTypes.MODULE,
          children: [content({ identifier: 'do_leaf1' }), content({ identifier: 'do_leaf2' })],
        }),
      ],
    })

  const card = (identifier: string, viewerUrl = `/viewer/${identifier}`) => ({ identifier, viewerUrl, children: null }) as any

  beforeEach(() => {
    queryParams$ = new Subject<any>()
    changed$ = new Subject<any>()

    activatedRoute = { queryParamMap: queryParams$ }
    domSanitizer = { bypassSecurityTrustResourceUrl: jest.fn((u: string) => `safe:${u}`) }
    contentSvc = {
      fetchContent: jest.fn().mockReturnValue(of({ result: { content: hierarchy() } })),
      fetchAuthoringContentHierarchy: jest.fn().mockReturnValue(of({ result: { content: hierarchy() } })),
      fetchCollectionHierarchy: jest.fn().mockReturnValue(of({ data: hierarchy() })),
    }
    utilitySvc = {
      getLeafNodes: jest.fn().mockReturnValue([]),
      getPath: jest.fn().mockReturnValue([]),
    }
    viewerDataSvc = {
      changedSubject: changed$,
      resourceId: 'do_leaf1',
      updateNextPrevResource: jest.fn(),
    }
    viewSvc = { getAuthoringUrl: jest.fn((u: string) => `auth:${u}`) }
    configSvc = { instanceConfig: { logos: { defaultContent: 'default.png' } } }
    contentProgressSvc = { getProgressHash: jest.fn().mockReturnValue(of({ do_leaf1: 50 })) }
    playerStateService = { setState: jest.fn() }
    editorService = { readcontentV3: jest.fn().mockReturnValue(of({ gatingEnabled: true })) }
    scormAdapterService = { LMSCommit: jest.fn() }
    cdr = { detectChanges: jest.fn() }
    ngZone = { run: jest.fn((fn: () => void) => fn()) }

    component = new ViewerTocComponent(
      activatedRoute,
      domSanitizer,
      contentSvc,
      utilitySvc,
      viewerDataSvc,
      viewSvc,
      configSvc,
      contentProgressSvc,
      playerStateService,
      editorService,
      scormAdapterService,
      cdr,
      ngZone,
    )
  })

  it('should be created with an empty tree', () => {
    expect(component).toBeTruthy()
    expect(component.tocMode).toBe('TREE')
    expect(component.isFetching).toBe(true)
    expect(component.nestedTreeControl).toBeTruthy()
    expect(component.nestedDataSource).toBeTruthy()
  })

  describe('tree predicates', () => {
    it('treats a node with children as nested', () => {
      expect(component.hasNestedChild(0, card('a'))).toBeFalsy()
      expect(component.hasNestedChild(0, { ...card('a'), children: [card('b')] })).toBeTruthy()
    })
  })

  describe('ngOnInit', () => {
    it('trusts the configured default thumbnail', () => {
      component.ngOnInit()

      expect(domSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('default.png')
      expect(component.defaultThumbnail).toBe('safe:default.png')
    })

    it('leaves the thumbnail unset without an instance config', () => {
      configSvc.instanceConfig = null
      component.ngOnInit()

      expect(component.defaultThumbnail).toBeNull()
    })

    it('ignores a query string with no collection', async () => {
      component.ngOnInit()
      queryParams$.next(paramMap({}))
      await flush()

      expect(contentSvc.fetchContent).not.toHaveBeenCalled()
      expect(component.collection).toBeNull()
    })

    it('loads a course collection and flattens its queue', async () => {
      utilitySvc.getLeafNodes.mockReturnValue([card('do_leaf1'), card('do_leaf2')])
      component.ngOnInit()
      queryParams$.next(paramMap({ collectionId: 'do_course', collectionType: 'Course' }))
      await flush()

      expect(contentSvc.fetchContent).toHaveBeenCalledWith('do_course', 'detail')
      expect(component.collection!.identifier).toBe('do_course')
      expect(component.queue.length).toBe(2)
      expect(component.isFetching).toBe(false)
      expect(component.isGetingEnabled).toBe(true)
    })

    it.each(['Collection', 'Learning Path'])('loads a %s collection', async type => {
      component.ngOnInit()
      queryParams$.next(paramMap({ collectionId: 'do_x', collectionType: type }))
      await flush()

      expect(contentSvc.fetchContent).toHaveBeenCalled()
      expect(component.isErrorOccurred).toBe(false)
    })

    it('reads the authoring hierarchy in preview mode', async () => {
      component.forPreview = true
      component.ngOnInit()
      queryParams$.next(paramMap({ collectionId: 'do_course', collectionType: 'Course' }))
      await flush()

      expect(contentSvc.fetchAuthoringContentHierarchy).toHaveBeenCalledWith('do_course')
      expect(contentSvc.fetchContent).not.toHaveBeenCalled()
    })

    it('loads a playlist through the collection hierarchy api', async () => {
      component.ngOnInit()
      queryParams$.next(paramMap({ collectionId: 'pl_1', collectionType: 'Playlist' }))
      await flush()

      expect(contentSvc.fetchCollectionHierarchy).toHaveBeenCalledWith('playlist', 'pl_1', 0, 1000)
      expect(component.collection!.identifier).toBe('do_course')
    })

    it('flags an unsupported collection type', async () => {
      component.ngOnInit()
      queryParams$.next(paramMap({ collectionId: 'do_x', collectionType: 'Nonsense' }))
      await flush()

      expect(component.isErrorOccurred).toBe(true)
      expect(component.collection).toBeNull()
    })

    it('reads the gating flag off the collection', async () => {
      editorService.readcontentV3.mockReturnValue(of({ gatingEnabled: false }))
      component.ngOnInit()
      queryParams$.next(paramMap({ collectionId: 'do_course', collectionType: 'Course' }))
      await flush()

      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_course')
      expect(component.isGetingEnabled).toBe(false)
    })

    it('re-processes the current resource when the query string changes', async () => {
      component.ngOnInit()
      component.resourceId = 'do_leaf1'
      component.collection = card('do_course')
      component.queue = [card('do_leaf1'), card('do_leaf2')]

      queryParams$.next(paramMap({}))
      await flush()

      expect(viewerDataSvc.updateNextPrevResource).toHaveBeenCalled()
    })

    it('picks up a resource change from the viewer data service', () => {
      component.ngOnInit()
      component.collection = card('do_course')
      component.queue = [card('do_leaf1'), card('do_leaf2')]

      changed$.next({})

      expect(component.resourceId).toBe('do_leaf1')
      expect(viewerDataSvc.updateNextPrevResource).toHaveBeenCalledWith(true, null, '/viewer/do_leaf2')
    })

    it('ignores a data-service ping for the resource already showing', () => {
      component.ngOnInit()
      component.resourceId = 'do_leaf1'

      changed$.next({})

      expect(viewerDataSvc.updateNextPrevResource).not.toHaveBeenCalled()
    })
  })

  describe('collection load failures', () => {
    it.each([
      [403, 'accessForbidden'],
      [404, 'notFound'],
      [500, 'internalServer'],
      [503, 'serviceUnavailable'],
      [418, 'somethingWrong'],
    ])('maps a %i from the content api to %s', async (status, errorType) => {
      contentSvc.fetchContent.mockReturnValue(throwError(() => ({ status })))
      component.ngOnInit()
      queryParams$.next(paramMap({ collectionId: 'do_course', collectionType: 'Course' }))
      await flush()

      expect(component.errorWidgetData.widgetData.errorType).toBe(errorType)
      expect(component.collection).toBeNull()
      expect(component.isFetching).toBe(false)
    })

    it.each([
      [403, 'accessForbidden'],
      [404, 'notFound'],
      [500, 'internalServer'],
      [503, 'serviceUnavailable'],
      [418, 'somethingWrong'],
    ])('maps a %i from the playlist api to %s', async (status, errorType) => {
      contentSvc.fetchCollectionHierarchy.mockReturnValue(throwError(() => ({ status })))
      component.ngOnInit()
      queryParams$.next(paramMap({ collectionId: 'pl_1', collectionType: 'Playlist' }))
      await flush()

      expect(component.errorWidgetData.widgetData.errorType).toBe(errorType)
      expect(component.collection).toBeNull()
    })
  })

  describe('card conversion', () => {
    const load = async (over: any = {}, preview = false) => {
      component.forPreview = preview
      contentSvc.fetchContent.mockReturnValue(of({ result: { content: content({ identifier: 'do_course', ...over }) } }))
      contentSvc.fetchAuthoringContentHierarchy.mockReturnValue(of({ result: { content: content({ identifier: 'do_course', ...over }) } }))
      component.ngOnInit()
      queryParams$.next(paramMap({ collectionId: 'do_course', collectionType: 'Course' }))
      await flush()
    }

    it('maps the content fields onto a toc card', async () => {
      await load({ children: [content({ identifier: 'do_leaf1' })] })

      expect(component.collection).toMatchObject({
        identifier: 'do_course',
        title: 'Intro',
        thumbnailUrl: 'icon.png',
        duration: 120,
        artifactUrl: 'artifact.pdf',
        complexity: 'Beginner',
      })
      expect(component.collection!.viewerUrl).toContain('do_course')
      expect(component.collection!.children!.length).toBe(1)
    })

    it('prefixes viewer urls with /author in preview mode', async () => {
      await load({}, true)

      expect(component.collection!.viewerUrl.startsWith('/author/viewer/')).toBe(true)
    })

    it('leaves children null for a leaf', async () => {
      await load({ children: [] })

      expect(component.collection!.children).toBeNull()
    })

    it('prefers the resource type over the content type', async () => {
      await load({ resourceType: 'Video' })

      expect(component.collection!.type).toBe('Video')
    })

    it('falls back to the content type', async () => {
      await load({ resourceType: undefined })

      expect(component.collection!.type).toBe('Resource')
    })
  })

  describe('collection card', () => {
    const loadWithDisplayType = async (displayContentType: any, preview = false, over: any = {}) => {
      component.forPreview = preview
      const payload = of({
        result: { content: content({ identifier: 'do_col', displayContentType, ...over }) },
      })
      contentSvc.fetchContent.mockReturnValue(payload)
      contentSvc.fetchAuthoringContentHierarchy.mockReturnValue(payload)
      component.ngOnInit()
      queryParams$.next(paramMap({ collectionId: 'do_col', collectionType: 'Course' }))
      await flush()
    }

    it.each([
      [NsContent.EDisplayContentTypes.PROGRAM, 'content'],
      [NsContent.EDisplayContentTypes.COURSE, 'content'],
      [NsContent.EDisplayContentTypes.MODULE, 'content'],
      [NsContent.EDisplayContentTypes.GOALS, 'goals'],
      [NsContent.EDisplayContentTypes.PLAYLIST, 'playlist'],
    ])('types a %s collection card as %s', async (displayType, expected) => {
      await loadWithDisplayType(displayType)

      expect(component.collectionCard!.type).toBe(expected)
    })

    it('leaves an unknown display type untyped and unlinked', async () => {
      await loadWithDisplayType('SomethingElse')

      expect(component.collectionCard!.type).toBeNull()
      expect(component.collectionCard!.redirectUrl).toBeNull()
    })

    it.each([
      [NsContent.EDisplayContentTypes.COURSE, '/app/toc/do_col/overview'],
      [NsContent.EDisplayContentTypes.GOALS, '/app/goals/do_col'],
      [NsContent.EDisplayContentTypes.PLAYLIST, '/app/playlist/do_col'],
    ])('links a %s collection card to %s', async (displayType, url) => {
      await loadWithDisplayType(displayType)

      expect(component.collectionCard!.redirectUrl).toBe(url)
    })

    it('links to the author toc in preview mode', async () => {
      await loadWithDisplayType(NsContent.EDisplayContentTypes.COURSE, true)

      expect(component.collectionCard!.redirectUrl).toBe('/author/toc/do_col/overview')
      expect(component.collectionCard!.thumbnail).toBe('auth:icon.png')
    })

    it('prefers the resource type for the card subtext', async () => {
      await loadWithDisplayType(NsContent.EDisplayContentTypes.COURSE, false, {
        resourceType: 'Video',
      })

      expect(component.collectionCard!.subText1).toBe('Video')
    })
  })

  describe('changeTocMode', () => {
    it('toggles between the tree and flat layouts', () => {
      expect(component.tocMode).toBe('TREE')

      component.changeTocMode()
      expect(component.tocMode).toBe('FLAT')

      component.changeTocMode()
      expect(component.tocMode).toBe('TREE')
    })
  })

  describe('processCurrentResourceChange', () => {
    beforeEach(() => {
      component.collection = { ...card('do_course'), children: [card('do_leaf1')] } as any
      component.queue = [card('do_leaf1'), card('do_leaf2'), card('do_leaf3')]
    })

    it('publishes the neighbouring resources and the progress hash', () => {
      viewerDataSvc.resourceId = 'do_leaf2'
      component.ngOnInit()
      changed$.next({})

      expect(viewerDataSvc.updateNextPrevResource).toHaveBeenCalledWith(true, '/viewer/do_leaf1', '/viewer/do_leaf3')
      expect(component.contentProgressHash).toEqual({ do_leaf1: 50 })
    })

    it('reports no previous resource at the head of the queue', () => {
      viewerDataSvc.resourceId = 'do_leaf1'
      component.ngOnInit()
      changed$.next({})

      expect(viewerDataSvc.updateNextPrevResource).toHaveBeenCalledWith(true, null, '/viewer/do_leaf2')
    })

    it('reports no next resource at the tail of the queue', () => {
      viewerDataSvc.resourceId = 'do_leaf3'
      component.ngOnInit()
      changed$.next({})

      expect(viewerDataSvc.updateNextPrevResource).toHaveBeenCalledWith(true, '/viewer/do_leaf2', null)
    })

    it('does nothing without a loaded collection', () => {
      component.collection = null
      component.ngOnInit()
      changed$.next({})

      expect(viewerDataSvc.updateNextPrevResource).not.toHaveBeenCalled()
    })
  })

  describe('processCollectionForTree', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('feeds the children into the nested data source and expands the path later', () => {
      const leaf = card('do_leaf1')
      component.collection = { ...card('do_course'), children: [leaf] } as any
      component.queue = [leaf]
      utilitySvc.getPath.mockReturnValue([leaf])

      component.ngOnInit()
      changed$.next({})

      expect(component.nestedDataSource.data).toEqual([leaf])
      expect(component.pathSet.has('do_leaf1')).toBe(true)
      expect(playerStateService.setState).toHaveBeenCalledWith({
        isValid: true,
        prev: null,
        next: null,
      })

      const expandSpy = jest.spyOn(component, 'expandThePath')
      jest.advanceTimersByTime(2000)
      expect(expandSpy).toHaveBeenCalled()
    })
  })

  describe('expandThePath', () => {
    it('expands every node on the path to the current resource', () => {
      const leaf = card('do_leaf1')
      const mod = { ...card('do_modA'), children: [leaf] }
      component.collection = { ...card('do_course'), children: [mod] } as any
      component.resourceId = 'do_leaf1'
      utilitySvc.getPath.mockReturnValue([mod, leaf])
      const expandSpy = jest.spyOn(component.nestedTreeControl, 'expand')

      component.expandThePath()

      expect(utilitySvc.getPath).toHaveBeenCalledWith(component.collection, 'do_leaf1')
      expect(Array.from(component.pathSet)).toEqual(['do_modA', 'do_leaf1'])
      expect(expandSpy).toHaveBeenCalledTimes(2)
    })

    it('does nothing without a resource', () => {
      component.collection = card('do_course')
      component.resourceId = null

      component.expandThePath()

      expect(utilitySvc.getPath).not.toHaveBeenCalled()
    })
  })

  describe('updateResourceChange', () => {
    it('marks the player invalid when no collection is loaded', () => {
      component.queue = []
      component.updateResourceChange()

      expect(playerStateService.setState).toHaveBeenCalledWith({
        isValid: false,
        prev: null,
        next: null,
      })
    })
  })

  describe('minimizenav', () => {
    it('emits the hide-nav event', () => {
      const spy = jest.fn()
      component.hidenav.subscribe(spy)

      component.minimizenav()

      expect(spy).toHaveBeenCalledWith(false)
    })
  })

  describe('showAlert', () => {
    it('commits the SCORM session', () => {
      component.showAlert()
      expect(scormAdapterService.LMSCommit).toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes from both streams', () => {
      component.ngOnInit()
      component.ngOnDestroy()

      queryParams$.next(paramMap({ collectionId: 'do_x', collectionType: 'Course' }))
      changed$.next({})

      expect(contentSvc.fetchContent).not.toHaveBeenCalled()
    })

    it('is safe before init', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
