import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { KeycloakService } from 'keycloak-angular'

import { SearchApiService } from './search-api.service'

const BASE = '/apis/protected/v8'

describe('SearchApiService', () => {
  let service: SearchApiService
  let httpMock: HttpTestingController
  let keycloak: { getKeycloakInstance: jest.Mock }

  beforeEach(() => {
    keycloak = { getKeycloakInstance: jest.fn().mockReturnValue(null) }
    TestBed.configureTestingModule({
      providers: [SearchApiService, { provide: KeycloakService, useValue: keycloak }, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(SearchApiService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('getSearchResults POSTs the social search request', () => {
    service.getSearchResults({ query: 'x' } as any).subscribe()
    const req = httpMock.expectOne(`${BASE}/social/post/search`)
    expect(req.request.method).toBe('POST')
    req.flush({})
  })

  it('getSearchAutoCompleteResults GETs with q + l params', () => {
    service.getSearchAutoCompleteResults({ q: 'ang', l: 'en' }).subscribe()
    const req = httpMock.expectOne(r => r.url === `${BASE}/content/searchAutoComplete`)
    expect(req.request.params.get('q')).toBe('ang')
    expect(req.request.params.get('l')).toBe('en')
    req.flush([])
  })

  it('userId returns undefined when there is no keycloak instance', () => {
    expect(service.userId).toBeUndefined()
  })

  it('userId reads sub from the parsed token when present', () => {
    keycloak.getKeycloakInstance.mockReturnValue({ tokenParsed: { sub: 'user-9' } })
    expect(service.userId).toBe('user-9')
  })

  it('getSearchV6Results flattens a single catalogPaths filter', () => {
    const children = [{ id: 'child' }]
    let result: any
    service.getSearchV6Results({} as any).subscribe(r => (result = r))
    const req = httpMock.expectOne(`${BASE}/content/searchV6`)
    expect(req.request.method).toBe('POST')
    req.flush({ filters: [{ type: 'catalogPaths', content: [{ children }] }] })
    expect(result.filters[0].content).toEqual(children)
  })
})
