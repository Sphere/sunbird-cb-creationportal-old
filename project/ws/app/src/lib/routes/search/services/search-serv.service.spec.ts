import { of } from 'rxjs'

import { SearchServService } from './search-serv.service'

describe('SearchServService', () => {
  let service: SearchServService
  let events: { dispatchEvent: jest.Mock }
  let searchApi: {
    getSearchAutoCompleteResults: jest.Mock
    getSearchV6Results: jest.Mock
    getSearchResults: jest.Mock
  }
  let configSrv: any
  let http: { get: jest.Mock }

  beforeEach(() => {
    localStorage.clear()
    events = { dispatchEvent: jest.fn() }
    searchApi = {
      getSearchAutoCompleteResults: jest.fn().mockReturnValue(of([{ text: 'a' }])),
      getSearchV6Results: jest.fn().mockReturnValue(of({ result: [] })),
      getSearchResults: jest.fn().mockReturnValue(of({ result: [] })),
    }
    configSrv = { sitePath: '/site', activeOrg: 'o1', rootOrg: 'r1' }
    http = {
      get: jest.fn().mockReturnValue(of({ search: { visibleFilters: {}, excludeSourceFields: [] } })),
    }
    service = new SearchServService(events as any, searchApi as any, configSrv, http as any)
  })

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('defaultFiltersTranslated returns the empty en/all shape', () => {
    expect(service.defaultFiltersTranslated).toEqual({ en: {}, all: {} })
  })

  it('getSearchConfig fetches once and caches the result', async () => {
    const cfg = await service.getSearchConfig()
    expect(cfg).toEqual({ search: { visibleFilters: {}, excludeSourceFields: [] } })
    await service.getSearchConfig()
    expect(http.get).toHaveBeenCalledTimes(1)
    expect(http.get).toHaveBeenCalledWith('/site/feature/search.json')
  })

  it('getApplyPhraseSearch is true when phraseSearch is enabled', async () => {
    http.get.mockReturnValue(of({ search: { tabs: [{ phraseSearch: true }] } }))
    await expect(service.getApplyPhraseSearch()).resolves.toBe(true)
  })

  it('getApplyPhraseSearch is false when phraseSearch is explicitly disabled', async () => {
    http.get.mockReturnValue(of({ search: { tabs: [{ phraseSearch: false }] } }))
    await expect(service.getApplyPhraseSearch()).resolves.toBe(false)
  })

  describe('searchAutoComplete', () => {
    it('delegates to the api for a single non-all locale', async () => {
      const res = await service.searchAutoComplete({ q: 'ANG', l: 'en' } as any)
      expect(searchApi.getSearchAutoCompleteResults).toHaveBeenCalledWith({ q: 'ang', l: 'en' })
      expect(res).toEqual([{ text: 'a' }])
    })

    it('resolves empty for multi/all locales', async () => {
      const res = await service.searchAutoComplete({ q: 'ang', l: 'all' } as any)
      expect(searchApi.getSearchAutoCompleteResults).not.toHaveBeenCalled()
      expect(res).toEqual([])
    })
  })

  it('getLearning normalises locale and delegates to the v6 api', () => {
    let out: any
    service.getLearning({ locale: ['all'], query: 'x', filters: {} } as any).subscribe(r => (out = r))
    expect(searchApi.getSearchV6Results).toHaveBeenCalled()
    const req = searchApi.getSearchV6Results.mock.calls[0][0]
    expect(req.query).toBe('x')
    expect(req.locale).toEqual([])
    expect(out).toEqual({ result: [] })
  })

  it('fetchSocialSearchUsers injects org and rootOrg from config', () => {
    service.fetchSocialSearchUsers({ query: 'x' } as any)
    expect(searchApi.getSearchResults).toHaveBeenCalledWith(expect.objectContaining({ org: 'o1', rootOrg: 'r1', query: 'x' }))
  })

  describe('updateSelectedFiltersSet', () => {
    it('expands hierarchical tag paths and flags reset', () => {
      const { filterSet, filterReset } = service.updateSelectedFiltersSet({
        tags: ['a/b/c'],
        contentType: ['Course'],
      })
      expect(filterReset).toBe(true)
      expect(filterSet.has('a')).toBe(true)
      expect(filterSet.has('a/b')).toBe(true)
      expect(filterSet.has('a/b/c')).toBe(true)
      expect(filterSet.has('Course')).toBe(true)
    })

    it('does not flag reset for empty filters', () => {
      const { filterReset } = service.updateSelectedFiltersSet({ contentType: [] })
      expect(filterReset).toBe(false)
    })
  })

  it('transformSearchV6Filters flattens andFilters into a key map', () => {
    const result = service.transformSearchV6Filters([{ andFilters: [{ contentType: ['Course'] }, { status: ['Live'] }] }] as any)
    expect(result).toEqual({ contentType: ['Course'], status: ['Live'] })
  })

  it('handleFilters extracts concepts and drops dtLastModified', () => {
    const filters = [
      { type: 'concepts', content: [{ type: 'c1' }] },
      { type: 'dtLastModified', content: [] },
      { type: 'resourceType', content: [{ type: 'pdf' }] },
    ]
    const res = service.handleFilters(filters as any, new Set(), {})
    expect(res.concept.length).toBe(1)
    expect(res.filtersRes.map(f => f.type)).toEqual(['resourceType'])
  })

  it('formatFilterForSearch builds a $-joined filter string', () => {
    const str = service.formatFilterForSearch({ contentType: ['Course', 'Resource'], region: ['IN'] })
    expect(str).toBe('"contentType":["Course","Resource"]$"region":["IN"]')
  })

  it('getDisplayName maps known types and falls back to the raw type', () => {
    expect(service.getDisplayName('kshop')).toBe('Documents')
    expect(service.getDisplayName('project')).toBe('Project References')
    expect(service.getDisplayName('somethingElse')).toBe('somethingElse')
  })

  it('getLanguageSearchIndex maps zh-CN to zh', () => {
    expect(service.getLanguageSearchIndex('zh-CN')).toBe('zh')
    expect(service.getLanguageSearchIndex('en')).toBe('en')
  })

  it('raiseSearchEvent dispatches a telemetry interact event', () => {
    service.raiseSearchEvent('q', { a: 1 }, ['en'])
    expect(events.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ from: 'search', to: 'telemetry' }))
  })

  it('raiseSearchResponseEvent dispatches a telemetry search event with size', () => {
    service.raiseSearchResponseEvent('q', {}, 12, ['en'])
    const arg = events.dispatchEvent.mock.calls[0][0]
    expect(arg.data.size).toBe(12)
  })

  describe('translateSearchFilters', () => {
    it('returns cached en translations without an http call', async () => {
      const res = await service.translateSearchFilters('en')
      expect(res).toEqual({})
      expect(http.get).not.toHaveBeenCalled()
    })

    it('fetches and caches a new single language', async () => {
      http.get.mockReturnValue(of({ hello: 'namaste' }))
      const res = await service.translateSearchFilters('hi')
      expect(http.get).toHaveBeenCalledWith('/apis/protected/v8/translate/filterdata/hi')
      expect(res).toEqual({ hello: 'namaste' })
      const stored = JSON.parse(localStorage.getItem('filtersTranslation') || '{}')
      expect(stored.hi).toEqual({ hello: 'namaste' })
    })

    it('returns en for multi-language input', async () => {
      const res = await service.translateSearchFilters('en,hi')
      expect(res).toEqual({})
    })
  })
})
