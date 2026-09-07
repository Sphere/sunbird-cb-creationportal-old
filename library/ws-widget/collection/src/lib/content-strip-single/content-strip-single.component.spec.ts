import { of, throwError } from 'rxjs'
import { ContentStripSingleComponent } from './content-strip-single.component'

const setHref = (href: string) => {
  const original = window.location
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...original, href, origin: 'http://x' },
  })
  return () =>
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: original,
    })
}

describe('ContentStripSingleComponent', () => {
  let component: ContentStripSingleComponent
  let contentStripSvc: any
  let contentSvc: any

  const build = (widgetData: any = {}) => {
    const c = new ContentStripSingleComponent(contentStripSvc, contentSvc)
    c.widgetData = { image: '', key: 'k', title: 't', ...widgetData }
    return c
  }

  beforeEach(() => {
    contentStripSvc = {
      getContentStripResponseApi: jest.fn().mockReturnValue(of({ contents: [] })),
    }
    contentSvc = {
      search: jest.fn().mockReturnValue(of({ result: [] })),
      searchRegionRecommendation: jest.fn().mockReturnValue(of({ contents: [] })),
      searchV6: jest.fn().mockReturnValue(of({ result: [] })),
      fetchMultipleContent: jest.fn().mockReturnValue(of([])),
    }
    component = build()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('should set isFromAuthoring true when url matches searchArray words', () => {
      const restore = setHref('http://x/preview/abc')
      component.widgetData = { image: '', key: 'k', title: 't', loader: true }
      component.ngOnInit()
      expect(component.isFromAuthoring).toBe(true)
      expect(component.loader).toBe(true)
      restore()
    })

    it('should set isFromAuthoring false when url has none of the words', () => {
      const restore = setHref('http://x/home/abc')
      component.ngOnInit()
      expect(component.isFromAuthoring).toBe(false)
      restore()
    })
  })

  describe('fetchFromApi', () => {
    it('should convert contents to strip on success', () => {
      contentStripSvc.getContentStripResponseApi.mockReturnValue(
        of({ contents: [{ name: 'A', identifier: 'do_1', lastUpdatedOn: '20200101T101010' }] }),
      )
      const c = build({ request: { api: { path: '/p' } } })
      c.fetchFromApi()
      expect(contentStripSvc.getContentStripResponseApi).toHaveBeenCalled()
      expect(c.stripsResultDataMap.length).toBe(1)
      expect(c.stripsResultDataMap[0].title).toBe('A')
    })

    it('should mark error on failure', () => {
      contentStripSvc.getContentStripResponseApi.mockReturnValue(throwError(() => new Error('x')))
      const c = build({ request: { api: { path: '/p' } } })
      c.fetchFromApi()
      expect(c.errorDataCount).toBe(1)
    })

    it('should do nothing when no api request', () => {
      const c = build({ request: {} })
      c.fetchFromApi()
      expect(contentStripSvc.getContentStripResponseApi).not.toHaveBeenCalled()
    })
  })

  describe('fetchFromSearch', () => {
    it('should convert results on success', () => {
      contentSvc.search.mockReturnValue(of({ result: [{ name: 'B', identifier: 'do_2', lastUpdatedOn: '20200101T101010' }] }))
      const c = build({ request: { search: { query: 'q' } } })
      c.fetchFromSearch()
      expect(c.stripsResultDataMap.length).toBe(1)
    })

    it('should mark error on failure', () => {
      contentSvc.search.mockReturnValue(throwError(() => new Error('x')))
      const c = build({ request: { search: { query: 'q' } } })
      c.fetchFromSearch()
      expect(c.errorDataCount).toBe(1)
    })
  })

  describe('fetchFromSearchRegionRecommendation', () => {
    it('should convert contents on success', () => {
      contentSvc.searchRegionRecommendation.mockReturnValue(
        of({ contents: [{ name: 'C', identifier: 'do_3', lastUpdatedOn: '20200101T101010' }] }),
      )
      const c = build({ request: { searchRegionRecommendation: { some: 1 } } })
      c.fetchFromSearchRegionRecommendation()
      expect(c.stripsResultDataMap.length).toBe(1)
    })

    it('should mark error on failure', () => {
      contentSvc.searchRegionRecommendation.mockReturnValue(throwError(() => new Error('x')))
      const c = build({ request: { searchRegionRecommendation: { some: 1 } } })
      c.fetchFromSearchRegionRecommendation()
      expect(c.errorDataCount).toBe(1)
    })
  })

  describe('fetchFromSearchV6', () => {
    it('should convert results on success', () => {
      contentSvc.searchV6.mockReturnValue(of({ result: [{ name: 'D', identifier: 'do_4', lastUpdatedOn: '20200101T101010' }] }))
      const c = build({ request: { searchV6: { q: 1 } } })
      c.fetchFromSearchV6()
      expect(c.stripsResultDataMap.length).toBe(1)
    })

    it('should mark error on failure', () => {
      contentSvc.searchV6.mockReturnValue(throwError(() => new Error('x')))
      const c = build({ request: { searchV6: { q: 1 } } })
      c.fetchFromSearchV6()
      expect(c.errorDataCount).toBe(1)
    })
  })

  describe('fetchFromIds', () => {
    it('should convert results on success', () => {
      contentSvc.fetchMultipleContent.mockReturnValue(of([{ name: 'E', identifier: 'do_5', lastUpdatedOn: '20200101T101010' }]))
      const c = build({ request: { ids: ['do_5'] } })
      c.fetchFromIds()
      expect(c.stripsResultDataMap.length).toBe(1)
    })

    it('should mark error on failure', () => {
      contentSvc.fetchMultipleContent.mockReturnValue(throwError(() => new Error('x')))
      const c = build({ request: { ids: ['do_5'] } })
      c.fetchFromIds()
      expect(c.errorDataCount).toBe(1)
    })
  })

  describe('processManualData', () => {
    it('should push manual data entries', () => {
      const c = build({
        request: {
          manualData: [{ title: 'M', url: '/m', lastUpdatedOn: '2020-01-01', target: '_self' }],
        },
      })
      c.processManualData()
      expect(c.stripsResultDataMap.length).toBe(1)
      expect(c.stripsResultDataMap[0].title).toBe('M')
      expect(c.stripsResultDataMap[0].target).toBe('_self')
    })

    it('should default target to _blank when absent', () => {
      const c = build({
        request: { manualData: [{ title: 'M', url: '/m', lastUpdatedOn: '2020-01-01' }] },
      })
      c.processManualData()
      expect(c.stripsResultDataMap[0].target).toBe('_blank')
    })

    it('should do nothing when manualData empty', () => {
      const c = build({ request: { manualData: [] } })
      c.processManualData()
      expect(c.stripsResultDataMap.length).toBe(0)
    })
  })

  describe('convertToStrip', () => {
    it('should map content to strip entries', () => {
      component.convertToStrip([{ name: 'X', identifier: 'do_9', lastUpdatedOn: '20200101T101010' } as any])
      expect(component.stripsResultDataMap[0].url).toBe('/app/toc/do_9/overview')
      expect(component.stripsResultDataMap[0].target).toBe('_self')
    })

    it('should default to empty array', () => {
      component.convertToStrip()
      expect(component.stripsResultDataMap.length).toBe(0)
    })
  })

  describe('convertToISODate', () => {
    it('should build an ISO date from a compact date string', () => {
      const d = component.convertToISODate('20200102T030405')
      expect(d instanceof Date).toBe(true)
      expect(d.getUTCFullYear()).toBe(2020)
    })

    it('should return fallback date on error', () => {
      const d = component.convertToISODate(null as any)
      expect(d instanceof Date).toBe(true)
    })
  })

  describe('checkParentStatus via fetch orchestration', () => {
    it('should show no data when done with zero results', () => {
      const c = build({ loader: true, request: { search: { q: 1 } } })
      contentSvc.search.mockReturnValue(of({ result: [] }))
      c.widgetData.loader = true
      c.loader = true
      // fetching then done(0)
      c.fetchFromSearch()
      expect(c.noDataCount).toBe(1)
      expect(c.showNoData).toBe(true)
    })

    it('should set error flag when all requests error', () => {
      const c = build({ request: { search: { q: 1 } } })
      contentSvc.search.mockReturnValue(throwError(() => new Error('x')))
      c.fetchFromSearch()
      expect(c.error).toBe(true)
    })
  })
})
