import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { LearningHistoryService } from './learning-history.service'

const BASE = '/apis/protected/v8/user'

describe('LearningHistoryService', () => {
  let service: LearningHistoryService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LearningHistoryService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(LearningHistoryService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('fetchContentProgress GETs the course-dashboard endpoint with query params', () => {
    service.fetchContentProgress('open', 10, 'Live', 'Course').subscribe()
    const req = httpMock.expectOne(r => r.url.startsWith(`${BASE}/dashboard/course`) && r.url.includes('pageState=open'))
    expect(req.request.method).toBe('GET')
    req.flush({})
  })

  it('fetchChildProgress POSTs the children ids', () => {
    service.fetchChildProgress(['a', 'b']).subscribe()
    const req = httpMock.expectOne(`${BASE}/dashboard/course/details`)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual(['a', 'b'])
    req.flush({})
  })

  it('fetchCertification POSTs the default tracks/sortOrder body', () => {
    service.fetchCertification().subscribe()
    const req = httpMock.expectOne(`${BASE}/certification`)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ tracks: [], sortOrder: 'desc' })
    req.flush({})
  })
})
