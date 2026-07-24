import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ConfigurationsService } from '@ws-widget/utils'

import { ProfileService } from './profile.service'

describe('ProfileService', () => {
  let service: ProfileService
  let httpMock: HttpTestingController
  const sitePath = 'https://site.test'

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProfileService,
        { provide: ConfigurationsService, useValue: { sitePath, hostPath: 'host.test' } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    service = TestBed.inject(ProfileService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('fetchConfigFile GETs profile.json under the site path', () => {
    service.fetchConfigFile().subscribe()
    const req = httpMock.expectOne(`${sitePath}/feature/profile.json`)
    expect(req.request.method).toBe('GET')
    req.flush({})
  })

  it('timeSpent GETs the timespent endpoint with the date range', () => {
    service.timeSpent('2026-01-01', '2026-02-01', 'Course', 1).subscribe()
    const req = httpMock.expectOne(r => r.url.startsWith('/api/timespent'))
    expect(req.request.method).toBe('GET')
    req.flush({})
  })

  it('nsoArtifacts GETs the nso endpoint', () => {
    service.nsoArtifacts('2026-01-01', '2026-02-01', 'Course', 0).subscribe()
    const req = httpMock.expectOne(r => r.url.startsWith('/api/nsoArtifactsAndCollaborators'))
    expect(req.request.method).toBe('GET')
    req.flush({})
  })

  it('getDashBoard GETs the org-graph endpoint with start/end dates', () => {
    service.getDashBoard('2026-01-01', '2026-02-01').subscribe()
    const req = httpMock.expectOne(r => r.url.startsWith('/apis/protected/v8/user/dashboard/userOrgTime'))
    expect(req.request.method).toBe('GET')
    req.flush({})
  })
})
