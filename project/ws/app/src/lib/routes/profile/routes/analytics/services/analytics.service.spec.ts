import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ConfigurationsService } from '@ws-widget/utils'

import { AnalyticsService } from './analytics.service'

describe('AnalyticsService', () => {
  let service: AnalyticsService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        { provide: ConfigurationsService, useValue: { hostPath: 'host.test' } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    service = TestBed.inject(AnalyticsService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  const expectGet = (prefix: string) => {
    const req = httpMock.expectOne(r => r.url.startsWith(prefix))
    expect(req.request.method).toBe('GET')
    req.flush({})
  }

  it('timeSpent GETs /api/timespent', () => {
    service.timeSpent('s', 'e', 'Course', 1).subscribe()
    expectGet('/api/timespent')
  })

  it('nsoArtifacts GETs /api/nsoArtifactsAndCollaborators', () => {
    service.nsoArtifacts('s', 'e', 'Course', 0).subscribe()
    expectGet('/api/nsoArtifactsAndCollaborators')
  })

  it('userProgress GETs /api/userprogress', () => {
    service.userProgress('src', 'Course').subscribe()
    expectGet('/api/userprogress')
  })

  it('assessments GETs /api/assessment', () => {
    service.assessments('s', 'e', 'Course', 1).subscribe()
    expectGet('/api/assessment?')
  })

  it('fetchAssessments GETs /api/v1/assessment', () => {
    service.fetchAssessments('s', 'e').subscribe()
    expectGet('/api/v1/assessment')
  })

  it('fetchFilterList GETs /api/progressSource', () => {
    service.fetchFilterList().subscribe()
    expectGet('/api/progressSource')
  })
})
