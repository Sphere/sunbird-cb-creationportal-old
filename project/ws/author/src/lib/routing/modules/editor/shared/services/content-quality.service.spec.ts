import { ContentQualityService } from './content-quality.service'
import { of } from 'rxjs'

describe('ContentQualityService', () => {
  let http: { post: jest.Mock }
  let svc: ContentQualityService

  beforeEach(() => {
    http = { post: jest.fn(() => of({ result: { resources: [] } })) }
    svc = new ContentQualityService(http as any)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('calculateScore populates curationData keyed by resourceId', () => {
    svc.calculateScore({ result: { resources: [{ resourceId: 'r1', score: 5 }] } })
    expect(svc.getScore('r1')).toEqual({ resourceId: 'r1', score: 5 })
  })

  it('getScore falls back to the .img-stripped id', () => {
    svc.calculateScore({ result: { resources: [{ resourceId: 'abc', score: 1 }] } })
    expect(svc.getScore('abc.img')).toEqual({ resourceId: 'abc', score: 1 })
  })

  it('setJSONStruct deep-copies the structure', () => {
    const data = { a: { b: 1 } }
    svc.setJSONStruct(data)
    expect(svc.jSONStructure).toEqual(data)
    expect(svc.jSONStructure).not.toBe(data)
  })

  it('fetchresult posts to the score endpoint and caches the result', done => {
    http.post.mockReturnValue(of({ result: { resources: [{ resourceId: 'x', score: 9 }] } }))
    svc.fetchresult({ id: 1 }).subscribe(() => {
      expect(http.post).toHaveBeenCalledWith(expect.stringContaining('/scroing/fetch'), { id: 1 })
      expect(svc.getScore('x')).toEqual({ resourceId: 'x', score: 9 })
      done()
    })
  })

  it('postResponse posts to the calculate endpoint', done => {
    http.post.mockReturnValue(of({}))
    svc.postResponse({ y: 2 }).subscribe(() => {
      expect(http.post).toHaveBeenCalledWith(expect.stringContaining('/scroing/calculate'), { y: 2 })
      done()
    })
  })

  it('reset clears curationData and currentContent', () => {
    svc.calculateScore({ result: { resources: [{ resourceId: 'r', score: 1 }] } })
    svc.currentContent = 'c1'
    svc.reset()
    expect(svc.getScore('r')).toBeUndefined()
    expect(svc.currentContent).toBe('')
  })
})
