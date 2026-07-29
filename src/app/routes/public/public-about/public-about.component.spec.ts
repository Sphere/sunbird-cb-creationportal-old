import { of, Subject } from 'rxjs'

import { PublicAboutComponent } from './public-about.component'

describe('PublicAboutComponent', () => {
  let breakpointObserver: any
  let domSanitizer: any
  let configSvc: any
  let activateRoute: any
  let routeData$: Subject<any>

  const buildComponent = () => new PublicAboutComponent(breakpointObserver, domSanitizer, configSvc, activateRoute)

  beforeEach(() => {
    breakpointObserver = {
      observe: jest.fn().mockReturnValue(of({ matches: false })),
    }
    domSanitizer = {
      bypassSecurityTrustResourceUrl: jest.fn((v: string) => `safe-resource:${v}`),
      bypassSecurityTrustStyle: jest.fn((v: string) => `safe-style:${v}`),
    }
    configSvc = {
      pageNavBar: { title: 'nav' },
      instanceConfig: null,
    }
    routeData$ = new Subject<any>()
    activateRoute = { data: routeData$ }
  })

  it('should create and initialise fields from config', () => {
    const component = buildComponent()
    expect(component).toBeTruthy()
    expect(component.pageNavbar).toEqual({ title: 'nav' })
    expect(component.headerBanner).toBeNull()
    expect(component.footerBanner).toBeNull()
    expect(component.videoLink).toBeNull()
    expect(component.aboutPage).toBeNull()
    expect(component.objectKeys).toBe(Object.keys)
  })

  it('isSmallScreen$ should map breakpoint state matches value', done => {
    breakpointObserver.observe.mockReturnValue(of({ matches: true }))
    const component = buildComponent()
    component.isSmallScreen$.subscribe(matches => {
      expect(matches).toBe(true)
      done()
    })
  })

  describe('ngOnInit', () => {
    it('should set aboutPage from route data and sanitise videoLink when present', () => {
      const component = buildComponent()
      component.ngOnInit()

      const aboutPage = { banner: { videoLink: 'http://video' } }
      routeData$.next({ pageData: { data: aboutPage } })

      expect(component.aboutPage).toBe(aboutPage)
      expect(domSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('http://video')
      expect(component.videoLink).toBe('safe-resource:http://video')
    })

    it('should not sanitise videoLink when banner has no videoLink', () => {
      const component = buildComponent()
      component.ngOnInit()

      routeData$.next({ pageData: { data: { banner: { videoLink: '' } } } })

      expect(domSanitizer.bypassSecurityTrustResourceUrl).not.toHaveBeenCalled()
      expect(component.videoLink).toBeNull()
    })

    it('should handle null aboutPage data without throwing', () => {
      const component = buildComponent()
      component.ngOnInit()

      expect(() => routeData$.next({ pageData: { data: null } })).not.toThrow()
      expect(component.aboutPage).toBeNull()
    })

    it('should set header/footer banners from instanceConfig when available', () => {
      configSvc.instanceConfig = {
        logos: { aboutHeader: 'header.png', aboutFooter: 'footer.png' },
      }
      const component = buildComponent()
      component.ngOnInit()

      expect(domSanitizer.bypassSecurityTrustStyle).toHaveBeenCalledWith("url('header.png')")
      expect(domSanitizer.bypassSecurityTrustStyle).toHaveBeenCalledWith("url('footer.png')")
      expect(component.headerBanner).toBe("safe-style:url('header.png')")
      expect(component.footerBanner).toBe("safe-style:url('footer.png')")
    })
  })

  describe('ngOnDestroy', () => {
    it('should unsubscribe the route subscription', () => {
      const component = buildComponent()
      component.ngOnInit()
      const sub = (component as any).subscriptionAbout
      const spy = jest.spyOn(sub, 'unsubscribe')
      component.ngOnDestroy()
      expect(spy).toHaveBeenCalled()
    })

    it('should not throw when no subscription exists', () => {
      const component = buildComponent()
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
