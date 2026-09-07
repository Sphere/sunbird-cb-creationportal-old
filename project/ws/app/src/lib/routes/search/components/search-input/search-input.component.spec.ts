import { Subject } from 'rxjs'
import { SearchInputComponent } from './search-input.component'

describe('SearchInputComponent', () => {
  let component: SearchInputComponent
  let activated: any
  let router: any
  let searchServSvc: any
  let configSvc: any
  let route: any
  let queryParams$: Subject<any>

  const paramMap = (params: Record<string, string>) => ({
    has: (key: string) => key in params,
    get: (key: string) => (key in params ? params[key] : null),
  })

  const searchPageData = (over: any = {}) => ({
    data: {
      search: {
        isAutoCompleteAllowed: true,
        languageSearch: ['ALL', 'EN', 'HI'],
        ...over,
      },
    },
  })

  const build = (data: any = searchPageData()) => {
    route.snapshot.data = data ? { searchPageData: data } : {}
    activated.snapshot.data = route.snapshot.data
    return new SearchInputComponent(activated, router, searchServSvc, configSvc, route)
  }

  const flush = async () => {
    for (let i = 0; i < 12; i += 1) {
      await Promise.resolve()
    }
  }

  beforeEach(() => {
    jest.useFakeTimers()
    queryParams$ = new Subject<any>()

    activated = {
      snapshot: { queryParams: {}, data: {} },
      queryParamMap: queryParams$,
      parent: { path: 'search' },
    }
    route = { snapshot: { data: {} } }
    router = { navigate: jest.fn() }
    searchServSvc = {
      getLanguageSearchIndex: jest.fn((l: string) => l),
      searchAutoComplete: jest.fn().mockResolvedValue([{ suggestion: 'angular' }]),
    }
    configSvc = { activeLocale: { locals: ['hi'] }, userPreference: null }

    component = build()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('is created with the current query string and defaults', () => {
    activated.snapshot.queryParams = { q: 'angular' }

    const c = build()

    expect(c.queryControl.value).toBe('angular')
    expect(c.searchLocale).toBe('hi')
    expect(c.autoCompleteResults).toEqual([])
  })

  it('falls back to the catch-all query when the url carries none', () => {
    expect(component.queryControl.value).toBe('all')
  })

  describe('getActiveLocale', () => {
    it('maps the active locale through the search index', () => {
      expect(component.getActiveLocale()).toBe('hi')
      expect(searchServSvc.getLanguageSearchIndex).toHaveBeenCalledWith('hi')
    })

    it('falls back to English without an active locale', () => {
      configSvc.activeLocale = null

      expect(build().getActiveLocale()).toBe('en')
    })
  })

  describe('preferredLanguages', () => {
    it('maps every language in the user preference group', () => {
      configSvc.userPreference = { selectedLangGroup: 'en,hi' }

      expect(build().preferredLanguages).toBe('en,hi')
    })

    it('is null without a language preference', () => {
      expect(component.preferredLanguages).toBeNull()
    })
  })

  describe('swapRemove', () => {
    it('moves an entry to the front of the list', () => {
      const langs = ['en', 'hi', 'all']

      component.swapRemove(langs, 2, 0)

      expect(langs).toEqual(['all', 'en', 'hi'])
    })
  })

  describe('ngOnInit', () => {
    it('orders and normalises the language list', () => {
      component.ngOnInit()
      queryParams$.next(paramMap({}))

      expect(component.languageSearch).toEqual(['all', 'en', 'hi'])
    })

    it('inserts the preferred language group after "all"', () => {
      configSvc.userPreference = { selectedLangGroup: 'en,hi' }
      const c = build()

      c.ngOnInit()

      expect(c.languageSearch).toEqual(['all', 'en,hi', 'en', 'hi'])
    })

    it('leaves a single preferred language out of the list', () => {
      configSvc.userPreference = { selectedLangGroup: 'en' }
      const c = build()

      c.ngOnInit()

      expect(c.languageSearch).toEqual(['all', 'en', 'hi'])
    })

    it('is safe when the search box is not yet rendered', () => {
      expect(() => component.ngOnInit()).not.toThrow()
    })
  })

  describe('query string handling', () => {
    it('adopts the query from the url', () => {
      component.ngOnInit()

      queryParams$.next(paramMap({ q: 'angular' }))

      expect(component.queryControl.value).toBe('angular')
    })

    it('falls back to a catch-all query for an empty q parameter', () => {
      component.ngOnInit()

      queryParams$.next(paramMap({ q: '' }))

      expect(component.queryControl.value).toBe('all')
    })

    it('navigates to the catch-all query when the url has no q', () => {
      component.ngOnInit()

      queryParams$.next(paramMap({}))

      expect(component.queryControl.value).toBe('all')
      expect(router.navigate).toHaveBeenCalled()
    })

    it('adopts the language from the url', () => {
      component.ngOnInit()

      queryParams$.next(paramMap({ q: 'x', lang: 'ta' }))

      expect(component.searchLocale).toBe('ta')
    })

    it('falls back to the active locale when the url names no language', () => {
      component.ngOnInit()

      queryParams$.next(paramMap({ q: 'x' }))

      expect(component.searchLocale).toBe('hi')
    })

    it('fetches autocomplete suggestions for the current query', async () => {
      component.ngOnInit()

      queryParams$.next(paramMap({ q: 'angular' }))
      await flush()

      expect(searchServSvc.searchAutoComplete).toHaveBeenCalledWith({ q: 'angular', l: 'hi' })
      expect(component.autoCompleteResults).toEqual([{ suggestion: 'angular' }])
    })

    it('skips autocomplete when the instance turns it off', async () => {
      const c = build(searchPageData({ isAutoCompleteAllowed: false }))

      c.ngOnInit()
      queryParams$.next(paramMap({ q: 'angular' }))
      await flush()

      expect(searchServSvc.searchAutoComplete).not.toHaveBeenCalled()
    })
  })

  describe('autocomplete via typing', () => {
    it('fetches suggestions as the author types', async () => {
      component.queryControl.setValue('ang')
      jest.advanceTimersByTime(200)
      await flush()

      expect(searchServSvc.searchAutoComplete).toHaveBeenCalledWith({ q: 'ang', l: 'hi' })
    })

    it('does not subscribe to typing when autocomplete is off', () => {
      const c = build(searchPageData({ isAutoCompleteAllowed: false }))

      c.queryControl.setValue('ang')
      jest.advanceTimersByTime(200)

      expect(searchServSvc.searchAutoComplete).not.toHaveBeenCalled()
    })
  })

  describe('getSearchAutoCompleteResults', () => {
    it('does not fetch suggestions across a language group', () => {
      component.searchLocale = 'en,hi'

      component.getSearchAutoCompleteResults('angular')

      expect(searchServSvc.searchAutoComplete).not.toHaveBeenCalled()
    })

    it('swallows a failed suggestion lookup', async () => {
      searchServSvc.searchAutoComplete.mockRejectedValue(new Error('boom'))

      component.getSearchAutoCompleteResults('angular')
      await flush()

      expect(component.autoCompleteResults).toEqual([])
    })
  })

  describe('updateQuery', () => {
    it('opens the search page from the home bar', () => {
      const spy = jest.fn()
      component.closed.subscribe(spy)
      component.ref = 'home'

      component.updateQuery('  angular  ')

      expect(spy).toHaveBeenCalledWith(false)
      expect(router.navigate).toHaveBeenCalledWith(['/app/search'], {
        queryParams: { q: 'angular' },
        queryParamsHandling: 'merge',
      })
    })

    it('stays on the current page from the search bar', () => {
      component.updateQuery('angular')

      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: activated.parent,
        queryParams: { q: 'angular' },
        queryParamsHandling: 'merge',
      })
    })

    it('blurs the search box before navigating', () => {
      const blur = jest.fn()
      component.searchInputElem = { nativeElement: { blur } } as any

      component.updateQuery('angular')

      expect(blur).toHaveBeenCalled()
    })

    it('navigates even before the search box is rendered', () => {
      expect(() => component.updateQuery('angular')).not.toThrow()
      expect(router.navigate).toHaveBeenCalled()
    })
  })

  describe('searchLanguage', () => {
    it('re-runs the current query in the chosen language', () => {
      component.queryControl.setValue('angular')

      component.searchLanguage('ta')

      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: activated.parent,
        queryParams: { lang: 'ta', q: 'angular' },
        queryParamsHandling: 'merge',
      })
    })
  })

  describe('ngOnChanges', () => {
    it('is inert', () => {
      expect(() => component.ngOnChanges()).not.toThrow()
    })
  })
})
