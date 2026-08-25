import { of, Subject, throwError } from 'rxjs'
import { AppTocHomeComponent, ErrorType } from './app-toc-home.component'

describe('AppTocHomeComponent', () => {
  let route: any
  let contentSvc: any
  let tocSvc: any
  let loggerSvc: any
  let configSvc: any
  let domSanitizer: any
  let authAccessControlSvc: any
  let location: any
  let progressSvc: any
  let cdr: any
  let editorService: any
  let currentMessage: Subject<any>
  let routeData: Subject<any>
  let fragment: Subject<string | null>
  let locationEvents: Subject<any>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  const content = (over: any = {}) => ({
    identifier: 'do_1',
    status: 'Draft',
    reviewStatus: 'InReview',
    body: '<p>hello</p>',
    ...over,
  })

  const routeSnapshotData = () => ({ pageData: { data: { analytics: { enabled: true } } } })

  const build = () =>
    new AppTocHomeComponent(
      route,
      contentSvc,
      tocSvc,
      loggerSvc,
      configSvc,
      domSanitizer,
      authAccessControlSvc,
      location,
      progressSvc,
      cdr,
      editorService,
    )

  beforeEach(() => {
    currentMessage = new Subject<any>()
    routeData = new Subject<any>()
    fragment = new Subject<string | null>()
    locationEvents = new Subject<any>()
    route = {
      snapshot: { data: routeSnapshotData() },
      data: routeData.asObservable(),
      fragment: fragment.asObservable(),
    }
    contentSvc = { fetchContentHistory: jest.fn().mockReturnValue(of({ identifier: 'do_2' })) }
    tocSvc = {
      currentMessage,
      initData: jest.fn().mockReturnValue({ content: content(), errorCode: null }),
      subtitleOnBanners: false,
      showDescription: false,
    }
    loggerSvc = { error: jest.fn() }
    configSvc = { pageNavBar: {}, restrictedFeatures: new Set<string>() }
    domSanitizer = { bypassSecurityTrustHtml: jest.fn().mockImplementation((v: string) => `safe:${v}`) }
    authAccessControlSvc = {
      hasRole: jest.fn().mockReturnValue(false),
      hasAccess: jest.fn().mockReturnValue(true),
      proxyToAuthoringUrl: jest.fn().mockImplementation((v: string) => `proxied:${v}`),
    }
    location = { subscribe: jest.fn().mockImplementation((cb: any) => locationEvents.subscribe(cb)) }
    progressSvc = { getComments: jest.fn().mockReturnValue(of([])) }
    cdr = { detectChanges: jest.fn() }
    editorService = { getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: [] } })) }
  })

  it('should be created', () => {
    expect(build()).toBeTruthy()
  })

  describe('role resolution', () => {
    it('narrows the visible roles for a creator', () => {
      authAccessControlSvc.hasRole.mockImplementation((r: string[]) => r[0] === 'content_creator')
      const component = build()
      expect(component.isCreator).toBe(true)
      expect(component.roles).toEqual(['reviewer', 'publisher'])
    })

    it('narrows the visible roles for a reviewer', () => {
      authAccessControlSvc.hasRole.mockImplementation((r: string[]) => r[0] === 'content_reviewer')
      const component = build()
      expect(component.isReviewer).toBe(true)
      expect(component.roles).toEqual(['creator', 'publisher'])
    })

    it('narrows the visible roles for a publisher', () => {
      authAccessControlSvc.hasRole.mockImplementation((r: string[]) => r[0] === 'content_publisher')
      const component = build()
      expect(component.isPublisher).toBe(true)
      expect(component.roles).toEqual(['creator', 'reviewer'])
    })

    it('keeps the default roles for a user with none of them', () => {
      const component = build()
      expect(component.roles).toEqual(['reviewer', 'publisher', 'creator'])
      expect(component.filteredComments).toEqual({ reviewer: [], publisher: [], creator: [] })
    })
  })

  describe('panel messages', () => {
    it('loads and groups the comments by role', () => {
      progressSvc.getComments.mockReturnValue(
        of([
          { role: 'reviewer', text: 'a' },
          { role: 'publisher', text: 'b' },
        ]),
      )
      const component = build()
      component.content = content()
      currentMessage.next('comments')
      expect(component.changeText).toBe('comments')
      expect(component.commentsList.length).toBe(2)
      expect(component.filteredComments['reviewer']).toEqual([{ role: 'reviewer', text: 'a' }])
      expect(component.isLoading).toBe(false)
    })

    it('does not load comments before the content arrives', () => {
      const component = build()
      currentMessage.next('comments')
      expect(progressSvc.getComments).not.toHaveBeenCalled()
      expect(component.changeText).toBe('comments')
    })

    it('loads the proficiency list when switching to preview', () => {
      editorService.getAllEntities.mockReturnValue(of({ result: { entity: [{ code: 'C1' }] } }))
      const component = build()
      component.content = content({ lang: 'hi' })
      currentMessage.next('preview')
      expect(editorService.getAllEntities).toHaveBeenCalledWith('hi')
      expect(component.proficiencyList).toEqual([{ code: 'C1' }])
      expect(component.changeText).toBe('preview')
    })

    it('defaults the preview language to English', () => {
      const component = build()
      currentMessage.next('preview')
      expect(editorService.getAllEntities).toHaveBeenCalledWith('en')
    })

    it('loads the history without grouping it', () => {
      progressSvc.getComments.mockReturnValue(of([{ role: 'reviewer' }]))
      const component = build()
      component.content = content()
      currentMessage.next('history')
      expect(component.changeText).toBe('history')
      expect(component.commentsList).toEqual([{ role: 'reviewer' }])
    })

    it('does not load history before the content arrives', () => {
      const component = build()
      currentMessage.next('history')
      expect(progressSvc.getComments).not.toHaveBeenCalled()
    })

    it('records a return from preview', () => {
      const component = build()
      currentMessage.next('backFromPreview')
      expect(component.changeText).toBe('backFromPreview')
    })

    it('ignores an unknown message', () => {
      const component = build()
      component.changeText = 'home'
      currentMessage.next('whatever')
      expect(component.changeText).toBe('home')
    })

    it('showTocBanner clears the panel selection', () => {
      const component = build()
      component.changeText = 'comments'
      component.showTocBanner()
      expect(component.changeText).toBe('')
    })

    it('toggleComments flips the per-item read flag', () => {
      const component = build()
      const item: any = { readComments: false }
      component.toggleComments(item)
      expect(item.readComments).toBe(true)
    })
  })

  describe('ngOnInit', () => {
    const dataPayload = (over: any = {}) => ({
      content: { data: { identifier: 'do_1', ...over } },
      pageData: { data: { banners: { overview: 'o.png' }, subtitleOnBanners: true, showDescription: true } },
    })

    it('reads the banners and toc configuration from the route', () => {
      const component = build()
      component.ngOnInit()
      routeData.next(dataPayload())
      expect(component.banners).toEqual({ overview: 'o.png' })
      expect(tocSvc.subtitleOnBanners).toBe(true)
      expect(tocSvc.showDescription).toBe(true)
      expect(component.tocConfig).toBeTruthy()
    })

    it('parses the stringified people fields', () => {
      const component = build()
      component.ngOnInit()
      const payload = dataPayload({
        creatorContacts: JSON.stringify([{ id: 'u1' }]),
        creatorDetails: JSON.stringify([{ id: 'u2' }]),
        reviewer: JSON.stringify([{ id: 'u3' }]),
        publisherDetails: JSON.stringify([{ id: 'u4' }]),
      })
      routeData.next(payload)
      expect(payload.content.data.creatorContacts).toEqual([{ id: 'u1' }])
      expect(payload.content.data.reviewer).toEqual([{ id: 'u3' }])
    })

    it('leaves already-parsed people fields alone', () => {
      const component = build()
      component.ngOnInit()
      const payload = dataPayload({ creatorContacts: [{ id: 'u1' }] })
      routeData.next(payload)
      expect(payload.content.data.creatorContacts).toEqual([{ id: 'u1' }])
    })

    it('tracks the active fragment, defaulting to overview', () => {
      const component = build()
      component.ngOnInit()
      expect(component.currentFragment).toBe('overview')
      fragment.next('contents')
      expect(component.currentFragment).toBe('contents')
      fragment.next(null)
      expect(component.currentFragment).toBe('overview')
    })

    it('detects that it is not running inside an iframe', () => {
      const component = build()
      component.ngOnInit()
      expect(component.isInIframe).toBe(false)
    })

    it('reloads the page on a browser navigation event', () => {
      const assign = jest.fn()
      const original = window.location
      delete (window as any).location
      ;(window as any).location = { ...original, origin: 'http://host', assign }
      const component = build()
      component.ngOnInit()
      locationEvents.next({ url: 'app/toc' })
      expect(assign).toHaveBeenCalledWith('http://host/app/toc')
      ;(window as any).location = original
    })
  })

  describe('initData', () => {
    const payload = () => ({
      content: { data: { identifier: 'do_1' } },
      pageData: { data: { banners: {} } },
    })

    it('publishes the content and sanitises its body', () => {
      const component = build()
      component.ngOnInit()
      routeData.next(payload())
      expect(component.content).toBeTruthy()
      expect(component.body).toBe('safe:<p>hello</p>')
    })

    it('proxies the body through the authoring host in preview mode', () => {
      const component = build()
      component.forPreview = true
      component.ngOnInit()
      routeData.next(payload())
      expect(authAccessControlSvc.proxyToAuthoringUrl).toHaveBeenCalledWith('<p>hello</p>')
      expect(component.body).toBe('safe:proxied:<p>hello</p>')
    })

    it('sanitises an empty body when the content has none', () => {
      tocSvc.initData.mockReturnValue({ content: content({ body: '' }), errorCode: null })
      const component = build()
      component.ngOnInit()
      routeData.next(payload())
      expect(component.body).toBe('safe:')
    })

    it('loads the continue-learning data outside preview', () => {
      const component = build()
      component.ngOnInit()
      routeData.next(payload())
      expect(contentSvc.fetchContentHistory).toHaveBeenCalledWith('do_1')
      expect(component.resumeData).toEqual({ identifier: 'do_2' })
    })

    it('skips the continue-learning lookup in preview mode', () => {
      const component = build()
      component.forPreview = true
      component.ngOnInit()
      routeData.next(payload())
      expect(contentSvc.fetchContentHistory).not.toHaveBeenCalled()
    })

    it('logs a failed continue-learning lookup', () => {
      contentSvc.fetchContentHistory.mockReturnValue(throwError(() => 'boom'))
      const component = build()
      component.ngOnInit()
      routeData.next(payload())
      expect(loggerSvc.error).toHaveBeenCalled()
      expect(component.resumeData).toBeNull()
    })

    it('maps every known error code to the internal-server widget', () => {
      ;['API_FAILURE', 'INVALID_DATA', 'NO_DATA'].forEach(code => {
        tocSvc.initData.mockReturnValue({ content: content(), errorCode: code })
        const component = build()
        component.ngOnInit()
        routeData.next(payload())
        expect(component.errorWidgetData.widgetData.errorType).toBe(ErrorType.internalServer)
      })
    })

    it('falls back to the generic error widget', () => {
      tocSvc.initData.mockReturnValue({ content: content(), errorCode: 'SOMETHING_ELSE' })
      const component = build()
      component.ngOnInit()
      routeData.next(payload())
      expect(component.errorWidgetData.widgetData.errorType).toBe(ErrorType.somethingWrong)
    })
  })

  describe('showMenuItem', () => {
    const withContent = (over: any = {}) => {
      const component = build()
      component.content = content(over)
      return component
    }

    it('allows edit and delete for draft or live content the user can access', () => {
      expect(withContent({ status: 'Draft' }).showMenuItem('edit')).toBe(true)
      expect(withContent({ status: 'Live' }).showMenuItem('delete')).toBe(true)
    })

    it('refuses edit and delete for other statuses', () => {
      expect(withContent({ status: 'InReview' }).showMenuItem('edit')).toBe(false)
    })

    it('refuses edit when authoring is disabled for the content', () => {
      expect(withContent({ status: 'Draft', authoringDisabled: true }).showMenuItem('edit')).toBe(false)
    })

    it('still allows delete when authoring is disabled', () => {
      expect(withContent({ status: 'Draft', authoringDisabled: true }).showMenuItem('delete')).toBe(true)
    })

    it('allows moveToDraft from the reworkable statuses', () => {
      ;['InReview', 'Unpublished', 'Reviewed', 'QualityReview', 'Draft'].forEach(status => {
        expect(withContent({ status }).showMenuItem('moveToDraft')).toBe(true)
      })
    })

    it('refuses moveToDraft from a live course', () => {
      expect(withContent({ status: 'Live' }).showMenuItem('moveToDraft')).toBe(false)
    })

    it('allows moveToInReview from the reviewed statuses', () => {
      expect(withContent({ status: 'Reviewed' }).showMenuItem('moveToInReview')).toBe(true)
      expect(withContent({ status: 'QualityReview' }).showMenuItem('moveToInReview')).toBe(true)
      expect(withContent({ status: 'Draft' }).showMenuItem('moveToInReview')).toBe(false)
    })

    it('allows publish only for reviewed content under review', () => {
      expect(withContent({ status: 'Review', reviewStatus: 'Reviewed' }).showMenuItem('publish')).toBe(true)
      expect(withContent({ status: 'Review', reviewStatus: 'InReview' }).showMenuItem('publish')).toBe(false)
    })

    it('allows unpublish only for live content', () => {
      expect(withContent({ status: 'Live' }).showMenuItem('unpublish')).toBe(true)
      expect(withContent({ status: 'Draft' }).showMenuItem('unpublish')).toBe(false)
    })

    it('allows review only for content awaiting review', () => {
      expect(withContent({ status: 'Review', reviewStatus: 'InReview' }).showMenuItem('review')).toBe(true)
      expect(withContent({ status: 'Draft' }).showMenuItem('review')).toBe(false)
    })

    it('allows preview for both review states', () => {
      expect(withContent({ status: 'Review', reviewStatus: 'InReview' }).showMenuItem('preview')).toBe(true)
      expect(withContent({ status: 'Review', reviewStatus: 'Reviewed' }).showMenuItem('preview')).toBe(true)
      expect(withContent({ status: 'Draft' }).showMenuItem('preview')).toBe(false)
    })

    it('gates the language menu on draft access', () => {
      expect(withContent().showMenuItem('lang')).toBe(true)
      authAccessControlSvc.hasAccess.mockReturnValue(false)
      expect(withContent().showMenuItem('lang')).toBe(false)
    })

    it('refuses an unknown menu item', () => {
      expect(withContent().showMenuItem('whatever')).toBe(false)
    })
  })

  describe('misc', () => {
    it('checkJson accepts valid JSON and rejects the rest', () => {
      const component = build()
      expect(component.checkJson('{"a":1}')).toBe(true)
      expect(component.checkJson('nope')).toBe(false)
    })

    // jsdom keeps window.pageYOffset at 0 and it is not redefinable, so both
    // branches are driven by moving the menu offset relative to that scroll.
    it('pins the menu once the page has scrolled past it', () => {
      const component = build()
      component.elementPosition = 50
      component.handleScroll()
      expect(component.sticky).toBe(true)
    })

    it('leaves the menu unpinned while it is still below the fold', () => {
      const component = build()
      component.elementPosition = 500
      component.handleScroll()
      expect(component.sticky).toBe(false)
    })

    it('redirect sends the browser to the given path', () => {
      const assign = jest.fn()
      const original = window.location
      delete (window as any).location
      ;(window as any).location = { ...original, origin: 'http://host', assign }
      build().redirect('/app/toc')
      expect(assign).toHaveBeenCalledWith('http://host/app/toc')
      ;(window as any).location = original
    })

    it('scrollToTop scrolls when the page is scrolled down', () => {
      const scrollTo = jest.fn()
      ;(window as any).scrollTo = scrollTo
      Object.defineProperty(document.documentElement, 'scrollTop', { value: 500, writable: true })
      build().scrollToTop()
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    })

    it('scrollToTop does nothing at the top of the page', () => {
      const scrollTo = jest.fn()
      ;(window as any).scrollTo = scrollTo
      Object.defineProperty(document.documentElement, 'scrollTop', { value: 0, writable: true })
      build().scrollToTop()
      expect(scrollTo).not.toHaveBeenCalled()
    })

    it('ngAfterViewChecked scrolls the active fragment into view', () => {
      const el = document.createElement('div')
      el.id = 'overview'
      ;(el as any).scrollTo = jest.fn()
      document.body.appendChild(el)
      const component = build()
      component.fragment = 'overview'
      component.ngAfterViewChecked()
      expect((el as any).scrollTo).toHaveBeenCalledWith({ top: 80, behavior: 'smooth' })
      el.remove()
    })

    it('ngAfterViewChecked swallows a missing fragment target', () => {
      const component = build()
      component.fragment = 'nowhere'
      expect(() => component.ngAfterViewChecked()).not.toThrow()
    })

    it('ngAfterViewChecked does nothing without a fragment', () => {
      expect(() => build().ngAfterViewChecked()).not.toThrow()
    })

    it('ngOnDestroy releases the route subscription', () => {
      const component = build()
      component.ngOnInit()
      component.ngOnDestroy()
      expect(component.routeSubscription!.closed).toBe(true)
    })

    it('ngOnDestroy is safe before ngOnInit', () => {
      expect(() => build().ngOnDestroy()).not.toThrow()
    })
  })
})
