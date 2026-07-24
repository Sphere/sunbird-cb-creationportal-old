import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ConfigurationsService } from '@ws-widget/utils'

import { FracService } from './frac.service'

describe('FracService', () => {
  let service: FracService
  let httpMock: HttpTestingController
  const baseUrl = 'https://portal.test'

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FracService, { provide: ConfigurationsService, useValue: { baseUrl } }, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(FracService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('fetchFrac GETs frac.json under the configured base url and resolves the body', async () => {
    const payload = { competencies: [] } as any

    const promise = service.fetchFrac()

    const req = httpMock.expectOne(`${baseUrl}/feature/frac.json`)
    expect(req.request.method).toBe('GET')
    req.flush(payload)

    await expect(promise).resolves.toEqual(payload)
  })
})
