import { EmptyRouteGuard } from './empty-route.guard'

describe('EmptyRouteGuard', () => {
  let router: { parseUrl: jest.Mock }
  let configSvc: any
  let guard: EmptyRouteGuard

  beforeEach(() => {
    router = { parseUrl: jest.fn().mockImplementation((url: string) => ({ url })) }
    configSvc = { userProfile: null }
    guard = new EmptyRouteGuard(router as any, configSvc)
  })

  it('should be created', () => {
    expect(guard).toBeTruthy()
  })

  it('redirects a logged-in user to the authoring home page', () => {
    configSvc.userProfile = { userId: 'u1' }
    const result = guard.canActivate({} as any, {} as any)
    expect(router.parseUrl).toHaveBeenCalledWith('/author/cbp')
    expect(result).toEqual({ url: '/author/cbp' })
  })

  it('returns false when there is no user profile', () => {
    expect(guard.canActivate({} as any, {} as any)).toBe(false)
    expect(router.parseUrl).not.toHaveBeenCalled()
  })

  it('returns false when the profile carries no userId', () => {
    configSvc.userProfile = {}
    expect(guard.canActivate({} as any, {} as any)).toBe(false)
    expect(router.parseUrl).not.toHaveBeenCalled()
  })
})
