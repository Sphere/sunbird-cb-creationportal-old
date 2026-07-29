import { of, Subject } from 'rxjs'

import { MobileAppHomeComponent } from './mobile-app-home.component'

/**
 * Direct-instantiation unit tests for MobileAppHomeComponent.
 * Constructed with mocked sanitizer / route / platform / mobileService / config
 * collaborators; exercises the ngOnInit route-data branches and ngOnDestroy.
 */
describe('MobileAppHomeComponent', () => {
  let sanitizer: any
  let route: any
  let matPlatform: any
  let mobileService: any
  let configSvc: any
  let dataSubject: Subject<any>

  function build(platformIos = false): MobileAppHomeComponent {
    dataSubject = new Subject<any>()
    sanitizer = {
      bypassSecurityTrustUrl: jest.fn((url: string) => `safe:${url}`),
    }
    route = { data: dataSubject.asObservable() }
    matPlatform = { IOS: platformIos }
    mobileService = { iOsAppRef: null, isAndroidApp: false }
    configSvc = { pageNavBar: { color: 'blue' } }
    return new MobileAppHomeComponent(sanitizer, route, matPlatform, mobileService, configSvc)
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('constructs and reads default field initializers from collaborators', () => {
    const c = build(false)
    expect(c).toBeTruthy()
    expect(c.selectedTabIndex).toBe(0)
    expect(c.pageNavbar).toEqual({ color: 'blue' })
    expect(c.isAndriod).toBe(true)
    expect(c.isIos).toBe(true)
  })

  it('selectedTabIndex is 1 when the platform is iOS', () => {
    const c = build(true)
    expect(c.selectedTabIndex).toBe(1)
  })

  it('ngOnInit flips isAndriod off when there is an iOS app ref', () => {
    const c = build()
    mobileService.iOsAppRef = {}
    c.ngOnInit()
    expect(c.isAndriod).toBe(false)
  })

  it('ngOnInit flips isIos off when running inside an Android app', () => {
    const c = build()
    mobileService.isAndroidApp = true
    c.ngOnInit()
    expect(c.isIos).toBe(false)
  })

  it('ngOnInit maps route pageData into mobileLinks and sanitizes the iOS url', () => {
    const c = build()
    c.ngOnInit()
    dataSubject.next({
      pageData: {
        data: {
          appsAndroid: 'android-url',
          appsIos: 'ios-url',
          isClient: true,
          code: 'CODE1',
          showQrCode: false,
        },
      },
    })
    expect(c.isClient).toBe(true)
    expect(c.mobilePlatformCode).toBe('CODE1')
    expect(sanitizer.bypassSecurityTrustUrl).toHaveBeenCalledWith('ios-url')
    expect(c.mobileLinks!.appsIosSanitized).toBe('safe:ios-url')
    expect(c.isAndroidPlayStoreLink).toBe(false)
  })

  it('ngOnInit sets isAndroidPlayStoreLink when showQrCode is true', () => {
    const c = build()
    c.ngOnInit()
    dataSubject.next({
      pageData: {
        data: {
          appsAndroid: 'a',
          appsIos: 'i',
          showQrCode: true,
        },
      },
    })
    expect(c.isAndroidPlayStoreLink).toBe(true)
  })

  it('ngOnInit defaults isClient to false when the flag is absent', () => {
    const c = build()
    c.ngOnInit()
    dataSubject.next({ pageData: { data: { appsAndroid: 'a', appsIos: 'i' } } })
    expect(c.isClient).toBe(false)
  })

  it('ngOnInit tolerates a null mobileLinks payload', () => {
    const c = build()
    c.ngOnInit()
    dataSubject.next({ pageData: { data: null } })
    expect(c.mobileLinks).toBeNull()
    expect(c.isAndroidPlayStoreLink).toBe(false)
  })

  it('ngOnInit stores the route subscription', () => {
    const c = build()
    c.ngOnInit()
    expect(c.routeSubscription).not.toBeNull()
  })

  it('ngOnDestroy unsubscribes from the route subscription', () => {
    const c = build()
    const unsubscribe = jest.fn()
    c.routeSubscription = { unsubscribe } as any
    c.ngOnDestroy()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('ngOnDestroy is a no-op when there is no subscription', () => {
    const c = build()
    c.routeSubscription = null
    expect(() => c.ngOnDestroy()).not.toThrow()
  })

  it('ngOnInit does not subscribe when the route is falsy', () => {
    const c = build()
    ;(c as any).route = null
    c.ngOnInit()
    expect(c.routeSubscription).toBeNull()
  })

  // referenced to keep the imports meaningful under strict lint
  it('supports observable route data via of()', () => {
    const c = build()
    ;(c as any).route = { data: of({ pageData: { data: { appsAndroid: 'a', appsIos: 'i', showQrCode: true } } }) }
    c.ngOnInit()
    expect(c.isAndroidPlayStoreLink).toBe(true)
  })
})
