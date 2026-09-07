import { QualityJSONResolver } from './quality-json-resolver.service'
import { of, throwError } from 'rxjs'

describe('QualityJSONResolver', () => {
  let apiService: { get: jest.Mock }
  let router: { navigateByUrl: jest.Mock }
  let svc: QualityJSONResolver

  beforeEach(() => {
    apiService = { get: jest.fn() }
    router = { navigateByUrl: jest.fn() }
    svc = new QualityJSONResolver(apiService as any, router as any)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('resolve() unwraps result.result from the scoring-template endpoint', done => {
    apiService.get.mockReturnValue(of({ result: { result: { score: 42 } } }))
    svc.resolve().subscribe((data: any) => {
      expect(data).toEqual({ score: 42 })
      expect(apiService.get).toHaveBeenCalledWith(expect.stringContaining('content_scoring_template'), {})
      done()
    })
  })

  it('resolve() navigates to error page and passes value through on error', done => {
    apiService.get.mockReturnValue(throwError(() => 'boom'))
    svc.resolve().subscribe((v: any) => {
      expect(router.navigateByUrl).toHaveBeenCalledWith('/error-somethings-wrong')
      expect(v).toBe('boom')
      done()
    })
  })
})
