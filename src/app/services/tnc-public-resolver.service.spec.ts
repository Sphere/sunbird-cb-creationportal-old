import { TncPublicResolverService } from './tnc-public-resolver.service'
import { of, throwError } from 'rxjs'

describe('TncPublicResolverService', () => {
  let http: { get: jest.Mock }
  let svc: TncPublicResolverService

  beforeEach(() => {
    http = { get: jest.fn(() => of({ accepted: true })) }
    svc = new TncPublicResolverService(http as any)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('getPublicTnc hits the public tnc endpoint without locale', () => {
    svc.getPublicTnc()
    expect(http.get).toHaveBeenCalledWith('/apis/public/v8/tnc')
  })

  it('getPublicTnc appends locale when provided', () => {
    svc.getPublicTnc('en')
    expect(http.get).toHaveBeenCalledWith('/apis/public/v8/tnc?locale=en')
  })

  it('resolve wraps success as { data, error:null }', done => {
    svc.resolve().subscribe(res => {
      expect(res).toEqual({ data: { accepted: true }, error: null })
      done()
    })
  })

  it('resolve wraps failure as { error, data:null }', done => {
    http.get.mockReturnValue(throwError(() => 'x'))
    svc.resolve().subscribe(res => {
      expect(res).toEqual({ error: 'x', data: null })
      done()
    })
  })
})
