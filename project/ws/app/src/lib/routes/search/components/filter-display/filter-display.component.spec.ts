import { of } from 'rxjs'
import { FilterDisplayComponent } from './filter-display.component'

describe('FilterDisplayComponent', () => {
  let activated: any
  let router: any
  let searchServ: any
  let configSvc: any

  const queryParamMap = (params: { [k: string]: string } = {}) => ({
    has: (k: string) => k in params,
    get: (k: string) => (k in params ? params[k] : null),
  })

  const build = () => new FilterDisplayComponent(activated, router, searchServ, configSvc)

  beforeEach(() => {
    activated = {
      parent: {
        snapshot: {
          data: {
            searchPageData: {
              data: {
                search: {
                  tabs: [
                    {
                      titleKey: 'courses',
                      searchQuery: { advancedFilters: [{ displayName: 'A', filters: { k: ['v'] } }] },
                    },
                  ],
                },
              },
            },
          },
        },
      },
      queryParamMap: of(queryParamMap()),
    }
    router = { navigate: jest.fn() }
    searchServ = {
      translateSearchFilters: jest.fn().mockResolvedValue({}),
    }
    configSvc = { userPreference: { selectedLocale: 'en' } }
  })

  it('should be created', () => {
    expect(build()).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('loads advanced filters for the matching tab', () => {
      const component = build()
      component.routeComp = 'courses'
      component.ngOnInit()
      expect(component.advancedFilters).toEqual([{ displayName: 'A', filters: { k: ['v'] } }])
    })

    it('leaves advanced filters empty for a non-matching tab', () => {
      const component = build()
      component.routeComp = 'unknown'
      component.ngOnInit()
      expect(component.advancedFilters).toEqual([])
    })

    it('translates filters and stores them', async () => {
      searchServ.translateSearchFilters.mockResolvedValue({ Foo: { value: {} } })
      const component = build()
      component.ngOnInit()
      await Promise.resolve()
      expect(searchServ.translateSearchFilters).toHaveBeenCalledWith('en')
      // lowerCaseFilter mutates the object in place, adding lowercase aliases
      expect(component.translatedFilters.Foo).toEqual({ value: {} })
      expect(component.translatedFilters.foo).toBeDefined()
    })

    it('falls back to english when no locale is set', async () => {
      configSvc.userPreference = undefined
      const component = build()
      component.ngOnInit()
      await Promise.resolve()
      expect(searchServ.translateSearchFilters).toHaveBeenCalledWith('en')
    })

    it('reads filters from the f query param', () => {
      activated.queryParamMap = of(queryParamMap({ f: JSON.stringify({ topic: ['x'] }) }))
      const component = build()
      component.ngOnInit()
      expect(component.searchRequest.filters).toEqual({ topic: ['x'] })
    })

    it('resets filters when no f query param is present', () => {
      const component = build()
      component.ngOnInit()
      expect(component.searchRequest.filters).toEqual({})
    })
  })

  describe('advancedFilterClick', () => {
    it('navigates with the serialized filters', () => {
      const component = build()
      component.advancedFilterClick({ displayName: 'A', filters: { k: ['v'] } } as any)
      expect(router.navigate).toHaveBeenCalledWith([], {
        queryParams: { f: JSON.stringify({ k: ['v'] }) },
        relativeTo: activated.parent,
        queryParamsHandling: 'merge',
      })
    })
  })

  describe('trackBy helpers', () => {
    it('tracks a filter unit response by id', () => {
      expect(build().filterUnitResponseTrackBy({ id: 'r1' } as any)).toBe('r1')
    })

    it('tracks a filter unit by id', () => {
      expect(build().filterUnitTrackBy({ id: 'u1' } as any)).toBe('u1')
    })
  })

  describe('applyFilters', () => {
    it('adds a filter that is not already selected', () => {
      const component = build()
      component.searchRequest = { filters: {} }
      const addSpy = jest.spyOn(component, 'addFilter')
      component.applyFilters({ unitFilter: { type: 'pdf' } as any, filterType: 'mimeType' })
      expect(component.filtersResponse).toEqual([])
      expect(addSpy).toHaveBeenCalledWith({ key: 'mimeType', value: 'pdf' })
    })

    it('removes a filter that is already selected', () => {
      const component = build()
      component.searchRequest = { filters: { mimeType: ['pdf'] } }
      const removeSpy = jest.spyOn(component, 'removeFilter')
      component.applyFilters({ unitFilter: { type: 'pdf' } as any, filterType: 'mimeType' })
      expect(removeSpy).toHaveBeenCalledWith({ key: 'mimeType', value: 'pdf' })
    })
  })

  describe('addFilter', () => {
    it('creates a new key for the filter', () => {
      const component = build()
      component.searchRequest = { filters: {} }
      component.addFilter({ key: 'mimeType', value: 'pdf' })
      expect(router.navigate).toHaveBeenCalledWith([], {
        queryParams: { f: JSON.stringify({ mimeType: ['pdf'] }) },
        relativeTo: activated.parent,
        queryParamsHandling: 'merge',
      })
    })

    it('appends to an existing key', () => {
      const component = build()
      component.searchRequest = { filters: { mimeType: ['pdf'] } }
      component.addFilter({ key: 'mimeType', value: 'video' })
      const arg = router.navigate.mock.calls[0][1]
      expect(JSON.parse(arg.queryParams.f)).toEqual({ mimeType: ['pdf', 'video'] })
    })
  })

  describe('removeFilter', () => {
    it('removes a value and navigates', () => {
      const component = build()
      component.searchRequest = { filters: { mimeType: ['pdf', 'video'] } }
      component.removeFilter({ key: 'mimeType', value: 'pdf' })
      const arg = router.navigate.mock.calls[0][1]
      expect(JSON.parse(arg.queryParams.f)).toEqual({ mimeType: ['video'] })
    })

    it('drops a key once its last value is removed', () => {
      const component = build()
      component.searchRequest = { filters: { mimeType: ['pdf'] } }
      component.removeFilter({ key: 'mimeType', value: 'pdf' })
      const arg = router.navigate.mock.calls[0][1]
      expect(JSON.parse(arg.queryParams.f)).toEqual({})
    })
  })

  describe('removeFilters', () => {
    it('clears the f query param', () => {
      const component = build()
      component.removeFilters()
      expect(router.navigate).toHaveBeenCalledWith([], {
        queryParams: { f: null },
        queryParamsHandling: 'merge',
        relativeTo: activated.parent,
      })
    })
  })

  describe('lowerCaseFilter', () => {
    it('adds lowercase aliases for each key', () => {
      const component = build()
      const obj: any = { Foo: { value: {} } }
      component.lowerCaseFilter(obj, Object.keys(obj))
      expect(obj.foo).toBeDefined()
    })

    it('recurses into nested value objects', () => {
      const component = build()
      const obj: any = { Foo: { value: { Bar: { value: {} } } } }
      component.lowerCaseFilter(obj, Object.keys(obj))
      expect(obj.foo).toBeDefined()
      expect(obj.Foo.value.bar).toBeDefined()
    })
  })
})
