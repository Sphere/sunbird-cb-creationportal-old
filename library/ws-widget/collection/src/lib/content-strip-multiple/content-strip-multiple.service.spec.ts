import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ContentStripMultipleService } from './content-strip-multiple.service'
import { NsContentStripMultiple } from './content-strip-multiple.model'

describe('ContentStripMultipleService', () => {
  let service: ContentStripMultipleService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ContentStripMultipleService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(ContentStripMultipleService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('GETs the plain path when there are no query params or filters', () => {
    const request = { path: '/apis/strip/multi' } as NsContentStripMultiple.IStripRequestApi

    service.getContentStripResponseApi(request).subscribe()

    const req = httpMock.expectOne('/apis/strip/multi')
    expect(req.request.method).toBe('GET')
    req.flush({})
  })

  it('appends a query string when query params/filters are supplied', () => {
    const request = {
      path: '/apis/strip/multi',
      queryParams: { pageNo: 1, pageSize: 10, pageState: 'open', sourceFields: 'name' },
    } as NsContentStripMultiple.IStripRequestApi

    service.getContentStripResponseApi(request, { status: 'Live' }).subscribe()

    const req = httpMock.expectOne(r => r.url.startsWith('/apis/strip/multi') && r.url.includes('?'))
    expect(req.request.method).toBe('GET')
    req.flush({})
  })
})
