import { of, throwError, Subject } from 'rxjs'
import { AppTocSinglePageComponent } from './app-toc-single-page.component'

describe('AppTocSinglePageComponent', () => {
  let route: any
  let tocSharedSvc: any
  let configSvc: any
  let domSanitizer: any
  let authAccessControlSvc: any
  let dialog: any
  let titleTagService: any

  const build = () =>
    new AppTocSinglePageComponent(route, tocSharedSvc, configSvc, domSanitizer, authAccessControlSvc, dialog, titleTagService)

  beforeEach(() => {
    route = {
      fragment: of(null),
      parent: { data: of({ pageData: { data: { some: 'cfg' } } }) },
    }
    tocSharedSvc = {
      subtitleOnBanners: true,
      showDescription: true,
      initData: jest.fn().mockReturnValue({ content: { identifier: 'do_1', name: 'C', body: '<p>x</p>', contentType: 'Course' } }),
      fetchContentParent: jest.fn().mockReturnValue(of({ contentType: 'Course', collections: [] })),
      getTocStructure: jest.fn().mockImplementation((_c: any, s: any) => ({ ...s, course: 2 })),
    }
    configSvc = {
      restrictedFeatures: new Set<string>(),
      activeLocale: { path: 'en' },
      userProfile: { userId: 'u1' },
    }
    domSanitizer = { bypassSecurityTrustHtml: jest.fn().mockImplementation((v: string) => v) }
    authAccessControlSvc = { proxyToAuthoringUrl: jest.fn().mockImplementation((v: string) => `proxied:${v}`) }
    dialog = { open: jest.fn() }
    titleTagService = { setSocialMediaTags: jest.fn() }
  })

  it('should create and honour restrictedFeatures in constructor', () => {
    configSvc.restrictedFeatures = new Set<string>(['askAuthor', 'trainingLHub'])
    const c = build()
    expect(c).toBeTruthy()
    expect(c.askAuthorEnabled).toBe(false)
    expect(c.trainingLHubEnabled).toBe(false)
  })

  it('should default features enabled when not restricted', () => {
    const c = build()
    expect(c.askAuthorEnabled).toBe(true)
    // empty restricted set => !has('trainingLHub') === true
    expect(c.trainingLHubEnabled).toBe(true)
  })

  describe('trackByIndex', () => {
    it('should return the index', () => {
      expect(build().trackByIndex(3)).toBe(3)
    })
  })

  describe('ngOnInit', () => {
    it('should subscribe to parent data and set config + logged-in user', () => {
      const c = build()
      c.ngOnInit()
      expect(c.tocConfig).toEqual({ some: 'cfg' })
      expect(c.loggedInUserId).toBe('u1')
      expect(c.content).toBeTruthy()
    })

    it('should set forPreview from url when author path', () => {
      const original = window.location
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: { href: 'http://x/author/toc', origin: 'http://x' },
      })
      const c = build()
      c.ngOnInit()
      expect(c.forPreview).toBe(true)
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: original,
      })
    })
  })

  describe('detailUrl', () => {
    it('should build channel url with artifactUrl', () => {
      const c = build()
      const url = c.detailUrl({ contentType: 'Channel', artifactUrl: '/art' })
      expect(url).toContain('/en')
      expect(url).toContain('/art')
    })

    it('should build knowledge-board url', () => {
      const c = build()
      expect(c.detailUrl({ contentType: 'Knowledge Board', identifier: 'kb1' })).toContain('/app/knowledge-board/kb1')
    })

    it('should build default toc url', () => {
      const c = build()
      expect(c.detailUrl({ contentType: 'Resource', identifier: 'r1' })).toContain('/app/toc/r1/overview')
    })
  })

  describe('getters', () => {
    it('showSubtitleOnBanner reflects service', () => {
      expect(build().showSubtitleOnBanner).toBe(true)
    })

    it('showDescription true when content has no body', () => {
      const c = build()
      c.content = { identifier: 'x' } as any
      expect(c.showDescription).toBe(true)
    })

    it('showDescription falls back to service when content has body', () => {
      const c = build()
      c.content = { identifier: 'x', body: '<p>y</p>' } as any
      expect(c.showDescription).toBe(true)
    })
  })

  describe('setSocialMediaMetaTags', () => {
    it('should call titleTagService with detail url', () => {
      const c = build()
      c.setSocialMediaMetaTags({ contentType: 'Resource', identifier: 'r1', name: 'N', description: 'D', appIcon: 'I' })
      expect(titleTagService.setSocialMediaTags).toHaveBeenCalled()
    })
  })

  describe('getContentParent', () => {
    it('should parse content parent on success', () => {
      const c = build()
      c.content = { identifier: 'do_1' } as any
      tocSharedSvc.fetchContentParent.mockReturnValue(
        of({ contentType: 'Course', collections: [{ contentType: 'Course', collections: [] }] }),
      )
      c.getContentParent()
      expect(c.contentParents['Course'].length).toBe(1)
    })

    it('should reset contentParents on error', () => {
      const c = build()
      c.content = { identifier: 'do_1' } as any
      tocSharedSvc.fetchContentParent.mockReturnValue(throwError(() => new Error('x')))
      c.getContentParent()
      expect(c.contentParents).toEqual({})
    })

    it('should do nothing when no content', () => {
      const c = build()
      c.content = null
      c.getContentParent()
      expect(tocSharedSvc.fetchContentParent).not.toHaveBeenCalled()
    })
  })

  describe('parseContentParent', () => {
    it('should recursively group collections by contentType', () => {
      const c = build()
      c.parseContentParent({
        collections: [
          { contentType: 'Course', collections: [{ contentType: 'Course', collections: [] }] },
          { contentType: 'Learning Path', collections: [] },
        ],
      } as any)
      expect(c.contentParents['Course'].length).toBe(2)
      expect(c.contentParents['Learning Path'].length).toBe(1)
    })
  })

  describe('resetAndFetchTocStructure', () => {
    it('should set hasTocStructure when structure has positive counts', () => {
      const c = build()
      c.content = { identifier: 'do_1', contentType: 'Course' } as any
      c.resetAndFetchTocStructure()
      expect(c.hasTocStructure).toBe(true)
      expect(c.tocStructure).toBeTruthy()
    })

    it('should reset structure when no content', () => {
      const c = build()
      c.content = null
      c.resetAndFetchTocStructure()
      expect(c.tocStructure).toBeTruthy()
      expect(c.hasTocStructure).toBe(false)
    })
  })

  describe('ngOnDestroy', () => {
    it('should unsubscribe route subscription', () => {
      const c = build()
      const sub = new Subject().subscribe()
      const spy = jest.spyOn(sub, 'unsubscribe')
      ;(c as any).routeSubscription = sub
      c.ngOnDestroy()
      expect(spy).toHaveBeenCalled()
    })

    it('should not throw when no subscription', () => {
      const c = build()
      ;(c as any).routeSubscription = null
      expect(() => c.ngOnDestroy()).not.toThrow()
    })
  })
})
