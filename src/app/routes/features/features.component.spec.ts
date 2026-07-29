import { of, Subject } from 'rxjs'
import { FeaturesComponent } from './features.component'

describe('FeaturesComponent', () => {
  let component: FeaturesComponent
  let dialog: any
  let router: any
  let activateRoute: any
  let configurationSvc: any
  let tour: any
  let respondSvc: any
  let valueSvc: any
  let tourGuideNotifier$: Subject<boolean>

  const paramMap = (params: Record<string, string>) => ({
    get: (key: string) => (key in params ? params[key] : null),
  })

  const feature = (over: any = {}) => ({
    name: 'create course',
    keywords: ['author', 'content'],
    description: 'author a course',
    ...over,
  })

  const appsConfig = (over: any = {}) => ({
    tourGuide: null,
    groups: [{ hasRole: [], featureIds: ['f1', 'f2'] }],
    features: {
      f1: feature({ name: 'create course', keywords: ['author'], description: 'make a course' }),
      f2: feature({ name: 'reports', keywords: ['analytics'], description: 'view reports' }),
    },
    ...over,
  })

  const build = () => new FeaturesComponent(dialog, router, activateRoute, configurationSvc, tour, respondSvc, valueSvc)

  beforeEach(() => {
    jest.useFakeTimers()
    tourGuideNotifier$ = new Subject<boolean>()

    dialog = { open: jest.fn() }
    router = { navigate: jest.fn() }
    activateRoute = { snapshot: { queryParamMap: paramMap({}) } }
    configurationSvc = {
      appsConfig: appsConfig(),
      tourGuideNotifier: tourGuideNotifier$,
      restrictedFeatures: new Set<string>(),
      pageNavBar: { color: 'orange' },
    }
    tour = { data: null, startTour: jest.fn() }
    respondSvc = { unsubscribeResponse: jest.fn() }
    valueSvc = { isXSmall$: of(false) }

    component = build()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('is created and tracks the small-screen flag', () => {
    expect(component).toBeTruthy()
    expect(component.isXSmall).toBe(false)
    expect(component.pageNavbar).toEqual({ color: 'orange' })
  })

  it('reflects a small screen from the value service', () => {
    valueSvc.isXSmall$ = of(true)

    expect(build().isXSmall).toBe(true)
  })

  it('primes the tour guide when configured', () => {
    const notifier = { next: jest.fn() }
    configurationSvc.tourGuideNotifier = notifier
    configurationSvc.appsConfig = appsConfig({ tourGuide: { steps: [] } })

    const c = build()

    expect(notifier.next).toHaveBeenCalledWith(true)
    expect(tour.data).toEqual({ steps: [] })
    expect(c).toBeTruthy()
  })

  it('builds a feature widget for every feature id', () => {
    component.ngOnInit()
    jest.advanceTimersByTime(500)

    expect(component.featureGroups).toBeTruthy()
    expect(component.featureGroups!).toHaveLength(1)
    expect(component.featureGroups![0].featureWidgets).toHaveLength(2)
  })

  describe('ngOnInit', () => {
    it('navigates and filters when the query changes', () => {
      component.ngOnInit()

      component.queryControl.setValue('reports')
      jest.advanceTimersByTime(500)

      expect(router.navigate).toHaveBeenCalledWith([], { queryParams: { q: 'reports' } })
      expect(component.featureGroups!).toHaveLength(1)
      expect(component.featureGroups![0].featureWidgets).toHaveLength(1)
    })

    it('clears the query param when the query is emptied', () => {
      component.ngOnInit()

      component.queryControl.setValue('')
      jest.advanceTimersByTime(500)

      expect(router.navigate).toHaveBeenCalledWith([], { queryParams: { q: null } })
    })

    it('shows the tour guide when not restricted', () => {
      component.ngOnInit()

      tourGuideNotifier$.next(true)

      expect(component.isTourGuideAvailable).toBe(true)
    })

    it('keeps the tour guide hidden when the feature is restricted', () => {
      configurationSvc.restrictedFeatures = new Set<string>(['tourGuide'])
      const c = build()

      c.ngOnInit()
      tourGuideNotifier$.next(true)

      expect(c.isTourGuideAvailable).toBe(false)
    })
  })

  describe('filtering', () => {
    it('returns every group with no query', () => {
      component.ngOnInit()

      const result = (component as any).filteredFeatures('')

      expect(result[0].featureWidgets).toHaveLength(2)
    })

    it('filters features by name, keyword or description', () => {
      component.ngOnInit()

      const byName = (component as any).filteredFeatures('course')
      expect(byName[0].featureWidgets).toHaveLength(1)

      const byKeyword = (component as any).filteredFeatures('analytics')
      expect(byKeyword[0].featureWidgets).toHaveLength(1)

      const noMatch = (component as any).filteredFeatures('zzz')
      expect(noMatch).toHaveLength(0)
    })
  })

  describe('queryMatchForFeature', () => {
    it('matches on name', () => {
      expect((component as any).queryMatchForFeature(feature({ name: 'hello world' }), 'world')).toBe(true)
    })

    it('matches on a keyword', () => {
      expect((component as any).queryMatchForFeature(feature({ keywords: ['abc'] }), 'abc')).toBe(true)
    })

    it('returns false without a feature', () => {
      expect((component as any).queryMatchForFeature(undefined, 'x')).toBe(false)
    })
  })

  describe('clear', () => {
    it('resets the query control', () => {
      component.queryControl.setValue('something')

      component.clear()

      expect(component.queryControl.value).toBe('')
    })
  })

  describe('logout', () => {
    it('opens the logout dialog', () => {
      component.logout()

      expect(dialog.open).toHaveBeenCalled()
    })
  })

  describe('startTour', () => {
    it('starts the tour', () => {
      component.startTour()

      expect(tour.startTour).toHaveBeenCalled()
    })

    it('unsubscribes an existing response subscription', () => {
      const unsubscribe = jest.fn()
      ;(component as any).responseSubscription = { unsubscribe }

      component.startTour()

      expect(respondSvc.unsubscribeResponse).toHaveBeenCalled()
      expect(unsubscribe).toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes and notifies the tour guide off', () => {
      const next = jest.fn()
      configurationSvc.tourGuideNotifier = { next, subscribe: jest.fn() }
      const c = build()
      c.ngOnInit()
      const unsubscribe = jest.fn()
      ;(c as any).queryChangeSubs = { unsubscribe }

      c.ngOnDestroy()

      expect(unsubscribe).toHaveBeenCalled()
      expect(next).toHaveBeenCalledWith(false)
    })
  })
})
