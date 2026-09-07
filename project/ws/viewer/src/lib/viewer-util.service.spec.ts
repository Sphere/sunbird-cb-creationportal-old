import { ViewerUtilService } from './viewer-util.service'
import { of } from 'rxjs'

describe('ViewerUtilService', () => {
  let http: { get: jest.Mock; post: jest.Mock }
  let config: any
  let svc: ViewerUtilService

  beforeEach(() => {
    http = { get: jest.fn(() => of({})), post: jest.fn(() => of({})) }
    config = { rootOrg: '', activeOrg: '' }
    svc = new ViewerUtilService(http as any, config)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('getContent hits hierarchy endpoint with default org fallbacks', done => {
    svc.getContent('C1').subscribe(() => {
      const url = http.get.mock.calls[0][0]
      expect(url).toContain('/apis/authApi/action/content/hierarchy/C1')
      expect(url).toContain('rootOrg=aastrika')
      expect(url).toContain('org=aastrika')
      done()
    })
  })

  it('getAuthoringUrl encodes a non content-store url', () => {
    expect(svc.getAuthoringUrl('https://x/a.pdf')).toBe(`/apis/authContent/${encodeURIComponent('https://x/a.pdf')}`)
  })

  it('getAuthoringUrl uses pathname for a content-store url', () => {
    expect(svc.getAuthoringUrl('https://cdn/content-store/a/b.pdf')).toBe('/apis/authContent/content-store/a/b.pdf')
  })

  it('getAuthoringUrl returns empty string for falsy url', () => {
    expect(svc.getAuthoringUrl('')).toBe('')
  })

  it('getCompetencyAuthoringUrl builds the assessment content url', () => {
    expect(svc.getCompetencyAuthoringUrl('/x')).toBe('apis/public/v8/mobileApp/v1/assessment/content/x')
  })

  it('regexDownloadReplace rewrites to the authoring base', () => {
    expect(svc.regexDownloadReplace('', '/content-store/a b', '"')).toBe(`/apis/authContent/${encodeURIComponent('/content-store/a b')}"`)
  })

  it('realTimeProgressUpdate posts to the progress endpoint', () => {
    svc.realTimeProgressUpdate('C9', { p: 1 })
    expect(http.post).toHaveBeenCalledWith(expect.stringContaining('/user/realTimeProgress/update/C9'), { p: 1 })
  })
})
