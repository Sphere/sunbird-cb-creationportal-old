import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { SignupService } from './signup.service'

describe('SignupService', () => {
  let service: SignupService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SignupService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(SignupService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('signup POSTs to the public signup endpoint and unwraps result', () => {
    const body = { email: 'a@b.com' }
    let result: unknown

    service.signup(body).subscribe(r => (result = r))

    const req = httpMock.expectOne('/apis/public/v8/signup')
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual(body)
    req.flush({ result: { id: 'u1' } })
    expect(result).toEqual({ id: 'u1' })
  })
})
