import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ConfigurationsService } from '@ws-widget/utils'

import { PickerContentService } from './picker-content.service'

describe('PickerContentService', () => {
  let service: PickerContentService
  let httpMock: HttpTestingController
  const sitePath = 'https://portal.test'

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PickerContentService,
        { provide: ConfigurationsService, useValue: { sitePath } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    service = TestBed.inject(PickerContentService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('removeSubset POSTs the content ids to the removeSubset endpoint', () => {
    service.removeSubset(['a', 'b']).subscribe()
    const req = httpMock.expectOne('/apis/protected/v8/content/removeSubset')
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ contentIds: ['a', 'b'] })
    req.flush({})
  })

  it('getSearchConfigs GETs search.json under the configured site path', async () => {
    const payload = { filters: [] } as any
    const promise = service.getSearchConfigs()
    const req = httpMock.expectOne(`${sitePath}/feature/search.json`)
    expect(req.request.method).toBe('GET')
    req.flush(payload)
    await expect(promise).resolves.toEqual(payload)
  })
})
