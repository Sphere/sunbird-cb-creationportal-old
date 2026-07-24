import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ContentStripNewMultipleService } from './content-strip-new-multiple.service'

// Note: distinct from the same-named class under content-strip-new-multiple/;
// this network-strip variant POSTs to an explicit url.
describe('ContentStripNewMultipleService (network-strip)', () => {
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

  it('fetchNetworkUsers POSTs the request body to the given url', () => {
    const body = { filters: { role: 'author' } }
    const payload = { result: [] } as any
    let result: unknown

    service.fetchNetworkUsers(body, '/apis/network/users').subscribe(r => (result = r))

    const req = httpMock.expectOne('/apis/network/users')
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual(body)
    req.flush(payload)
    expect(result).toEqual(payload)
  })
})
