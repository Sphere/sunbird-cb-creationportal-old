import { HttpErrorResponse, provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { AI_REVIEW_API_BASE, AiReviewService } from './ai-review.service'

describe('AiReviewService', () => {
  let service: AiReviewService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AiReviewService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(AiReviewService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('reads the preview of a course', () => {
    service.preview('do_1').subscribe()
    const req = http.expectOne(`${AI_REVIEW_API_BASE}/courses/do_1/preview`)
    expect(req.request.method).toBe('GET')
    req.flush({})
  })

  it('starts a review with the course id and options', () => {
    const options = {
      addie: true,
      domain: false,
      watch: true,
      domainStyle: 'plain' as const,
      competencyId: null,
      level: null,
      audience: 'ANM',
      language: 'auto' as const,
      context: '',
    }
    let reviewId = ''
    service.start('do_1', options).subscribe(res => (reviewId = res.reviewId))
    const req = http.expectOne(`${AI_REVIEW_API_BASE}/reviews`)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ courseId: 'do_1', options })
    req.flush({ reviewId: 'r1', created: true, estimateUsd: 0.1 })
    expect(reviewId).toBe('r1')
  })

  it('asks which unchanged resources would be reused, treating a missing list as none', () => {
    const options = {
      addie: true,
      domain: false,
      watch: true,
      domainStyle: 'plain' as const,
      competencyId: null,
      level: null,
      audience: 'ANM',
      language: 'auto' as const,
      context: '',
    }
    let reused: unknown = null
    service.reuse('do_1', options).subscribe(r => (reused = r))
    const req = http.expectOne(`${AI_REVIEW_API_BASE}/courses/do_1/reuse`)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ options })
    req.flush({ reused: [{ contentId: 'do_v', reviewedAt: '2026-10-30T09:00:00Z' }] })
    expect(reused).toEqual([{ contentId: 'do_v', reviewedAt: '2026-10-30T09:00:00Z' }])

    service.reuse('do_1', options).subscribe(r => (reused = r))
    http.expectOne(`${AI_REVIEW_API_BASE}/courses/do_1/reuse`).flush({})
    expect(reused).toEqual([])
  })

  it('reads the pages and questions of a course, treating a missing list as none', () => {
    let sizes: unknown = null
    service.measure('do_1').subscribe(r => (sizes = r))
    const req = http.expectOne(`${AI_REVIEW_API_BASE}/courses/do_1/measure`)
    expect(req.request.method).toBe('GET')
    req.flush({ resources: [{ contentId: 'do_p', pages: 4, estimate: { base: 0, addie: 0.04, domain: 0.1, watch: 0 } }] })
    expect(sizes).toEqual([{ contentId: 'do_p', pages: 4, estimate: { base: 0, addie: 0.04, domain: 0.1, watch: 0 } }])

    service.measure('do_1').subscribe(r => (sizes = r))
    http.expectOne(`${AI_REVIEW_API_BASE}/courses/do_1/measure`).flush({})
    expect(sizes).toEqual([])
  })

  it('reads the FRAC role check for the settings', () => {
    const options = { addie: true, domain: true, watch: true, domainStyle: 'frac' as const, competencyId: 'C1', level: 2, positionCode: 'ANM', audience: 'ANM', language: 'auto' as const, context: '' }
    let check: unknown = null
    service.fracRole('do_1', options).subscribe(r => (check = r))
    const req = http.expectOne(`${AI_REVIEW_API_BASE}/courses/do_1/frac`)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ options })
    req.flush({ role: null, roleNote: 'No position was picked' })
    expect(check).toEqual({ role: null, roleNote: 'No position was picked' })
  })

  it('reads, lists and cancels', () => {
    service.get('r1').subscribe()
    http.expectOne(`${AI_REVIEW_API_BASE}/reviews/r1`).flush({})

    let list: unknown[] = []
    service.history('do_1').subscribe(res => (list = res))
    const listReq = http.expectOne(r => r.url === `${AI_REVIEW_API_BASE}/reviews`)
    expect(listReq.request.params.get('courseId')).toBe('do_1')
    listReq.flush({ reviews: [{ id: 'r1' }] })
    expect(list).toEqual([{ id: 'r1' }])

    service.cancel('r1').subscribe()
    expect(http.expectOne(`${AI_REVIEW_API_BASE}/reviews/r1`).request.method).toBe('DELETE')

  })

  it('treats a missing list as empty', () => {
    let list: unknown[] | null = null
    service.history('do_1').subscribe(res => (list = res))
    http.expectOne(r => r.url === `${AI_REVIEW_API_BASE}/reviews`).flush({})
    expect(list).toEqual([])
  })

  it('percent-encodes ids', () => {
    service.get('a/b').subscribe()
    http.expectOne(`${AI_REVIEW_API_BASE}/reviews/a%2Fb`).flush({})
  })

  describe('errorMessage / errorCode', () => {
    const httpError = (status: number, error: unknown) => new HttpErrorResponse({ status, error })

    it("uses the service's own message and code", () => {
      const err = httpError(429, { error: { code: 'TOO_MANY_ACTIVE', message: 'You already have 2 reviews running.' } })
      expect(AiReviewService.errorMessage(err)).toBe('You already have 2 reviews running.')
      expect(AiReviewService.errorCode(err)).toBe('TOO_MANY_ACTIVE')
    })

    it('explains a network failure and a 403', () => {
      expect(AiReviewService.errorMessage(httpError(0, null))).toMatch(/Could not reach/)
      expect(AiReviewService.errorMessage(httpError(403, null))).toMatch(/creator, reviewers and publishers/)
    })

    it('says what kind of failure it was: offline, not found, too slow, unavailable', () => {
      const online = jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      expect(AiReviewService.errorMessage(httpError(0, null))).toBe("You're offline. Reconnect to the internet and try again.")
      online.mockRestore()
      expect(AiReviewService.errorMessage(httpError(404, null))).toMatch(/not found/)
      expect(AiReviewService.errorMessage(httpError(504, null))).toMatch(/took too long/)
      expect(AiReviewService.errorMessage(httpError(408, null))).toMatch(/took too long/)
      expect(AiReviewService.errorMessage(httpError(503, null))).toMatch(/not available right now/)
      expect(AiReviewService.errorMessage(httpError(502, null))).toMatch(/not available right now/)
    })

    it('falls back for anything else', () => {
      expect(AiReviewService.errorMessage(httpError(500, 'oops'), 'fallback')).toBe('fallback')
      expect(AiReviewService.errorMessage(new Error('x'), 'fallback')).toBe('fallback')
      expect(AiReviewService.errorCode(new Error('x'))).toBe('')
    })
  })
})
