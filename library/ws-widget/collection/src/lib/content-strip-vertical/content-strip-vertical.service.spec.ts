import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ContentStripVerticalService } from './content-strip-vertical.service'
import { NsContentStripVertical } from './content-strip-vertical.model'

describe('ContentStripVerticalService', () => {
  let service: ContentStripVerticalService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ContentStripVerticalService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(ContentStripVerticalService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('GETs the plain path when there are no query params or filters', () => {
    const request = { path: '/apis/strip/vertical' } as NsContentStripVertical.IStripRequestApi

    service.getContentStripResponseApi(request).subscribe()

    const req = httpMock.expectOne('/apis/strip/vertical')
    expect(req.request.method).toBe('GET')
    req.flush({})
  })

  it('appends a query string when query params/filters are supplied', () => {
    const request = {
      path: '/apis/strip/vertical',
      queryParams: { pageNo: 1, pageSize: 10, pageState: 'open', sourceFields: 'name' },
    } as NsContentStripVertical.IStripRequestApi

    service.getContentStripResponseApi(request, { status: 'Live' }).subscribe()

    const req = httpMock.expectOne(r => r.url.startsWith('/apis/strip/vertical') && r.url.includes('?'))
    expect(req.request.method).toBe('GET')
    req.flush({})
  })
})
