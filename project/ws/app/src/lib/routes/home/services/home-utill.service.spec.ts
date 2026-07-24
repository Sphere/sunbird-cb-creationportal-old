import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ProfileV2UtillService } from './home-utill.service'

const BASE = '/apis/protected/v8'

describe('ProfileV2UtillService', () => {
  let service: ProfileV2UtillService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProfileV2UtillService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(ProfileV2UtillService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('fetchBadges GETs the per-user badge endpoint', () => {
    const payload = { badges: [] } as any
    let result: unknown

    service.fetchBadges('wid-123').subscribe(r => (result = r))

    const req = httpMock.expectOne(`${BASE}/user/badge/for/wid-123`)
    expect(req.request.method).toBe('GET')
    req.flush(payload)
    expect(result).toEqual(payload)
  })

  it('reCalculateBadges POSTs an empty body to the update endpoint', () => {
    service.reCalculateBadges().subscribe()

    const req = httpMock.expectOne(`${BASE}/user/badge/update`)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({})
    req.flush({})
  })

  it('fetchRecentBadge GETs the recent-notification endpoint', () => {
    const payload = { count: 1 } as any
    let result: unknown

    service.fetchRecentBadge().subscribe(r => (result = r))

    const req = httpMock.expectOne(`${BASE}/user/badge/notification`)
    expect(req.request.method).toBe('GET')
    req.flush(payload)
    expect(result).toEqual(payload)
  })
})
