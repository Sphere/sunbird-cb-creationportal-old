import { of } from 'rxjs'

import { KnowledgeComponent } from './knowledge.component'

/**
 * Direct-instantiation unit tests for KnowledgeComponent.
 * Router and search service are mocked with jest.fn(); no TestBed rendering.
 */
describe('KnowledgeComponent', () => {
  let activated: any
  let router: any
  let valueSvc: any
  let searchServ: any

  function makeParamMap(store: { [k: string]: string }) {
    return {
      has: (k: string) => Object.prototype.hasOwnProperty.call(store, k),
      get: (k: string) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    }
  }

  function build(paramStore: { [k: string]: string } = {}): KnowledgeComponent {
    activated = {
      parent: {},
      queryParamMap: of(makeParamMap(paramStore)),
    }
    router = { navigate: jest.fn(() => Promise.resolve(true)) }
    valueSvc = { isLtMedium$: of(false) }
    searchServ = {
      formatFilterForSearch: jest.fn(() => 'formatted'),
      updateSelectedFiltersSet: jest.fn(() => ({ filterSet: new Set(['a']), filterReset: true })),
    }
    return new KnowledgeComponent(activated, router, valueSvc, searchServ)
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('constructs with sensible defaults', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.searchRequestStatus).toBe('none')
    expect(c.sideNavBarOpened).toBe(true)
  })

  it('ngOnInit reacts to screen size and resets the search request', () => {
    const c = build()
    c.ngOnInit()
    expect(c.screenSizeIsLtMedium).toBe(false)
    expect(c.sideNavBarOpened).toBe(true)
    expect(c.knowledgeData).toEqual([])
    expect(c.searchObj.from).toBe(0)
  })

  it('ngOnInit reads the query param into the search request', () => {
    const c = build({ q: 'angular' })
    c.ngOnInit()
    expect(c.searchRequest.query).toBe('angular')
    expect(c.searchObj.searchQuery).toBe('angular')
  })

  it('ngOnInit parses filters and updates the selected filter set', () => {
    const c = build({ f: '{"contentType":["Course"]}', sort: 'asc' })
    c.ngOnInit()
    expect(c.searchRequest.filters).toEqual({ contentType: ['Course'] })
    expect(c.searchObj.filter).toBe('formatted')
    expect(c.searchRequest.sort).toBe('asc')
    expect(c.filtersResetAble).toBe(true)
    expect(c.selectedFilterSet.has('a')).toBe(true)
    expect(searchServ.formatFilterForSearch).toHaveBeenCalledWith({ contentType: ['Course'] })
  })

  it('getResults is a no-op that does not throw', () => {
    const c = build()
    expect(() => c.getResults()).not.toThrow()
  })

  it('removeFilters navigates clearing the f query param', () => {
    const c = build()
    c.removeFilters()
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { f: null }, queryParamsHandling: 'merge' }))
  })

  it('sortOrder navigates with the sort query param', async () => {
    const c = build()
    await c.sortOrder('desc')
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { sort: 'desc' }, queryParamsHandling: 'merge' }),
    )
  })

  it('closeFilter sets the side bar state', () => {
    const c = build()
    c.closeFilter(false)
    expect(c.sideNavBarOpened).toBe(false)
  })

  it('ngOnDestroy unsubscribes without throwing', () => {
    const c = build()
    c.ngOnInit()
    expect(() => c.ngOnDestroy()).not.toThrow()
  })
})
