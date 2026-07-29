import { Subject } from 'rxjs'
import { ViewerTopBarComponent } from './viewer-top-bar.component'

describe('ViewerTopBarComponent', () => {
  let component: ViewerTopBarComponent
  let activatedRoute: any
  let domSanitizer: any
  let configSvc: any
  let viewerDataSvc: any
  let valueSvc: any
  let router: any
  let accessService: any
  let dialog: any
  let isXSmall$: Subject<boolean>
  let tocChange$: Subject<any>
  let changed$: Subject<any>
  let queryParams$: Subject<any>
  let afterClosed$: Subject<any>
  let logSpy: jest.SpyInstance

  const paramMap = (params: Record<string, string | null>) => ({
    get: (key: string) => params[key] ?? null,
  })

  const build = (queryParams: any = {}) => {
    activatedRoute.snapshot = { queryParams }
    return new ViewerTopBarComponent(activatedRoute, domSanitizer, configSvc, viewerDataSvc, valueSvc, router, accessService, dialog)
  }

  beforeEach(() => {
    isXSmall$ = new Subject<boolean>()
    tocChange$ = new Subject<any>()
    changed$ = new Subject<any>()
    queryParams$ = new Subject<any>()
    afterClosed$ = new Subject<any>()

    activatedRoute = { snapshot: { queryParams: {} }, queryParamMap: queryParams$ }
    domSanitizer = { bypassSecurityTrustResourceUrl: jest.fn((u: string) => `safe:${u}`) }
    configSvc = {
      pageNavBar: { background: 'primary' },
      instanceConfig: { logos: { app: 'app.svg' } },
      userRoles: new Set<string>(['content_creator']),
    }
    viewerDataSvc = {
      resourceId: 'do_leaf1',
      resource: { name: 'Intro' },
      tocChangeSubject: tocChange$,
      changedSubject: changed$,
    }
    valueSvc = { isXSmall$ }
    router = { navigateByUrl: jest.fn() }
    accessService = { hasRole: jest.fn().mockReturnValue(false) }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed$ }) }
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)

    component = build()
  })

  afterEach(() => {
    logSpy.mockRestore()
    sessionStorage.clear()
  })

  it('should be created from the current viewer state', () => {
    expect(component).toBeTruthy()
    expect(component.resourceId).toBe('do_leaf1')
    expect(component.resourceName).toBe('Intro')
    expect(component.pageNavbar).toEqual({ background: 'primary' })
    expect(component.logo).toBe(true)
  })

  it('falls back to an empty name when no resource is loaded', () => {
    viewerDataSvc.resource = null
    viewerDataSvc.resourceId = null

    const c = build()

    expect(c.resourceId).toBe('')
    expect(c.resourceName).toBe('')
  })

  it('hides the logo on the smallest screens', () => {
    isXSmall$.next(true)
    expect(component.logo).toBe(false)

    isXSmall$.next(false)
    expect(component.logo).toBe(true)
  })

  describe('canShow', () => {
    it.each([
      ['review', 'content_reviewer'],
      ['publish', 'content_publisher'],
      ['author_create', 'content_creator'],
    ])('grants %s to a user holding %s', (permission, role) => {
      configSvc.userRoles = new Set([role])

      expect(component.canShow(permission)).toBe(true)
    })

    it.each(['content_reviewer', 'content_creator', 'content_publisher'])('grants author to a user holding %s', role => {
      configSvc.userRoles = new Set([role])

      expect(component.canShow('author')).toBe(true)
    })

    it('denies author to a user with none of the content roles', () => {
      configSvc.userRoles = new Set(['other'])

      expect(component.canShow('author')).toBe(false)
    })

    it('denies an unknown permission', () => {
      expect(component.canShow('nonsense')).toBe(false)
    })
  })

  describe('ngOnInit', () => {
    it('resolves the viewer permissions', () => {
      configSvc.userRoles = new Set(['content_creator', 'content_reviewer'])
      const c = build()

      c.ngOnInit()

      expect(c.isCreator).toBe(true)
      expect(c.isReviewer).toBe(true)
      expect(c.isPublisher).toBe(false)
    })

    it('trusts the instance app icon', () => {
      component.ngOnInit()

      expect(component.appIcon).toBe('safe:/assets/instances/eagle/app_logos/aastar-logo.svg')
    })

    it('leaves the icon unset without an instance config', () => {
      configSvc.instanceConfig = null
      const c = build()

      c.ngOnInit()

      expect(c.appIcon).toBeNull()
    })

    it('recognises that the resource belongs to a collection', () => {
      const c = build({ collectionType: 'Course' })

      c.ngOnInit()

      expect(c.isTypeOfCollection).toBe(true)
      expect(c.collectionType).toBe('Course')
    })

    it('treats a standalone resource as outside a collection', () => {
      component.ngOnInit()

      expect(component.isTypeOfCollection).toBe(false)
    })

    it('tracks the neighbouring resource urls', () => {
      component.ngOnInit()

      tocChange$.next({ prevResource: '/viewer/a', nextResource: '/viewer/b' })

      expect(component.prevResourceUrl).toBe('/viewer/a')
      expect(component.nextResourceUrl).toBe('/viewer/b')
    })

    it('discards the placeholder url the author preview emits', () => {
      component.ngOnInit()

      tocChange$.next({ prevResource: null, nextResource: '/author/viewer//undefined' })

      expect(component.nextResourceUrl).toBeNull()
    })

    it('refreshes the title when the toc moves to another resource', () => {
      component.ngOnInit()
      viewerDataSvc.resourceId = 'do_leaf2'
      viewerDataSvc.resource = { name: 'Chapter 2' }

      tocChange$.next({ prevResource: null, nextResource: null })

      expect(component.resourceId).toBe('do_leaf2')
      expect(component.resourceName).toBe('Chapter 2')
    })

    it('refreshes the title when the viewer data service changes resource', () => {
      component.ngOnInit()
      viewerDataSvc.resourceId = 'do_leaf3'
      viewerDataSvc.resource = null

      changed$.next({})

      expect(component.resourceId).toBe('do_leaf3')
      expect(component.resourceName).toBe('')
    })

    it('reads the collection and preview flags off the query string', () => {
      component.ngOnInit()

      queryParams$.next(paramMap({ collectionId: 'do_course', preview: 'true' }))

      expect(component.collectionId).toBe('do_course')
      expect(component.isPreview).toBe(true)
    })

    it('treats a missing preview flag as not previewing', () => {
      component.ngOnInit()

      queryParams$.next(paramMap({ collectionId: 'do_course' }))

      expect(component.isPreview).toBe(false)
    })
  })

  describe('ngOnDestroy', () => {
    it('detaches every subscription', () => {
      component.ngOnInit()
      component.ngOnDestroy()
      const before = component.resourceId

      viewerDataSvc.resourceId = 'do_other'
      tocChange$.next({ prevResource: 'x', nextResource: 'y' })
      changed$.next({})
      queryParams$.next(paramMap({ collectionId: 'do_other' }))

      expect(component.resourceId).toBe(before)
      expect(component.prevResourceUrl).toBeNull()
      expect(component.collectionId).toBe('')
    })

    it('is safe before init', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })

  describe('toggleSideBar', () => {
    it('emits the toggle event', () => {
      const spy = jest.fn()
      component.toggle.subscribe(spy)

      component.toggleSideBar()

      expect(spy).toHaveBeenCalled()
    })
  })

  describe('back', () => {
    it('walks the browser history back', () => {
      const spy = jest.spyOn(window.history, 'back').mockImplementation(() => undefined)

      component.back()

      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  describe('sendForReview', () => {
    it('opens the review checklist for a reviewer', () => {
      accessService.hasRole.mockReturnValue(true)

      component.sendForReview('review')

      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {
        width: '480px',
        data: 'yes',
      })
      expect(router.navigateByUrl).not.toHaveBeenCalled()

      expect(() => afterClosed$.next({ done: true })).not.toThrow()
    })

    it('sends a non-reviewer back to the editor', () => {
      const c = build({ collectionId: 'do_course' })

      c.sendForReview('review')

      expect(dialog.open).not.toHaveBeenCalled()
      expect(sessionStorage.getItem('isReviewClicked')).toBe('true')
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/editor/do_course')
    })

    it('sends a reviewer back to the editor for any other action', () => {
      accessService.hasRole.mockReturnValue(true)
      const c = build({ collectionId: 'do_course' })

      c.sendForReview('edit')

      expect(dialog.open).not.toHaveBeenCalled()
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/editor/do_course')
    })
  })
})
