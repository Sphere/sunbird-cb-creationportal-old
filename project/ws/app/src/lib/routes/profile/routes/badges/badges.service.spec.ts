import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { BadgesService } from './badges.service'

const BASE = '/apis/protected/v8'

describe('BadgesService', () => {
  let service: BadgesService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BadgesService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(BadgesService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('fetchBadges GETs the user badge endpoint', () => {
    const payload = { badges: [] } as any
    let result: unknown

    service.fetchBadges().subscribe(r => (result = r))

    const req = httpMock.expectOne(`${BASE}/user/badge`)
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

  it('fetchRecentBadge GETs the recent-notification endpoint and maps through', () => {
    const payload = { count: 2 } as any
    let result: unknown

    service.fetchRecentBadge().subscribe(r => (result = r))

    const req = httpMock.expectOne(`${BASE}/user/badge/notification`)
    expect(req.request.method).toBe('GET')
    req.flush(payload)
    expect(result).toEqual(payload)
  })
})
