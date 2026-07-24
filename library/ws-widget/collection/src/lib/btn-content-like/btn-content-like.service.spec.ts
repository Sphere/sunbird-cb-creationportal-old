import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { BtnContentLikeService } from './btn-content-like.service'

const BASE = '/apis/protected/v8/user/content'

describe('BtnContentLikeService', () => {
  let service: BtnContentLikeService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BtnContentLikeService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(BtnContentLikeService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('isLikedFor fetches likes once and reports membership', () => {
    let liked: boolean | undefined
    service.isLikedFor('c1').subscribe(v => (liked = v))

    const req = httpMock.expectOne(`${BASE}/like`)
    expect(req.request.method).toBe('GET')
    req.flush(['c1', 'c2'])

    expect(liked).toBe(true)
  })

  it('isLikedFor reports false for unknown ids and swallows fetch errors', () => {
    let liked: boolean | undefined
    service.isLikedFor('nope').subscribe(v => (liked = v))

    httpMock.expectOne(`${BASE}/like`).error(new ProgressEvent('fail'))

    expect(liked).toBe(false)
  })

  it('like POSTs to the like endpoint for the content id', () => {
    service.like('c1').subscribe()
    const req = httpMock.expectOne(`${BASE}/like/c1`)
    expect(req.request.method).toBe('POST')
    req.flush({})
  })

  it('unlike DELETEs the unlike endpoint for the content id', () => {
    service.unlike('c1').subscribe()
    const req = httpMock.expectOne(`${BASE}/unlike/c1`)
    expect(req.request.method).toBe('DELETE')
    req.flush({})
  })

  it('fetchContentSpecificLikes POSTs the content ids', () => {
    service.fetchContentSpecificLikes(['a', 'b']).subscribe()
    const req = httpMock.expectOne(`${BASE}/contentLikes`)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ content_id: ['a', 'b'] })
    req.flush({})
  })
})
