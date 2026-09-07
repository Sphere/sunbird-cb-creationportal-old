import { Subject } from 'rxjs'
import { HomeComponent } from './home.component'

describe('HomeComponent', () => {
  let configSvc: any
  let router: any
  let route: any
  let searchSvc: any
  let queryParamMap$: Subject<any>

  const params = (map: Record<string, string> = {}) => ({
    has: (k: string) => Object.prototype.hasOwnProperty.call(map, k),
    get: (k: string) => (Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null),
  })

  const snapshotData = (over: any = {}) => ({
    pageData: {
      data: {
        search: {
          isAutoCompleteAllowed: true,
          languageSearch: ['ALL', 'EN', 'HI'],
          ...over,
        },
      },
    },
  })

  const build = (searchOver: any = {}) => {
    route = {
      snapshot: { data: snapshotData(searchOver) },
      queryParamMap: queryParamMap$.asObservable(),
      parent: {},
    }
    return new HomeComponent(configSvc, router, route, searchSvc)
  }

  beforeEach(() => {
    queryParamMap$ = new Subject<any>()
    router = { navigate: jest.fn().mockResolvedValue(true) }
    configSvc = {
      pageNavBar: { color: 'primary' },
      activeLocale: { locals: ['en'] },
      userPreference: { selectedLangGroup: 'en,hi' },
    }
    searchSvc = {
      getLanguageSearchIndex: jest.fn().mockImplementation((l: string) => l),
      searchAutoComplete: jest.fn().mockResolvedValue([{ id: '1' }]),
      getSearchConfig: jest.fn().mockResolvedValue({ search: { suggestedFilters: [{ type: 't' }] } }),
    }
  })

  it('should be created and seed the search query locale', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.searchQuery.l).toBe('en')
  })

  it('wires the debounced autocomplete when allowed and reflects the typed query', () => {
    const c = build()
    // valueChanges is debounced 200ms; the FormControl value updates synchronously.
    c.query.setValue('ng')
    expect(c.query.value).toBe('ng')
  })

  it('does not wire autocomplete when disabled', () => {
    const c = build({ isAutoCompleteAllowed: false })
    const spy = jest.spyOn(c, 'getAutoCompleteResults')
    c.query.setValue('ng')
    expect(spy).not.toHaveBeenCalled()
  })

  describe('getActivateLocale', () => {
    it('maps the active locale through the search index', () => {
      const c = build()
      expect(c.getActivateLocale()).toBe('en')
      expect(searchSvc.getLanguageSearchIndex).toHaveBeenCalledWith('en')
    })

    it('falls back to english without an active locale', () => {
      configSvc.activeLocale = null
      const c = build()
      expect(c.getActivateLocale()).toBe('en')
    })
  })

  describe('preferredLanguages', () => {
    it('maps every language in the preference group', () => {
      const c = build()
      expect(c.preferredLanguages).toBe('en,hi')
    })

    it('is null without a preference group', () => {
      configSvc.userPreference = null
      const c = build()
      expect(c.preferredLanguages).toBeNull()
    })
  })

  describe('search', () => {
    it('navigates to home then learning with the current query', async () => {
      const c = build()
      c.searchQuery.q = 'angular'
      c.search()
      await Promise.resolve()
      expect(router.navigate).toHaveBeenCalledWith(['/app/search/home'], expect.any(Object))
      await Promise.resolve()
      expect(router.navigate).toHaveBeenCalledWith(['/app/search/learning'], expect.any(Object))
    })

    it('prefers an explicit query argument', async () => {
      const c = build()
      c.search('explicit')
      expect(router.navigate).toHaveBeenCalledWith(
        ['/app/search/home'],
        expect.objectContaining({ queryParams: expect.objectContaining({ q: 'explicit' }) }),
      )
    })
  })

  describe('searchWithFilter', () => {
    it('builds a contentType filter', async () => {
      const c = build()
      c.searchWithFilter({ contentType: 'Course' })
      await Promise.resolve()
      await Promise.resolve()
      expect(router.navigate).toHaveBeenCalledWith(
        ['/app/search/learning'],
        expect.objectContaining({ queryParams: expect.objectContaining({ f: JSON.stringify({ contentType: ['Course'] }) }) }),
      )
    })

    it('builds a resourceType filter', async () => {
      const c = build()
      c.searchWithFilter({ resourceType: 'pdf' })
      await Promise.resolve()
      await Promise.resolve()
      expect(router.navigate).toHaveBeenCalledWith(
        ['/app/search/learning'],
        expect.objectContaining({ queryParams: expect.objectContaining({ f: JSON.stringify({ resourceType: ['pdf'] }) }) }),
      )
    })

    it('expands the learningContent combined type', async () => {
      const c = build()
      c.searchWithFilter({ combinedType: 'learningContent' })
      await Promise.resolve()
      await Promise.resolve()
      expect(router.navigate).toHaveBeenCalledWith(
        ['/app/search/learning'],
        expect.objectContaining({
          queryParams: expect.objectContaining({ f: JSON.stringify({ contentType: ['Collection', 'Learning Path', 'Course'] }) }),
        }),
      )
    })
  })

  it('swapRemove moves an element to a new index', () => {
    const c = build()
    const arr = ['a', 'b', 'c']
    c.swapRemove(arr, 2, 0)
    expect(arr).toEqual(['c', 'a', 'b'])
  })

  describe('getAutoCompleteResults', () => {
    it('stores the returned suggestions', async () => {
      const c = build()
      c.getAutoCompleteResults()
      await Promise.resolve()
      expect(c.autoCompleteResults).toEqual([{ id: '1' }])
    })

    it('swallows a rejected lookup', async () => {
      searchSvc.searchAutoComplete.mockRejectedValue('boom')
      const c = build()
      expect(() => c.getAutoCompleteResults()).not.toThrow()
      await Promise.resolve()
    })
  })

  it('searchLanguage navigates with the language and refreshes suggestions', async () => {
    const c = build()
    const spy = jest.spyOn(c, 'getAutoCompleteResults').mockImplementation(() => undefined)
    c.searchLanguage('hi')
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: expect.objectContaining({ lang: 'hi' }) }))
    await Promise.resolve()
    expect(spy).toHaveBeenCalled()
  })

  describe('ngOnInit', () => {
    it('reads the query and language from the params and sorts the language list', () => {
      const c = build()
      c.ngOnInit()
      queryParamMap$.next(params({ q: 'angular', lang: 'hi' }))
      expect(c.searchQuery.q).toBe('angular')
      expect(c.searchQuery.l).toBe('hi')
      expect(c.query.value).toBe('angular')
      // 'all' is moved to the front by swapRemove
      expect(c.languageSearch[0]).toBe('all')
    })

    it('defaults the query and locale when absent from the params', () => {
      const c = build()
      c.ngOnInit()
      queryParamMap$.next(params())
      expect(c.searchQuery.q).toBe('')
      expect(c.searchQuery.l).toBe('en')
    })

    it('injects the preferred languages when the group has more than one', () => {
      const c = build()
      c.ngOnInit()
      queryParamMap$.next(params())
      expect(c.languageSearch).toContain('en,hi')
    })

    it('loads the suggested filters from the search config', async () => {
      const c = build()
      c.ngOnInit()
      await Promise.resolve()
      expect(c.suggestedFilters).toEqual([{ type: 't' }])
    })
  })
})
