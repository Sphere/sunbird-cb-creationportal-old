import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ConfigurationsService } from '@ws-widget/utils'

import { IntranetSelectorService } from './intranet-selector.service'

describe('IntranetSelectorService', () => {
  let service: IntranetSelectorService
  let httpMock: HttpTestingController

  function setup(instanceConfig?: unknown) {
    TestBed.configureTestingModule({
      providers: [
        IntranetSelectorService,
        { provide: ConfigurationsService, useValue: { instanceConfig } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    service = TestBed.inject(IntranetSelectorService)
    httpMock = TestBed.inject(HttpTestingController)
  }

  afterEach(() => httpMock.verify())

  it('isLoading GETs the configured intranet url when present', () => {
    setup({ intranetUrlToCheck: 'https://corp.intranet/health' })
    service.isLoading()
    const req = httpMock.expectOne('https://corp.intranet/health')
    expect(req.request.method).toBe('GET')
    req.flush('ok')
  })

  it('isLoading falls back to the default intranet url when config is absent', () => {
    setup(undefined)
    service.isLoading()
    const req = httpMock.expectOne('https://intranet.link')
    expect(req.request.method).toBe('GET')
    req.flush('ok')
  })

  it('isLoading honours an explicitly passed url', () => {
    setup(undefined)
    service.isLoading('https://explicit.url/ping')
    const req = httpMock.expectOne('https://explicit.url/ping')
    expect(req.request.method).toBe('GET')
    req.flush('ok')
  })
})
