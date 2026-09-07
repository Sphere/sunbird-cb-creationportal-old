import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ConfigurationsService } from '@ws-widget/utils'
import { NsContent } from '@ws-widget/collection/src/lib/_services/widget-content.model'

import { AppTocService } from './app-toc.service'
import { NsCohorts } from '../models/app-toc.model'

const PROTECTED = '/apis/protected/v8'
const PROXY = '/apis/proxies/v8'

function emptyTocStructure(): any {
  return {
    assessment: 0,
    course: 0,
    handsOn: 0,
    interactiveVideo: 0,
    learningModule: 0,
    other: 0,
    pdf: 0,
    podcast: 0,
    quiz: 0,
    video: 0,
    webModule: 0,
    webPage: 0,
    youtube: 0,
  }
}

describe('AppTocService (app)', () => {
  let service: AppTocService
  let httpMock: HttpTestingController
  let configSvc: { userProfile: any }

  beforeEach(() => {
    configSvc = { userProfile: null }
    TestBed.configureTestingModule({
      providers: [AppTocService, { provide: ConfigurationsService, useValue: configSvc }, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(AppTocService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('changeMessage emits on currentMessage', done => {
    service.currentMessage.subscribe(msg => {
      expect(msg).toBe('hello')
      done()
    })
    service.changeMessage('hello')
  })

  it('subtitleOnBanners and showDescription getters/setters round-trip', () => {
    expect(service.subtitleOnBanners).toBe(false)
    expect(service.showDescription).toBe(false)
    service.subtitleOnBanners = true
    service.showDescription = true
    expect(service.subtitleOnBanners).toBe(true)
    expect(service.showDescription).toBe(true)
  })

  describe('showStartButton', () => {
    it('returns hidden state for null content', () => {
      expect(service.showStartButton(null)).toEqual({ show: false, msg: '' })
    })

    it('forbids youtube content for users in China', () => {
      configSvc.userProfile = { country: 'China' }
      const res = service.showStartButton({ artifactUrl: 'https://youtu.be/abc' } as any)
      expect(res).toEqual({ show: false, msg: 'youtubeForbidden' })
    })

    it('shows the button for a normal (non-certification) resource', () => {
      const res = service.showStartButton({ artifactUrl: '', resourceType: 'Learning' } as any)
      expect(res.show).toBe(true)
    })

    it('does not show for Certification content', () => {
      const res = service.showStartButton({ artifactUrl: '', resourceType: 'Certification' } as any)
      expect(res.show).toBe(false)
    })
  })

  describe('initData', () => {
    it('extracts content when data has an identifier', () => {
      const content = { identifier: 'do_1' }
      const res = service.initData({ content: { data: content } } as any)
      expect(res.content).toBe(content)
      expect(res.errorCode).toBeNull()
    })

    it('reports API_FAILURE when data has an error', () => {
      const res = service.initData({ error: true } as any)
      expect(res.content).toBeNull()
      expect(res.errorCode).toBe('API_FAILURE')
    })

    it('reports NO_DATA when there is neither content nor error', () => {
      const res = service.initData({} as any)
      expect(res.errorCode).toBe('NO_DATA')
    })
  })

  describe('getTocStructure', () => {
    it('counts a course and recurses into its children', () => {
      const content = {
        contentType: 'Course',
        children: [{ contentType: 'Resource', mimeType: NsContent.EMimeTypes.PDF, resourceType: 'Learning' }],
      }
      const result = service.getTocStructure(content as any, emptyTocStructure())
      expect(result.course).toBe(1)
      expect(result.pdf).toBe(1)
    })

    it('classifies a quiz assessment separately from a normal quiz', () => {
      const assessment = {
        contentType: 'Resource',
        mimeType: NsContent.EMimeTypes.QUIZ,
        resourceType: 'Assessment',
      }
      const quiz = {
        contentType: 'Resource',
        mimeType: NsContent.EMimeTypes.QUIZ,
        resourceType: 'Learning',
      }
      expect(service.getTocStructure(assessment as any, emptyTocStructure()).assessment).toBe(1)
      expect(service.getTocStructure(quiz as any, emptyTocStructure()).quiz).toBe(1)
    })
  })

  describe('filterToc / filterUnitContent', () => {
    it('keeps a resource that matches the ALL category', () => {
      const content = { contentType: 'Resource', resourceType: 'Learning' }
      expect(service.filterToc(content as any, NsContent.EFilterCategory.ALL)).toBe(content)
    })

    it('filterUnitContent returns true for ALL', () => {
      expect(service.filterUnitContent({ resourceType: 'Learning' } as any, NsContent.EFilterCategory.ALL)).toBe(true)
    })

    it('returns null for a collection with no matching children', () => {
      const content = { contentType: 'Collection', children: [] }
      expect(service.filterToc(content as any, NsContent.EFilterCategory.ALL)).toBeNull()
    })
  })

  describe('HTTP methods', () => {
    it('fetchContentParents GETs the parents endpoint', () => {
      service.fetchContentParents('do_1').subscribe()
      const req = httpMock.expectOne(`${PROTECTED}/content/parents/do_1`)
      expect(req.request.method).toBe('GET')
      req.flush([])
    })

    it('fetchContentWhatsNext includes contentType when supplied', () => {
      service.fetchContentWhatsNext('do_1', 'Course').subscribe()
      const req = httpMock.expectOne(`${PROTECTED}/content/next/do_1?contentType=Course`)
      expect(req.request.method).toBe('GET')
      req.flush([])
    })

    it('fetchContentWhatsNext falls back to a timestamped url without contentType', () => {
      service.fetchContentWhatsNext('do_1').subscribe()
      const req = httpMock.expectOne(r => r.url.startsWith(`${PROTECTED}/content/next/do_1?ts=`))
      req.flush([])
    })

    it('fetchMoreLikeThisPaid marks exclusiveContent true', () => {
      service.fetchMoreLikeThisPaid('do_1').subscribe()
      const req = httpMock.expectOne(r => r.url.includes('exclusiveContent=true'))
      req.flush([])
    })

    it('fetchMoreLikeThisFree marks exclusiveContent false', () => {
      service.fetchMoreLikeThisFree('do_1').subscribe()
      const req = httpMock.expectOne(r => r.url.includes('exclusiveContent=false'))
      req.flush([])
    })

    it('fetchContentCohorts hits the cohorts endpoint', () => {
      service.fetchContentCohorts(NsCohorts.ECohortTypes.AUTHORS, 'do_1').subscribe()
      const req = httpMock.expectOne(`${PROTECTED}/cohorts/authors/do_1`)
      req.flush([])
    })

    it('fetchExternalContentAccess hits the external-access endpoint', () => {
      service.fetchExternalContentAccess('do_1').subscribe()
      const req = httpMock.expectOne(`${PROTECTED}/content/external-access/do_1`)
      req.flush({ hasAccess: true })
    })

    it('fetchCohortGroupUsers hits the group cohorts endpoint', () => {
      service.fetchCohortGroupUsers(42).subscribe()
      const req = httpMock.expectOne(`${PROTECTED}/cohorts/42`)
      req.flush([])
    })

    it('fetchMoreLikeThis hits the related-resources endpoint', () => {
      service.fetchMoreLikeThis('do_1', 'Course').subscribe()
      const req = httpMock.expectOne(`${PROTECTED}/khub/fetchRelatedResources/do_1/Course`)
      req.flush([])
    })

    it('fetchPostAssessmentStatus hits the post-assessment endpoint', () => {
      service.fetchPostAssessmentStatus('do_1').subscribe()
      const req = httpMock.expectOne(`${PROTECTED}/user/evaluate/post-assessment/do_1`)
      req.flush({ result: [] })
    })

    it('fetchContentParent maps out the content of a successful hierarchy response', () => {
      let out: any
      service.fetchContentParent('do_1', { fields: [] }).subscribe(r => (out = r))
      const req = httpMock.expectOne(`${PROXY}/action/content/v3/hierarchy/do_1?mode=edit`)
      expect(req.request.method).toBe('GET')
      req.flush({ params: { status: 'successful' }, result: { content: { identifier: 'do_1' } } })
      expect(out).toEqual({ identifier: 'do_1' })
    })
  })
})
