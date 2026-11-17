import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { AccessControlService } from '../../../../modules/shared/services/access-control.service'
import { AiReviewMarksService, MARKS_BATCH_MS, MARKS_FRESH_MS } from './ai-review-marks.service'

describe('AiReviewMarksService', () => {
  let svc: AiReviewMarksService
  let http: HttpTestingController
  let allowed: boolean

  beforeEach(() => {
    jest.useFakeTimers()
    allowed = true
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AccessControlService, useValue: { canUseAiReview: () => allowed } },
      ],
    })
    svc = TestBed.inject(AiReviewMarksService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => {
    http.verify()
    jest.useRealTimers()
  })

  const latest = () => http.expectOne(r => r.url === '/apis/protected/v8/courseReview/reviews/latest')

  it('asks once for all the cards on screen, and marks the courses that have a report', () => {
    svc.request('do_a')
    svc.request('do_b')
    svc.request('do_a')
    jest.advanceTimersByTime(MARKS_BATCH_MS)
    const req = latest()
    expect(req.request.params.get('courseIds')).toBe('do_a,do_b')
    req.flush({ reports: [{ courseId: 'do_a', reviewId: 'r1', status: 'done', finishedAt: '2026-11-16T10:00:00Z' }] })
    expect(svc.marks().get('do_a')?.reviewId).toBe('r1')
    expect(svc.marks().has('do_b')).toBe(false)
  })

  it('does not ask again within a short while, and asks again after it (a review may have finished)', () => {
    svc.request('do_a')
    jest.advanceTimersByTime(MARKS_BATCH_MS)
    latest().flush({ reports: [{ courseId: 'do_a', reviewId: 'r1', status: 'done', finishedAt: null }] })
    svc.request('do_a')
    jest.advanceTimersByTime(MARKS_BATCH_MS)
    http.expectNone(r => r.url.endsWith('/reviews/latest'))
    jest.advanceTimersByTime(MARKS_FRESH_MS)
    svc.request('do_a')
    jest.advanceTimersByTime(MARKS_BATCH_MS)
    // Its report was replaced and the newer one removed: the mark goes.
    latest().flush({ reports: [] })
    expect(svc.marks().has('do_a')).toBe(false)
  })

  it('asks nothing for users without AI review, or without a course', () => {
    allowed = false
    svc.request('do_a')
    svc.request(null)
    jest.advanceTimersByTime(MARKS_BATCH_MS)
    http.expectNone(r => r.url.endsWith('/reviews/latest'))
  })

  it('leaves the cards without a mark when the lookup fails, and forgets everything on reset', () => {
    svc.request('do_a')
    jest.advanceTimersByTime(MARKS_BATCH_MS)
    latest().flush('down', { status: 502, statusText: 'Bad Gateway' })
    expect(svc.marks().size).toBe(0)
    svc.reset()
    svc.request('do_a')
    jest.advanceTimersByTime(MARKS_BATCH_MS)
    latest().flush({ reports: [] })
  })
})
