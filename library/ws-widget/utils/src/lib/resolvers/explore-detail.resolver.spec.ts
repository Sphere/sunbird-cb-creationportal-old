import { of, throwError } from 'rxjs'
import { ExploreDetailResolve } from './explore-detail.resolver'

describe('ExploreDetailResolve', () => {
  let http: { get: jest.Mock }
  let configSvc: any
  let utilitySvc: any
  let resolver: ExploreDetailResolve

  const snapshot = (data: any, tags = 'Health') => ({ data, params: { tags } }) as any

  /** A minimal page document carrying one breadcrumb and one content-strip widget. */
  const pageDoc = () => ({
    navigationBar: {
      pageTitle: 'Explore',
      pageBackLink: '/page/explore',
      links: [{ widgetData: { tags: 'Health' } }, { widgetData: { tags: 'Finance' } }],
    },
    pageLayout: {
      widgetData: {
        widgets: [
          { widgetSubType: 'cardBreadcrumb', widgetData: {} },
          {
            widgetSubType: 'contentStripMultiple',
            widgetData: {
              strips: [{ request: { searchV6: { filters: [{ andFilters: [] }] } } }],
            },
          },
        ],
      },
    },
  })

  beforeEach(() => {
    http = { get: jest.fn() }
    configSvc = { sitePath: '/site', isIntranetAllowed: true }
    utilitySvc = { isMobile: false }
    resolver = new ExploreDetailResolve(http as any, configSvc, utilitySvc)
  })

  it('should be created', () => {
    expect(resolver).toBeTruthy()
  })

  it('reads the explicit pageUrl from route data', done => {
    http.get.mockReturnValue(of(pageDoc()))
    resolver.resolve(snapshot({ pageUrl: '/custom/explore.json' }), {} as any).subscribe(() => {
      expect(http.get).toHaveBeenCalledWith('/custom/explore.json')
      done()
    })
  })

  it('builds the page URL from the site path and page key', done => {
    http.get.mockReturnValue(of(pageDoc()))
    resolver.resolve(snapshot({ pageType: 'page', pageKey: 'explore' }), {} as any).subscribe(() => {
      expect(http.get).toHaveBeenCalledWith('/site/page/explore.json')
      done()
    })
  })

  it('captures the intranet setting from configuration on each resolve', done => {
    configSvc.isIntranetAllowed = false
    http.get.mockReturnValue(of(pageDoc()))
    resolver.resolve(snapshot({ pageUrl: '/x.json' }), {} as any).subscribe(() => {
      expect(resolver.isIntranetAllowedSettings).toBe(false)
      done()
    })
  })

  it('surfaces a fetch failure as { data: null, error }', done => {
    http.get.mockReturnValue(throwError(() => 'boom'))
    resolver.resolve(snapshot({ pageUrl: '/x.json' }), {} as any).subscribe(res => {
      expect(res).toEqual({ data: null, error: 'boom' })
      done()
    })
  })

  it('filters navigation links down to the selected tag', done => {
    http.get.mockReturnValue(of(pageDoc()))
    resolver.resolve(snapshot({ pageUrl: '/x.json' }, 'Health'), {} as any).subscribe(res => {
      expect(res.data.navigationBar.links).toEqual([{ widgetData: { tags: 'Health' } }])
      done()
    })
  })

  it('builds a breadcrumb path rooted at the navigation bar title', done => {
    http.get.mockReturnValue(of(pageDoc()))
    resolver.resolve(snapshot({ pageUrl: '/x.json' }, 'Health>Nutrition'), {} as any).subscribe(res => {
      const crumb = res.data.pageLayout.widgetData.widgets[0]
      expect(crumb.widgetData.path).toEqual([
        { text: 'Explore', clickUrl: '/page/explore' },
        { text: 'Health', clickUrl: '/page/explore/Health' },
        { text: 'Nutrition', clickUrl: '/page/explore/Health>Nutrition' },
      ])
      done()
    })
  })

  it('decodes an encoded tag before splitting the breadcrumb path', done => {
    http.get.mockReturnValue(of(pageDoc()))
    resolver.resolve(snapshot({ pageUrl: '/x.json' }, encodeURIComponent('Health>Nutrition')), {} as any).subscribe(res => {
      const crumb = res.data.pageLayout.widgetData.widgets[0]
      expect(crumb.widgetData.path.map((p: any) => p.text)).toEqual(['Explore', 'Health', 'Nutrition'])
      done()
    })
  })

  it('pushes the catalog-path filter onto every content strip', done => {
    http.get.mockReturnValue(of(pageDoc()))
    resolver.resolve(snapshot({ pageUrl: '/x.json' }, 'Health'), {} as any).subscribe(res => {
      const strip = res.data.pageLayout.widgetData.widgets[1].widgetData.strips[0]
      expect(strip.request.searchV6.filters[0].andFilters).toEqual([{ catalogPaths: ['Health'] }])
      done()
    })
  })

  it('adds the intranet filter on mobile when intranet content is not allowed', done => {
    utilitySvc.isMobile = true
    configSvc.isIntranetAllowed = false
    http.get.mockReturnValue(of(pageDoc()))
    resolver.resolve(snapshot({ pageUrl: '/x.json' }, 'Health'), {} as any).subscribe(res => {
      const strip = res.data.pageLayout.widgetData.widgets[1].widgetData.strips[0]
      expect(strip.request.searchV6.filters[0].andFilters).toEqual([{ catalogPaths: ['Health'] }, { isInIntranet: ['false'] }])
      done()
    })
  })

  it('omits the intranet filter on mobile when intranet content is allowed', done => {
    utilitySvc.isMobile = true
    configSvc.isIntranetAllowed = true
    http.get.mockReturnValue(of(pageDoc()))
    resolver.resolve(snapshot({ pageUrl: '/x.json' }, 'Health'), {} as any).subscribe(res => {
      const strip = res.data.pageLayout.widgetData.widgets[1].widgetData.strips[0]
      expect(strip.request.searchV6.filters[0].andFilters).toEqual([{ catalogPaths: ['Health'] }])
      done()
    })
  })

  it('applies the same filters to the noDataWidget strips', done => {
    const doc = pageDoc()
    doc.pageLayout.widgetData.widgets[1].widgetData = {
      ...doc.pageLayout.widgetData.widgets[1].widgetData,
      noDataWidget: {
        widgetData: { strips: [{ request: { searchV6: { filters: [{ andFilters: [] }] } } }] },
      },
    } as any
    http.get.mockReturnValue(of(doc))
    resolver.resolve(snapshot({ pageUrl: '/x.json' }, 'Health'), {} as any).subscribe(res => {
      const noData = res.data.pageLayout.widgetData.widgets[1].widgetData.noDataWidget
      expect(noData.widgetData.strips[0].request.searchV6.filters[0].andFilters).toEqual([{ catalogPaths: ['Health'] }])
      done()
    })
  })

  it('leaves the page untouched when there is no navigation bar', done => {
    const doc: any = pageDoc()
    delete doc.navigationBar
    doc.pageLayout.widgetData.widgets = [doc.pageLayout.widgetData.widgets[1]]
    http.get.mockReturnValue(of(doc))
    resolver.resolve(snapshot({ pageUrl: '/x.json' }, 'Health'), {} as any).subscribe(res => {
      expect(res.error).toBeNull()
      expect(res.data.navigationBar).toBeUndefined()
      done()
    })
  })
})
