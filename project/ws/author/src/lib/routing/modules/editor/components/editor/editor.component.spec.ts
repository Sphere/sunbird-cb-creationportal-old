import { NavigationStart } from '@angular/router'
import { of, Subject } from 'rxjs'
import { EditorComponent } from './editor.component'

describe('EditorComponent', () => {
  let dialog: any
  let valueSvc: any
  let router: any // ActivatedRoute (first "router" param)
  let route: any // Router (second "route" param)
  let contentService: any
  let snackBar: any
  let contentV2Service: any
  let initSvc: any
  let routerEvents$: Subject<any>

  const content = (over: any = {}) => ({
    identifier: 'do_1',
    status: 'Draft',
    contentType: 'Resource',
    mimeType: 'application/pdf',
    isMetaEditingDisabled: false,
    isExternal: false,
    categoryType: '',
    ...over,
  })

  const build = (dataContents?: any[]) => {
    router = {
      data: of(dataContents ? { contents: dataContents } : {}),
    }
    return new EditorComponent(dialog, valueSvc, router, route, contentService, snackBar, contentV2Service, initSvc)
  }

  beforeEach(() => {
    routerEvents$ = new Subject<any>()
    dialog = { open: jest.fn() }
    valueSvc = { isXSmall$: of(false) }
    route = {
      events: routerEvents$.asObservable(),
      navigate: jest.fn().mockResolvedValue(true),
      navigateByUrl: jest.fn().mockResolvedValue(true),
    }
    contentService = {
      hasAccess: jest.fn().mockReturnValue(true),
      setOriginalMeta: jest.fn(),
      reset: jest.fn(),
      changeActiveCont: { next: jest.fn() },
      currentContent: '',
      parentContent: '',
    }
    snackBar = { openFromComponent: jest.fn() }
    contentV2Service = {
      contentMetaMap: new Map(),
      contentDataMap: new Map(),
      parentContent: [],
      changeActiveCont: { next: jest.fn() },
      changeActiveParentCont: { next: jest.fn() },
    }
    initSvc = { authAdditionalConfig: { allowActionHistory: false } }
  })

  it('should be created', () => {
    expect(build()).toBeTruthy()
  })

  describe('router popstate handling', () => {
    it('steps history back on a popstate to an editor url', () => {
      build()
      const goSpy = jest.spyOn(window.history, 'go').mockImplementation(() => undefined)
      const evt: any = new NavigationStart(1, '/author/editor/do_1')
      evt.navigationTrigger = 'popstate'
      routerEvents$.next(evt)
      expect(goSpy).toHaveBeenCalledWith(-1)
      goSpy.mockRestore()
    })

    it('ignores non-editor popstate urls', () => {
      build()
      const goSpy = jest.spyOn(window.history, 'go').mockImplementation(() => undefined)
      const evt: any = new NavigationStart(1, '/author/home')
      evt.navigationTrigger = 'popstate'
      routerEvents$.next(evt)
      expect(goSpy).not.toHaveBeenCalled()
      goSpy.mockRestore()
    })

    it('ignores non-popstate navigation', () => {
      build()
      const goSpy = jest.spyOn(window.history, 'go').mockImplementation(() => undefined)
      const evt: any = new NavigationStart(1, '/author/editor/do_1')
      evt.navigationTrigger = 'imperative'
      routerEvents$.next(evt)
      expect(goSpy).not.toHaveBeenCalled()
      goSpy.mockRestore()
    })
  })

  describe('ngOnInit', () => {
    it('does nothing when there are no contents', async () => {
      const c = build()
      await c.ngOnInit()
      expect(route.navigate).not.toHaveBeenCalled()
      expect(route.navigateByUrl).not.toHaveBeenCalled()
    })

    it('tracks the mobile flag from the value service', async () => {
      valueSvc.isXSmall$ = of(true)
      const c = build()
      await c.ngOnInit()
      expect(c.isMobile).toBe(true)
    })

    it('notifies and redirects home for a deleted content', async () => {
      const c = build([{ content: content({ status: 'Deleted' }), data: {} }])
      await c.ngOnInit()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(route.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('redirects home when the user lacks access', async () => {
      contentService.hasAccess.mockReturnValue(false)
      const c = build([{ content: content(), data: {} }])
      await c.ngOnInit()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(route.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('redirects home when meta editing is disabled', async () => {
      const c = build([{ content: content({ isMetaEditingDisabled: true }), data: {} }])
      await c.ngOnInit()
      expect(route.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('primes the content services and routes a course to the collection view', async () => {
      const c = build([
        { content: content({ contentType: 'Course', mimeType: 'application/vnd.ekstep.content-collection' }), data: { x: 1 } },
      ])
      await c.ngOnInit()
      expect(contentService.setOriginalMeta).toHaveBeenCalled()
      expect(contentV2Service.contentMetaMap.get('do_1')).toBeDefined()
      expect(contentV2Service.contentDataMap.get('do_1')).toEqual({ x: 1 })
      expect(contentV2Service.parentContent).toContain('do_1')
      expect(contentService.currentContent).toBe('do_1')
      expect(route.navigate).toHaveBeenCalledWith(['collection'], { relativeTo: router })
    })

    it('routes a knowledge board', async () => {
      const c = build([{ content: content({ contentType: 'Knowledge Board' }), data: {} }])
      await c.ngOnInit()
      expect(route.navigate).toHaveBeenCalledWith(['knowledge-board'], { relativeTo: router })
    })

    it('routes a knowledge artifact', async () => {
      const c = build([{ content: content({ contentType: 'Knowledge Artifact' }), data: {} }])
      await c.ngOnInit()
      expect(route.navigate).toHaveBeenCalledWith(['kartifact-pa'], { relativeTo: router })
    })

    it('routes a pdf resource to the upload view', async () => {
      const c = build([{ content: content({ mimeType: 'application/pdf' }), data: {} }])
      await c.ngOnInit()
      expect(route.navigate).toHaveBeenCalledWith(['upload'], { relativeTo: router })
    })

    it('routes a quiz', async () => {
      const c = build([{ content: content({ mimeType: 'application/quiz', categoryType: 'Quiz' }), data: {} }])
      await c.ngOnInit()
      expect(route.navigate).toHaveBeenCalledWith(['quiz'], { relativeTo: router })
    })

    it('routes an assessment', async () => {
      const c = build([{ content: content({ mimeType: 'application/quiz', categoryType: 'Assessment' }), data: {} }])
      await c.ngOnInit()
      expect(route.navigate).toHaveBeenCalledWith(['assessment'], { relativeTo: router })
    })

    it('routes a web module', async () => {
      const c = build([{ content: content({ mimeType: 'application/web-module' }), data: {} }])
      await c.ngOnInit()
      expect(route.navigate).toHaveBeenCalledWith(['web-module'], { relativeTo: router })
    })

    it('routes a class diagram', async () => {
      const c = build([{ content: content({ mimeType: 'application/class-diagram' }), data: {} }])
      await c.ngOnInit()
      expect(route.navigate).toHaveBeenCalledWith(['class-diagram'], { relativeTo: router })
    })

    it('falls back to the curate view for anything else', async () => {
      const c = build([{ content: content({ contentType: 'Resource', mimeType: 'text/x-url' }), data: {} }])
      await c.ngOnInit()
      expect(route.navigate).toHaveBeenCalledWith(['curate'], { relativeTo: router })
    })

    it('opens the status-track dialog for an in-review content when history is allowed', async () => {
      initSvc.authAdditionalConfig.allowActionHistory = true
      const c = build([{ content: content({ status: 'InReview' }), data: {} }])
      await c.ngOnInit()
      expect(dialog.open).toHaveBeenCalled()
    })

    it('does not open the dialog when action history is disabled', async () => {
      initSvc.authAdditionalConfig.allowActionHistory = false
      const c = build([{ content: content({ status: 'InReview' }), data: {} }])
      await c.ngOnInit()
      expect(dialog.open).not.toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('resets the content service and releases subscriptions', async () => {
      const c = build([{ content: content(), data: {} }])
      await c.ngOnInit()
      c.ngOnDestroy()
      expect(contentService.reset).toHaveBeenCalled()
      expect(c.routerSubscription.closed).toBe(true)
      expect(c.routerEventSubscription.closed).toBe(true)
    })

    it('is safe when no data subscription exists', () => {
      const c = build()
      expect(() => c.ngOnDestroy()).not.toThrow()
      expect(contentService.reset).toHaveBeenCalled()
    })
  })
})
