import { LoginGuard } from './login.guard'

describe('LoginGuard', () => {
  let router: { parseUrl: jest.Mock }
  let configSvc: any
  let guard: LoginGuard

  /** Builds an ActivatedRouteSnapshot stub whose queryParamMap holds `params`. */
  const snapshot = (params: Record<string, string> = {}) =>
    ({
      queryParamMap: {
        has: (k: string) => Object.prototype.hasOwnProperty.call(params, k),
        get: (k: string) => (Object.prototype.hasOwnProperty.call(params, k) ? params[k] : null),
      },
    }) as any

  beforeEach(() => {
    router = { parseUrl: jest.fn().mockImplementation((url: string) => ({ url })) }
    configSvc = {
      isAuthenticated: false,
      instanceConfig: { keycloak: { isLoginHidden: false } },
    }
    guard = new LoginGuard(router as any, configSvc)
  })

  it('should be created', () => {
    expect(guard).toBeTruthy()
  })

  it('allows the login route for an unauthenticated user when login is visible', () => {
    expect(guard.canActivate(snapshot(), {} as any)).toBe(true)
  })

  it('blocks the login route when login is hidden for the instance', () => {
    configSvc.instanceConfig.keycloak.isLoginHidden = true
    expect(guard.canActivate(snapshot(), {} as any)).toBe(false)
  })

  it('allows the login route when instanceConfig is absent', () => {
    configSvc.instanceConfig = null
    expect(guard.canActivate(snapshot(), {} as any)).toBe(true)
  })

  it('redirects an authenticated user to the decoded ref target', () => {
    configSvc.isAuthenticated = true
    guard.canActivate(snapshot({ ref: encodeURIComponent('/author/my-content') }), {} as any)
    expect(router.parseUrl).toHaveBeenCalledWith('/author/my-content')
  })

  it('redirects an authenticated user to my-content when no ref is supplied', () => {
    configSvc.isAuthenticated = true
    guard.canActivate(snapshot(), {} as any)
    expect(router.parseUrl).toHaveBeenCalledWith('author/my-content?status=publish')
  })
})
