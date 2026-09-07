import { of, Subject, throwError } from 'rxjs'
import { ContentStripMultipleComponent } from './content-strip-multiple.component'

describe('ContentStripMultipleComponent', () => {
  let contentStripSvc: any
  let contentSvc: any
  let loggerSvc: any
  let eventSvc: any
  let configSvc: any
  let utilitySvc: any
  let searchServSvc: any
  let events$: Subject<any>

  const strip = (over: any = {}) => ({
    key: 'k1',
    title: 'Strip 1',
    ...over,
  })

  const build = (widgetData: any = {}) => {
    const c = new ContentStripMultipleComponent(contentStripSvc, contentSvc, loggerSvc, eventSvc, configSvc, utilitySvc, searchServSvc)
    c.widgetData = { strips: [], ...widgetData } as any
    return c
  }

  beforeEach(() => {
    events$ = new Subject<any>()
    contentStripSvc = { getContentStripResponseApi: jest.fn(() => of({ contents: [] })) }
    contentSvc = {
      search: jest.fn(() => of({ result: [] })),
      searchRegionRecommendation: jest.fn(() => of({ contents: [] })),
      searchV6: jest.fn(() => of({ result: [] })),
      fetchMultipleContent: jest.fn(() => of([])),
      fetchContentLikes: jest.fn(() => Promise.resolve({})),
    }
    loggerSvc = { warn: jest.fn() }
    eventSvc = { events$: events$.asObservable() }
    configSvc = { activeLocale: null }
    utilitySvc = { isMobile: false }
    searchServSvc = { transformSearchV6Filters: jest.fn((f: any) => f) }
    sessionStorage.clear()
  })

  it('creates the component with a unique host id', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.id).toMatch(/^ws-strip-miltiple_/)
    expect(c.contentAvailable).toBe(true)
  })

  describe('ngOnInit', () => {
    it('flags authoring context from the URL and processes empty strips', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'http://x/preview/y' },
        writable: true,
      })
      const c = build({ strips: [strip()] })
      c.ngOnInit()
      expect(c.isFromAuthoring).toBe(true)
      expect(c.stripsKeyOrder).toEqual(['k1'])
      expect(c.stripsResultDataMap.k1).toBeDefined()
    })

    it('shows the parent loader while an api strip is fetching', () => {
      contentStripSvc.getContentStripResponseApi = jest.fn(() => new Subject())
      Object.defineProperty(window, 'location', { value: { href: 'http://x/home' }, writable: true })
      const c = build({
        loader: true,
        strips: [strip({ request: { api: { path: '/a' } }, loader: true })],
      })
      c.ngOnInit()
      expect(c.showParentLoader).toBe(true)
      expect(c.isFromAuthoring).toBe(false)
    })

    it('refetches a strip when a matching refresh event fires', () => {
      Object.defineProperty(window, 'location', { value: { href: 'http://x/home' }, writable: true })
      const s = strip({
        request: { api: { path: '/a' } },
        refreshEvent: { eventType: 'refresh', from: 'src' },
      })
      const c = build({ strips: [s] })
      c.ngOnInit()
      const spy = jest.spyOn(c, 'fetchFromApi')
      events$.next({ eventType: 'refresh', from: 'src' })
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('checkForEmptyWidget', () => {
    it.each([
      [{ api: { path: 'x' } }],
      [{ search: { query: 'x' } }],
      [{ searchRegionRecommendation: { a: 1 } }],
      [{ searchV6: { query: 'x' } }],
      [{ ids: { a: 1 } }],
    ])('is true for a non-empty request %p', request => {
      const c = build()
      expect(c.checkForEmptyWidget(strip({ request }) as any)).toBe(true)
    })

    it('is false when there is no request', () => {
      const c = build()
      expect(c.checkForEmptyWidget(strip() as any)).toBe(false)
    })

    it('is false when every request bucket is empty', () => {
      const c = build()
      expect(c.checkForEmptyWidget(strip({ request: { api: {}, search: {} } }) as any)).toBe(false)
    })
  })

  describe('fetchFromApi', () => {
    it('processes contents into card widgets on success', () => {
      const c = build({ strips: [strip()] })
      contentStripSvc.getContentStripResponseApi = jest.fn(() => of({ contents: [{ identifier: 'do_1' }] }))
      c.fetchFromApi(strip({ request: { api: { path: '/a' } } }) as any)
      expect(c.stripsResultDataMap.k1.widgets!.length).toBe(1)
      expect(c.stripsResultDataMap.k1.widgets![0].widgetType).toBe('card')
    })

    it('marks the strip as error on failure', () => {
      const c = build({ strips: [strip()] })
      contentStripSvc.getContentStripResponseApi = jest.fn(() => throwError(() => new Error('x')))
      c.fetchFromApi(strip({ request: { api: { path: '/a' }, errorWidget: {} }, errorWidget: {} }) as any)
      expect(c.stripsResultDataMap.k1.showOnError).toBe(true)
    })

    it('does nothing without an api request', () => {
      const c = build()
      c.fetchFromApi(strip() as any)
      expect(contentStripSvc.getContentStripResponseApi).not.toHaveBeenCalled()
    })
  })

  describe('fetchFromSearch', () => {
    it('uses the active locale and offers view-more for large result sets', () => {
      configSvc.activeLocale = { locals: ['hi'] }
      const c = build({ strips: [strip()] })
      const result = Array.from({ length: 6 }, (_, i) => ({ identifier: `do_${i}` }))
      contentSvc.search = jest.fn(() => of({ result }))
      const s = strip({
        request: { search: { query: 'q', filters: {} } },
        stripConfig: { postCardForSearch: true },
      })
      c.fetchFromSearch(s as any)
      expect(s.request.search.locale).toEqual(['hi'])
      expect(c.stripsResultDataMap.k1.viewMoreUrl).not.toBeNull()
    })

    it('defaults the locale to en and handles errors', () => {
      const c = build({ strips: [strip()] })
      contentSvc.search = jest.fn(() => throwError(() => new Error('x')))
      const s = strip({ request: { search: { query: 'q' } }, errorWidget: {} })
      c.fetchFromSearch(s as any)
      expect(s.request.search.locale).toEqual(['en'])
      expect(c.stripsResultDataMap.k1.showOnError).toBe(true)
    })
  })

  describe('fetchFromSearchRegionRecommendation', () => {
    it('processes recommendation contents', () => {
      const c = build({ strips: [strip()] })
      contentSvc.searchRegionRecommendation = jest.fn(() => of({ contents: [{ identifier: 'do_1' }] }))
      c.fetchFromSearchRegionRecommendation(strip({ request: { searchRegionRecommendation: { a: 1 } } }) as any)
      expect(c.stripsResultDataMap.k1.widgets!.length).toBe(1)
    })

    it('handles a recommendation error', () => {
      const c = build({ strips: [strip()] })
      contentSvc.searchRegionRecommendation = jest.fn(() => throwError(() => new Error('x')))
      c.fetchFromSearchRegionRecommendation(strip({ request: { searchRegionRecommendation: { a: 1 } }, errorWidget: {} }) as any)
      expect(c.stripsResultDataMap.k1.showOnError).toBe(true)
    })
  })

  describe('fetchFromSearchV6', () => {
    it('transforms v6 filters into a view-more url', () => {
      const c = build({ strips: [strip()] })
      const result = Array.from({ length: 6 }, (_, i) => ({ identifier: `do_${i}` }))
      contentSvc.searchV6 = jest.fn(() => of({ result }))
      const s = strip({
        request: { searchV6: { query: 'q', filters: { a: 1 } } },
        stripConfig: { postCardForSearch: true },
      })
      c.fetchFromSearchV6(s as any)
      expect(searchServSvc.transformSearchV6Filters).toHaveBeenCalledWith({ a: 1 })
      expect(c.stripsResultDataMap.k1.viewMoreUrl).not.toBeNull()
    })

    it('keeps a preset locale and handles an error', () => {
      const c = build({ strips: [strip()] })
      contentSvc.searchV6 = jest.fn(() => throwError(() => new Error('x')))
      const s = strip({ request: { searchV6: { query: 'q', locale: ['fr'] } }, errorWidget: {} })
      c.fetchFromSearchV6(s as any)
      expect(s.request.searchV6.locale).toEqual(['fr'])
      expect(c.stripsResultDataMap.k1.showOnError).toBe(true)
    })
  })

  describe('fetchFromIds', () => {
    it('processes fetched content by ids', () => {
      const c = build({ strips: [strip()] })
      contentSvc.fetchMultipleContent = jest.fn(() => of([{ identifier: 'do_1' }]))
      c.fetchFromIds(strip({ request: { ids: { a: 1 } } }) as any)
      expect(c.stripsResultDataMap.k1.widgets!.length).toBe(1)
    })

    it('handles an ids error', () => {
      const c = build({ strips: [strip()] })
      contentSvc.fetchMultipleContent = jest.fn(() => throwError(() => new Error('x')))
      c.fetchFromIds(strip({ request: { ids: { a: 1 } }, errorWidget: {} }) as any)
      expect(c.stripsResultDataMap.k1.showOnError).toBe(true)
    })
  })

  describe('showAccordion', () => {
    it('returns the accordion flag on mobile accordion strips', () => {
      utilitySvc.isMobile = true
      const c = build()
      c.stripsResultDataMap = { k1: { mode: 'accordion' } as any }
      c.showAccordionData = false
      expect(c.showAccordion('k1')).toBe(false)
    })

    it('returns true on desktop', () => {
      const c = build()
      c.stripsResultDataMap = { k1: { mode: 'accordion' } as any }
      expect(c.showAccordion('k1')).toBe(true)
    })
  })

  describe('strip hide state', () => {
    it('hides a strip and records it in session storage', () => {
      const c = build()
      c.stripsResultDataMap = { k1: { showStrip: true } as any }
      c.setHiddenForStrip('k1')
      expect(c.stripsResultDataMap.k1.showStrip).toBe(false)
      expect(sessionStorage.getItem('cstrip_k1')).toBe('1')
    })
  })

  describe('toggleInfo', () => {
    it('toggles the visibility mode of a below-mode strip info', () => {
      const c = build()
      c.stripsResultDataMap = {
        k1: { key: 'k1', stripInfo: { mode: 'below', visibilityMode: 'hidden' } } as any,
      }
      c.toggleInfo({ key: 'k1' } as any)
      expect(c.stripsResultDataMap.k1.stripInfo!.visibilityMode).toBe('visible')
    })

    it('warns and normalises an unsupported info mode', () => {
      const c = build()
      c.stripsResultDataMap = {
        k1: { key: 'k1', stripInfo: { mode: 'side', visibilityMode: 'visible' } } as any,
      }
      c.toggleInfo({ key: 'k1' } as any)
      expect(loggerSvc.warn).toHaveBeenCalled()
      expect(c.stripsResultDataMap.k1.stripInfo!.mode).toBe('below')
    })

    it('does nothing when there is no strip info', () => {
      const c = build()
      c.stripsResultDataMap = { k1: { key: 'k1' } as any }
      expect(() => c.toggleInfo({ key: 'k1' } as any)).not.toThrow()
    })
  })

  describe('processContentLikes', () => {
    it('annotates results with fetched like counts', async () => {
      contentSvc.fetchContentLikes = jest.fn(() => Promise.resolve({ do_1: 7 }))
      const c = build()
      const results: any[] = [{ widgetData: { content: { identifier: 'do_1' } } }]
      await c.processContentLikes(results)
      expect(results[0].widgetData.likes).toBe(7)
    })

    it('swallows a like-fetch error', async () => {
      contentSvc.fetchContentLikes = jest.fn(() => Promise.reject(new Error('x')))
      const c = build()
      await expect(c.processContentLikes([{ widgetData: { content: { identifier: 'do_1' } } }] as any)).resolves.toBeUndefined()
    })
  })

  describe('processStrip parent status', () => {
    it('marks parent no-data when strips resolve empty', async () => {
      const c = build({ strips: [strip()] })
      contentStripSvc.getContentStripResponseApi = jest.fn(() => of({ contents: [] }))
      c.fetchFromApi(strip({ request: { api: { path: '/a' } } }) as any)
      await Promise.resolve()
      expect(c.showParentNoData).toBe(true)
      expect(c.contentAvailable).toBe(false)
    })

    it('fetches likes when the strip requests them', async () => {
      contentSvc.fetchContentLikes = jest.fn(() => Promise.resolve({ do_1: 2 }))
      const c = build({ strips: [strip()] })
      contentStripSvc.getContentStripResponseApi = jest.fn(() => of({ contents: [{ identifier: 'do_1' }] }))
      c.fetchFromApi(strip({ request: { api: { path: '/a' } }, fetchLikes: true }) as any)
      await Promise.resolve()
      expect(contentSvc.fetchContentLikes).toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes the change event subscription', () => {
      const c = build()
      const unsub = jest.fn()
      ;(c as any).changeEventSubscription = { unsubscribe: unsub }
      c.ngOnDestroy()
      expect(unsub).toHaveBeenCalled()
    })

    it('is safe with no subscription', () => {
      const c = build()
      expect(() => c.ngOnDestroy()).not.toThrow()
    })
  })
})
