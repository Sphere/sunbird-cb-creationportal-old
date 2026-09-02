import { InterestService } from './interest.service'
import { of } from 'rxjs'

describe('InterestService', () => {
  let http: any
  let svc: InterestService

  beforeEach(() => {
    http = {
      get: jest.fn(() => of([])),
      post: jest.fn(() => of({ responseData: [] })),
      patch: jest.fn(() => of({})),
      request: jest.fn(() => of({})),
    }
    svc = new InterestService(http, {} as any)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('fetchUserInterests maps topics to names', done => {
    http.get.mockReturnValue(of([{ name: 'ng' }, { name: 'js' }]))
    svc.fetchUserInterests().subscribe(names => {
      expect(names).toEqual(['ng', 'js'])
      expect(http.get.mock.calls[0][0]).toContain('/user/topics')
      done()
    })
  })

  it('fetchSuggestedInterests maps recommended topics to names', done => {
    http.get.mockReturnValue(of([{ name: 'rec' }]))
    svc.fetchSuggestedInterests().subscribe(names => {
      expect(names).toEqual(['rec'])
      done()
    })
  })

  it('modifyUserInterests posts the topics', done => {
    svc.modifyUserInterests(['a']).subscribe(() => {
      expect(http.post).toHaveBeenCalledWith(expect.stringContaining('/user/topics'), { topics: ['a'] })
      done()
    })
  })

  it('addUserInterest patches a single interest', done => {
    svc.addUserInterest('ml').subscribe(() => {
      expect(http.patch).toHaveBeenCalledWith(expect.stringContaining('/user/topics'), { interest: 'ml' })
      done()
    })
  })

  it('removeUserInterest issues a delete request with a body', done => {
    svc.removeUserInterest('ml').subscribe(() => {
      expect(http.request).toHaveBeenCalledWith('delete', expect.stringContaining('/user/topics'), {
        body: { interest: 'ml' },
      })
      done()
    })
  })

  it('fetchAutocompleteCompetencyV2 posts two searches and maps responseData', done => {
    http.post.mockReturnValue(of({ responseData: [{ name: 'C1' }, { name: 'C2' }] }))
    svc.fetchAutocompleteCompetencyV2('q').subscribe(rows => {
      const body = http.post.mock.calls[0][1]
      expect(body.searches).toHaveLength(2)
      expect(body.searches[0].keyword).toBe('q')
      expect(rows).toEqual([{ name: 'C1' }, { name: 'C2' }])
      done()
    })
  })

  it('createPost posts to addCompetency', done => {
    svc.createPost({ x: 1 }).subscribe(() => {
      expect(http.post).toHaveBeenCalledWith(expect.stringContaining('/competency/addCompetency'), { x: 1 })
      done()
    })
  })
})
