import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'

import { BtnPlaylistService } from './btn-playlist.service'
import { NsPlaylist } from './btn-playlist.model'

const BASE = '/apis/protected/v8/user/playlist'

describe('BtnPlaylistService', () => {
  let service: BtnPlaylistService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BtnPlaylistService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(BtnPlaylistService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('upsertPlaylist POSTs to the create endpoint (no refresh when flag false)', () => {
    service.upsertPlaylist({ name: 'p' } as any, false).subscribe()
    const req = httpMock.expectOne(`${BASE}/create`)
    expect(req.request.method).toBe('POST')
    req.flush('ok')
  })

  it('addToPlaylist POSTs to the playlist add endpoint', () => {
    service.addToPlaylist('pl1', { contentIds: ['x'] } as any, false).subscribe()
    const req = httpMock.expectOne(`${BASE}/pl1/add`)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ contentIds: ['x'] })
    req.flush('ok')
  })

  it('deleteContent POSTs to the playlist delete endpoint', () => {
    service.deleteContent('pl2', { contentIds: ['y'] } as any, false).subscribe()
    const req = httpMock.expectOne(`${BASE}/pl2/delete`)
    expect(req.request.method).toBe('POST')
    req.flush('ok')
  })

  it('getAllPlaylistsApi passes the details-required query param', () => {
    service.getAllPlaylistsApi(true).subscribe()
    const req = httpMock.expectOne(r => r.url === BASE && r.params.get('details-required') === 'true')
    expect(req.request.method).toBe('GET')
    req.flush({ user: [], share: [], pending: [] })
  })

  it('getPlaylist GETs a single playlist with sourceFields', () => {
    service.getPlaylist('pl3', NsPlaylist.EPlaylistTypes.ME, 'name,id').subscribe()
    const req = httpMock.expectOne(r => r.url === `${BASE}/user/pl3`)
    expect(req.request.params.get('sourceFields')).toBe('name,id')
    req.flush({})
  })

  it('deletePlaylist issues a DELETE', () => {
    service.deletePlaylist('pl4', NsPlaylist.EPlaylistTypes.ME).subscribe()
    const req = httpMock.expectOne(`${BASE}/pl4`)
    expect(req.request.method).toBe('DELETE')
    req.flush({})
  })

  it('patchPlaylist PATCHes content ids and title, merging new ids', () => {
    const playlist = { id: 'pl5', name: 'My List', contents: [{ identifier: 'c1' }] } as any
    service.patchPlaylist(playlist, ['c2']).subscribe()
    const req = httpMock.expectOne(`${BASE}/pl5`)
    expect(req.request.method).toBe('PATCH')
    expect(req.request.body.contentIds).toEqual([{ identifier: 'c1' }, { identifier: 'c2' }])
    expect(req.request.body.playlist_title).toBe('My List')
    req.flush({})
  })

  it('addPlaylistContent delegates to addToPlaylist', () => {
    service.addPlaylistContent({ id: 'pl6' } as any, ['c9'], false).subscribe()
    const req = httpMock.expectOne(`${BASE}/pl6/add`)
    expect(req.request.body).toEqual({ contentIds: ['c9'] })
    req.flush('ok')
  })

  it('deletePlaylistContent errors when the playlist is undefined', done => {
    service.deletePlaylistContent(undefined, ['c']).subscribe({
      error: err => {
        expect(err.error).toBe('ERROR_PLAYLIST_UNDEFINED')
        done()
      },
    })
  })

  it('acceptPlaylist POSTs to the accept endpoint', () => {
    service.acceptPlaylist('pl7').subscribe()
    const req = httpMock.expectOne(`${BASE}/accept/pl7`)
    expect(req.request.method).toBe('POST')
    req.flush({})
  })

  it('rejectPlaylist POSTs to the reject endpoint', () => {
    service.rejectPlaylist('pl8').subscribe()
    const req = httpMock.expectOne(`${BASE}/reject/pl8`)
    expect(req.request.method).toBe('POST')
    req.flush({})
  })

  it('sharePlaylist POSTs the share request to share/<id>', () => {
    service.sharePlaylist({ users: [] } as any, 'pl9').subscribe()
    const req = httpMock.expectOne(`${BASE}/share/pl9`)
    expect(req.request.method).toBe('POST')
    req.flush({})
  })

  it('getPlaylists initializes subjects and emits the fetched user list', done => {
    service.getPlaylists(NsPlaylist.EPlaylistTypes.ME).subscribe(list => {
      expect(list).toEqual([{ id: 'a' }])
      done()
    })
    const req = httpMock.expectOne(BASE)
    expect(req.request.method).toBe('GET')
    req.flush({ user: [{ id: 'a' }], share: [], pending: [] })
  })
})
