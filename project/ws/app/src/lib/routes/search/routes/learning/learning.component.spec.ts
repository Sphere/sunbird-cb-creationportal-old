import { of, Subject, throwError } from 'rxjs'
import { LearningComponent } from './learning.component'

describe('LearningComponent', () => {
  let component: LearningComponent
  let activated: any
  let router: any
  let valueSvc: any
  let searchServ: any
  let configSvc: any
  let utilitySvc: any
  let queryParamMap$: Subject<any>
  let prefChangeNotifier: Subject<any>

  /** A queryParamMap stub over a plain record. */
  const params = (map: Record<string, string> = {}) => ({
    has: (k: string) => Object.prototype.hasOwnProperty.call(map, k),
    get: (k: string) => (Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null),
  })

  const pageData = (over: any = {}) => ({
    data: {
      search: {
        tabs: [
          {
            titleKey: 'learning',
            searchQuery: { filters: {} },
            ...over,
          },
        ],
      },
    },
  })

  const searchResult = (over: any = {}) => ({
    totalHits: 1,
    result: [{ identifier: 'do_1' }],
    filters: [],
    queryUsed: 'q',
    doYouMean: [],
    ...over,
  })

  const build = (snapshotData: any = {}) => {
    activated = {
      parent: {},
      snapshot: {
        queryParamMap: params(),
        data: { pageroute: 'learning', pageData: pageData(), ...snapshotData },
      },
      queryParamMap: queryParamMap$.asObservable(),
    }
    return new LearningComponent(activated, router, valueSvc, searchServ, configSvc, utilitySvc)
  }

  beforeEach(() => {
    queryParamMap$ = new Subject<any>()
    prefChangeNotifier = new Subject<any>()
    router = { navigate: jest.fn().mockResolvedValue(true) }
    valueSvc = { isLtMedium$: of(false) }
    searchServ = {
      searchConfig: null,
      getLanguageSearchIndex: jest.fn().mockImplementation((l: string) => l),
      translateSearchFilters: jest.fn().mockResolvedValue({ contentType: 'Type' }),
      updateSelectedFiltersSet: jest.fn().mockReturnValue({ filterSet: new Set<string>(), filterReset: false }),
      raiseSearchEvent: jest.fn(),
      raiseSearchResponseEvent: jest.fn(),
      handleFilters: jest.fn().mockReturnValue({ filtersRes: [] }),
      getLearning: jest.fn().mockReturnValue(of(searchResult())),
    }
    configSvc = {
      activeLocale: { locals: ['en'] },
      userPreference: { selectedLocale: 'en', selectedLangGroup: 'en,hi' },
      prefChangeNotifier,
      isIntranetAllowed: true,
      restrictedFeatures: new Set<string>(),
    }
    utilitySvc = { isMobile: false }
    component = build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('locale helpers', () => {
    it('getActiveLocale maps the active locale through the search index', () => {
      expect(component.getActiveLocale()).toBe('en')
      expect(searchServ.getLanguageSearchIndex).toHaveBeenCalledWith('en')
    })

    it('getActiveLocale falls back to an empty locale', () => {
      configSvc.activeLocale = null
      expect(component.getActiveLocale()).toBe('')
    })

    it('preferredLanguages maps every language in the preference group', () => {
      expect(component.preferredLanguages).toBe('en,hi')
    })

    it('preferredLanguages defaults to English without a preference', () => {
      configSvc.userPreference = null
      expect(component.preferredLanguages).toBe('en')
    })
  })

  describe('config-driven getters', () => {
    it('applyPhraseSearch is on by default', () => {
      expect(component.applyPhraseSearch).toBe(true)
    })

    it('applyPhraseSearch honours an explicit false', () => {
      component = build({ pageData: pageData({ phraseSearch: false }) })
      expect(component.applyPhraseSearch).toBe(false)
    })

    it('applyIsStandAlone is on by default', () => {
      expect(component.applyIsStandAlone).toBe(true)
    })

    it('applyIsStandAlone honours an explicit false', () => {
      component = build({ pageData: pageData({ isStandAlone: false }) })
      expect(component.applyIsStandAlone).toBe(false)
    })

    it('filtersFromConfig reads the configured tab filters', () => {
      component = build({ pageData: pageData({ searchQuery: { filters: { contentType: ['Course'] } } }) })
      expect(component.filtersFromConfig).toEqual({ contentType: ['Course'] })
    })
  })

  describe('isDefaultFilterApplied', () => {
    it('is false when the tab configures no filters', () => {
      expect(component.isDefaultFilterApplied).toBe(false)
    })

    it('is true when every configured filter is applied', () => {
      component = build({ pageData: pageData({ searchQuery: { filters: { contentType: ['Course'] } } }) })
      component.searchRequestObject.filters = { contentType: ['Course'] }
      expect(component.isDefaultFilterApplied).toBe(true)
    })

    it('is false when an applied filter differs', () => {
      component = build({ pageData: pageData({ searchQuery: { filters: { contentType: ['Course'] } } }) })
      component.searchRequestObject.filters = { contentType: ['Resource'] }
      expect(component.isDefaultFilterApplied).toBe(false)
    })
  })

  describe('searchAcrossPreferredLang', () => {
    it('is false unless the tab opts in', () => {
      expect(component.searchAcrossPreferredLang).toBe(false)
    })

    it('is true when the applied locale differs from the preference', () => {
      component = build({ pageData: pageData({ acrossPreferredLang: true }) })
      component.searchRequestObject.locale = ['ta']
      expect(component.searchAcrossPreferredLang).toBe(true)
    })

    it('is false when the applied locale already matches the preference', () => {
      component = build({ pageData: pageData({ acrossPreferredLang: true }) })
      component.searchRequestObject.locale = ['en', 'hi']
      expect(component.searchAcrossPreferredLang).toBe(false)
    })
  })

  describe('navigation helpers', () => {
    it('removeDefaultFiltersApplied strips the configured filters from the URL', () => {
      component = build({ pageData: pageData({ searchQuery: { filters: { contentType: ['Course'] } } }) })
      component.searchRequestObject.filters = { contentType: ['Course'], lang: ['en'] }
      component.removeDefaultFiltersApplied()
      expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { f: JSON.stringify({ lang: ['en'] }) } }))
    })

    it('removeDefaultFiltersApplied does nothing when a default filter is absent', () => {
      component = build({ pageData: pageData({ searchQuery: { filters: { contentType: ['Course'] } } }) })
      component.searchRequestObject.filters = {}
      component.removeDefaultFiltersApplied()
      expect(router.navigate).not.toHaveBeenCalled()
    })

    it('removeDefaultFiltersApplied does nothing when a default filter was changed', () => {
      component = build({ pageData: pageData({ searchQuery: { filters: { contentType: ['Course'] } } }) })
      component.searchRequestObject.filters = { contentType: ['Resource'] }
      component.removeDefaultFiltersApplied()
      expect(router.navigate).not.toHaveBeenCalled()
    })

    it('searchWithPreferredLanguage puts the preference on the URL', () => {
      component.searchWithPreferredLanguage()
      expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { lang: 'en,hi' } }))
    })

    it('sortOrder navigates with the requested sort', async () => {
      await component.sortOrder('duration')
      expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { sort: 'duration' } }))
    })

    it('sortOrder rethrows a navigation failure', async () => {
      router.navigate.mockRejectedValue('boom')
      await expect(component.sortOrder('duration')).rejects.toBe('boom')
    })

    it('searchLanguage navigates and stops the preferred-language expansion', async () => {
      await component.searchLanguage('ta')
      expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { lang: 'ta' } }))
      expect(component.expandToPrefLang).toBe(false)
    })

    it('searchLanguage rethrows a navigation failure', async () => {
      router.navigate.mockRejectedValue('boom')
      await expect(component.searchLanguage('ta')).rejects.toBe('boom')
    })

    it('didYouMeanSearch strips the highlight markup from the suggestion', () => {
      component.didYouMeanSearch('<em>angular</em>')
      expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { q: 'angular' } }))
    })

    it('removeFilters clears the filter query param', () => {
      component.searchRequestObject.query = 'ng'
      component.removeFilters()
      expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { f: null, q: 'ng' } }))
    })

    it('removeLanguage clears the language and keeps the filters', () => {
      component.searchRequest.filters = { contentType: ['Course'] }
      component.searchRequestObject.query = 'ng'
      component.removeLanguage()
      expect(component.searchRequest.lang).toBe('')
      expect(router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { f: JSON.stringify({ contentType: ['Course'] }), q: 'ng', lang: null },
        }),
      )
    })

    it('closeFilter records the sidebar state', () => {
      component.closeFilter(false)
      expect(component.sideNavBarOpened).toBe(false)
    })
  })

  describe('getSortType', () => {
    it('maps the known sort keys', () => {
      expect(component.getSortType('lastUpdatedOn')).toEqual([{ lastUpdatedOn: 'desc' }])
      expect(component.getSortType('duration')).toEqual([{ duration: 'desc' }])
      expect(component.getSortType('size')).toEqual([{ size: 'desc' }])
    })

    it('falls back to last-updated for anything else', () => {
      expect(component.getSortType('whatever')).toEqual([{ lastUpdatedOn: 'desc' }])
    })
  })

  it('contentTrackBy keys rows by identifier', () => {
    expect(component.contentTrackBy({ identifier: 'do_1' } as any)).toBe('do_1')
  })

  it('del removes the optional property', () => {
    const thing: any = { prop: 'x' }
    component.del(thing)
    expect(thing.prop).toBeUndefined()
  })

  describe('ngOnInit', () => {
    it('publishes the search config and translated filters', async () => {
      component.ngOnInit()
      await Promise.resolve()
      expect(searchServ.searchConfig).toBe(activated.snapshot.data.pageData.data)
      expect(component.translatedFilters).toEqual({ contentType: 'Type' })
    })

    it('tracks the intranet preference', () => {
      component.ngOnInit()
      configSvc.isIntranetAllowed = false
      prefChangeNotifier.next(true)
      expect(component.isIntranetAllowedSettings).toBe(false)
    })

    it('opens the sidebar on a wide screen', () => {
      component.ngOnInit()
      expect(component.screenSizeIsLtMedium).toBe(false)
      expect(component.sideNavBarOpened).toBe(true)
    })

    it('collapses the sidebar on a narrow screen', () => {
      valueSvc.isLtMedium$ = of(true)
      component = build()
      component.ngOnInit()
      expect(component.sideNavBarOpened).toBe(false)
    })

    it('seeds the URL with the configured filters when none are applied', () => {
      component = build({ pageData: pageData({ searchQuery: { filters: { contentType: ['Course'] } } }) })
      component.ngOnInit()
      expect(router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { f: JSON.stringify({ contentType: ['Course'] }) } }),
      )
    })

    it('runs a search when the query params settle', () => {
      component.ngOnInit()
      queryParamMap$.next(params({ q: 'angular' }))
      // Single-word queries are passed through as-is; only multi-word queries get
      // wrapped in quotes for the phrase-search pass.
      expect(component.searchRequestObject.query).toBe('angular')
      expect(searchServ.getLearning).toHaveBeenCalled()
      expect(component.searchResults.totalHits).toBe(1)
    })

    it('applies the filters from the URL', () => {
      component.ngOnInit()
      queryParamMap$.next(params({ f: JSON.stringify({ contentType: ['Course'] }) }))
      expect(component.searchRequestObject.filters.contentType).toEqual(['Course'])
    })

    it('applies the locale from the URL', () => {
      component.ngOnInit()
      queryParamMap$.next(params({ lang: 'HI,EN' }))
      expect(component.searchRequestObject.locale).toEqual(['hi', 'en'])
    })

    it('sorts by last updated for a wildcard query', () => {
      component.ngOnInit()
      queryParamMap$.next(params({ q: 'all' }))
      expect(component.searchRequestObject.sort).toEqual([{ lastUpdatedOn: 'desc' }])
    })

    it('marks a query without a content-type filter as stand-alone', () => {
      component.ngOnInit()
      queryParamMap$.next(params({ q: 'angular' }))
      expect(component.searchRequestObject.isStandAlone).toBe(true)
    })

    it('restricts to public content for mobile users outside the intranet', () => {
      utilitySvc.isMobile = true
      configSvc.isIntranetAllowed = false
      component = build()
      component.ngOnInit()
      prefChangeNotifier.next(true)
      queryParamMap$.next(params())
      expect(component.searchRequestObject.filters['isInIntranet']).toEqual(['false'])
    })

    it('adopts the tab filters when the route is not the learning tab', () => {
      component = build({
        pageroute: 'knowledge',
        pageData: {
          data: {
            search: {
              tabs: [{ titleKey: 'knowledge', searchQuery: { filters: { contentType: ['Resource'] } } }],
            },
          },
        },
      })
      component.ngOnInit()
      queryParamMap$.next(params())
      expect(component.routeComp).toBe('knowledge')
      expect(component.searchRequestObject.filters.contentType).toEqual(['Resource'])
    })
  })

  describe('getResults', () => {
    it('records the returned hits and marks the request done', () => {
      component.getResults(undefined)
      expect(component.searchResults.totalHits).toBe(1)
      expect(component.searchRequestStatus).toBe('done')
      expect(searchServ.raiseSearchEvent).toHaveBeenCalled()
      expect(searchServ.raiseSearchResponseEvent).toHaveBeenCalled()
    })

    it('reports more pages while results remain', () => {
      searchServ.getLearning.mockReturnValue(of(searchResult({ totalHits: 10 })))
      component.getResults(undefined)
      expect(component.searchRequestStatus).toBe('hasMore')
      expect(component.searchRequestObject.pageNo).toBe(1)
    })

    it('flags an empty result for a single-word query', () => {
      searchServ.getLearning.mockReturnValue(of(searchResult({ totalHits: 0, result: [] })))
      component.searchRequestObject.query = 'angular'
      component.getResults(undefined)
      expect(component.noContent).toBe(true)
    })

    it('offers the exact-phrase link when a multi-word query returns hits', () => {
      component.searchRequestObject.query = 'angular forms'
      component.getResults(true)
      expect(component.exactResult.applied).toBe(true)
    })

    it('disables did-you-mean for a multi-locale search', () => {
      component.searchRequestObject.locale = ['en', 'hi']
      component.getResults(undefined)
      expect(component.searchRequestObject.didYouMean).toBe(false)
    })

    it('records a failed search', () => {
      searchServ.getLearning.mockReturnValue(throwError(() => 'boom'))
      component.getResults(undefined)
      expect(component.error.load).toBe(true)
      expect(component.error.message).toBe('boom')
      expect(component.searchRequestStatus).toBe('done')
    })

    it('drops the default filters and retries when they yield nothing', () => {
      component = build({ pageData: pageData({ searchQuery: { filters: { contentType: ['Course'] } } }) })
      component.searchRequestObject.filters = { contentType: ['Course'] }
      searchServ.getLearning.mockReturnValueOnce(of(searchResult({ totalHits: 0, result: [] }))).mockReturnValue(of(searchResult()))
      component.getResults(undefined)
      expect(router.navigate).toHaveBeenCalled()
      expect(searchServ.getLearning).toHaveBeenCalledTimes(2)
    })

    it('widens to the preferred languages when a scoped search yields nothing', () => {
      component = build({ pageData: pageData({ acrossPreferredLang: true }) })
      component.searchRequestObject.locale = ['ta']
      searchServ.getLearning.mockReturnValueOnce(of(searchResult({ totalHits: 0, result: [] }))).mockReturnValue(of(searchResult()))
      component.getResults(undefined)
      expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { lang: 'en,hi' } }))
    })

    it('retries without the phrase quotes when a phrase search yields nothing', () => {
      searchServ.getLearning.mockReturnValueOnce(of(searchResult({ totalHits: 0, result: [] }))).mockReturnValue(of(searchResult()))
      component.searchRequestObject.query = 'angular forms'
      component.getResults(undefined)
      expect(searchServ.getLearning).toHaveBeenCalledTimes(2)
      expect(component.exactResult.applied).toBe(true)
    })

    it('gives up on a quoted multi-word search that still finds nothing', () => {
      searchServ.getLearning.mockReturnValue(of(searchResult({ totalHits: 0, result: [] })))
      component.searchRequestObject.query = 'angular forms'
      component.getResults(true)
      expect(component.noContent).toBe(true)
    })

    it('gives up on a multi-word search when phrase search is disabled', () => {
      component = build({ pageData: pageData({ phraseSearch: false }) })
      searchServ.getLearning.mockReturnValue(of(searchResult({ totalHits: 0, result: [] })))
      component.searchRequestObject.query = 'angular forms'
      component.getResults(undefined)
      expect(component.noContent).toBe(true)
    })

    it('searchInsteadFor re-runs the search without did-you-mean', () => {
      component.searchResults.result = [{ identifier: 'old' } as any]
      component.searchInsteadFor()
      expect(component.searchRequestObject.didYouMean).toBe(false)
    })
  })

  describe('ngOnDestroy', () => {
    it('releases every subscription', () => {
      component.ngOnInit()
      component.getResults(undefined)
      component.ngOnDestroy()
      expect(component.searchResultsSubscription!.closed).toBe(true)
      expect(component.defaultSideNavBarOpenedSubscription!.closed).toBe(true)
      expect(component.prefChangeSubscription!.closed).toBe(true)
    })

    it('is safe when nothing was subscribed', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
