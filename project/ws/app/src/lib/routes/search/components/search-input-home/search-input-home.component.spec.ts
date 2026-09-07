import { Subject } from 'rxjs'
import { SearchInputHomeComponent } from './search-input-home.component'

describe('SearchInputHomeComponent', () => {
  let component: SearchInputHomeComponent
  let activated: any
  let router: any
  let searchServSvc: any
  let configSvc: any
  let route: any
  let queryParams$: Subject<any>

  const paramMap = (params: Record<string, string>) => ({
    has: (key: string) => key in params,
    get: (key: string) => params[key] ?? null,
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
    activated.snapshot.data = data ? { searchPageData: data } : {}
    route.snapshot.data = activated.snapshot.data
    return new SearchInputHomeComponent(activated, router, searchServSvc, configSvc, route)
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
      getSearchConfig: jest.fn().mockResolvedValue(searchPageData().data),
      getLanguageSearchIndex: jest.fn((l: string) => l),
      searchAutoComplete: jest.fn().mockResolvedValue([{ suggestion: 'angular' }]),
    }
    configSvc = { activeLocale: { locals: ['hi'] }, userPreference: null }

    component = build()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should be created from the current query string', () => {
    activated.snapshot.queryParams = { q: 'angular' }

    const c = build()

    expect(c.queryControl.value).toBe('angular')
    expect(c.searchLocale).toBe('hi')
    expect(c.autoCompleteResults).toEqual([])
  })

  it('starts with an empty query when the url carries none', () => {
    expect(component.queryControl.value).toBe('')
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
    it('loads the search config and orders the languages', async () => {
      component.ngOnInit()
      await flush()

      expect(searchServSvc.getSearchConfig).toHaveBeenCalled()
      expect(component.languageSearch).toEqual(['all', 'en', 'hi'])
    })

    it('inserts the preferred language group after "all"', async () => {
      configSvc.userPreference = { selectedLangGroup: 'en,hi' }
      const c = build()

      c.ngOnInit()
      await flush()

      expect(c.languageSearch).toEqual(['all', 'en,hi', 'en', 'hi'])
    })

    it('leaves a single preferred language out of the list', async () => {
      configSvc.userPreference = { selectedLangGroup: 'en' }
      const c = build()

      c.ngOnInit()
      await flush()

      expect(c.languageSearch).toEqual(['all', 'en', 'hi'])
    })

    it('focuses the search box once it is rendered', async () => {
      const focus = jest.fn()
      component.searchInputElem = { nativeElement: { focus, blur: jest.fn() } } as any

      component.ngOnInit()
      await flush()

      expect(focus).toHaveBeenCalled()
    })
  })

  describe('query string handling', () => {
    const init = async (c = component) => {
      c.ngOnInit()
      await flush()
    }

    it('adopts the query from the url', async () => {
      await init()

      queryParams$.next(paramMap({ q: 'angular' }))

      expect(component.queryControl.value).toBe('angular')
    })

    it('falls back to a catch-all query for an empty q parameter', async () => {
      await init()

      queryParams$.next(paramMap({ q: '' }))

      expect(component.queryControl.value).toBe('all')
    })

    it('adopts the language from the url', async () => {
      await init()

      queryParams$.next(paramMap({ lang: 'ta' }))

      expect(component.searchLocale).toBe('ta')
    })

    it('falls back to the active locale when the url names no language', async () => {
      await init()

      queryParams$.next(paramMap({}))

      expect(component.searchLocale).toBe('hi')
    })

    it('fetches autocomplete suggestions for the current query', async () => {
      await init()

      queryParams$.next(paramMap({ q: 'angular' }))
      await flush()

      expect(searchServSvc.searchAutoComplete).toHaveBeenCalledWith({ q: 'angular', l: 'hi' })
      expect(component.autoCompleteResults).toEqual([{ suggestion: 'angular' }])
    })

    it('skips autocomplete when the instance turns it off', async () => {
      const c = build(searchPageData({ isAutoCompleteAllowed: false }))
      searchServSvc.getSearchConfig.mockResolvedValue(searchPageData({ isAutoCompleteAllowed: false }).data)

      await init(c)
      queryParams$.next(paramMap({ q: 'angular' }))
      await flush()

      expect(searchServSvc.searchAutoComplete).not.toHaveBeenCalled()
    })
  })

  describe('autoFilter', () => {
    it('fetches suggestions as the author types', async () => {
      component.ngOnInit()
      await flush()

      component.queryControl.setValue('ang')
      jest.advanceTimersByTime(200)
      await flush()

      expect(searchServSvc.searchAutoComplete).toHaveBeenCalledWith({ q: 'ang', l: 'hi' })
    })

    it('does nothing before the search config has loaded', () => {
      const c = build(null)

      c.autoFilter()
      c.queryControl.setValue('ang')
      jest.advanceTimersByTime(200)

      expect(searchServSvc.searchAutoComplete).not.toHaveBeenCalled()
    })
  })

  describe('getSearchAutoCompleteResults', () => {
    it('does not fetch suggestions across a language group', async () => {
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
      component.searchInputElem = { nativeElement: { blur, focus: jest.fn() } } as any

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
