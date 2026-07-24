import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ContentStripSingleService } from './content-strip-single.service'
import { NsContentStripSingle } from './content-strip-single.model'

describe('ContentStripSingleService', () => {
  let service: ContentStripSingleService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ContentStripSingleService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(ContentStripSingleService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('GETs the plain path when there are no query params or filters', () => {
    const request = { path: '/apis/strip/single' } as NsContentStripSingle.IStripRequestApi

    service.getContentStripResponseApi(request).subscribe()

    const req = httpMock.expectOne('/apis/strip/single')
    expect(req.request.method).toBe('GET')
    req.flush({})
  })

  it('appends a query string when query params/filters are supplied', () => {
    const request = {
      path: '/apis/strip/single',
      queryParams: { pageNo: 1, pageSize: 10, pageState: 'open' },
    } as NsContentStripSingle.IStripRequestApi

    service.getContentStripResponseApi(request, { status: 'Live' }).subscribe()

    const req = httpMock.expectOne(r => r.url.startsWith('/apis/strip/single') && r.url.includes('?'))
    expect(req.request.method).toBe('GET')
    req.flush({})
  })
})
