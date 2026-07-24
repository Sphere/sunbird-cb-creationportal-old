import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { NotificationApiService } from './notification-api.service'

const API_BASE = '/apis/protected/v8/user/notifications'

describe('NotificationApiService', () => {
  let service: NotificationApiService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificationApiService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(NotificationApiService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('getNotifications GETs with no params when nothing is supplied', () => {
    service.getNotifications().subscribe()
    const req = httpMock.expectOne(r => r.url === API_BASE)
    expect(req.request.params.keys().length).toBe(0)
    req.flush({})
  })

  it('getNotifications forwards classification/size/page params', () => {
    service.getNotifications('course', 20, '2').subscribe()
    const req = httpMock.expectOne(r => r.url === API_BASE)
    expect(req.request.params.get('classification')).toBe('course')
    expect(req.request.params.get('size')).toBe('20')
    expect(req.request.params.get('page')).toBe('2')
    req.flush({})
  })

  it('getCount GETs the unseen-count endpoint', () => {
    service.getCount().subscribe()
    const req = httpMock.expectOne('/apis/protected/v8/user/iconBadge/unseenNotificationCount')
    expect(req.request.method).toBe('GET')
    req.flush(3)
  })

  it('updateNotificationSeenStatus PATCHes the specific notification when id + classification given', () => {
    service.updateNotificationSeenStatus('n1', 'course' as any, false).subscribe()
    const req = httpMock.expectOne(`${API_BASE}/n1/course`)
    expect(req.request.method).toBe('PATCH')
    expect(req.request.body).toEqual({ seen: false })
    req.flush({})
  })

  it('updateNotificationSeenStatus PATCHes the base with empty body when no id', () => {
    service.updateNotificationSeenStatus().subscribe()
    const req = httpMock.expectOne(r => r.url === API_BASE && r.method === 'PATCH')
    expect(req.request.body).toEqual({})
    req.flush({})
  })
})
