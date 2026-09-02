import { ContentStripNewMultipleService } from './activity-strip-new-multiple.service'
import { of } from 'rxjs'

describe('ContentStripNewMultipleService (activity-strip)', () => {
  let http: { get: jest.Mock; post: jest.Mock }
  let svc: ContentStripNewMultipleService

  beforeEach(() => {
    http = { get: jest.fn(() => of({})), post: jest.fn(() => of({})) }
    svc = new ContentStripNewMultipleService(http as any)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('getContentStripResponseApi GETs the plain path when no query params/filters', done => {
    svc.getContentStripResponseApi({ path: '/strip' } as any).subscribe(() => {
      expect(http.get).toHaveBeenCalledWith('/strip')
      done()
    })
  })

  it('getContentStripResponseApi appends query params + encoded filters', done => {
    const req: any = { path: '/strip', queryParams: { pageNo: 1, pageSize: 10 } }
    svc.getContentStripResponseApi(req, { status: 'Live' }).subscribe(() => {
      const url = http.get.mock.calls[0][0]
      expect(url.startsWith('/strip?')).toBe(true)
      expect(url).toContain('pageNo=1')
      expect(url).toContain('pageSize=10')
      expect(url).toContain('filters=')
      done()
    })
  })

  it('fetchNetworkUsers POSTs the request body to the url', done => {
    svc.fetchNetworkUsers('body', '/net/users').subscribe(() => {
      expect(http.post).toHaveBeenCalledWith('/net/users', 'body')
      done()
    })
  })
})
