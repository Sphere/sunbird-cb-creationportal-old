import { AppTocResolverService } from './app-toc-resolver.service'
import { of, throwError } from 'rxjs'

describe('AppTocResolverService (content-detail)', () => {
  let contentSvc: { fetchAuthoringContent: jest.Mock; fetchContent: jest.Mock }
  let router: { navigateByUrl: jest.Mock }
  let svc: AppTocResolverService

  const routeWith = (contentId: string | null): any => ({
    paramMap: { get: (k: string) => (k === 'contentId' ? contentId : null) },
  })

  beforeEach(() => {
    contentSvc = {
      fetchAuthoringContent: jest.fn(() => of({ identifier: 'C1' })),
      fetchContent: jest.fn(() => of({})),
    }
    router = { navigateByUrl: jest.fn() }
    svc = new AppTocResolverService(contentSvc as any, router as any)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('returns null when there is no contentId', () => {
    expect(svc.resolve(routeWith(null), {} as any)).toBeNull()
  })

  it('fetches authoring content for a contentId (preview mode)', done => {
    const obs = svc.resolve(routeWith('C1'), {} as any)!
    obs.subscribe((data: any) => {
      expect(contentSvc.fetchAuthoringContent).toHaveBeenCalledWith('C1')
      expect(data).toEqual({ identifier: 'C1' })
      done()
    })
  })

  it('navigates to error page and passes value through on failure', done => {
    contentSvc.fetchAuthoringContent.mockReturnValue(throwError(() => 'e'))
    svc.resolve(routeWith('C1'), {} as any)!.subscribe((v: any) => {
      expect(router.navigateByUrl).toHaveBeenCalledWith('/error-somethings-wrong')
      expect(v).toBe('e')
      done()
    })
  })
})
