import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { TreeCatalogService } from './tree-catalog.service'

describe('TreeCatalogService', () => {
  let service: TreeCatalogService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TreeCatalogService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(TreeCatalogService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('getCatalog POSTs type + tags when both are supplied', () => {
    service.getCatalog('/apis/cat', 'course', 'tag1').subscribe()
    const req = httpMock.expectOne('/apis/cat')
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ type: 'course', tags: 'tag1' })
    req.flush([])
  })

  it('getCatalog falls back to the full catalog when type/tags are missing', () => {
    service.getCatalog('/apis/cat').subscribe()
    const req = httpMock.expectOne('/apis/cat')
    expect(req.request.method).toBe('GET')
    req.flush([])
  })

  it('getFullCatalog caches the response and does not refetch', () => {
    const catalog = [{ id: '1' }] as any
    let first: unknown
    service.getFullCatalog('/apis/cat').subscribe(c => (first = c))
    httpMock.expectOne('/apis/cat').flush(catalog)
    expect(first).toEqual(catalog)

    // Second call must be served from cache — no new HTTP request.
    let second: unknown
    service.getFullCatalog('/apis/cat').subscribe(c => (second = c))
    httpMock.expectNone('/apis/cat')
    expect(second).toEqual(catalog)
  })

  it('getFullCatalog defaults to the catalog endpoint when no url is given', () => {
    service.getFullCatalog().subscribe()
    const req = httpMock.expectOne('/apis/protected/v8/catalog')
    expect(req.request.method).toBe('GET')
    req.flush([])
  })
})
