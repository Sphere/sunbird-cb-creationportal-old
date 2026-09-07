import { ContentTOCResolver } from './content-resolve.service'
import { of, throwError } from 'rxjs'

describe('ContentTOCResolver', () => {
  let apiService: { get: jest.Mock }
  let accessService: { orgRootOrgAsQuery: string }
  let router: { navigateByUrl: jest.Mock }
  let svc: ContentTOCResolver

  beforeEach(() => {
    apiService = { get: jest.fn() }
    accessService = { orgRootOrgAsQuery: '?rootOrg=ORG' }
    router = { navigateByUrl: jest.fn() }
    svc = new ContentTOCResolver(apiService as any, accessService as any, router as any)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('resolve() reads route id and calls content-read with the org query', done => {
    apiService.get.mockReturnValue(of({ identifier: 'X1' }))
    const route: any = { params: { id: 'X1' } }
    svc.resolve(route).subscribe((meta: any) => {
      expect(meta).toEqual({ identifier: 'X1' })
      const url = apiService.get.mock.calls[0][0]
      expect(url).toContain('X1')
      expect(url).toContain('?rootOrg=ORG')
      done()
    })
  })

  it('resolve() navigates to error page and passes value through on error', done => {
    apiService.get.mockReturnValue(throwError(() => 'err'))
    svc.resolve({ params: { id: 'Z' } } as any).subscribe((v: any) => {
      expect(router.navigateByUrl).toHaveBeenCalledWith('/error-somethings-wrong')
      expect(v).toBe('err')
      done()
    })
  })
})
