import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart } from '@angular/router'
import { of, Subject } from 'rxjs'
import { RootComponent } from './root.component'

describe('RootComponent', () => {
  let component: RootComponent
  let router: any
  let routerEvents$: Subject<any>
  let showNavbar$: Subject<boolean>
  let authSvc: any
  let configSvc: any
  let valueSvc: any
  let telemetrySvc: any
  let mobileAppsSvc: any
  let rootSvc: any
  let btnBackSvc: any
  let changeDetector: any

  const build = () =>
    new RootComponent(router, authSvc, configSvc, valueSvc, telemetrySvc, mobileAppsSvc, rootSvc, btnBackSvc, changeDetector)

  beforeEach(() => {
    routerEvents$ = new Subject<any>()
    showNavbar$ = new Subject<boolean>()
    router = { events: routerEvents$ }
    authSvc = { isAuthenticated: false }
    configSvc = {}
    valueSvc = { isXSmall$: of(false) }
    telemetrySvc = {
      impression: jest.fn(),
      audit: jest.fn(),
      start: jest.fn(),
    }
    mobileAppsSvc = { init: jest.fn() }
    rootSvc = { showNavbarDisplay$: showNavbar$ }
    btnBackSvc = { initialize: jest.fn() }
    changeDetector = { detectChanges: jest.fn() }

    component = build()
  })

  describe('construction', () => {
    it('creates and initialises the mobile apps service', () => {
      expect(component).toBeTruthy()
      expect(mobileAppsSvc.init).toHaveBeenCalled()
      expect(component.isXSmall$).toBe(valueSvc.isXSmall$)
    })
  })

  describe('ngOnInit', () => {
    it('detects when running inside an iframe', () => {
      const spy = jest.spyOn(window, 'self', 'get').mockReturnValue({} as any)
      component.ngOnInit()

      expect(component.isInIframe).toBe(true)
      expect(btnBackSvc.initialize).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('falls back to not-in-iframe when the window access throws', () => {
      const spy = jest.spyOn(window, 'self', 'get').mockImplementation(() => {
        throw new Error('blocked')
      })
      component.ngOnInit()

      expect(component.isInIframe).toBe(false)
      spy.mockRestore()
    })

    it('flags the setup page on a matching NavigationEnd', () => {
      component.ngOnInit()

      routerEvents$.next(new NavigationEnd(1, '/setup/step', '/setup/step'))

      expect(component.isSetupPage).toBe(true)
    })

    it('hides the nav bar on preview or embed routes', () => {
      component.ngOnInit()

      routerEvents$.next(new NavigationStart(1, '/preview/abc'))
      expect(component.isNavBarRequired).toBe(false)
      expect(component.routeChangeInProgress).toBe(true)

      routerEvents$.next(new NavigationStart(1, '/embed/abc'))
      expect(component.isNavBarRequired).toBe(false)
    })

    it('hides the nav bar on author routes inside an iframe', () => {
      component.ngOnInit()
      component.isInIframe = true

      routerEvents$.next(new NavigationStart(1, '/author/create'))

      expect(component.isNavBarRequired).toBe(false)
    })

    it('shows the nav bar on a normal route', () => {
      component.ngOnInit()
      component.isInIframe = false

      routerEvents$.next(new NavigationStart(1, '/app/home'))

      expect(component.isNavBarRequired).toBe(true)
      expect(component.routeChangeInProgress).toBe(true)
    })

    it('ends the route change and records impression on NavigationEnd', () => {
      component.ngOnInit()

      routerEvents$.next(new NavigationEnd(1, '/app/home', '/app/home'))

      expect(component.routeChangeInProgress).toBe(false)
      expect(component.currentUrl).toBe('/app/home')
      expect(telemetrySvc.impression).toHaveBeenCalled()
    })

    it('raises the login audit only once when app start was raised', () => {
      component.ngOnInit()
      component.appStartRaised = true

      routerEvents$.next(new NavigationEnd(1, '/app/home', '/app/home'))

      expect(telemetrySvc.audit).toHaveBeenCalledTimes(1)
      expect(component.appStartRaised).toBe(false)
    })

    it('ends the route change on NavigationCancel', () => {
      component.ngOnInit()
      component.routeChangeInProgress = true

      routerEvents$.next(new NavigationCancel(1, '/x', 'why'))

      expect(component.routeChangeInProgress).toBe(false)
      expect(component.currentUrl).toBe('/x')
    })

    it('ends the route change on NavigationError', () => {
      component.ngOnInit()
      component.routeChangeInProgress = true

      routerEvents$.next(new NavigationError(1, '/y', new Error('boom')))

      expect(component.routeChangeInProgress).toBe(false)
      expect(component.currentUrl).toBe('/y')
    })

    it('reflects the nav bar display stream', () => {
      component.ngOnInit()

      showNavbar$.next(true)
      expect(component.showNavbar).toBe(true)

      showNavbar$.next(false)
      expect(component.showNavbar).toBe(false)
    })
  })

  describe('ngAfterViewInit', () => {
    it('does not throw', () => {
      expect(() => component.ngAfterViewInit()).not.toThrow()
    })
  })
})
