import { KeycloakEventTypeLegacy } from 'keycloak-angular'
import { Subject } from 'rxjs'

import { AuthKeycloakService } from './auth-keycloak.service'

/** Matches the private storageKey in auth-keycloak.service.ts. */
const STORAGE_KEY = 'kc'

/**
 * Covers the paths the base auth-keycloak.service.spec.ts leaves out: initAuth with a
 * real instance config, the keycloak event listener, the cross-frame AUTH_REQUEST
 * responder, and the saved-config storage round trip.
 */
describe('AuthKeycloakService (init + events)', () => {
  let kc: any
  let keycloakSvc: any
  let configSvc: any
  let msAuthSvc: any
  let svc: AuthKeycloakService
  let events$: Subject<any>

  const instanceConfig = (): any => ({
    microsoft: { isConfigured: false },
    keycloak: {
      url: 'https://kc/auth',
      realm: 'realm1',
      clientId: 'client1',
      bearerExcludedUrls: ['/public'],
    },
  })

  beforeEach(() => {
    localStorage.clear()
    events$ = new Subject<any>()
    kc = {
      authenticated: true,
      token: 'tok',
      sessionId: 'sess',
      tokenParsed: { sub: 'u1', email: 'a@b.com', name: 'Alice' },
      idTokenParsed: { sub: 'u1-id' },
      idToken: 'id',
      refreshToken: 'rt',
      timeSkew: 3,
    }
    keycloakSvc = {
      isLoggedIn: jest.fn(() => true),
      getKeycloakInstance: jest.fn(() => kc),
      keycloakEvents$: events$,
      login: jest.fn(() => Promise.resolve()),
      register: jest.fn(() => Promise.resolve()),
      getToken: jest.fn(() => Promise.resolve('tok')),
      init: jest.fn(() => Promise.resolve(true)),
      updateToken: jest.fn(),
    }
    configSvc = { instanceConfig: null, isAuthenticated: false }
    msAuthSvc = { init: jest.fn(), isLogoutRequired: false, logoutUrl: jest.fn() }
    svc = new AuthKeycloakService(configSvc, keycloakSvc, msAuthSvc)
  })

  afterEach(() => {
    localStorage.clear()
    jest.restoreAllMocks()
  })

  describe('initAuth', () => {
    it('passes the configured realm, url and client through to keycloak', async () => {
      configSvc.instanceConfig = instanceConfig()

      await svc.initAuth()

      const args = keycloakSvc.init.mock.calls[0][0]
      expect(args.config).toEqual({ url: 'https://kc/auth', realm: 'realm1', clientId: 'client1' })
      expect(args.loadUserProfileAtStartUp).toBe(false)
      expect(args.bearerExcludedUrls).toEqual(['/public'])
    })

    it('defaults onLoad to check-sso and disables the login iframe', async () => {
      configSvc.instanceConfig = instanceConfig()

      await svc.initAuth()

      const opts = keycloakSvc.init.mock.calls[0][0].initOptions
      expect(opts.onLoad).toBe('check-sso')
      expect(opts.checkLoginIframe).toBe(false)
    })

    it('honours an explicit onLoad setting', async () => {
      const cfg = instanceConfig()
      ;(cfg.keycloak as any).onLoad = 'login-required'
      configSvc.instanceConfig = cfg

      await svc.initAuth()

      expect(keycloakSvc.init.mock.calls[0][0].initOptions.onLoad).toBe('login-required')
    })

    it('rehydrates a complete saved keycloak config', async () => {
      const saved = { idToken: 'i', refreshToken: 'r', timeSkew: 1, token: 't' }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
      configSvc.instanceConfig = instanceConfig()

      await svc.initAuth()

      const opts = keycloakSvc.init.mock.calls[0][0].initOptions
      expect(opts.idToken).toBe('i')
      expect(opts.refreshToken).toBe('r')
      expect(opts.token).toBe('t')
    })

    it('ignores a partial saved config', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ idToken: 'i' }))
      configSvc.instanceConfig = instanceConfig()

      await svc.initAuth()

      expect(keycloakSvc.init.mock.calls[0][0].initOptions.idToken).toBeUndefined()
    })

    it('ignores an unparseable saved config', async () => {
      localStorage.setItem(STORAGE_KEY, 'not json')
      configSvc.instanceConfig = instanceConfig()

      await expect(svc.initAuth()).resolves.toBe(true)
    })

    it('resolves false when keycloak init throws', async () => {
      configSvc.instanceConfig = instanceConfig()
      keycloakSvc.init.mockRejectedValue(new Error('kc down'))

      await expect(svc.initAuth()).resolves.toBe(false)
    })
  })

  describe('keycloak event listener', () => {
    const initAndEmit = async (event: any) => {
      configSvc.instanceConfig = instanceConfig()
      await svc.initAuth()
      events$.next(event)
    }

    it('reports logged-out on an auth error', async () => {
      const seen: boolean[] = []
      svc.isLoggedIn$.subscribe(v => seen.push(v))
      await initAndEmit({ type: KeycloakEventTypeLegacy.OnAuthError })
      expect(seen).toContain(false)
    })

    it('clears the saved config on logout', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 't' }))
      await initAndEmit({ type: KeycloakEventTypeLegacy.OnAuthLogout })
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it('saves the keycloak config when ready and authenticated', async () => {
      await initAndEmit({ type: KeycloakEventTypeLegacy.OnReady, args: true })
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) as string)).toEqual({
        idToken: 'id',
        refreshToken: 'rt',
        timeSkew: 3,
        token: 'tok',
      })
    })

    it('does not save the config when ready but unauthenticated', async () => {
      await initAndEmit({ type: KeycloakEventTypeLegacy.OnReady, args: false })
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it('refreshes the token when it expires', async () => {
      await initAndEmit({ type: KeycloakEventTypeLegacy.OnTokenExpired })
      expect(keycloakSvc.updateToken).toHaveBeenCalledWith(60)
    })

    it('ignores refresh success, refresh error and auth success events', async () => {
      configSvc.instanceConfig = instanceConfig()
      await svc.initAuth()
      expect(() => {
        events$.next({ type: KeycloakEventTypeLegacy.OnAuthRefreshError })
        events$.next({ type: KeycloakEventTypeLegacy.OnAuthRefreshSuccess })
        events$.next({ type: KeycloakEventTypeLegacy.OnAuthSuccess })
      }).not.toThrow()
      expect(keycloakSvc.updateToken).not.toHaveBeenCalled()
    })
  })

  describe('cross-frame AUTH_REQUEST responder', () => {
    const postFrom = (data: any, source: any, origin = 'https://child') => {
      const event: any = new Event('message')
      event.data = data
      Object.defineProperty(event, 'source', { value: source })
      Object.defineProperty(event, 'origin', { value: origin })
      window.dispatchEvent(event)
      return event
    }

    it('answers an AUTH_REQUEST with the current token', async () => {
      configSvc.instanceConfig = instanceConfig()
      await svc.initAuth()
      const postMessage = jest.fn()

      postFrom({ type: 'AUTH_REQUEST', data: { id: 'req1' } }, { postMessage })
      await Promise.resolve()
      await Promise.resolve()

      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          app: 'WEB_PORTAL',
          type: 'AUTH_RESPONSE',
          data: { token: 'tok', id: 'req1' },
        }),
        'https://child',
      )
    })

    it('ignores messages of another type', async () => {
      configSvc.instanceConfig = instanceConfig()
      await svc.initAuth()
      const postMessage = jest.fn()

      postFrom({ type: 'SOMETHING_ELSE' }, { postMessage })
      await Promise.resolve()

      expect(postMessage).not.toHaveBeenCalled()
    })

    it('ignores a message with no usable source window', async () => {
      configSvc.instanceConfig = instanceConfig()
      await svc.initAuth()
      expect(() => postFrom({ type: 'AUTH_REQUEST' }, null)).not.toThrow()
    })

    it('ignores a message with no data', async () => {
      configSvc.instanceConfig = instanceConfig()
      await svc.initAuth()
      const postMessage = jest.fn()
      postFrom(null, { postMessage })
      await Promise.resolve()
      expect(postMessage).not.toHaveBeenCalled()
    })
  })

  describe('logout', () => {
    it('drops the telemetry session id', async () => {
      localStorage.setItem('telemetrySessionId', 'abc')
      await svc.logout('https://portal/')
      expect(localStorage.getItem('telemetrySessionId')).toBeNull()
    })

    it('is safe when no telemetry session exists', async () => {
      await expect(svc.logout('https://portal/')).resolves.toBeUndefined()
    })
  })
})
