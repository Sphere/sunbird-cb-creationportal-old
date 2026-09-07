import { of, throwError } from 'rxjs'
import { NsPlaylist } from '@ws-widget/collection'
import { NotificationComponent } from './notification.component'

describe('NotificationComponent', () => {
  let component: NotificationComponent
  let playlistSvc: any
  let configSvc: any

  const playlist = (over: any = {}): NsPlaylist.IPlaylist =>
    ({
      id: 'pl1',
      sharedBy: 'alice@example.com',
      ...over,
    }) as NsPlaylist.IPlaylist

  const build = () => new NotificationComponent(playlistSvc, configSvc)

  beforeEach(() => {
    playlistSvc = {
      getPlaylists: jest.fn().mockReturnValue(of([])),
    }
    configSvc = {
      pageNavBar: { background: 'primary' },
    }
    component = build()
  })

  it('should be created and pick up the page nav bar config', () => {
    expect(component).toBeTruthy()
    expect(component.pageNavbar).toEqual({ background: 'primary' })
  })

  describe('ngOnInit / initiate', () => {
    it('kicks off the fetch cycle', () => {
      const spy = jest.spyOn(component, 'initiate')
      component.ngOnInit()
      expect(spy).toHaveBeenCalled()
      expect(component.statusCount).toBe(1)
    })

    it('resets status and count before fetching', () => {
      jest.spyOn(component, 'fetchSharedPlaylist').mockImplementation(() => {})
      jest.spyOn(component, 'fetchSharedGoals').mockImplementation(() => {})
      component.initiate()
      expect(component.fetchStatus).toBe('fetching')
      expect(component.statusCount).toBe(0)
    })
  })

  describe('fetchSharedPlaylist', () => {
    it('strips the domain from sharedBy and stores the playlists', () => {
      playlistSvc.getPlaylists.mockReturnValue(of([playlist(), playlist({ id: 'pl2', sharedBy: 'bob@corp.org' })]))
      component.statusCount = 0
      component.fetchSharedPlaylist()
      expect(playlistSvc.getPlaylists).toHaveBeenCalledWith(NsPlaylist.EPlaylistTypes.PENDING)
      expect(component.sharedPlaylists.length).toBe(2)
      expect(component.sharedPlaylists[0].sharedBy).toBe('alice')
      expect(component.sharedPlaylists[1].sharedBy).toBe('bob')
      expect(component.fetchStatus).toBe('done')
      expect(component.statusCount).toBe(1)
    })

    it('handles a missing sharedBy gracefully', () => {
      playlistSvc.getPlaylists.mockReturnValue(of([playlist({ sharedBy: undefined })]))
      component.statusCount = 0
      component.fetchSharedPlaylist()
      expect(component.sharedPlaylists[0].sharedBy).toBe('')
    })

    it('still advances the status count on error', () => {
      playlistSvc.getPlaylists.mockReturnValue(throwError(() => 'boom'))
      component.statusCount = 0
      component.fetchSharedPlaylist()
      expect(component.fetchStatus).toBe('done')
      expect(component.statusCount).toBe(1)
    })
  })

  describe('fetchSharedGoals', () => {
    it('is a no-op that does not throw', () => {
      expect(() => component.fetchSharedGoals()).not.toThrow()
    })
  })

  describe('checkContentStatus', () => {
    it('marks status done and increments the count', () => {
      component.statusCount = 0
      component.checkContentStatus()
      expect(component.fetchStatus).toBe('done')
      expect(component.statusCount).toBe(1)
    })

    it('reports none when nothing arrived after three checks', () => {
      component.statusCount = 2
      component.recentBadge = null
      component.sharedPlaylists = []
      component.checkContentStatus()
      expect(component.statusCount).toBe(3)
      expect(component.fetchStatus).toBe('none')
    })

    it('stays done when playlists exist after three checks', () => {
      component.statusCount = 2
      component.sharedPlaylists = [playlist()]
      component.checkContentStatus()
      expect(component.fetchStatus).toBe('done')
    })

    it('leaves the count untouched when it is null', () => {
      component.statusCount = null
      component.checkContentStatus()
      expect(component.statusCount).toBeNull()
      expect(component.fetchStatus).toBe('done')
    })
  })

  describe('playlistTrackBy', () => {
    it('returns the playlist id', () => {
      expect(component.playlistTrackBy(playlist({ id: 'xyz' }))).toBe('xyz')
    })
  })
})
