import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { CertificationService } from './certification.service'

describe('CertificationService', () => {
  let service: CertificationService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CertificationService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(CertificationService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('fetchCertifications POSTs the request wrapped under a request key', () => {
    const request = { tracks: [] as never[], sortOrder: 'asc' }

    service.fetchCertifications(request).subscribe()

    const req = httpMock.expectOne(r => r.method === 'POST')
    expect(req.request.body).toEqual({ request })
    req.flush({})
  })
})
