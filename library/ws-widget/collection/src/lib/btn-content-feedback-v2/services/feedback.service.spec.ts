import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { FeedbackService } from './feedback.service'

const BASE = '/apis/protected/v8/user/feedbackV2'

describe('FeedbackService', () => {
  let service: FeedbackService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FeedbackService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(FeedbackService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('searchFeedback POSTs the query to /search', () => {
    service.searchFeedback({ q: 'x' } as any).subscribe()
    const req = httpMock.expectOne(`${BASE}/search`)
    expect(req.request.method).toBe('POST')
    req.flush({})
  })

  it('getFeedbackThread GETs by feedback id', () => {
    service.getFeedbackThread('f1').subscribe()
    const req = httpMock.expectOne(`${BASE}/f1`)
    expect(req.request.method).toBe('GET')
    req.flush([])
  })

  it('submitPlatformFeedback POSTs to /platform', () => {
    service.submitPlatformFeedback({} as any).subscribe()
    httpMock.expectOne(`${BASE}/platform`).flush({})
  })

  it('contentShareNew POSTs to the share endpoint', () => {
    service.contentShareNew({} as any).subscribe()
    const req = httpMock.expectOne('/apis/protected/v8/user/share/content')
    expect(req.request.method).toBe('POST')
    req.flush({})
  })

  it('submitContentFeedback POSTs to /content/:id', () => {
    service.submitContentFeedback({ contentId: 'c1' } as any).subscribe()
    httpMock.expectOne(`${BASE}/content/c1`).flush({})
  })

  it('submitContentRequest POSTs to /content-request', () => {
    service.submitContentRequest({} as any).subscribe()
    httpMock.expectOne(`${BASE}/content-request`).flush({})
  })

  it('submitServiceRequest POSTs to /service-request', () => {
    service.submitServiceRequest({} as any).subscribe()
    httpMock.expectOne(`${BASE}/service-request`).flush({})
  })

  it('getFeedbackSummary GETs /feedback-summary', () => {
    service.getFeedbackSummary().subscribe()
    httpMock.expectOne(`${BASE}/feedback-summary`).flush({})
  })

  it('updateFeedbackStatus PATCHes with an optional category query', () => {
    service.updateFeedbackStatus('r1', 'bug').subscribe()
    const req = httpMock.expectOne(`${BASE}/r1?category=bug`)
    expect(req.request.method).toBe('PATCH')
    req.flush({})
  })

  it('updateFeedbackStatus PATCHes without a category when none given', () => {
    service.updateFeedbackStatus('r1').subscribe()
    const req = httpMock.expectOne(`${BASE}/r1`)
    expect(req.request.method).toBe('PATCH')
    req.flush({})
  })

  it('getFeedbackConfig GETs /config', () => {
    service.getFeedbackConfig().subscribe()
    httpMock.expectOne(`${BASE}/config`).flush({})
  })
})
