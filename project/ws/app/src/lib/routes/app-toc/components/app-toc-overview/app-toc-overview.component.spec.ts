import { of, Subject, throwError } from 'rxjs'
import { AppTocOverviewComponent } from './app-toc-overview.component'

describe('AppTocOverviewComponent', () => {
  let component: AppTocOverviewComponent
  let route: any
  let tocSharedSvc: any
  let configSvc: any
  let domSanitizer: any
  let authAccessControlSvc: any
  let routeData: Subject<any>

  const content = (over: any = {}) =>
    ({
      identifier: 'do_1',
      name: 'Course A',
      contentType: 'Course',
      body: '<p>hello</p>',
      ...over,
    }) as any

  const tocStructureBlank = () => ({
    assessment: 0,
    course: 0,
    handsOn: 0,
    interactiveVideo: 0,
    learningModule: 0,
    other: 0,
    pdf: 0,
    podcast: 0,
    quiz: 0,
    video: 0,
    webModule: 0,
    webPage: 0,
    youtube: 0,
  })

  const build = () => {
    component = new AppTocOverviewComponent(route, tocSharedSvc, configSvc, domSanitizer, authAccessControlSvc)
  }

  beforeEach(() => {
    routeData = new Subject<any>()
    route = { parent: { data: routeData.asObservable() } }
    tocSharedSvc = {
      subtitleOnBanners: true,
      showDescription: true,
      initData: jest.fn().mockReturnValue({ content: content() }),
      getTocStructure: jest.fn().mockImplementation((_c: any, s: any) => s),
      fetchContentParent: jest.fn().mockReturnValue(of({ collections: [] })),
    }
    configSvc = { restrictedFeatures: new Set<string>() }
    domSanitizer = {
      bypassSecurityTrustHtml: jest.fn().mockImplementation((v: string) => `safe:${v}`),
    }
    authAccessControlSvc = {
      proxyToAuthoringUrl: jest.fn().mockImplementation((v: string) => `proxy:${v}`),
    }
    build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('constructor', () => {
    it('enables ask-author and training-hub with an empty restricted set', () => {
      expect(component.askAuthorEnabled).toBe(true)
      expect(component.trainingLHubEnabled).toBe(true)
    })

    it('disables both features when they are restricted', () => {
      configSvc.restrictedFeatures = new Set(['askAuthor', 'trainingLHub'])
      build()
      expect(component.askAuthorEnabled).toBe(false)
      expect(component.trainingLHubEnabled).toBe(false)
    })

    it('tolerates a missing restricted-features set', () => {
      configSvc.restrictedFeatures = undefined
      expect(() => build()).not.toThrow()
      expect(component.askAuthorEnabled).toBe(true)
    })
  })

  describe('trackByIndex', () => {
    it('returns the index', () => {
      expect(component.trackByIndex(3)).toBe(3)
    })
  })

  describe('ngOnInit', () => {
    it('leaves forPreview when already set and wires the route data', () => {
      component.forPreview = true
      component.ngOnInit()
      routeData.next({ pageData: { data: { foo: 'bar' } } })
      expect(component.forPreview).toBe(true)
      expect(component.tocConfig).toEqual({ foo: 'bar' })
      expect(tocSharedSvc.initData).toHaveBeenCalled()
    })

    it('derives forPreview from the URL when not preset', () => {
      const original = window.location
      delete (window as any).location
      ;(window as any).location = { href: 'http://x/author/toc' }
      component.ngOnInit()
      expect(component.forPreview).toBe(true)
      ;(window as any).location = original
    })

    it('does nothing when the route has no parent', () => {
      route.parent = null
      build()
      component.ngOnInit()
      expect(component.routeSubscription).toBeNull()
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes the route subscription', () => {
      component.forPreview = true
      component.ngOnInit()
      routeData.next({ pageData: { data: {} } })
      const sub = component.routeSubscription!
      component.ngOnDestroy()
      expect(sub.closed).toBe(true)
    })

    it('is safe with no subscription', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })

  describe('getters', () => {
    it('showSubtitleOnBanner delegates to the service', () => {
      expect(component.showSubtitleOnBanner).toBe(true)
    })

    it('showDescription is true when content has no body', () => {
      component.content = content({ body: '' })
      expect(component.showDescription).toBe(true)
    })

    it('showDescription delegates to the service when a body exists', () => {
      component.content = content()
      tocSharedSvc.showDescription = false
      expect(component.showDescription).toBe(false)
    })
  })

  describe('initData (via route data)', () => {
    beforeEach(() => {
      component.forPreview = true
      component.ngOnInit()
    })

    it('stores content and sanitizes the body', () => {
      routeData.next({ pageData: { data: {} } })
      expect(component.content).toBeTruthy()
      expect(component.body).toBe('safe:proxy:<p>hello</p>')
      expect(authAccessControlSvc.proxyToAuthoringUrl).toHaveBeenCalledWith('<p>hello</p>')
    })

    it('uses the raw body outside preview', () => {
      component.forPreview = false
      routeData.next({ pageData: { data: {} } })
      expect(component.body).toBe('safe:<p>hello</p>')
      expect(authAccessControlSvc.proxyToAuthoringUrl).not.toHaveBeenCalled()
    })

    it('sanitizes an empty string when there is no body', () => {
      tocSharedSvc.initData.mockReturnValue({ content: content({ body: '' }) })
      routeData.next({ pageData: { data: {} } })
      expect(component.body).toBe('safe:')
    })
  })

  describe('getContentParent', () => {
    it('does nothing without content', () => {
      component.content = null
      component.getContentParent()
      expect(tocSharedSvc.fetchContentParent).not.toHaveBeenCalled()
    })

    it('parses the fetched collections', () => {
      component.content = content()
      tocSharedSvc.fetchContentParent.mockReturnValue(
        of({
          collections: [
            { contentType: 'Course', name: 'C1' },
            { contentType: 'Course', name: 'C2' },
          ],
        }),
      )
      component.getContentParent()
      expect(component.contentParents['Course'].length).toBe(2)
    })

    it('resets the parents on error', () => {
      component.content = content()
      component.contentParents = { Course: [{} as any] }
      tocSharedSvc.fetchContentParent.mockReturnValue(throwError(() => 'boom'))
      component.getContentParent()
      expect(component.contentParents).toEqual({})
    })
  })

  describe('parseContentParent', () => {
    it('groups nested collections by content type recursively', () => {
      component.contentParents = {}
      component.parseContentParent({
        collections: [
          {
            contentType: 'Course',
            name: 'C1',
            collections: [{ contentType: 'Module', name: 'M1' }],
          },
        ],
      } as any)
      expect(component.contentParents['Course'].length).toBe(1)
      expect(component.contentParents['Module'].length).toBe(1)
    })

    it('ignores a payload with no collections', () => {
      component.contentParents = {}
      component.parseContentParent({} as any)
      expect(component.contentParents).toEqual({})
    })
  })

  describe('resetAndFetchTocStructure', () => {
    it('resets to blank structure without content', () => {
      component.content = null
      component.resetAndFetchTocStructure()
      expect(component.tocStructure).toEqual(tocStructureBlank())
    })

    it('marks a Collection learning module as -1', () => {
      component.content = content({ contentType: 'Collection' })
      component.resetAndFetchTocStructure()
      expect(component.tocStructure!.learningModule).toBe(-1)
      expect(component.tocStructure!.course).toBe(0)
    })

    it('marks a Course as -1', () => {
      component.content = content({ contentType: 'Course' })
      component.resetAndFetchTocStructure()
      expect(component.tocStructure!.course).toBe(-1)
    })

    it('sets hasTocStructure when the service reports positive counts', () => {
      component.content = content()
      tocSharedSvc.getTocStructure.mockImplementation((_c: any, s: any) => ({ ...s, pdf: 3 }))
      component.resetAndFetchTocStructure()
      expect(component.hasTocStructure).toBe(true)
    })

    it('leaves hasTocStructure false with no positive counts', () => {
      component.content = content()
      component.resetAndFetchTocStructure()
      expect(component.hasTocStructure).toBe(false)
    })
  })
})
