import { AuthKeycloakService } from './auth-keycloak.service'
import { Subject } from 'rxjs'

describe('AuthKeycloakService', () => {
  let kc: any
  let keycloakSvc: any
  let configSvc: any
  let msAuthSvc: any
  let svc: AuthKeycloakService

  beforeEach(() => {
    kc = {
      authenticated: true,
      token: 'tok',
      sessionId: 'sess',
      tokenParsed: { sub: 'u1', email: 'a@b.com', name: 'Alice' },
      idTokenParsed: { sub: 'u1-id' },
      idToken: 'id',
      refreshToken: 'rt',
      timeSkew: 0,
    }
    keycloakSvc = {
      isLoggedIn: jest.fn(() => true),
      getKeycloakInstance: jest.fn(() => kc),
      keycloakEvents$: new Subject(),
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

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('isLoggedIn delegates to keycloak', () => {
    expect(svc.isLoggedIn).toBe(true)
    expect(keycloakSvc.isLoggedIn).toHaveBeenCalled()
  })

  it('exposes authenticated / token / sessionId from the kc instance', () => {
    expect(svc.isAuthenticated).toBe(true)
    expect(svc.token).toBe('tok')
    expect(svc.sessionId).toBe('sess')
  })

  it('userId / userEmail / userName read the parsed token', () => {
    expect(svc.userId).toBe('u1')
    expect(svc.userEmail).toBe('a@b.com')
    expect(svc.userName).toBe('Alice')
  })

  it('userEmail falls back through idToken / preferred_username', () => {
    kc.tokenParsed = {}
    kc.idTokenParsed = { preferred_username: 'alice@corp' }
    expect(svc.userEmail).toBe('alice@corp')
  })

  it('login calls keycloak.login with idpHint + redirect', () => {
    svc.login('N', '/back')
    expect(keycloakSvc.login).toHaveBeenCalledWith({ idpHint: 'N', redirectUri: '/back' })
  })

  it('register calls keycloak.register with redirect', () => {
    svc.register('/back')
    expect(keycloakSvc.register).toHaveBeenCalledWith({ redirectUri: '/back' })
  })

  it('logout clears the telemetry session id', async () => {
    localStorage.setItem('telemetrySessionId', 'abc')
    await svc.logout('/base/')
    expect(localStorage.getItem('telemetrySessionId')).toBeNull()
  })

  it('initAuth returns false when there is no instance config', async () => {
    configSvc.instanceConfig = null
    await expect(svc.initAuth()).resolves.toBe(false)
  })

  it('isLoggedIn$ emits auth state and updates config on login events', done => {
    svc.isLoggedIn$.subscribe(state => {
      expect(state).toBe(true)
      expect(configSvc.isAuthenticated).toBe(true)
      done()
    })
    ;(svc as any).loginChangeSubject.next(true)
  })
})
