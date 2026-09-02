import { ContentProgressService } from './content-progress.service'
import { of } from 'rxjs'
import { take } from 'rxjs/operators'

describe('ContentProgressService', () => {
  let http: { get: jest.Mock; post: jest.Mock }
  let svc: ContentProgressService

  beforeEach(() => {
    http = { get: jest.fn(() => of([])), post: jest.fn(() => of({})) }
    svc = new ContentProgressService(http as any)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('getComments GETs the course comments endpoint with courseId', done => {
    svc.getComments('C1').subscribe(() => {
      expect(http.get).toHaveBeenCalledWith(expect.stringContaining('course?courseId=C1'))
      done()
    })
  })

  it('addComment POSTs to the create-comment endpoint', done => {
    svc.addComment({ text: 'hi' }).subscribe(() => {
      expect(http.post).toHaveBeenCalledWith(expect.stringContaining('/comments/create'), { text: 'hi' })
      done()
    })
  })

  it('fetchProgressHashContentsId POSTs contentIds to the progress endpoint', done => {
    svc.fetchProgressHashContentsId(['a', 'b']).subscribe(() => {
      expect(http.post).toHaveBeenCalledWith(expect.stringContaining('/user/progress'), ['a', 'b'])
      done()
    })
  })

  it('updateProgressHash merges new_progress into the hash and emits', done => {
    // seed internal hash
    ;(svc as any).progressHash = { c1: 10 }
    svc
      .getProgressHash()
      .pipe(take(1))
      .subscribe(hash => {
        expect(hash).toEqual({ c1: 55 })
        done()
      })
    svc.updateProgressHash({ c1: { new_progress: 55 } })
  })

  it('getProgressFor maps the hash to a single id progress', done => {
    ;(svc as any).progressHash = { c9: 42 }
    ;(svc as any).progressHashSubject.next({ c9: 42 })
    svc
      .getProgressFor('c9')
      .pipe(take(1))
      .subscribe(v => {
        expect(v).toBe(42)
        done()
      })
  })
})
