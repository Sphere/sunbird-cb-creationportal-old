import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ConfigurationsService } from '@ws-widget/utils'
import { NsContent } from '@ws-widget/collection/src/lib/_services/widget-content.model'

import { MyTocService } from './my-toc.service'

function emptyCounts(): any {
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

describe('MyTocService', () => {
  let service: MyTocService
  let httpMock: HttpTestingController
  let configSvc: { userProfile: any }

  beforeEach(() => {
    configSvc = { userProfile: null }
    TestBed.configureTestingModule({
      providers: [MyTocService, { provide: ConfigurationsService, useValue: configSvc }, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(MyTocService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('subtitleOnBanners and showDescription round-trip', () => {
    service.subtitleOnBanners = true
    service.showDescription = true
    expect(service.subtitleOnBanners).toBe(true)
    expect(service.showDescription).toBe(true)
  })

  describe('showStartButton', () => {
    it('returns the hidden default for null content', () => {
      expect(service.showStartButton(null)).toEqual({ show: false, msg: '' })
    })

    it('forbids youtube content for a user in China', () => {
      configSvc.userProfile = { country: 'China' }
      const res = service.showStartButton({ artifactUrl: 'https://youtu.be/x' } as any)
      expect(res).toEqual({ show: false, msg: 'youtubeForbidden' })
    })

    it('shows the button for a normal resource', () => {
      const res = service.showStartButton({ artifactUrl: 'http://a.b/c', resourceType: 'Learning' } as any)
      expect(res.show).toBe(true)
    })
  })

  describe('initData', () => {
    it('extracts content when it has an identifier', () => {
      const content = { identifier: 'do_1' }
      const res = service.initData({ content } as any)
      expect(res.content).toBe(content)
      expect(res.errorCode).toBeNull()
    })

    it('reports API_FAILURE on an error route payload', () => {
      const res = service.initData({ error: true } as any)
      expect(res.errorCode).toBe('API_FAILURE')
    })

    it('reports NO_DATA otherwise', () => {
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
      const result = service.getTocStructure(content as any, emptyCounts())
      expect(result.course).toBe(1)
      expect(result.pdf).toBe(1)
    })

    it('counts a video resource', () => {
      const content = { contentType: 'Resource', mimeType: NsContent.EMimeTypes.MP4 }
      expect(service.getTocStructure(content as any, emptyCounts()).video).toBe(1)
    })
  })
})
