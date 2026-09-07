jest.mock('uuid', () => ({ v4: () => 'test-uuid' }))

import { InitService } from './init.service'
import { of } from 'rxjs'

describe('InitService', () => {
  let logger: any
  let configSvc: any
  let authSvc: any
  let widgetResolverService: any
  let settingsSvc: any
  let userPreference: any
  let http: any
  let domSanitizer: any
  let iconRegistry: any

  const makeService = (baseHref = '/en/') =>
    new InitService(
      logger,
      configSvc,
      authSvc,
      widgetResolverService,
      settingsSvc,
      userPreference,
      http,
      baseHref,
      domSanitizer,
      iconRegistry,
    )

  beforeEach(() => {
    logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
    configSvc = {
      isProduction: false,
      sitePath: 'https://site',
      userRoles: new Set<string>(),
      userGroups: new Set<string>(),
      restrictedFeatures: new Set<string>(),
      restrictedWidgets: new Set<string>(),
    }
    authSvc = { logout: jest.fn() }
    widgetResolverService = { initialize: jest.fn() }
    settingsSvc = { initializePrefChanges: jest.fn() }
    userPreference = { initialize: jest.fn() }
    domSanitizer = { bypassSecurityTrustResourceUrl: jest.fn((u: string) => u) }
    iconRegistry = { addSvgIcon: jest.fn() }
    http = { get: jest.fn(), post: jest.fn() }
  })

  it('should be created and register svg icons in the constructor', () => {
    const svc = makeService()
    expect(svc).toBeTruthy()
    // pin, facebook, linked-in, twitter, goi, hubs
    expect(iconRegistry.addSvgIcon).toHaveBeenCalledTimes(6)
    expect(configSvc.isProduction).toBeDefined()
  })

  describe('locale getter', () => {
    it('strips slashes from baseHref', () => {
      const svc = makeService('/hi/')
      expect(svc.locale).toBe('hi')
    })

    it('falls back to "en" when baseHref reduces to empty', () => {
      const svc = makeService('/')
      expect(svc.locale).toBe('en')
    })
  })

  describe('hasRole', () => {
    let svc: InitService
    beforeEach(() => {
      svc = makeService()
    })

    it('returns true when a CBP role is present', () => {
      expect(svc.hasRole(['EDITOR'])).toBe(true)
      expect(svc.hasRole(['PUBLIC', 'SOMETHING'])).toBe(true)
    })

    it('returns false when no CBP role matches', () => {
      expect(svc.hasRole(['RANDOM'])).toBe(false)
      expect(svc.hasRole([])).toBe(false)
    })
  })

  describe('fetchDefaultConfig', () => {
    it('loads host.config.json and seeds configSvc with aastrika org', async () => {
      const config: any = { appSetup: { x: 1 }, backgrounds: {} }
      http.get.mockReturnValue(of(config))
      const svc = makeService()
      const result = await (svc as any).fetchDefaultConfig()
      expect(http.get).toHaveBeenCalledWith('assets/configurations/host.config.json')
      expect(result.rootOrg).toBe('aastrika')
      expect(configSvc.instanceConfig).toBe(config)
      expect(configSvc.rootOrg).toBe('aastrika')
      expect(configSvc.org).toEqual(['aastrika'])
      expect(configSvc.activeOrg).toBe('aastrika')
      expect(configSvc.appSetup).toEqual({ x: 1 })
    })
  })

  describe('fetchAppsConfig', () => {
    it('fetches apps.json', async () => {
      const apps: any = { features: {}, groups: [], tourGuide: {} }
      http.get.mockReturnValue(of(apps))
      const svc = makeService()
      const result = await (svc as any).fetchAppsConfig()
      expect(http.get).toHaveBeenCalledWith('assets/configurations/feature/apps.json')
      expect(result).toBe(apps)
    })
  })

  describe('fetchInstanceConfig', () => {
    it('fetches site.config.json, seeds org and updates index meta', async () => {
      const config: any = {
        backgrounds: {},
        details: { appName: 'My App' },
        indexHtmlMeta: {},
      }
      http.get.mockReturnValue(of(config))
      const svc = makeService()
      const result = await (svc as any).fetchInstanceConfig()
      expect(http.get).toHaveBeenCalledWith('https://site/site.config.json')
      expect(result.rootOrg).toBe('aastrika')
      expect(configSvc.activeOrg).toBe('aastrika')
      expect(document.title).toBe('My App')
    })
  })

  describe('fetchWidgetStatus', () => {
    it('fetches widgets.config.json', async () => {
      const widgets: any = [{ widgetType: 'a' }]
      http.get.mockReturnValue(of(widgets))
      const svc = makeService()
      const result = await (svc as any).fetchWidgetStatus()
      expect(http.get).toHaveBeenCalledWith('assets/configurations/widgets.config.json')
      expect(result).toBe(widgets)
    })
  })

  describe('fetchFeaturesStatus', () => {
    it('fetches features.config.json and builds a restrictedFeatures set', async () => {
      http.get.mockReturnValue(of({}))
      const svc = makeService()
      const result = await (svc as any).fetchFeaturesStatus()
      expect(http.get).toHaveBeenCalledWith('assets/configurations/features.config.json')
      expect(result).toBeInstanceOf(Set)
      expect(configSvc.restrictedFeatures).toBe(result)
    })
  })

  describe('processWidgetStatus', () => {
    it('returns a Set of restricted widget keys', () => {
      const svc = makeService()
      const result = (svc as any).processWidgetStatus([])
      expect(result).toBeInstanceOf(Set)
      expect(configSvc.restrictedWidgets).toBe(result)
    })
  })

  describe('processAppsConfig', () => {
    it('filters features and groups by permission', () => {
      const svc = makeService()
      const appsConfig: any = {
        tourGuide: { t: 1 },
        features: {},
        groups: [],
      }
      const result = (svc as any).processAppsConfig(appsConfig)
      expect(result.tourGuide).toEqual({ t: 1 })
      expect(result.features).toEqual({})
      expect(result.groups).toEqual([])
    })

    it('keeps groups whose feature ids survive filtering', () => {
      const svc = makeService()
      configSvc.restrictedFeatures = new Set<string>()
      const appsConfig: any = {
        tourGuide: {},
        features: {
          f1: { id: 'f1', permission: [] },
        },
        groups: [{ name: 'g', featureIds: ['f1'] }],
      }
      const result = (svc as any).processAppsConfig(appsConfig)
      expect(result.features.f1).toBeTruthy()
      expect(result.groups.length).toBe(1)
    })
  })

  describe('updateNavConfig', () => {
    it('does nothing when there is no instanceConfig', () => {
      const svc = makeService()
      configSvc.instanceConfig = undefined
      expect(() => (svc as any).updateNavConfig()).not.toThrow()
    })

    it('copies nav bar backgrounds and primaryNavBarConfig', () => {
      const svc = makeService()
      configSvc.instanceConfig = {
        backgrounds: { primaryNavBar: 'pnb', pageNavBar: 'pgnb' },
        primaryNavBarConfig: { cfg: 1 },
      }
      ;(svc as any).updateNavConfig()
      expect(configSvc.primaryNavBar).toBe('pnb')
      expect(configSvc.pageNavBar).toBe('pgnb')
      expect(configSvc.primaryNavBarConfig).toEqual({ cfg: 1 })
    })
  })

  describe('fetchStartUpDetails', () => {
    it('returns a Public default set when pid check is disabled', async () => {
      configSvc.instanceConfig = { disablePidCheck: true }
      const svc = makeService()
      const result = await (svc as any).fetchStartUpDetails()
      expect(result.tncStatus).toBe(true)
      expect(result.isActive).toBe(true)
      expect(http.get).not.toHaveBeenCalled()
    })

    it('maps profile and roles when pid check is enabled', async () => {
      configSvc.instanceConfig = { disablePidCheck: false }
      const response = {
        result: {
          response: {
            roles: ['EDITOR'],
            userId: 'u1',
            firstName: 'First',
            lastName: 'Last',
            userName: 'first.last',
            email: 'a@b.com',
            channel: 'dept',
            promptTnC: false,
            isDeleted: false,
          },
        },
      }
      http.get.mockReturnValue(of(response))
      const svc = makeService()
      const result = await (svc as any).fetchStartUpDetails()
      expect(http.get).toHaveBeenCalledWith('/apis/proxies/v8/api/user/v2/read')
      expect(configSvc.userProfile.userId).toBe('u1')
      expect(configSvc.userProfileV2).toBeTruthy()
      expect(result.roles).toEqual(['editor'])
      expect(configSvc.userRoles.has('editor')).toBe(true)
      expect(authSvc.logout).not.toHaveBeenCalled()
    })

    it('logs the user out when no valid CBP role is present', async () => {
      configSvc.instanceConfig = { disablePidCheck: false }
      const response = {
        result: {
          response: {
            roles: ['RANDOM'],
            userId: 'u2',
            promptTnC: true,
            isDeleted: false,
          },
        },
      }
      http.get.mockReturnValue(of(response))
      const svc = makeService()
      const result = await (svc as any).fetchStartUpDetails()
      expect(authSvc.logout).toHaveBeenCalled()
      expect(result.isActive).toBe(true)
    })
  })

  describe('init', () => {
    const hostConfig: any = { disablePidCheck: true, backgrounds: {} }
    const siteConfig: any = {
      backgrounds: {},
      details: { appName: 'App' },
      indexHtmlMeta: {},
      featuredApps: [],
    }
    const appsConfig: any = { features: {}, groups: [], tourGuide: {} }

    const routeGet = () => (url: string) => {
      if (url.includes('host.config.json')) {
        return of({ ...hostConfig })
      }
      if (url.includes('site.config.json')) {
        return of({ ...siteConfig })
      }
      if (url.includes('apps.json')) {
        return of({ ...appsConfig })
      }
      if (url.includes('widgets.config.json')) {
        return of([])
      }
      if (url.includes('features.config.json')) {
        return of({})
      }
      return of({})
    }

    it('resolves true and initializes preferences on the happy path', async () => {
      http.get.mockImplementation(routeGet())
      const svc = makeService()
      const result = await svc.init()
      expect(result).toBe(true)
      expect(widgetResolverService.initialize).toHaveBeenCalled()
      expect(settingsSvc.initializePrefChanges).toHaveBeenCalled()
      expect(userPreference.initialize).toHaveBeenCalled()
    })

    it('returns false and marks not authenticated when startup details fail', async () => {
      http.get.mockImplementation((url: string) => {
        if (url.includes('host.config.json')) {
          // pid check enabled so fetchStartUpDetails calls the read api
          return of({ disablePidCheck: false, backgrounds: {} })
        }
        // read api throws -> fetchStartUpDetails rejects
        return { toPromise: () => Promise.reject(new Error('boom')), pipe: () => ({ toPromise: () => Promise.reject(new Error('boom')) }) }
      })
      const svc = makeService()
      const result = await svc.init()
      expect(result).toBe(false)
      expect(logger.info).toHaveBeenCalledWith('Not Authenticated')
      expect(settingsSvc.initializePrefChanges).toHaveBeenCalled()
    })
  })
})
