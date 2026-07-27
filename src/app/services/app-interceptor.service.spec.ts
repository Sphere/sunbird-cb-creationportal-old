import { AppInterceptorService } from './app-interceptor.service'
import { of } from 'rxjs'

describe('AppInterceptorService', () => {
  let configSvc: any
  let next: { handle: jest.Mock }
  let svc: AppInterceptorService

  const makeReq = (url: string) => ({ url, clone: jest.fn((opts: any) => ({ cloned: true, opts })) })

  beforeEach(() => {
    configSvc = {
      userPreference: null,
      activeOrg: 'ORG',
      rootOrg: 'ROOT',
      hostPath: 'host_1',
      userProfile: { userId: 'u9' },
    }
    next = { handle: jest.fn(() => of('resp')) }
    svc = new AppInterceptorService(configSvc, 'en-US')
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('passes external static/S3 URLs through untouched', () => {
    const req = makeReq('https://static.cdn/x.js')
    svc.intercept(req as any, next as any)
    expect(req.clone).not.toHaveBeenCalled()
    expect(next.handle).toHaveBeenCalledWith(req)
  })

  it('adds org/rootOrg/locale/wid/hostPath headers for internal requests', () => {
    const req = makeReq('/apis/protected/v8/x')
    svc.intercept(req as any, next as any)
    expect(req.clone).toHaveBeenCalledWith({
      setHeaders: {
        Authorization: '',
        org: 'ORG',
        rootOrg: 'ROOT',
        locale: 'en',
        wid: 'u9',
        hostPath: 'host_1',
      },
    })
    expect(next.handle).toHaveBeenCalledWith({ cloned: true, opts: expect.any(Object) })
  })

  it('merges selectedLangGroup into the locale header', () => {
    configSvc.userPreference = { selectedLangGroup: 'hi, ta' }
    const req = makeReq('/apis/x')
    svc.intercept(req as any, next as any)
    expect(req.clone.mock.calls[0][0].setHeaders.locale).toBe('en,hi,ta')
  })

  it('passes through unchanged when activeOrg/rootOrg are absent', () => {
    configSvc.activeOrg = ''
    const req = makeReq('/apis/x')
    svc.intercept(req as any, next as any)
    expect(req.clone).not.toHaveBeenCalled()
    expect(next.handle).toHaveBeenCalledWith(req)
  })
})
