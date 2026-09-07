import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ResourceCollectionService } from './resource-collection.service'

const BASE = '/apis/protected/v8/user/exercise'

describe('ResourceCollectionService', () => {
  let service: ResourceCollectionService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ResourceCollectionService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(ResourceCollectionService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('getAllSubmission GETs the submissions endpoint with type + contentId', () => {
    service.getAllSubmission('assignment', 'c1').subscribe()
    const req = httpMock.expectOne(`${BASE}/getSubmissions?type=assignment&contentId=c1`)
    expect(req.request.method).toBe('GET')
    req.flush([])
  })

  it('createContentDirectory POSTs to the create-directory endpoint', () => {
    service.createContentDirectory('c1').subscribe()
    const req = httpMock.expectOne(`${BASE}/createContentDirectory/c1`)
    expect(req.request.method).toBe('POST')
    req.flush({})
  })

  it('uploadFile POSTs the form data to the upload endpoint', () => {
    const fd = new FormData()
    fd.append('file', 'x')
    service.uploadFile(fd, 'c1').subscribe()
    const req = httpMock.expectOne(`${BASE}/uploadFileToContentDirectory/c1`)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toBe(fd)
    req.flush({})
  })

  it('postSubmission POSTs the submission data', () => {
    const data = { answers: [] }
    service.postSubmission(data, 'c1').subscribe()
    const req = httpMock.expectOne(`${BASE}/postsubmission/c1`)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual(data)
    req.flush({})
  })

  it('readContentTextFile GETs the url as plain text', () => {
    service.readContentTextFile('/some/file.txt').subscribe()
    const req = httpMock.expectOne('/some/file.txt')
    expect(req.request.method).toBe('GET')
    expect(req.request.responseType).toBe('text')
    req.flush('hello')
  })
})
