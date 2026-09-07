import { of, Subject } from 'rxjs'
import { LoginComponent } from './login.component'

describe('LoginComponent', () => {
  let component: LoginComponent
  let activateRoute: any
  let authSvc: any
  let configSvc: any
  let domSanitizer: any
  let data$: Subject<any>

  const instanceConfig = {
    logos: {
      appTransparent: 'app-transparent.png',
      company: 'company-logo.png',
      developedBy: 'Tarento',
    },
  }

  const pageData = {
    pageData: {
      data: {
        isClient: true,
        footer: {
          descriptiveFooter: { welcome: 'hello' },
          contactUs: true,
        },
        topbar: {
          title: 'Login Title',
          subTitle: 'Login SubTitle',
        },
      },
    },
  }

  const buildRoute = (config: any = pageData, params: any = {}) => {
    data$ = new Subject<any>()
    return {
      data: data$,
      snapshot: {
        queryParamMap: {
          has: (k: string) => k in params,
          get: (k: string) => params[k],
        },
      },
      _pageData: config,
    }
  }

  const build = () => new LoginComponent(activateRoute, authSvc, configSvc, domSanitizer)

  beforeEach(() => {
    activateRoute = buildRoute()
    authSvc = { login: jest.fn() }
    configSvc = { instanceConfig }
    domSanitizer = {
      bypassSecurityTrustResourceUrl: jest.fn((u: string) => `safe:${u}`),
    }
  })

  it('should create', () => {
    component = build()
    expect(component).toBeTruthy()
  })

  it('should set logos from instanceConfig in constructor', () => {
    component = build()
    expect(domSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('app-transparent.png')
    expect(component.appIcon).toBe('safe:app-transparent.png')
    expect(component.productLogo).toBe('company-logo.png')
    expect(component.developedBy).toBe('Tarento')
  })

  it('should not set logos when instanceConfig is absent', () => {
    configSvc = { instanceConfig: null }
    component = build()
    expect(component.appIcon).toBeNull()
    expect(component.productLogo).toBe('')
    expect(component.developedBy).toBe('')
  })

  it('ngOnInit should populate fields from route data', () => {
    component = build()
    component.ngOnInit()
    data$.next(pageData)
    expect(component.loginConfig).toBe(pageData.pageData.data)
    expect(component.isClientLogin).toBe(true)
    expect(component.welcomeFooter).toEqual({ welcome: 'hello' })
    expect(component.title).toBe('Login Title')
    expect(component.subTitle).toBe('Login SubTitle')
    expect(component.contactUs).toBe(true)
  })

  it('ngOnInit should set redirectUrl from ref query param', () => {
    activateRoute = buildRoute(pageData, { ref: 'somePage' })
    component = build()
    component.ngOnInit()
    component.login('E')
    expect(authSvc.login).toHaveBeenCalledWith('E', document.baseURI + 'somePage')
  })

  it('ngOnInit should default redirectUrl to baseURI when no ref', () => {
    component = build()
    component.ngOnInit()
    component.login('N')
    expect(authSvc.login).toHaveBeenCalledWith('N', document.baseURI)
  })

  it('login should delegate to authSvc.login', () => {
    component = build()
    component.login('S')
    expect(authSvc.login).toHaveBeenCalledWith('S', '')
  })

  it('ngOnDestroy should unsubscribe active subscription', () => {
    component = build()
    component.ngOnInit()
    const sub = (component as any).subscriptionLogin
    const spy = jest.spyOn(sub, 'unsubscribe')
    component.ngOnDestroy()
    expect(spy).toHaveBeenCalled()
  })

  it('ngOnDestroy should be safe when no subscription exists', () => {
    component = build()
    expect(() => component.ngOnDestroy()).not.toThrow()
  })
})
