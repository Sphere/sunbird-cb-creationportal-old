import { AppTocResolverService } from './app-toc-resolver.service'
import { of, throwError } from 'rxjs'

describe('AppTocResolverService', () => {
  let contentSvc: { fetchContent: jest.Mock; fetchAuthoringContentHierarchy: jest.Mock }
  let routePipe: { transform: jest.Mock }
  let router: { navigate: jest.Mock }
  let svc: AppTocResolverService

  const routeWith = (id: string | null): any => ({ paramMap: { get: () => id } })

  beforeEach(() => {
    contentSvc = {
      fetchContent: jest.fn(() => of({ result: { content: { identifier: 'C1', children: [], contentType: 'Course' } } })),
      fetchAuthoringContentHierarchy: jest.fn(() => of({ result: { content: {} } })),
    }
    routePipe = { transform: jest.fn(() => ({ url: '/u', queryParams: {} })) }
    router = { navigate: jest.fn() }
    svc = new AppTocResolverService(contentSvc as any, routePipe as any, router as any)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('resolve returns NO_ID error when there is no content id', done => {
    svc.resolve(routeWith(null), {} as any).subscribe((res: any) => {
      expect(res).toEqual({ error: 'NO_ID', data: null })
      expect(contentSvc.fetchContent).not.toHaveBeenCalled()
      done()
    })
  })

  it('resolve fetches content and unwraps result.content (non-preview)', done => {
    const obs = svc.resolve(routeWith('C1'), {} as any) as any
    obs.subscribe((res: any) => {
      expect(contentSvc.fetchContent).toHaveBeenCalledWith('C1', 'detail', expect.any(Array))
      expect(res.error).toBeNull()
      expect(res.data).toEqual({ identifier: 'C1', children: [], contentType: 'Course' })
      done()
    })
  })

  it('resolve maps errors to { error, data:null }', done => {
    contentSvc.fetchContent.mockReturnValue(throwError(() => 'bad'))
    const obs = svc.resolve(routeWith('C1'), {} as any) as any
    obs.subscribe((res: any) => {
      expect(res).toEqual({ error: 'bad', data: null })
      done()
    })
  })
})
