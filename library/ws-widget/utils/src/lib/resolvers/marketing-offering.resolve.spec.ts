import { of, throwError } from 'rxjs'

import { MarketingOfferingResolve } from './marketing-offering.resolve'

describe('MarketingOfferingResolve', () => {
  let resolver: MarketingOfferingResolve
  let http: { get: jest.Mock }

  const buildPageData = () => ({
    pageLayout: {
      widgetData: {
        widgets: [
          {
            widgetSubType: 'contentStripMultiple',
            widgetData: {
              strips: [
                {
                  request: { search: { filters: { catalogPaths: [] } } },
                },
                {
                  request: { search: { filters: { catalogPaths: [] } } },
                },
              ],
            },
          },
          {
            widgetSubType: 'somethingElse',
            widgetData: {},
          },
        ],
      },
    },
  })

  const buildRoute = (tag: string, pageUrl = '/apis/page') =>
    ({
      params: { tag },
      data: { pageUrl },
    }) as any

  beforeEach(() => {
    http = { get: jest.fn() }
    resolver = new MarketingOfferingResolve(http as any)
  })

  it('should create', () => {
    expect(resolver).toBeTruthy()
  })

  it('should resolve with transformed data and null error on success', done => {
    const pageData = buildPageData()
    http.get.mockReturnValue(of(pageData))

    resolver.resolve(buildRoute('tag%20one'), {} as any).subscribe(res => {
      expect(http.get).toHaveBeenCalledWith('/apis/page')
      expect(res.error).toBeNull()
      expect(res.data).toBe(pageData)
      done()
    })
  })

  it('should decode the tag and set catalogPaths on contentStripMultiple strips', done => {
    const pageData = buildPageData()
    http.get.mockReturnValue(of(pageData))

    resolver.resolve(buildRoute('a%2Fb'), {} as any).subscribe(res => {
      const widgets = res.data.pageLayout.widgetData.widgets
      widgets[0].widgetData.strips.forEach((strip: any) => {
        expect(strip.request.search.filters.catalogPaths).toEqual(['a/b'])
      })
      done()
    })
  })

  it('should leave non-contentStripMultiple widgets unchanged', done => {
    const pageData = buildPageData()
    http.get.mockReturnValue(of(pageData))

    resolver.resolve(buildRoute('t'), {} as any).subscribe(res => {
      const widgets = res.data.pageLayout.widgetData.widgets
      expect(widgets[1].widgetSubType).toBe('somethingElse')
      expect(widgets[1].widgetData.strips).toBeUndefined()
      done()
    })
  })

  it('should catch errors and return null data with the error', done => {
    const err = new Error('network down')
    http.get.mockReturnValue(throwError(() => err))

    resolver.resolve(buildRoute('t'), {} as any).subscribe(res => {
      expect(res.data).toBeNull()
      expect(res.error).toBe(err)
      done()
    })
  })
})
