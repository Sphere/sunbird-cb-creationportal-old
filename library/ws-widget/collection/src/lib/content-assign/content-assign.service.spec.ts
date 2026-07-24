import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ContentAssignService } from './content-assign.service'

const BASE = '/apis/protected/v8/user/content-assign'

describe('ContentAssignService', () => {
  let service: ContentAssignService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ContentAssignService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(ContentAssignService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('searchUsers POSTs the search request', () => {
    const body = { query: 'a' } as any
    service.searchUsers(body).subscribe()
    const req = httpMock.expectOne(`${BASE}/searchUsers`)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual(body)
    req.flush({})
  })

  it('getAdminLevel GETs the admin-level endpoint', () => {
    service.getAdminLevel().subscribe()
    const req = httpMock.expectOne(`${BASE}/getAdminLevel`)
    expect(req.request.method).toBe('GET')
    req.flush({})
  })

  it('assignContent POSTs the assignment request', () => {
    const body = { contentId: 'c1' } as any
    service.assignContent(body).subscribe()
    const req = httpMock.expectOne(`${BASE}/assignContent`)
    expect(req.request.method).toBe('POST')
    req.flush({})
  })

  it('getAssignments GETs with the assignmentType query', () => {
    service.getAssignments('manager').subscribe()
    const req = httpMock.expectOne(`${BASE}/getAssignments?assignmentType=manager`)
    expect(req.request.method).toBe('GET')
    req.flush({})
  })

  it('getManagerDetails POSTs the wid/rootOrg conditions', () => {
    service.getManagerDetails('w1', 'org1').subscribe()
    const req = httpMock.expectOne('/apis/protected/v8/user/details/managerDetails')
    expect(req.request.method).toBe('POST')
    expect(req.request.body.conditions.wid).toBe('w1')
    expect(req.request.body.conditions.root_org).toBe('org1')
    req.flush({})
  })
})
