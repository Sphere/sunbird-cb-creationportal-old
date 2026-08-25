import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ConfigurationsService } from '@ws-widget/utils'

import { AssessmentService } from './competency.service'

describe('AssessmentService', () => {
  let service: AssessmentService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AssessmentService,
        { provide: ConfigurationsService, useValue: { hostPath: 'host.test' } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    service = TestBed.inject(AssessmentService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('getDetails GETs the assessment endpoint directly', () => {
    service.getDetails('s', 'e').subscribe()
    const req = httpMock.expectOne(r => r.url.startsWith('/api/v1/assessment'))
    expect(req.request.method).toBe('GET')
    req.flush({})
  })

  it('getAssessmentDetails fetches once and maps assessments to achievements', () => {
    const obs = service.getAssessmentDetails('s', 'e')
    const req = httpMock.expectOne(r => r.url.startsWith('/api/v1/assessment'))
    req.flush({ assessments: [{ id: 'a1' }] })

    let result: any
    obs.subscribe(r => (result = r))
    expect(result.achievements).toEqual([{ id: 'a1' }])
  })

  it('getAssessmentForID triggers a fetch and emits (mapped) data', () => {
    let emitted = false
    service.getAssessmentForID('a1', 's', 'e').subscribe(() => (emitted = true))
    httpMock.expectOne(r => r.url.startsWith('/api/v1/assessment')).flush({ assessments: [{ id: 'a1' }] })
    expect(emitted).toBe(true)
  })
})
