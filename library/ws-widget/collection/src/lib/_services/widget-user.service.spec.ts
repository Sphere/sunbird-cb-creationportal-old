import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { WidgetUserService } from './widget-user.service'

describe('WidgetUserService', () => {
  let service: WidgetUserService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WidgetUserService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(WidgetUserService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('fetchUserGroupDetails GETs the fetchUserGroup endpoint with the userId', () => {
    const payload = [{ id: 'g1' }] as any
    let result: unknown

    service.fetchUserGroupDetails('user-1').subscribe(r => (result = r))

    const req = httpMock.expectOne('/apis/protected/v8/user/group/fetchUserGroup?userId=user-1')
    expect(req.request.method).toBe('GET')
    req.flush(payload)
    expect(result).toEqual(payload)
  })

  it('handleError maps an ErrorEvent to a thrown message', done => {
    const errorEvent = { error: new ErrorEvent('boom', { message: 'kaboom' }) } as any

    service.handleError(errorEvent).subscribe({
      error: (msg: string) => {
        expect(msg).toBe('Error: kaboom')
        done()
      },
    })
  })
})
