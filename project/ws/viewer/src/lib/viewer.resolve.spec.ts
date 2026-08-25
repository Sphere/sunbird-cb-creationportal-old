import { of, throwError } from 'rxjs'
import { VIEWER_ROUTE_FROM_MIME } from '@ws-widget/collection'
import { ViewerResolve } from './viewer.resolve'

describe('ViewerResolve', () => {
  let contentSvc: any
  let viewerDataSvc: any
  let mobileAppsSvc: any
  let router: any
  let msAuthSvc: any
  let configSvc: any
  let platform: any
  let resolver: ViewerResolve

  const PDF_MIME = 'application/pdf'
  const pdfRoute = VIEWER_ROUTE_FROM_MIME(PDF_MIME as any) // 'pdf'

  const makeRoute = (resourceType: string, resourceId: string | null = 'R1') => ({
    data: { resourceType },
    paramMap: { get: jest.fn(() => resourceId) },
    queryParamMap: { get: jest.fn(() => null) },
  })

  beforeEach(() => {
    contentSvc = {
      fetchAuthoringContent: jest.fn(),
      fetchContent: jest.fn(),
    }
    viewerDataSvc = {
      resourceId: null as string | null,
      reset: jest.fn(function (this: any, id: string | null) {
        viewerDataSvc.resourceId = id
      }),
      updateResource: jest.fn(),
    }
    mobileAppsSvc = { sendViewerData: jest.fn() }
    router = { navigate: jest.fn() }
    msAuthSvc = { loginForSSOEnabledEmbed: jest.fn() }
    configSvc = { userProfile: { email: 'user@x.org' } }
    platform = { ANDROID: false, IOS: false }
    resolver = new ViewerResolve(contentSvc, viewerDataSvc, mobileAppsSvc, router, msAuthSvc, configSvc, platform)
  })

  it('should create', () => {
    expect(resolver).toBeTruthy()
  })

  it('returns null when there is no resourceId', () => {
    const result = resolver.resolve(makeRoute(pdfRoute, null) as any)
    expect(viewerDataSvc.reset).toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('resolves matching content and forwards it to the mobile app service', done => {
    const content = { identifier: 'ID1', mimeType: PDF_MIME, status: 'Live' }
    contentSvc.fetchAuthoringContent.mockReturnValue(of({ result: { content } }))
    const obs = resolver.resolve(makeRoute(pdfRoute) as any)
    expect(obs).not.toBeNull()
    obs!.subscribe((res: any) => {
      expect(res.error).toBeNull()
      expect(res.data.identifier).toBe('ID1')
      expect(viewerDataSvc.updateResource).toHaveBeenCalledWith(content, null)
      expect(mobileAppsSvc.sendViewerData).toHaveBeenCalled()
      done()
    })
  })

  it('navigates to overview when content is Deleted', done => {
    const content = { identifier: 'IDdel', mimeType: PDF_MIME, status: 'Deleted' }
    contentSvc.fetchAuthoringContent.mockReturnValue(of({ result: { content } }))
    resolver.resolve(makeRoute(pdfRoute) as any)!.subscribe(() => {
      expect(router.navigate).toHaveBeenCalledWith([expect.stringContaining('/toc/IDdel/overview')])
      done()
    })
  })

  it('triggers SSO login when content has ssoEnabled', done => {
    const content = { identifier: 'IDsso', mimeType: PDF_MIME, status: 'Live', ssoEnabled: true }
    contentSvc.fetchAuthoringContent.mockReturnValue(of({ result: { content } }))
    resolver.resolve(makeRoute(pdfRoute) as any)!.subscribe(() => {
      expect(msAuthSvc.loginForSSOEnabledEmbed).toHaveBeenCalledWith('user@x.org')
      done()
    })
  })

  it('navigates when resourceType is unknown', done => {
    const content = { identifier: 'IDunk', mimeType: PDF_MIME, status: 'Live' }
    contentSvc.fetchAuthoringContent.mockReturnValue(of({ result: { content } }))
    resolver.resolve(makeRoute('unknown') as any)!.subscribe(() => {
      expect(router.navigate).toHaveBeenCalled()
      done()
    })
  })

  it('returns a mimeType mismatch error when route type differs', done => {
    const content = { identifier: 'IDmis', mimeType: PDF_MIME, status: 'Live' }
    contentSvc.fetchAuthoringContent.mockReturnValue(of({ result: { content } }))
    // resourceType 'video' will not match the pdf mimeType
    resolver.resolve(makeRoute('video') as any)!.subscribe((res: any) => {
      expect(res.data).toBeNull()
      expect(res.error).toBe('mimeTypeMismatch')
      expect(viewerDataSvc.updateResource).toHaveBeenCalledWith(null, expect.objectContaining({ errorType: 'mimeTypeMismatch' }))
      done()
    })
  })

  it('catches errors from the content service', done => {
    contentSvc.fetchAuthoringContent.mockReturnValue(throwError(() => 'network-error'))
    resolver.resolve(makeRoute(pdfRoute) as any)!.subscribe((res: any) => {
      expect(res.data).toBeNull()
      expect(res.error).toBe('network-error')
      expect(viewerDataSvc.updateResource).toHaveBeenCalledWith(null, 'network-error')
      done()
    })
  })
})
