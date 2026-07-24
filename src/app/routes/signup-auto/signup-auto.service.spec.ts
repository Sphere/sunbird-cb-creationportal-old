import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { SignupAutoService } from './signup-auto.service'

describe('SignupAutoService', () => {
  let service: SignupAutoService
  let httpMock: HttpTestingController

  beforeEach(() => {
    // The service builds its own HttpClient from the injected HttpBackend;
    // provideHttpClientTesting swaps in the testing backend, so requests are
    // still captured by HttpTestingController.
    TestBed.configureTestingModule({
      providers: [SignupAutoService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(SignupAutoService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('signup POSTs to the auto-signup create endpoint with the id', () => {
    let result: unknown

    service.signup('abc').subscribe(r => (result = r))

    const req = httpMock.expectOne('/apis/public/v8/signup/create/abc')
    expect(req.request.method).toBe('POST')
    req.flush({ ok: true })
    expect(result).toEqual({ ok: true })
  })
})
