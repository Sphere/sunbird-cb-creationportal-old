import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'

import { ConfigurationsService } from '@ws-widget/utils/src/lib/services/configurations.service'

import { WidgetContentService } from './widget-content.service'

describe('WidgetContentService', () => {
  let service: WidgetContentService
  let httpMock: HttpTestingController
  let configSvc: any

  beforeEach(() => {
    configSvc = { userProfile: { country: 'India' } }
    TestBed.configureTestingModule({
      providers: [
        WidgetContentService,
        { provide: ConfigurationsService, useValue: configSvc },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    service = TestBed.inject(WidgetContentService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('readcontentV3 GETs the hierarchy and unwraps result.content', done => {
    service.readcontentV3('c1').subscribe(content => {
      expect(content).toEqual({ name: 'inner' })
      done()
    })
    const req = httpMock.expectOne('/apis/proxies/v8/action/content/v3/hierarchy/c1?mode=edit')
    expect(req.request.method).toBe('GET')
    req.flush({ result: { content: { name: 'inner' } } })
  })

  it('fetchContent POSTs additionalFields with the hierarchy type in the url', () => {
    service.fetchContent('c2', 'minimal', ['x']).subscribe()
    const req = httpMock.expectOne('/apis/protected/v8/content/c2?hierarchyType=minimal')
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ additionalFields: ['x'] })
    req.flush({})
  })

  it('fetchAuthoringContent GETs the authoring read endpoint', () => {
    service.fetchAuthoringContent('c3').subscribe()
    const req = httpMock.expectOne('/apis/authApi/content/v3/read/c3?mode=edit')
    expect(req.request.method).toBe('GET')
    req.flush({})
  })

  it('fetchMultipleContent joins ids with commas', () => {
    service.fetchMultipleContent(['a', 'b']).subscribe()
    const req = httpMock.expectOne('/apis/protected/v8/content/multiple/a,b')
    expect(req.request.method).toBe('GET')
    req.flush([])
  })

  it('fetchCollectionHierarchy builds the paged collection url', () => {
    service.fetchCollectionHierarchy('course', 'id1', 2, 5).subscribe()
    const req = httpMock.expectOne('/apis/protected/v8/content/collection/course/id1?pageNumber=2&pageSize=5')
    req.flush({})
  })

  it('saveContinueLearning POSTs to the continue endpoint', () => {
    service.saveContinueLearning({ resourceId: 'r' } as any).subscribe()
    const req = httpMock.expectOne('/apis/protected/v8/user/history/continue')
    expect(req.request.method).toBe('POST')
    req.flush({})
  })

  it('setS3Cookie swallows errors and emits true', done => {
    service.setS3Cookie('c4').subscribe(res => {
      expect(res).toBe(true)
      done()
    })
    httpMock.expectOne('/apis/protected/v8/content/setCookie').error(new ProgressEvent('err'))
  })

  it('search defaults an empty query and wraps the request', () => {
    service.search({} as any).subscribe()
    const req = httpMock.expectOne('/apis/protected/v8/content/searchV5')
    expect(req.request.body.request.query).toBe('')
    req.flush({})
  })

  it('searchV6 posts the request directly', () => {
    service.searchV6({ query: 'hi' } as any).subscribe()
    const req = httpMock.expectOne('/apis/protected/v8/content/searchV6')
    expect(req.request.body.query).toBe('hi')
    req.flush({})
  })

  it('searchRegionRecommendation appends the user country as a label', () => {
    service.searchRegionRecommendation({ preLabelValue: 'IN-' } as any).subscribe()
    const req = httpMock.expectOne('/apis/protected/v8/content/searchRegionRecommendation')
    expect(req.request.body.request.filters.labels).toEqual(['IN-India'])
    req.flush({})
  })

  it('addContentRating POSTs the rating value', () => {
    service.addContentRating('c5', { rating: 4 }).subscribe()
    const req = httpMock.expectOne('/apis/protected/v8/user/rating/c5')
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ rating: 4 })
    req.flush({})
  })

  it('deleteContentRating issues a DELETE', () => {
    service.deleteContentRating('c6').subscribe()
    const req = httpMock.expectOne('/apis/protected/v8/user/rating/c6')
    expect(req.request.method).toBe('DELETE')
    req.flush({})
  })

  describe('getFirstChildInHierarchy', () => {
    it('returns the node itself when it has no children', () => {
      const node = { children: [] } as any
      expect(service.getFirstChildInHierarchy(node)).toBe(node)
    })

    it('returns a Resource node directly', () => {
      const node = { contentType: 'Resource', children: [{ contentType: 'Resource' }] } as any
      expect(service.getFirstChildInHierarchy(node)).toBe(node)
    })

    it('descends into the first child for a collection', () => {
      const leaf = { contentType: 'Resource', children: [] }
      const node = { contentType: 'Course', children: [leaf] } as any
      expect(service.getFirstChildInHierarchy(node)).toBe(leaf)
    })
  })
})
