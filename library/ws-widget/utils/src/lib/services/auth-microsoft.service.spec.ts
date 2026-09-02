import { of } from 'rxjs'

import { AuthMicrosoftService } from './auth-microsoft.service'

describe('AuthMicrosoftService', () => {
  let loggerSvc: any
  let http: any
  let service: AuthMicrosoftService

  const configureMs = (svc: AuthMicrosoftService, overrides: any = {}) => {
    ;(svc as any).msConfig = {
      clientId: 'client-1',
      tenant: 'tenant-1',
      defaultEmailId: 'default@corp.com',
      validEmailExtensions: ['@corp.com'],
      isConfigured: true,
      ...overrides,
    }
  }

  beforeEach(() => {
    loggerSvc = { warn: jest.fn(), info: jest.fn(), error: jest.fn(), log: jest.fn() }
    http = { get: jest.fn() }
    service = new AuthMicrosoftService(loggerSvc, http)
  })

  it('is created', () => {
    expect(service).toBeInstanceOf(AuthMicrosoftService)
  })

  describe('isValidEmail', () => {
    it('matches against the configured valid extensions', () => {
      configureMs(service)
      expect(service.isValidEmail('john@corp.com')).toBe(true)
      expect(service.isValidEmail('john@other.com')).toBe(false)
    })
  })

  describe('isValid', () => {
    it('is true only when both token and expiry are present', () => {
      expect(service.isValid('token', '123')).toBe(true)
      expect(service.isValid('', '123')).toBe(false)
      expect(service.isValid('token', undefined)).toBe(false)
    })
  })

  describe('isLogoutRequired', () => {
    it('is false without a used email', () => {
      configureMs(service)
      expect(service.isLogoutRequired).toBe(false)
    })
    it('is true when configured and an email was used', () => {
      configureMs(service)
      ;(service as any).emailUsed = 'john@corp.com'
      expect(service.isLogoutRequired).toBe(true)
    })
  })

  describe('loginUrl', () => {
    it('returns null when not configured', () => {
      configureMs(service, { isConfigured: false })
      expect(service.loginUrl).toBeNull()
    })
    it('builds an oauth2 authorize url when configured', () => {
      configureMs(service)
      const url = service.loginUrl as string
      expect(url).toContain('https://login.windows.net/common/oauth2/authorize')
      expect(url).toContain('client_id=client-1')
      expect(url).toContain('response_type=code')
    })
  })

  describe('logoutUrl', () => {
    it('returns the microsoft logout url for a valid used email', () => {
      configureMs(service)
      ;(service as any).emailUsed = 'john@corp.com'
      expect(service.logoutUrl('https://back')).toContain('login.microsoftonline.com')
    })
    it('returns the plain redirect url for an invalid email', () => {
      configureMs(service)
      ;(service as any).emailUsed = 'john@bad.com'
      expect(service.logoutUrl('https://back')).toBe('https://back')
    })
  })

  describe('getInstanceFromResponse', () => {
    it('maps the token response to the internal shape', () => {
      const result = service.getInstanceFromResponse({
        accessToken: 'a',
        expiresOn: 'e',
        resource: 'r',
        tokenType: 'Bearer',
      })
      expect(result).toEqual({ accessToken: 'a', expiresOn: 'e', resource: 'r', tokenType: 'Bearer' })
    })
  })

  describe('init', () => {
    it('warns when no configuration is passed', async () => {
      await service.init({ microsoft: undefined } as any)
      expect(loggerSvc.warn).toHaveBeenCalled()
    })
  })

  describe('login', () => {
    it('warns and does nothing for an invalid email', async () => {
      configureMs(service)
      await service.login('john@bad.com')
      // Invalid email short-circuits before any navigation happens
      expect(loggerSvc.warn).toHaveBeenCalled()
    })
  })

  describe('getToken', () => {
    it('returns the cached token when it is still valid', async () => {
      ;(service as any).msToken = { accessToken: 'cached', expiresOn: 'later' }
      const token = await service.getToken('john@corp.com')
      expect(token).toBe('cached')
    })

    it('fetches a fresh token for a valid email', async () => {
      configureMs(service)
      jest.spyOn(service, 'getTokenForEmail').mockResolvedValue({ accessToken: 'fresh', expiresOn: 'e' })
      const token = await service.getToken('john@corp.com')
      expect(token).toBe('fresh')
      expect((service as any).emailUsed).toBe('john@corp.com')
    })

    it('throws when no token can be fetched', async () => {
      configureMs(service, { defaultEmailId: '' })
      jest.spyOn(service, 'getTokenForEmail').mockRejectedValue(new Error('no'))
      jest.spyOn(service, 'login').mockResolvedValue(undefined)
      await expect(service.getToken('john@corp.com')).rejects.toThrow('UNABLE TO FETCH MS AUTH TOKEN')
    })
  })

  describe('getTokenForEmail', () => {
    it('calls the token endpoint and maps the response', async () => {
      http.get.mockReturnValue(of({ accessToken: 't', expiresOn: 'e', resource: 'r', tokenType: 'Bearer' }))
      const result = await service.getTokenForEmail('john@corp.com')
      expect(http.get).toHaveBeenCalledWith(expect.stringContaining('email=john@corp.com'))
      expect(result.accessToken).toBe('t')
    })
  })

  describe('loginForSSOEnabledEmbed', () => {
    it('warns for an invalid email but still evaluates the timestamp gate', () => {
      configureMs(service)
      localStorage.clear()
      const loginSpy = jest.spyOn(service, 'login').mockResolvedValue(undefined)
      service.loginForSSOEnabledEmbed('john@bad.com')
      expect(loggerSvc.warn).toHaveBeenCalled()
      loginSpy.mockRestore()
    })

    it('triggers login and stores a timestamp for a fresh request', () => {
      configureMs(service)
      localStorage.clear()
      const loginSpy = jest.spyOn(service, 'login').mockResolvedValue(undefined)
      service.loginForSSOEnabledEmbed('john@corp.com')
      expect(loginSpy).toHaveBeenCalledWith('john@corp.com')
      expect(localStorage.getItem('msLoginRequested')).toBeTruthy()
      loginSpy.mockRestore()
    })
  })
})
