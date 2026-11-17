import { HttpErrorResponse, HttpEventType, provideHttpClient, withInterceptors } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { AI_REVIEW_API_BASE, AI_REVIEW_PACKAGE_BASE, AiReviewService, adminParams, packagePreviewUrl } from './ai-review.service'

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
    const options = {
      addie: true,
      domain: true,
      watch: true,
      domainStyle: 'frac' as const,
      competencyId: 'C1',
      level: 2,
      positionCode: 'ANM',
      audience: 'ANM',
      language: 'auto' as const,
      context: '',
    }
    let check: unknown = null
    service.fracRole('do_1', options).subscribe(r => (check = r))
    const req = http.expectOne(`${AI_REVIEW_API_BASE}/courses/do_1/frac`)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ options })
    req.flush({ role: null, roleNote: 'No position was picked' })
    expect(check).toEqual({ role: null, roleNote: 'No position was picked', roleGap: null })
    // The position with no activities comes through as data, not only as English text.
    service.fracRole('do_1', options).subscribe(r => (check = r))
    http
      .expectOne(`${AI_REVIEW_API_BASE}/courses/do_1/frac`)
      .flush({ role: null, roleNote: 'x', roleGap: { position: 'ANM', competencies: ['C18'] } })
    expect(check).toEqual({ role: null, roleNote: 'x', roleGap: { position: 'ANM', competencies: ['C18'] } })
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

  it('gives each HTML package a preview link from its token, and nothing else one', () => {
    let review: { items: { contentId: string; packageUrl?: string | null }[] } | undefined
    service.get('r1').subscribe(r => (review = r as never))
    http.expectOne(`${AI_REVIEW_API_BASE}/reviews/r1`).flush({
      id: 'r1',
      items: [
        { contentId: 'do_h', kind: 'html', packageToken: '1790000000.sig' },
        { contentId: 'do_v', kind: 'video', packageToken: null },
      ],
    })
    expect(review!.items[0].packageUrl).toBe(`${AI_REVIEW_PACKAGE_BASE}/r1/do_h/1790000000.sig/index.html`)
    expect(review!.items[1].packageUrl).toBeUndefined()
    // Every part is encoded, so none can change the path.
    expect(packagePreviewUrl('r/1', 'do?x', 'a#b')).toBe(`${AI_REVIEW_PACKAGE_BASE}/r%2F1/do%3Fx/a%23b/index.html`)
  })

  it("reads the account's own reviews, treating a missing list as none", () => {
    let list: unknown[] | null = null
    service.pastReviews().subscribe(res => (list = res))
    const req = http.expectOne(`${AI_REVIEW_API_BASE}/reviews/mine`)
    expect(req.request.method).toBe('GET')
    req.flush({ reviews: [{ id: 'r1', source: 'course' }] })
    expect(list).toEqual([{ id: 'r1', source: 'course' }])
    service.pastReviews().subscribe(res => (list = res))
    http.expectOne(`${AI_REVIEW_API_BASE}/reviews/mine`).flush({})
    expect(list).toEqual([])
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

  it('reads the admin report with only the filters that are set', () => {
    expect(adminParams({ from: '2026-11-01', to: '', userId: ' u1 ', q: '  ' })).toEqual({ from: '2026-11-01', userId: 'u1' })
    let page: unknown = null
    service.adminReviews({ source: 'upload', q: 'BP' }, 50, 100).subscribe(p => (page = p))
    const req = http.expectOne(r => r.url === `${AI_REVIEW_API_BASE}/admin/reviews`)
    expect(req.request.method).toBe('GET')
    expect(req.request.params.get('source')).toBe('upload')
    expect(req.request.params.get('q')).toBe('BP')
    expect(req.request.params.get('limit')).toBe('50')
    expect(req.request.params.get('offset')).toBe('100')
    req.flush({ reviews: [], page: { total: 0, limit: 50, offset: 100 }, costUsd: 0 })
    expect(page).toEqual({ reviews: [], page: { total: 0, limit: 50, offset: 100 }, costUsd: 0 })
    service.adminSummary({ from: '2026-11-01' }).subscribe()
    const sum = http.expectOne(r => r.url === `${AI_REVIEW_API_BASE}/admin/summary`)
    expect(sum.request.params.keys()).toEqual(['from'])
    sum.flush({})
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

    it("words a gateway's own refusals, which carry no service message", () => {
      // Kong answers { message }, not the service's { error: { message } }.
      expect(AiReviewService.errorMessage(httpError(429, { message: 'API rate limit exceeded' }))).toMatch(/Too many AI review requests/)
      expect(AiReviewService.errorMessage(httpError(401, { message: 'Unauthorized' }))).toMatch(/Sign in again/)
      expect(AiReviewService.errorMessage(httpError(413, null))).toMatch(/too large/)
      const files = new HttpErrorResponse({ status: 403, error: null, url: `${AI_REVIEW_API_BASE}/uploads/abc` })
      expect(AiReviewService.errorMessage(files)).toMatch(/uploaded these files/)
    })

    it('says what kind of failure it was: offline, not found, too slow, unavailable', () => {
      const online = jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      expect(AiReviewService.errorMessage(httpError(0, null))).toBe("You're offline. Reconnect to the internet and try again.")
      online.mockRestore()
      expect(AiReviewService.errorMessage(httpError(404, null))).toMatch(/not available on this server/)
      expect(AiReviewService.errorMessage(httpError(504, null))).toMatch(/took too long/)
      expect(AiReviewService.errorMessage(httpError(408, null))).toMatch(/took too long/)
      expect(AiReviewService.errorMessage(httpError(503, null))).toMatch(/not available right now/)
      expect(AiReviewService.errorMessage(httpError(502, null))).toMatch(/not available right now/)
    })

    it('tells a missing endpoint from a missing record', () => {
      const missingRoute = httpError(404, { error: { code: 'NO_ENDPOINT', message: 'No such endpoint.' } })
      expect(AiReviewService.errorMessage(missingRoute)).toMatch(/not available on this server yet/)
      // A gateway with no such route answers with its own body, not the service's.
      expect(AiReviewService.errorMessage(httpError(404, '<pre>Cannot GET /x</pre>'))).toMatch(/not available on this server yet/)
      const gone = httpError(404, { error: { code: 'NOT_FOUND', message: 'This review could not be found.' } })
      expect(AiReviewService.errorMessage(gone)).toBe('This review could not be found.')
    })

    it('falls back for anything else', () => {
      expect(AiReviewService.errorMessage(httpError(500, 'oops'), 'fallback')).toBe('fallback')
      expect(AiReviewService.errorMessage(new Error('x'), 'fallback')).toBe('fallback')
      expect(AiReviewService.errorCode(new Error('x'))).toBe('')
    })
  })

  describe('files reviewed on their own', () => {
    const options = {
      addie: true,
      domain: true,
      watch: true,
      domainStyle: 'plain' as const,
      competencyId: 'C1',
      level: 2,
      levelMode: 'single' as const,
      positionCode: null,
      audience: 'ANM',
      language: 'auto' as const,
      context: '',
    }

    it('reads the setup context, signs uploads and checks them', () => {
      service.uploadContext().subscribe()
      expect(http.expectOne(`${AI_REVIEW_API_BASE}/uploads/context`).request.method).toBe('GET')

      let signed: unknown = null
      service.signUploads([{ name: 'bp.mp4', size: 10, kind: 'video' }]).subscribe(r => (signed = r))
      const sign = http.expectOne(`${AI_REVIEW_API_BASE}/uploads`)
      expect(sign.request.method).toBe('POST')
      expect(sign.request.body).toEqual({ files: [{ name: 'bp.mp4', size: 10, kind: 'video' }] })
      sign.flush({})
      expect(signed).toEqual([])

      service.checkUploads(['u1']).subscribe()
      const check = http.expectOne(`${AI_REVIEW_API_BASE}/uploads/measure`)
      expect(check.request.body).toEqual({ uploadIds: ['u1'] })
      check.flush({ uploads: [], estimateUsd: 0 })
    })

    it('switches an uploaded sheet with a PATCH of its kind only, the id encoded', () => {
      let out: unknown = null
      service.changeUploadKind('u/1', 'assessment').subscribe(r => (out = r))
      const req = http.expectOne(`${AI_REVIEW_API_BASE}/uploads/u%2F1`)
      expect(req.request.method).toBe('PATCH')
      expect(req.request.body).toEqual({ kind: 'assessment' })
      req.flush({ uploadId: 'u/1', kind: 'assessment', status: 'ready' })
      expect(out).toMatchObject({ kind: 'assessment' })
    })

    it('reads the FRAC role check, starts a review and lists past ones', () => {
      let check: unknown = null
      service.uploadFracRole(options).subscribe(r => (check = r))
      const frac = http.expectOne(`${AI_REVIEW_API_BASE}/uploads/frac`)
      expect(frac.request.body).toEqual({ options })
      frac.flush({})
      expect(check).toEqual({ role: null, roleNote: null, roleGap: null })

      service.startUploadReview('BP drafts', ['u1', 'u2'], options).subscribe()
      const start = http.expectOne(r => r.url === `${AI_REVIEW_API_BASE}/uploads/reviews` && r.method === 'POST')
      expect(start.request.body).toEqual({ title: 'BP drafts', uploadIds: ['u1', 'u2'], options })
      start.flush({ reviewId: 'r1', created: true, estimateUsd: 0.1 })

      let list: unknown = null
      service.uploadHistory().subscribe(r => (list = r))
      http.expectOne(r => r.url === `${AI_REVIEW_API_BASE}/uploads/reviews` && r.method === 'GET').flush({})
      expect(list).toEqual([])
    })

    it('sends a signed form to storage: the policy fields first, then the file, with progress', () => {
      const body = new Blob(['abc'], { type: 'video/mp4' })
      const seen: number[] = []
      service
        .uploadFile(
          { method: 'POST', url: 'https://bucket.s3.amazonaws.com/', fields: { key: 'k/1.mp4', Policy: 'p' }, headers: {}, expiresAt: '' },
          body,
        )
        .subscribe(p => seen.push(p))
      const req = http.expectOne('https://bucket.s3.amazonaws.com/')
      expect(req.request.method).toBe('POST')
      const form = req.request.body as FormData
      expect([...form.keys()]).toEqual(['key', 'Policy', 'file'])
      req.event({ type: HttpEventType.UploadProgress, loaded: 1, total: 4 })
      req.event({ type: HttpEventType.UploadProgress, loaded: 4, total: 4 })
      req.flush(null, { status: 204, statusText: 'No Content' })
      // Never 100 until storage has answered.
      expect(seen).toEqual([25, 99, 100])
    })

    it('sends a raw body with the signed headers for a PUT upload', () => {
      const body = new Blob(['{}'], { type: 'application/json' })
      service
        .uploadFile(
          { method: 'PUT', url: '/v1/uploads/local/tok', fields: {}, headers: { 'Content-Type': 'application/json' }, expiresAt: '' },
          body,
        )
        .subscribe()
      const req = http.expectOne('/v1/uploads/local/tok')
      expect(req.request.method).toBe('PUT')
      expect(req.request.body).toBe(body)
      expect(req.request.headers.get('Content-Type')).toBe('application/json')
      req.flush(null)
    })
  })
})

describe('AiReviewService uploads to storage', () => {
  it("skips the portal's interceptors, so no session header reaches storage", () => {
    TestBed.resetTestingModule()
    TestBed.configureTestingModule({
      providers: [
        AiReviewService,
        provideHttpClient(withInterceptors([(req, next) => next(req.clone({ setHeaders: { Authorization: 'Bearer session' } }))])),
        provideHttpClientTesting(),
      ],
    })
    const service = TestBed.inject(AiReviewService)
    const http = TestBed.inject(HttpTestingController)

    service
      .uploadFile({ method: 'POST', url: 'https://bucket.s3.amazonaws.com/', fields: {}, headers: {}, expiresAt: '' }, new Blob(['x']))
      .subscribe()
    expect(http.expectOne('https://bucket.s3.amazonaws.com/').request.headers.has('Authorization')).toBe(false)

    // Calls to the review service itself still carry it.
    service.uploadContext().subscribe()
    expect(http.expectOne(`${AI_REVIEW_API_BASE}/uploads/context`).request.headers.get('Authorization')).toBe('Bearer session')
    http.verify()
  })
})
