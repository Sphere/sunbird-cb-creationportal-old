import { of } from 'rxjs'
import { PlayerAudioComponent } from './player-audio.component'

describe('PlayerAudioComponent', () => {
  let eventSvc: any
  let contentSvc: any
  let activatedRoute: any

  const build = (widgetData: any = {}) => {
    activatedRoute = { snapshot: { queryParams: {} } }
    const c = new PlayerAudioComponent(eventSvc, contentSvc, activatedRoute)
    c.widgetData = widgetData
    return c
  }

  beforeEach(() => {
    eventSvc = { dispatchEvent: jest.fn() }
    contentSvc = {
      fetchContent: jest.fn().mockReturnValue(of({ artifactUrl: '/content-store/a.mp3', appIcon: 'icon.png' })),
      setS3Cookie: jest.fn().mockReturnValue(of({})),
      saveContinueLearning: jest.fn().mockReturnValue(of({})),
    }
  })

  it('should be created', () => {
    expect(build()).toBeTruthy()
  })

  it('ngOnInit does nothing harmful', () => {
    const c = build()
    expect(() => c.ngOnInit()).not.toThrow()
  })

  describe('ngAfterViewInit', () => {
    it('fetches content when an identifier is set but no url', () => {
      const c = build({ identifier: 'do_1' })
      const fetchSpy = jest.spyOn(c, 'fetchContent').mockResolvedValue(undefined as any)
      const initSpy = jest.spyOn(c as any, 'initializePlayer').mockImplementation(() => undefined)
      c.ngAfterViewInit()
      expect(fetchSpy).toHaveBeenCalled()
      expect(initSpy).not.toHaveBeenCalled()
    })

    it('initializes the player when a url is present', () => {
      const c = build({ url: 'http://x/a.mp3' })
      const fetchSpy = jest.spyOn(c, 'fetchContent').mockResolvedValue(undefined as any)
      const initSpy = jest.spyOn(c as any, 'initializePlayer').mockImplementation(() => undefined)
      c.ngAfterViewInit()
      expect(initSpy).toHaveBeenCalled()
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('does neither when there is no identifier and no url', () => {
      const c = build({})
      const fetchSpy = jest.spyOn(c, 'fetchContent').mockResolvedValue(undefined as any)
      const initSpy = jest.spyOn(c as any, 'initializePlayer').mockImplementation(() => undefined)
      c.ngAfterViewInit()
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(initSpy).not.toHaveBeenCalled()
    })
  })

  describe('fetchContent', () => {
    it('populates url/poster and sets the S3 cookie for a content-store artifact', async () => {
      const c = build({ identifier: 'do_1' })
      await c.fetchContent()
      expect(c.widgetData.url).toBe('/content-store/a.mp3')
      expect(c.widgetData.posterImage).toBe('icon.png')
      expect(contentSvc.setS3Cookie).toHaveBeenCalledWith('do_1')
    })

    it('ignores artifacts that are not in the content store', async () => {
      contentSvc.fetchContent.mockReturnValue(of({ artifactUrl: 'http://cdn/a.mp3', appIcon: 'icon.png' }))
      const c = build({ identifier: 'do_1' })
      await c.fetchContent()
      expect(c.widgetData.url).toBeUndefined()
      expect(contentSvc.setS3Cookie).not.toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('disposes the player and the dispose callback', () => {
      const c = build()
      const playerDispose = jest.fn()
      const disposeCb = jest.fn()
      ;(c as any).player = { dispose: playerDispose }
      ;(c as any).dispose = disposeCb
      c.ngOnDestroy()
      expect(playerDispose).toHaveBeenCalled()
      expect(disposeCb).toHaveBeenCalled()
    })

    it('is a no-op when nothing was initialized', () => {
      const c = build()
      expect(() => c.ngOnDestroy()).not.toThrow()
    })
  })
})
