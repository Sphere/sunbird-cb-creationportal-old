import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ConfigurationsService } from '@ws-widget/utils'

import { OrgServiceService } from './org-service.service'

const SEARCH = '/apis/public/v8/publicSearch/getCourses'

describe('OrgServiceService', () => {
  let service: OrgServiceService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OrgServiceService,
        { provide: ConfigurationsService, useValue: { sitePath: 'https://site.test' } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    service = TestBed.inject(OrgServiceService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('getOrgMetadata GETs the cbp-data json (with cache buster)', () => {
    service.getOrgMetadata().subscribe()
    const req = httpMock.expectOne(r => r.url.includes('cbp-data.json'))
    expect(req.request.method).toBe('GET')
    req.flush({})
  })

  it('resolve wraps a successful metadata response as { data, error: null }', () => {
    let out: any
    service.resolve().subscribe(r => (out = r))
    httpMock.expectOne(r => r.url.includes('cbp-data.json')).flush({ org: 'x' })
    expect(out).toEqual({ data: { org: 'x' }, error: null })
  })

  it('resolve maps an error to { error, data: null }', () => {
    let out: any
    service.resolve().subscribe(r => (out = r))
    httpMock.expectOne(r => r.url.includes('cbp-data.json')).error(new ProgressEvent('fail'))
    expect(out.data).toBeNull()
    expect(out.error).toBeTruthy()
  })

  it('getSearchResults POSTs a Course filter with the source name', () => {
    service.getSearchResults('src1').subscribe()
    const req = httpMock.expectOne(SEARCH)
    expect(req.request.method).toBe('POST')
    expect(req.request.body.request.filters.sourceName).toBe('src1')
    req.flush({})
  })

  it('getSearchResultsById POSTs a Course filter with the identifier', () => {
    service.getSearchResultsById('id1').subscribe()
    const req = httpMock.expectOne(SEARCH)
    expect(req.request.body.request.filters.identifier).toBe('id1')
    req.flush({})
  })

  it('getLiveSearchResults POSTs a Course filter with the language', () => {
    service.getLiveSearchResults('en').subscribe()
    const req = httpMock.expectOne(SEARCH)
    expect(req.request.body.request.filters.lang).toBe('en')
    req.flush({})
  })

  it('setSashaktId GETs the sashakt auth endpoint with token + moduleId', () => {
    service.setSashaktId('tok', 'm1').subscribe()
    const req = httpMock.expectOne(r => r.url.startsWith('/apis/public/v8/sashaktAuth/login'))
    expect(req.request.method).toBe('GET')
    req.flush({})
  })

  it('setConnectSid POSTs the keycloak cookie endpoint with the auth code', () => {
    service.setConnectSid('code1').subscribe()
    const req = httpMock.expectOne(r => r.url.startsWith('/apis/public/v8/emailMobile/authv2'))
    expect(req.request.method).toBe('POST')
    req.flush({})
  })

  it('getDatabyOrgId GETs course.json under the site path', async () => {
    const promise = service.getDatabyOrgId()
    const req = httpMock.expectOne('https://site.test/page/course.json')
    expect(req.request.method).toBe('GET')
    req.flush({ ok: true })
    await expect(promise).resolves.toEqual({ ok: true })
  })
})
