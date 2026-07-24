import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { SettingsService } from './settings.service'

const NOTIFICATIONS_URL = '/apis/protected/v8/user/notifications/settings'

describe('SettingsService', () => {
  let service: SettingsService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SettingsService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(SettingsService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('fetchNotificationSettings GETs the notifications settings endpoint', () => {
    const payload = [{ id: 'g1' }] as any
    let result: unknown

    service.fetchNotificationSettings().subscribe(r => (result = r))

    const req = httpMock.expectOne(NOTIFICATIONS_URL)
    expect(req.request.method).toBe('GET')
    req.flush(payload)
    expect(result).toEqual(payload)
  })

  it('updateNotificationSettings PATCHes the body to the endpoint', () => {
    const body = [{ id: 'g1', enabled: true }] as any

    service.updateNotificationSettings(body).subscribe()

    const req = httpMock.expectOne(NOTIFICATIONS_URL)
    expect(req.request.method).toBe('PATCH')
    expect(req.request.body).toEqual(body)
    req.flush({})
  })
})
