import { TncAppResolverService } from './tnc-app-resolver.service'
import { of, throwError } from 'rxjs'

describe('TncAppResolverService', () => {
  let http: { get: jest.Mock }
  let configSvc: any
  let svc: TncAppResolverService

  beforeEach(() => {
    http = { get: jest.fn() }
    configSvc = { userPreference: { selectedLocale: 'hi' } }
    svc = new TncAppResolverService(http as any, configSvc)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('getTnc appends locale query when provided', () => {
    http.get.mockReturnValue(of({}))
    svc.getTnc('en')
    expect(http.get).toHaveBeenCalledWith('/apis/protected/v8/user/tnc?locale=en')
  })

  it('getTnc omits locale query when not provided', () => {
    http.get.mockReturnValue(of({}))
    svc.getTnc()
    expect(http.get).toHaveBeenCalledWith('/apis/protected/v8/user/tnc')
  })

  it('resolve() wraps success as { data, error:null } using preference locale', done => {
    http.get.mockReturnValue(of({ accepted: true }))
    svc.resolve().subscribe(res => {
      expect(res).toEqual({ data: { accepted: true }, error: null })
      expect(http.get).toHaveBeenCalledWith('/apis/protected/v8/user/tnc?locale=hi')
      done()
    })
  })

  it('resolve() wraps failure as { error, data:null }', done => {
    http.get.mockReturnValue(throwError(() => 'nope'))
    svc.resolve().subscribe(res => {
      expect(res).toEqual({ error: 'nope', data: null })
      done()
    })
  })
})
