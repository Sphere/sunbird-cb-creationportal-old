import { GeneralGuard } from './general.guard'

describe('GeneralGuard', () => {
  let router: { parseUrl: jest.Mock; navigateByUrl: jest.Mock }
  let configSvc: any
  let guard: GeneralGuard

  const snapshot = (data?: any) => ({ data }) as any

  beforeEach(() => {
    router = {
      parseUrl: jest.fn().mockImplementation((url: string) => ({ url })),
      navigateByUrl: jest.fn().mockResolvedValue(true),
    }
    configSvc = {
      userProfile: { userId: 'u1' },
      instanceConfig: { disablePidCheck: true },
      hasAcceptedTnc: true,
      userRoles: new Set<string>(),
      restrictedFeatures: new Set<string>(),
    }
    guard = new GeneralGuard(router as any, configSvc)
  })

  it('should be created', () => {
    expect(guard).toBeTruthy()
  })

  it('allows navigation when no roles or features are required', async () => {
    await expect(guard.canActivate(snapshot())).resolves.toBe(true)
    expect(router.parseUrl).not.toHaveBeenCalled()
  })

  it('tolerates a snapshot with no data object', async () => {
    await expect(guard.canActivate({} as any)).resolves.toBe(true)
  })

  it('redirects to invalid-user when profile is null and pid check is enabled', async () => {
    configSvc.userProfile = null
    configSvc.instanceConfig = { disablePidCheck: false }
    await guard.canActivate(snapshot())
    expect(router.parseUrl).toHaveBeenCalledWith('/app/invalid-user')
  })

  it('does not redirect to invalid-user when pid check is disabled', async () => {
    configSvc.userProfile = null
    configSvc.instanceConfig = { disablePidCheck: true }
    await expect(guard.canActivate(snapshot())).resolves.toBe(true)
  })

  it('does not redirect to invalid-user when instanceConfig is absent', async () => {
    configSvc.userProfile = null
    configSvc.instanceConfig = null
    await expect(guard.canActivate(snapshot())).resolves.toBe(true)
  })

  it('allows access when the user holds one of the required roles', async () => {
    configSvc.userRoles = new Set(['CONTENT_CREATOR'])
    await expect(guard.canActivate(snapshot({ requiredRoles: ['CONTENT_CREATOR'] }))).resolves.toBe(true)
    expect(router.navigateByUrl).not.toHaveBeenCalled()
  })

  it('redirects to forbidden when the user lacks every required role', async () => {
    configSvc.userRoles = new Set(['LEARNER'])
    await guard.canActivate(snapshot({ requiredRoles: ['CONTENT_CREATOR'] }))
    expect(router.navigateByUrl).toHaveBeenCalledWith('/error-access-forbidden')
  })

  it('skips the role check when userRoles is undefined', async () => {
    configSvc.userRoles = undefined
    await expect(guard.canActivate(snapshot({ requiredRoles: ['CONTENT_CREATOR'] }))).resolves.toBe(true)
    expect(router.navigateByUrl).not.toHaveBeenCalled()
  })

  it('redirects to /author/cbp when a required feature is restricted', async () => {
    configSvc.restrictedFeatures = new Set(['frac'])
    await guard.canActivate(snapshot({ requiredFeatures: ['frac'] }))
    expect(router.parseUrl).toHaveBeenCalledWith('/author/cbp')
  })

  it('allows access when required features are not restricted', async () => {
    configSvc.restrictedFeatures = new Set(['somethingElse'])
    await expect(guard.canActivate(snapshot({ requiredFeatures: ['frac'] }))).resolves.toBe(true)
  })

  it('skips the feature check when restrictedFeatures is undefined', async () => {
    configSvc.restrictedFeatures = undefined
    await expect(guard.canActivate(snapshot({ requiredFeatures: ['frac'] }))).resolves.toBe(true)
  })
})
