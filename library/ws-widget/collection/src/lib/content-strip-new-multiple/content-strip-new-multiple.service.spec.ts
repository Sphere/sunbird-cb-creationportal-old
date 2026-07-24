import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ContentStripNewMultipleService } from './content-strip-new-multiple.service'
import { NsContentStripNewMultiple } from './content-strip-new-multiple.model'

describe('ContentStripNewMultipleService', () => {
  let service: ContentStripNewMultipleService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ContentStripNewMultipleService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(ContentStripNewMultipleService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('GETs the plain path when there are no query params or filters', () => {
    const request = { path: '/apis/strip/new-multi' } as NsContentStripNewMultiple.IStripRequestApi

    service.getContentStripResponseApi(request).subscribe()

    const req = httpMock.expectOne('/apis/strip/new-multi')
    expect(req.request.method).toBe('GET')
    req.flush({})
  })

  it('appends a query string when query params/filters are supplied', () => {
    const request = {
      path: '/apis/strip/new-multi',
      queryParams: { pageNo: 1, pageSize: 10, pageState: 'open', sourceFields: 'name' },
    } as NsContentStripNewMultiple.IStripRequestApi

    service.getContentStripResponseApi(request, { status: 'Live' }).subscribe()

    const req = httpMock.expectOne(r => r.url.startsWith('/apis/strip/new-multi') && r.url.includes('?'))
    expect(req.request.method).toBe('GET')
    req.flush({})
  })
})
