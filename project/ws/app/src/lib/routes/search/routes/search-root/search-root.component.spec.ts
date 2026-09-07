import { Subject } from 'rxjs'
import { UrlSegment } from '@angular/router'
import { SearchRootComponent } from './search-root.component'

describe('SearchRootComponent', () => {
  let component: SearchRootComponent
  let router: any
  let activated: any
  let configSvc: any
  let queryParamMap$: Subject<any>

  const searchConfig = {
    tabs: [{ name: 'Learning' }, { name: 'People' }],
    routeValue: ['learning', 'people'],
    placeHolder: {},
    social: {},
  }

  const makeQueryParamMap = (params: { [k: string]: string }) => ({
    has: (key: string) => key in params,
    get: (key: string) => params[key] ?? null,
  })

  const makeUrlTree = (paths: string[]) => ({
    root: {
      children: {
        primary: {
          segments: paths.map(p => new UrlSegment(p, {})),
        },
      },
    },
  })

  const build = () => new SearchRootComponent(router, activated, configSvc)

  beforeEach(() => {
    queryParamMap$ = new Subject<any>()
    router = {
      url: '/app/search/people',
      parseUrl: jest.fn(() => makeUrlTree(['app', 'search', 'people'])),
      navigateByUrl: jest.fn(),
    }
    activated = {
      snapshot: { data: { searchPageData: { data: { search: searchConfig } } } },
      queryParamMap: queryParamMap$,
    }
    configSvc = { pageNavBar: { background: 'blue' } }
    component = build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  it('reads the page nav bar from the config service', () => {
    expect(component.pageNavbar).toEqual({ background: 'blue' })
  })

  describe('ngOnInit', () => {
    it('loads searchTabs from resolver data', () => {
      component.ngOnInit()
      expect(component.searchTabs).toEqual(searchConfig)
    })

    it('leaves default searchTabs when resolver has no search data', () => {
      activated.snapshot.data.searchPageData.data.search = undefined
      const c = build()
      c.ngOnInit()
      expect(c.searchTabs.tabs).toEqual([])
    })

    it('updates query, route and selected index from query params', () => {
      component.ngOnInit()
      queryParamMap$.next(makeQueryParamMap({ q: 'angular' }))
      expect(component.searchRequest.query).toBe('angular')
      expect(component.route).toBe('people')
      expect(component.selectedIndex).toBe(1)
    })

    it('does not overwrite the query when q is absent', () => {
      component.ngOnInit()
      component.searchRequest.query = 'existing'
      queryParamMap$.next(makeQueryParamMap({}))
      expect(component.searchRequest.query).toBe('existing')
    })

    it('sets selectedIndex to -1 when the route is not a known tab', () => {
      router.parseUrl = jest.fn(() => makeUrlTree(['app', 'search', 'unknown']))
      component.ngOnInit()
      queryParamMap$.next(makeQueryParamMap({}))
      expect(component.route).toBe('unknown')
      expect(component.selectedIndex).toBe(-1)
    })
  })

  describe('routeTabs', () => {
    it('sets the selected index and navigates to the tab route', () => {
      component.ngOnInit()
      component.routeTabs(1)
      expect(component.selectedIndex).toBe(1)
      expect(router.navigateByUrl).toHaveBeenCalledWith('/app/search/people')
    })
  })

  describe('hasKeys', () => {
    it('returns true for a non-empty object', () => {
      expect(component.hasKeys({ a: 1 })).toBe(true)
    })

    it('returns false for an empty object', () => {
      expect(component.hasKeys({})).toBe(false)
    })

    it('returns false for a null value', () => {
      expect(component.hasKeys(null as any)).toBe(false)
    })
  })
})
