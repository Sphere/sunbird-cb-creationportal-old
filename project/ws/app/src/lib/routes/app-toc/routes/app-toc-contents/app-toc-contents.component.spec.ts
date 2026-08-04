import { Subject, of } from 'rxjs'
import { NsContent } from '@ws-widget/collection'
import { AppTocContentsComponent } from './app-toc-contents.component'

describe('AppTocContentsComponent', () => {
  let component: AppTocContentsComponent
  let route: any
  let sanitizer: any
  let tocSvc: any
  let configSvc: any
  let queryParams$: Subject<any>
  let parentData$: Subject<any>

  const paramMap = (params: Record<string, string | null>) => ({
    get: (key: string) => params[key] ?? null,
  })

  const content = (over: any = {}) =>
    ({
      identifier: 'do_1',
      name: 'A resource',
      contentType: NsContent.EContentTypes.RESOURCE,
      mimeType: NsContent.EMimeTypes.PDF,
      artifactUrl: 'a.pdf',
      appIcon: 'icon.png',
      ...over,
    }) as any

  const build = () => new AppTocContentsComponent(route, sanitizer, tocSvc, configSvc)

  const load = (over: any = {}) => {
    tocSvc.initData.mockReturnValue({ content: content(over), errorCode: null })
    component.ngOnInit()
    parentData$.next({})
  }

  beforeEach(() => {
    queryParams$ = new Subject<any>()
    parentData$ = new Subject<any>()

    route = { queryParamMap: queryParams$, parent: { data: parentData$ } }
    sanitizer = { bypassSecurityTrustStyle: jest.fn((s: string) => `safe:${s}`) }
    tocSvc = {
      initData: jest.fn().mockReturnValue({ content: content(), errorCode: null }),
      fetchContentParents: jest.fn().mockReturnValue(of([{ identifier: 'do_parent' }])),
    }
    configSvc = {
      instanceConfig: { logos: { defaultContent: 'default.png' } },
      rootOrg: 'acme',
    }

    component = build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
    expect(component.content).toBeNull()
    expect(component.isPlayable).toBe(false)
    expect(component.contentPlayWidgetConfig).toBeNull()
    expect(component.expandAll).toBe(false)
  })

  describe('ngOnInit', () => {
    it('takes the default thumbnail from the instance config', () => {
      component.ngOnInit()

      expect(component.defaultThumbnail).toBe('default.png')
    })

    it('leaves the thumbnail unset without an instance config', () => {
      configSvc.instanceConfig = null
      const c = build()

      c.ngOnInit()

      expect(c.defaultThumbnail).toBe('')
    })

    it('resolves the content off the parent route', () => {
      load()

      expect(tocSvc.initData).toHaveBeenCalled()
      expect(component.content!.identifier).toBe('do_1')
      expect(component.errorCode).toBeNull()
    })

    it('records the resolver error when there is no content', () => {
      tocSvc.initData.mockReturnValue({ content: null, errorCode: 'notFound' })
      component.ngOnInit()

      parentData$.next({})

      expect(component.content).toBeNull()
      expect(component.errorCode).toBe('notFound')
      expect(tocSvc.fetchContentParents).not.toHaveBeenCalled()
    })

    it('takes the browsing context from the query string', () => {
      component.ngOnInit()

      queryParams$.next(paramMap({ contextId: 'do_root', contextPath: 'Course' }))
      parentData$.next({})

      expect(component.contextId).toBe('do_root')
      expect(component.contextPath).toBe('Course')
    })

    it('falls back to the content itself as the context', () => {
      load()

      expect(component.contextId).toBe('do_1')
      expect(component.contextPath).toBe(NsContent.EContentTypes.RESOURCE)
    })

    it('ignores a partial browsing context', () => {
      component.ngOnInit()

      queryParams$.next(paramMap({ contextId: 'do_root' }))
      parentData$.next({})

      expect(component.contextId).toBe('do_1')
    })

    it('loads the parents of the content', () => {
      load()

      expect(tocSvc.fetchContentParents).toHaveBeenCalledWith('do_1')
      expect(component.contentParents).toEqual([{ identifier: 'do_parent' }])
    })

    it('copes with a content that has no parents', () => {
      tocSvc.fetchContentParents.mockReturnValue(of(null))
      load()

      expect(component.contentParents).toEqual([])
    })

    it('recognises the author preview by its url', () => {
      const href = window.location.href
      delete (window as any).location
      ;(window as any).location = { href: 'https://host/author/toc/do_1' }

      const c = build()
      c.ngOnInit()

      expect(c.forPreview).toBe(true)
      ;(window as any).location = { href }
    })

    it('does nothing about the parent route when there is none', () => {
      route.parent = null
      const c = build()

      expect(() => c.ngOnInit()).not.toThrow()
      expect(c.content).toBeNull()
    })
  })

  describe('inline player', () => {
    it.each([NsContent.EMimeTypes.M3U8, NsContent.EMimeTypes.MP4])('plays a %s resource as video', mimeType => {
      load({ mimeType })

      expect(component.isPlayable).toBe(true)
      expect(component.contentPlayWidgetConfig!.widgetData).toEqual({
        url: 'a.pdf',
        autoplay: true,
        posterImage: 'icon.png',
      })
      expect(component.contentPlayWidgetConfig!.widgetHostStyle).toEqual({ height: '375px' })
    })

    it.each([NsContent.EMimeTypes.MP3, NsContent.EMimeTypes.M4A])('plays a %s resource as audio', mimeType => {
      load({ mimeType })

      expect(component.isPlayable).toBe(true)
      expect(component.contentPlayWidgetConfig!.widgetData.autoplay).toBe(true)
    })

    it('renders a pdf resource in the pdf player', () => {
      load({ mimeType: NsContent.EMimeTypes.PDF })

      expect(component.isPlayable).toBe(true)
      expect(component.contentPlayWidgetConfig!.widgetData).toEqual({ pdfUrl: 'a.pdf' })
    })

    it('plays a youtube resource', () => {
      load({ mimeType: NsContent.EMimeTypes.YOUTUBE })

      expect(component.isPlayable).toBe(true)
      expect(component.contentPlayWidgetConfig!.widgetData.url).toBe('a.pdf')
    })

    it('builds no player for an unsupported resource type', () => {
      load({ mimeType: 'application/zip' })

      expect(component.isPlayable).toBe(false)
      expect(component.contentPlayWidgetConfig).toBeNull()
    })

    it('plays a knowledge artifact the same way', () => {
      load({ contentType: NsContent.EContentTypes.KNOWLEDGE_ARTIFACT })

      expect(component.isPlayable).toBe(true)
    })

    it('builds no player for a collection', () => {
      load({
        contentType: NsContent.EContentTypes.COURSE,
        mimeType: NsContent.EMimeTypes.COLLECTION,
      })

      expect(component.isPlayable).toBe(false)
    })
  })

  describe('sanitizedBackgroundImage', () => {
    it('builds the background css value', () => {
      expect(component.sanitizedBackgroundImage('pic.png')).toBe('url(pic.png)')
    })
  })

  describe('resourceLink', () => {
    it('builds a viewer route for the resource', () => {
      const link = component.resourceLink(content())

      expect(link.url).toContain('do_1')
      expect(link.queryParams).toBeTruthy()
    })
  })

  describe('contentTrackBy', () => {
    it('tracks content by identifier', () => {
      expect(component.contentTrackBy(0, content())).toBe('do_1')
    })

    it('tracks missing content as null', () => {
      expect(component.contentTrackBy(0, null as any)).toBeNull()
    })
  })

  describe('showYouMayAlsoLikeTab', () => {
    it('is on for every org', () => {
      expect(component.showYouMayAlsoLikeTab).toBe(true)
    })
  })

  describe('ngOnDestroy', () => {
    it('detaches both route subscriptions', () => {
      load()
      tocSvc.initData.mockClear()

      component.ngOnDestroy()
      parentData$.next({})
      queryParams$.next(paramMap({ contextId: 'do_x', contextPath: 'Course' }))

      expect(tocSvc.initData).not.toHaveBeenCalled()
      expect(component.contextId).toBe('do_1')
    })

    it('is safe before init', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
