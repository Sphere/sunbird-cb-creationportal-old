import { of } from 'rxjs'

import { videoJsInitializer } from '../_services/videojs-util'
import { PlayerAudioComponent } from './player-audio.component'

// The real initializer boots video.js against a live <audio> element, which jsdom
// cannot drive. Stub it so the callbacks the component builds can be invoked directly.
jest.mock('../_services/videojs-util', () => ({
  videoJsInitializer: jest.fn(),
}))

/**
 * Wave 18 — `initializePlayer`: the telemetry dispatcher, the continue-learning
 * writer (playlist and plain), the subtitle tracks and the source hand-off.
 */
describe('PlayerAudioComponent (player wiring)', () => {
  let eventSvc: any
  let contentSvc: any
  let activatedRoute: any
  let player: any
  let dispose: jest.Mock

  const initializer = videoJsInitializer as unknown as jest.Mock

  const build = (widgetData: any = {}, queryParams: any = {}) => {
    activatedRoute = { snapshot: { queryParams } }
    const c = new PlayerAudioComponent(eventSvc, contentSvc, activatedRoute)
    c.widgetData = widgetData
    c.audioTag = { nativeElement: {} } as any
    return c
  }

  /** Runs initializePlayer and returns the callbacks it handed the initializer. */
  const init = (c: PlayerAudioComponent) => {
    ;(c as any).initializePlayer()
    const [element, options, dispatcher, saveCLearning, fireRProgress, passThrough, widgetType, resumePoint, enableTelemetry] =
      initializer.mock.calls[0]
    return { element, options, dispatcher, saveCLearning, fireRProgress, passThrough, widgetType, resumePoint, enableTelemetry }
  }

  beforeEach(() => {
    eventSvc = { dispatchEvent: jest.fn() }
    contentSvc = {
      fetchContent: jest.fn().mockReturnValue(of({ artifactUrl: '/content-store/a.mp3' })),
      setS3Cookie: jest.fn().mockReturnValue(of({})),
      saveContinueLearning: jest.fn().mockReturnValue(of({})),
    }
    dispose = jest.fn()
    player = {
      ready: jest.fn((cb: any) => cb()),
      addRemoteTextTrack: jest.fn(),
      src: jest.fn(),
      dispose: jest.fn(),
    }
    initializer.mockReturnValue({ player, dispose })
  })

  afterEach(() => jest.clearAllMocks())

  describe('telemetry dispatcher', () => {
    it('forwards an event for a real resource', () => {
      const c = build({ identifier: 'do_1', url: 'a.mp3' })
      init(c).dispatcher({ type: 'play' } as any)
      expect(eventSvc.dispatchEvent).toHaveBeenCalledWith({ type: 'play' })
    })

    it('stays quiet for a resource with no identifier', () => {
      const c = build({ url: 'a.mp3' })
      init(c).dispatcher({ type: 'play' } as any)
      expect(eventSvc.dispatchEvent).not.toHaveBeenCalled()
    })
  })

  describe('continue-learning writer', () => {
    const progress = { resourceId: 'do_1', progress: 0.5 } as any

    it('records progress against the parent collection', () => {
      const c = build({ identifier: 'do_1', url: 'a.mp3' }, { collectionId: 'do_course' })
      init(c).saveCLearning(progress)
      const [payload] = contentSvc.saveContinueLearning.mock.calls[0]
      expect(payload.contextPathId).toBe('do_course')
      expect(payload.resourceId).toBe('do_1')
      expect(payload.contextType).toBeUndefined()
    })

    it('falls back to the resource itself with no collection', () => {
      const c = build({ identifier: 'do_1', url: 'a.mp3' })
      init(c).saveCLearning(progress)
      expect(contentSvc.saveContinueLearning.mock.calls[0][0].contextPathId).toBe('do_1')
    })

    it('marks a playlist context and records the full path', () => {
      const c = build({ identifier: 'do_1', url: 'a.mp3' }, { collectionType: 'Playlist', collectionId: 'pl_1' })
      init(c).saveCLearning(progress)
      const [payload] = contentSvc.saveContinueLearning.mock.calls[0]
      expect(payload.contextType).toBe('playlist')
      expect(JSON.parse(payload.data).contextFullPath).toEqual(['pl_1', 'do_1'])
    })

    it('falls back to the resource itself for a playlist with no collection', () => {
      const c = build({ identifier: 'do_1', url: 'a.mp3' }, { collectionType: 'playlist' })
      init(c).saveCLearning(progress)
      expect(contentSvc.saveContinueLearning.mock.calls[0][0].contextPathId).toBe('do_1')
    })

    it('records nothing for a resource with no identifier', () => {
      const c = build({ url: 'a.mp3' })
      init(c).saveCLearning(progress)
      expect(contentSvc.saveContinueLearning).not.toHaveBeenCalled()
    })
  })

  describe('real-time progress', () => {
    it('accepts a progress report without failing', () => {
      const c = build({ identifier: 'do_1', url: 'a.mp3' })
      expect(() => init(c).fireRProgress('do_1', { progress: 1 } as any)).not.toThrow()
    })

    it('accepts an empty progress report', () => {
      const c = build({ identifier: 'do_1', url: 'a.mp3' })
      expect(() => init(c).fireRProgress('', undefined as any)).not.toThrow()
    })
  })

  describe('player set-up', () => {
    it('enables telemetry only when the widget explicitly allows it', () => {
      const c = build({ identifier: 'do_1', url: 'a.mp3', disableTelemetry: false })
      expect(init(c).enableTelemetry).toBe(true)
    })

    it('leaves telemetry off when the widget says nothing about it', () => {
      const c = build({ identifier: 'do_1', url: 'a.mp3' })
      expect(init(c).enableTelemetry).toBe(false)
    })

    it('leaves telemetry off when the widget disables it', () => {
      const c = build({ identifier: 'do_1', url: 'a.mp3', disableTelemetry: true })
      expect(init(c).enableTelemetry).toBe(false)
    })

    it('starts from the stored resume point', () => {
      const c = build({ identifier: 'do_1', url: 'a.mp3', resumePoint: 42 })
      expect(init(c).resumePoint).toBe(42)
    })

    it('starts from the beginning with no resume point', () => {
      const c = build({ identifier: 'do_1', url: 'a.mp3' })
      expect(init(c).resumePoint).toBe(0)
    })

    it('adds every subtitle track, defaulting to the first', () => {
      const c = build({
        identifier: 'do_1',
        url: 'a.mp3',
        subtitles: [
          { label: 'English', srclang: 'en', url: 'en.vtt' },
          { label: 'Hindi', srclang: 'hi', url: 'hi.vtt' },
        ],
      })
      init(c)
      expect(player.addRemoteTextTrack).toHaveBeenCalledTimes(2)
      expect(player.addRemoteTextTrack.mock.calls[0][0].default).toBe(true)
      expect(player.addRemoteTextTrack.mock.calls[1][0].default).toBe(false)
    })

    it('adds no tracks when the widget declares no subtitles', () => {
      const c = build({ identifier: 'do_1', url: 'a.mp3' })
      init(c)
      expect(player.addRemoteTextTrack).not.toHaveBeenCalled()
    })

    it('hands the audio url to the player', () => {
      const c = build({ identifier: 'do_1', url: 'a.mp3' })
      init(c)
      expect(player.src).toHaveBeenCalledWith('a.mp3')
    })

    it('leaves the player without a source when the widget has no url', () => {
      const c = build({ identifier: 'do_1' })
      init(c)
      expect(player.src).not.toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('disposes both the player and its listeners', () => {
      const c = build({ identifier: 'do_1', url: 'a.mp3' })
      init(c)
      c.ngOnDestroy()
      expect(player.dispose).toHaveBeenCalled()
      expect(dispose).toHaveBeenCalled()
    })

    it('survives being destroyed before the player was built', () => {
      const c = build({ identifier: 'do_1' })
      expect(() => c.ngOnDestroy()).not.toThrow()
    })
  })
})
