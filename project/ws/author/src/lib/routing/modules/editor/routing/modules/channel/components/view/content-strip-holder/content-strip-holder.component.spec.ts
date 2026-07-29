import { of, throwError, Subject } from 'rxjs'
import { ContentStripHolderComponent } from './content-strip-holder.component'

describe('ContentStripHolderComponent', () => {
  let store: any
  let contentStripSvc: any
  let contentSvc: any
  let update$: Subject<string>

  const build = () => {
    const c = new ContentStripHolderComponent(store, contentStripSvc, contentSvc)
    c.id = 'strip1'
    return c
  }

  const widgetWith = (request: any, info = false) => ({
    children: info ? ['c-info', 'c-pre'] : ['c-pre'],
    data: { request, key: 'k', stripConfig: { cardSubType: 'sub', intranetMode: false, deletedMode: false } },
  })

  beforeEach(() => {
    update$ = new Subject<string>()
    store = {
      update: update$.asObservable(),
      getUpdatedContent: jest.fn(),
      triggerEdit: jest.fn(),
    }
    contentStripSvc = {
      getContentStripResponseApi: jest.fn().mockReturnValue(of({ contents: [] })),
    }
    contentSvc = {
      search: jest.fn().mockReturnValue(of({ result: [] })),
      fetchMultipleContent: jest.fn().mockReturnValue(of([])),
      searchRegionRecommendation: jest.fn().mockReturnValue(of({ contents: [] })),
      searchV6: jest.fn().mockReturnValue(of({ result: [] })),
    }
  })

  it('is created', () => {
    expect(build()).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('runs initiate when the store emits a matching id', () => {
      const c = build()
      store.getUpdatedContent.mockReturnValue(widgetWith({}))
      const initiateSpy = jest.spyOn(c, 'initiate')
      c.ngOnInit()
      update$.next('strip1')
      expect(initiateSpy).toHaveBeenCalled()
    })

    it('ignores a non-matching id', () => {
      const c = build()
      const initiateSpy = jest.spyOn(c, 'initiate')
      c.ngOnInit()
      update$.next('other')
      expect(initiateSpy).not.toHaveBeenCalled()
    })
  })

  describe('initiate', () => {
    it('classifies children into the widget map and shows info', () => {
      const c = build()
      store.getUpdatedContent.mockImplementation((id: string) => {
        if (id === 'strip1') {
          return {
            children: ['c-info', 'c-nodata', 'c-error', 'c-pre', 'c-post'],
            data: { request: {} },
          }
        }
        const map: any = {
          'c-info': { purpose: 'info', addOnData: { visibilityMode: 'visible' } },
          'c-nodata': { purpose: 'noDataWidget' },
          'c-error': { purpose: 'errorWidget' },
          'c-pre': { purpose: 'preWidget' },
          'c-post': { purpose: 'postWidget' },
        }
        return map[id]
      })
      c.initiate()
      expect(c.widgetMap.info).toBe('c-info')
      expect(c.widgetMap.noData).toBe('c-nodata')
      expect(c.widgetMap.error).toBe('c-error')
      expect(c.widgetMap.preWidgets).toEqual(['c-pre'])
      expect(c.widgetMap.postWidgets).toEqual(['c-post'])
      expect(c.showInfo).toBe(true)
      expect(c.showNoData).toBe(true)
    })

    it('shows no data when there is no request', () => {
      const c = build()
      store.getUpdatedContent.mockReturnValue({ children: [], data: { request: {} } })
      c.initiate()
      expect(c.showNoData).toBe(true)
    })

    it('routes to fetchFromApi when an api request is present', () => {
      const c = build()
      store.getUpdatedContent.mockReturnValue(widgetWith({ api: { path: '/x' } }))
      const spy = jest.spyOn(c, 'fetchFromApi')
      c.initiate()
      expect(spy).toHaveBeenCalled()
    })

    it('routes to fetchFromSearch when a search request is present', () => {
      const c = build()
      store.getUpdatedContent.mockReturnValue(widgetWith({ search: { query: 'x' } }))
      const spy = jest.spyOn(c, 'fetchFromSearch')
      c.initiate()
      expect(spy).toHaveBeenCalled()
    })

    it('routes to fetchFromIds when ids are present', () => {
      const c = build()
      store.getUpdatedContent.mockReturnValue(widgetWith({ ids: ['a', 'b'] }))
      const spy = jest.spyOn(c, 'fetchFromIds')
      c.initiate()
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('fetch methods', () => {
    const seedWidget = (c: ContentStripHolderComponent, request: any) => {
      c.widget = { data: { request, key: 'k', stripConfig: { postCardForSearch: true } } } as any
    }

    it('fetchFromApi transforms contents on success', () => {
      const c = build()
      seedWidget(c, { api: {} })
      contentStripSvc.getContentStripResponseApi.mockReturnValue(of({ contents: [{ identifier: '1' }] }))
      c.fetchFromApi()
      expect(c.widgetDatas).toHaveLength(1)
      expect(c.widgetDatas[0].widgetType).toBe('card')
    })

    it('fetchFromApi sets showError on failure', () => {
      const c = build()
      seedWidget(c, { api: {} })
      contentStripSvc.getContentStripResponseApi.mockReturnValue(throwError(() => 'boom'))
      c.fetchFromApi()
      expect(c.showError).toBe(true)
    })

    it('fetchFromSearch sets viewMore and transforms results', () => {
      const c = build()
      seedWidget(c, { search: {} })
      contentSvc.search.mockReturnValue(of({ result: [{ identifier: '1' }] }))
      c.fetchFromSearch()
      expect(c.viewMore).toBe(true)
      expect(c.widgetDatas).toHaveLength(1)
    })

    it('fetchFromSearch sets showError on failure', () => {
      const c = build()
      seedWidget(c, { search: {} })
      contentSvc.search.mockReturnValue(throwError(() => 'boom'))
      c.fetchFromSearch()
      expect(c.showError).toBe(true)
    })

    it('fetchFromIds transforms results', () => {
      const c = build()
      seedWidget(c, { ids: ['a'] })
      contentSvc.fetchMultipleContent.mockReturnValue(of([{ identifier: '1' }]))
      c.fetchFromIds()
      expect(c.widgetDatas).toHaveLength(1)
    })

    it('fetchFromIds sets showError on failure', () => {
      const c = build()
      seedWidget(c, { ids: ['a'] })
      contentSvc.fetchMultipleContent.mockReturnValue(throwError(() => 'boom'))
      c.fetchFromIds()
      expect(c.showError).toBe(true)
    })

    it('fetchFromSearchRegionRecommendation transforms contents', () => {
      const c = build()
      seedWidget(c, { searchRegionRecommendation: { region: 'x' } })
      contentSvc.searchRegionRecommendation.mockReturnValue(of({ contents: [{ identifier: '1' }] }))
      c.fetchFromSearchRegionRecommendation()
      expect(c.widgetDatas).toHaveLength(1)
    })

    it('fetchFromSearchRegionRecommendation sets showError on failure', () => {
      const c = build()
      seedWidget(c, { searchRegionRecommendation: { region: 'x' } })
      contentSvc.searchRegionRecommendation.mockReturnValue(throwError(() => 'boom'))
      c.fetchFromSearchRegionRecommendation()
      expect(c.showError).toBe(true)
    })

    it('fetchFromSearchV6 sets viewMore and transforms results', () => {
      const c = build()
      seedWidget(c, { searchV6: { query: 'x' } })
      contentSvc.searchV6.mockReturnValue(of({ result: [{ identifier: '1' }] }))
      c.fetchFromSearchV6()
      expect(c.viewMore).toBe(true)
      expect(c.widgetDatas).toHaveLength(1)
    })

    it('fetchFromSearchV6 sets showError on failure', () => {
      const c = build()
      seedWidget(c, { searchV6: { query: 'x' } })
      contentSvc.searchV6.mockReturnValue(throwError(() => 'boom'))
      c.fetchFromSearchV6()
      expect(c.showError).toBe(true)
    })
  })

  it('triggerEdit delegates to the store', () => {
    const c = build()
    c.triggerEdit('id-9')
    expect(store.triggerEdit).toHaveBeenCalledWith('id-9')
  })
})
