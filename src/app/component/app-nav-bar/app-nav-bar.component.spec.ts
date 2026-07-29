import { NavigationEnd, NavigationStart } from '@angular/router'
import { Subject } from 'rxjs'
import { AppNavBarComponent } from './app-nav-bar.component'

describe('AppNavBarComponent', () => {
  let component: AppNavBarComponent
  let domSanitizer: any
  let configSvc: any
  let tourService: any
  let router: any
  let routerEvents$: Subject<any>
  let tourGuide$: Subject<boolean>
  let isTourComplete$: Subject<boolean>

  const build = () => new AppNavBarComponent(domSanitizer, configSvc, tourService, router)

  const navigateTo = (url: string) => routerEvents$.next(new NavigationEnd(1, url, url))

  beforeEach(() => {
    jest.useFakeTimers()
    routerEvents$ = new Subject<any>()
    tourGuide$ = new Subject<boolean>()
    isTourComplete$ = new Subject<boolean>()

    domSanitizer = { bypassSecurityTrustResourceUrl: jest.fn((u: string) => `safe:${u}`) }
    configSvc = {
      restrictedFeatures: new Set<string>(),
      instanceConfig: {
        logos: { app: 'app.svg', appBottomNav: 'bottom.svg' },
        showNavBarInSetup: false,
      },
      rootOrg: 'acme',
      primaryNavBar: { color: 'primary' },
      pageNavBar: { color: 'page' },
      primaryNavBarConfig: { items: [] },
      appsConfig: { features: { search: {}, profile: {} } },
      tourGuideNotifier: tourGuide$,
      prefChangeNotifier: { next: jest.fn() },
      completedTour: false,
    }
    tourService = {
      createPopupTour: jest.fn().mockReturnValue({ id: 'popup' }),
      startTour: jest.fn(),
      startPopupTour: jest.fn(),
      cancelPopupTour: jest.fn(),
      isTourComplete: isTourComplete$,
    }
    router = { events: routerEvents$ }

    component = build()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('construction', () => {
    it('starts from the basic apps button config', () => {
      expect(component.btnAppsConfig).toEqual(component.basicBtnAppsConfig)
      expect(component.mode).toBe('top')
      expect(component.showAppNavBar).toBe(false)
    })

    it('honours a restricted help menu', () => {
      configSvc.restrictedFeatures = new Set(['helpNavBarMenu'])

      expect(build().isHelpMenuRestricted).toBe(true)
    })

    it('leaves the help menu available when nothing is restricted', () => {
      expect(component.isHelpMenuRestricted).toBe(false)
    })

    it('copes with an instance that restricts nothing at all', () => {
      configSvc.restrictedFeatures = null

      expect(() => build()).not.toThrow()
    })

    it.each([
      ['start', () => new NavigationStart(1, '/app/home')],
      ['end', () => new NavigationEnd(1, '/app/home', '/app/home')],
    ])('cancels a running popup tour on navigation %s', (_label, makeEvent) => {
      component.ngOnInit()
      tourGuide$.next(true)

      routerEvents$.next(makeEvent())

      expect(tourService.cancelPopupTour).toHaveBeenCalled()
      expect(component.isTourGuideClosed).toBe(false)
    })

    it('ignores navigation events when no popup tour is running', () => {
      routerEvents$.next(new NavigationStart(1, '/app/home'))

      expect(tourService.cancelPopupTour).not.toHaveBeenCalled()
    })
  })

  describe('ngOnInit', () => {
    it('trusts the instance logos and takes the nav configuration', () => {
      component.ngOnInit()

      expect(component.appIcon).toBe('safe:app.svg')
      expect(component.appBottomIcon).toBe('safe:bottom.svg')
      expect(component.instanceVal).toBe('acme')
      expect(component.primaryNavbarBackground).toEqual({ color: 'primary' })
      expect(component.pageNavbar).toEqual({ color: 'page' })
      expect(component.primaryNavbarConfig).toEqual({ items: [] })
    })

    it('skips the bottom logo when the instance has none', () => {
      configSvc.instanceConfig.logos.appBottomNav = ''
      const c = build()

      c.ngOnInit()

      expect(c.appBottomIcon).toBeUndefined()
    })

    it('falls back to an empty org name', () => {
      configSvc.rootOrg = null
      const c = build()

      c.ngOnInit()

      expect(c.instanceVal).toBe('')
    })

    it('skips the instance lookups without an instance config', () => {
      configSvc.instanceConfig = null
      const c = build()

      c.ngOnInit()

      expect(c.appIcon).toBeNull()
      expect(c.primaryNavbarBackground).toBeNull()
    })

    it('lists the configured feature apps', () => {
      component.ngOnInit()

      expect(component.featureApps).toEqual(['search', 'profile'])
    })

    it('lists no feature apps without an apps config', () => {
      configSvc.appsConfig = null
      const c = build()

      c.ngOnInit()

      expect(c.featureApps).toEqual([])
    })

    it('hides the nav bar on the setup page when the instance says so', () => {
      component.ngOnInit()

      navigateTo('/app/setup')

      expect(component.showAppNavBar).toBe(false)
    })

    it('shows the nav bar on the setup page when the instance allows it', () => {
      configSvc.instanceConfig.showNavBarInSetup = true
      const c = build()
      c.ngOnInit()

      navigateTo('/app/setup')

      expect(c.showAppNavBar).toBe(true)
    })

    it('shows the nav bar on any other page', () => {
      component.ngOnInit()

      navigateTo('/app/home')

      expect(component.showAppNavBar).toBe(true)
    })

    it('shows the stepper on the create page only', () => {
      component.ngOnInit()

      navigateTo('/author/create')
      expect(component.showStepper).toBe(true)

      navigateTo('/app/home')
      expect(component.showStepper).toBe(false)
    })

    it('ignores navigation events other than the end of a navigation', () => {
      component.ngOnInit()

      routerEvents$.next(new NavigationStart(1, '/author/create'))

      expect(component.showAppNavBar).toBe(false)
      expect(component.showStepper).toBe(false)
    })

    it('arms the tour guide when it is not restricted', () => {
      component.ngOnInit()

      tourGuide$.next(true)

      expect(component.isTourGuideAvailable).toBe(true)
      expect(component.popupTour).toEqual({ id: 'popup' })
    })

    it('leaves the tour guide alone when it is restricted', () => {
      configSvc.restrictedFeatures = new Set(['tourGuide'])
      const c = build()
      c.ngOnInit()

      tourGuide$.next(true)

      expect(c.isTourGuideAvailable).toBe(false)
      expect(tourService.createPopupTour).not.toHaveBeenCalled()
    })
  })

  describe('ngOnChanges', () => {
    it('shows the app titles in the bottom bar', () => {
      component.mode = 'bottom'

      component.ngOnChanges({ mode: {} as any })

      expect(component.btnAppsConfig.widgetData.showTitle).toBe(true)
    })

    it('hides the app titles in the top bar', () => {
      component.mode = 'bottom'
      component.ngOnChanges({ mode: {} as any })

      component.mode = 'top'
      component.ngOnChanges({ mode: {} as any })

      expect(component.btnAppsConfig.widgetData.showTitle).toBeUndefined()
    })

    it('ignores changes to any other input', () => {
      component.mode = 'bottom'

      component.ngOnChanges({ other: {} as any })

      expect(component.btnAppsConfig).toEqual(component.basicBtnAppsConfig)
    })
  })

  describe('startTour', () => {
    it('runs the tour and celebrates once it completes', () => {
      component.startTour()

      expect(tourService.startTour).toHaveBeenCalled()

      isTourComplete$.next(true)

      expect(tourService.startPopupTour).toHaveBeenCalled()
      expect(configSvc.completedTour).toBe(true)
      expect(configSvc.prefChangeNotifier.next).toHaveBeenCalledWith({ completedTour: true })

      jest.advanceTimersByTime(3000)
      expect(tourService.cancelPopupTour).toHaveBeenCalled()
    })

    it('does nothing further while the tour is unfinished', () => {
      component.startTour()

      isTourComplete$.next(false)

      expect(tourService.startPopupTour).not.toHaveBeenCalled()
      expect(configSvc.completedTour).toBe(false)
    })
  })

  describe('cancelTour', () => {
    it('cancels a running popup tour', () => {
      component.popupTour = { id: 'popup' }
      component.isTourGuideClosed = true

      component.cancelTour()

      expect(tourService.cancelPopupTour).toHaveBeenCalled()
      expect(component.isTourGuideClosed).toBe(false)
    })

    it('does nothing when no popup tour is running', () => {
      component.cancelTour()

      expect(tourService.cancelPopupTour).not.toHaveBeenCalled()
    })
  })
})
