import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ApiService } from './api.service'
import { AUTHORING_BASE } from '../../../constants/apiEndpoints'

describe('ApiService', () => {
  let service: ApiService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(ApiService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  describe('base64', () => {
    it('base64-encodes the body for AUTHORING_BASE urls', () => {
      const out = service.base64(`${AUTHORING_BASE}/content`, { a: 1 })
      expect(out).toHaveProperty('data')
      expect(typeof out.data).toBe('string')
    })

    it('returns the body untouched for non-authoring urls', () => {
      const body = { a: 1 }
      expect(service.base64('/apis/other', body)).toBe(body)
    })
  })

  it('get issues a GET', () => {
    service.get('/apis/other').subscribe()
    const req = httpMock.expectOne('/apis/other')
    expect(req.request.method).toBe('GET')
    req.flush({})
  })

  it('post with doEncoding=false sends the raw body', () => {
    const body = { a: 1 }
    service.post(`${AUTHORING_BASE}/x`, body, false).subscribe()
    const req = httpMock.expectOne(`${AUTHORING_BASE}/x`)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual(body)
    req.flush({})
  })

  it('post with encoding sends an encoded body for authoring urls', () => {
    service.post(`${AUTHORING_BASE}/x`, { a: 1 }).subscribe()
    const req = httpMock.expectOne(`${AUTHORING_BASE}/x`)
    expect(req.request.body).toHaveProperty('data')
    req.flush({})
  })

  it('put / patch / delete issue their verbs', () => {
    service.put('/apis/other', { a: 1 }).subscribe()
    httpMock.expectOne(r => r.method === 'PUT').flush({})

    service.patch('/apis/other', { a: 1 }).subscribe()
    httpMock.expectOne(r => r.method === 'PATCH').flush({})

    service.delete('/apis/other').subscribe()
    httpMock.expectOne(r => r.method === 'DELETE').flush({})
  })
})
