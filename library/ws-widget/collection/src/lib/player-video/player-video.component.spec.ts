import { of } from 'rxjs'

// A videojs Player double whose registered handlers can be fired by name.
const makePlayer = () => {
  const handlers: Record<string, (...a: any[]) => void> = {}
  let time = 0
  return {
    handlers,
    on: jest.fn((name: string, cb: (...a: any[]) => void) => {
      handlers[name] = cb
    }),
    fire: (name: string, ...a: any[]) => handlers[name] && handlers[name](...a),
    pause: jest.fn(),
    play: jest.fn(),
    currentTime: jest.fn((v?: number) => {
      if (v !== undefined) {
        time = v
        return undefined
      }
      return time
    }),
    setCurrentTime: (v: number) => (time = v),
    dispose: jest.fn(),
  }
}

let lastPlayer: any
const videoJsFactory = jest.fn(() => {
  lastPlayer = makePlayer()
  return lastPlayer
})

jest.mock('video.js', () => ({
  __esModule: true,
  default: (...args: any[]) => videoJsFactory(...args),
}))

jest.mock('videojs-markers', () => ({}))

const videoInitializer = jest.fn(() => ({ dispose: jest.fn() }))
const videoJsInitializer = jest.fn()
jest.mock('../_services/videojs-util', () => ({
  videoInitializer: (...a: any[]) => videoInitializer(...a),
  videoJsInitializer: (...a: any[]) => videoJsInitializer(...a),
}))

// eslint-disable-next-line import/first
import { PlayerVideoComponent } from './player-video.component'

describe('PlayerVideoComponent', () => {
  let eventSvc: any
  let contentSvc: any
  let activatedRoute: any
  let viewerDataSvc: any
  let dialog: any

  const build = (widgetData: any = {}) => {
    const c = new PlayerVideoComponent(eventSvc, contentSvc, activatedRoute, viewerDataSvc, dialog)
    c.widgetData = { identifier: 'do_1', ...widgetData }
    return c
  }

  beforeEach(() => {
    jest.clearAllMocks()
    videoInitializer.mockReturnValue({ dispose: jest.fn() })
    eventSvc = { dispatchEvent: jest.fn() }
    contentSvc = {
      readcontentV3: jest.fn(() => of({})),
      saveContinueLearning: jest.fn(() => of({})),
    }
    activatedRoute = { snapshot: { queryParams: {} } }
    viewerDataSvc = {}
    dialog = { open: jest.fn(), closeAll: jest.fn() }
  })

  it('creates the component', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.popupShown).toBe(false)
  })

  it('ngOnInit runs without throwing', () => {
    const c = build()
    expect(() => c.ngOnInit()).not.toThrow()
  })

  describe('fetchContent', () => {
    it('parses video questions and sets the content-store url', async () => {
      contentSvc.readcontentV3 = jest.fn(() =>
        of({
          videoQuestions: JSON.stringify([{ timestampInSeconds: 5 }]),
          artifactUrl: '/content-store/video.mp4',
          appIcon: 'icon.png',
        }),
      )
      const c = build()
      await c.fetchContent()
      expect(c.widgetData.videoQuestions).toEqual([{ timestampInSeconds: 5 }])
      expect(c.widgetData.url).toBe('/content-store/video.mp4')
      expect(c.widgetData.posterImage).toBe('icon.png')
    })

    it('leaves the url unset for a non content-store artifact', async () => {
      contentSvc.readcontentV3 = jest.fn(() => of({ artifactUrl: 'https://cdn/x.mp4' }))
      const c = build()
      await c.fetchContent()
      expect(c.widgetData.url).toBeUndefined()
    })
  })

  describe('ngAfterViewInit', () => {
    it('fetches content and initialises the videojs player when configured', async () => {
      contentSvc.readcontentV3 = jest.fn(() => of({}))
      const c = build({ url: 'x.mp4', isVideojs: true })
      const spy = jest.spyOn(c as any, 'initializePlayer').mockImplementation(() => undefined)
      await (c as any).afterViewInitAsync()
      expect(contentSvc.readcontentV3).toHaveBeenCalled()
      expect(spy).toHaveBeenCalled()
    })

    it('initialises the native player when not videojs', async () => {
      const c = build({ url: 'x.mp4', isVideojs: false })
      const spy = jest.spyOn(c as any, 'initializeVPlayer').mockImplementation(() => undefined)
      await (c as any).afterViewInitAsync()
      expect(spy).toHaveBeenCalled()
    })

    it('wires the time-update listener when a video tag is present', async () => {
      const c = build({})
      c.videoTag = { nativeElement: { id: 'v1' } } as any
      await (c as any).afterViewInitAsync()
      expect(videoJsFactory).toHaveBeenCalled()
      expect(c.videoStates.v1).toBeDefined()
    })
  })

  describe('addTimeUpdateListener', () => {
    it('registers play and timeupdate handlers and tracks milestones', () => {
      const c = build({ videoQuestions: [{ timestampInSeconds: 2, question: [{ text: 'Q' }] }] })
      const el: any = { id: 'v1' }
      const openSpy = jest.spyOn(c, 'openPopup').mockImplementation(() => undefined)
      c.addTimeUpdateListener(el)
      expect(c.videoStates.v1).toBeDefined()

      // fire play -> starts an interval; advance the player time to the milestone
      lastPlayer.setCurrentTime(2)
      lastPlayer.fire('play')
      // the interval callback runs asynchronously; drive it via fake timers
      jest.useFakeTimers()
      lastPlayer.fire('play')
      lastPlayer.setCurrentTime(2)
      jest.advanceTimersByTime(600)
      jest.useRealTimers()
      expect(openSpy).toHaveBeenCalled()
    })

    it('resets a triggered milestone when the user seeks back before it', () => {
      const c = build({ videoQuestions: [{ timestampInSeconds: 10 }] })
      const el: any = { id: 'v2' }
      c.addTimeUpdateListener(el)
      c.videoStates.v2.popupTriggered.add(10)
      lastPlayer.setCurrentTime(3)
      lastPlayer.fire('timeupdate')
      expect(c.videoStates.v2.popupTriggered.has(10)).toBe(false)
    })
  })

  describe('openPopup', () => {
    it('opens the dialog and resumes playback after it closes', () => {
      const afterClosed = of(undefined)
      dialog.open = jest.fn(() => ({ afterClosed: () => afterClosed }))
      const c = build()
      const intervalId = { unsubscribe: jest.fn() }
      const videoEl = { play: jest.fn() }
      const listenerSpy = jest.spyOn(c, 'addTimeUpdateListener').mockImplementation(() => undefined)
      c.openPopup([{ text: 'Q' }], videoEl, intervalId as any)
      expect(dialog.open).toHaveBeenCalled()
      expect(dialog.closeAll).toHaveBeenCalled()
      expect(videoEl.play).toHaveBeenCalled()
      expect(intervalId.unsubscribe).toHaveBeenCalled()
      expect(listenerSpy).toHaveBeenCalledWith(videoEl)
    })

    it('does nothing further when the dialog cannot open', () => {
      dialog.open = jest.fn(() => null)
      const c = build()
      expect(() => c.openPopup([], {}, { unsubscribe: jest.fn() } as any)).not.toThrow()
    })
  })

  describe('initializeVPlayer', () => {
    it('sets the resume point and invokes the native initializer', () => {
      const c = build({ url: 'x.mp4', resumePoint: 12, disableTelemetry: false, mimeType: 'video/mp4' })
      c.realvideoTag = { nativeElement: { currentTime: 0 } } as any
      ;(c as any).initializeVPlayer()
      expect(c.realvideoTag.nativeElement.currentTime).toBe(12)
      expect(videoInitializer).toHaveBeenCalled()
    })

    it('exercises the telemetry callbacks passed to the initializer', () => {
      const c = build({ url: 'x.mp4', disableTelemetry: false })
      c.realvideoTag = { nativeElement: { currentTime: 0 } } as any
      ;(c as any).initializeVPlayer()
      const args = videoInitializer.mock.calls[0]
      const dispatcher: any = args[1]
      const saveCLearning: any = args[2]
      const fireRProgress: any = args[3]
      dispatcher({ some: 'event' })
      expect(eventSvc.dispatchEvent).toHaveBeenCalled()
      saveCLearning({ resourceId: 'do_1', progress: 1 })
      expect(contentSvc.saveContinueLearning).toHaveBeenCalled()
      expect(() => fireRProgress('do_1', {})).not.toThrow()
    })

    it('saves playlist continue-learning data from the callback', () => {
      activatedRoute.snapshot.queryParams = { collectionType: 'playlist', collectionId: 'col_1' }
      const c = build({ url: 'x.mp4', disableTelemetry: false })
      c.realvideoTag = { nativeElement: { currentTime: 0 } } as any
      ;(c as any).initializeVPlayer()
      const saveCLearning: any = videoInitializer.mock.calls[0][2]
      saveCLearning({ resourceId: 'do_1', progress: 1 })
      expect(contentSvc.saveContinueLearning).toHaveBeenCalledWith(
        expect.objectContaining({ contextType: 'playlist', contextPathId: 'col_1' }),
      )
    })
  })

  describe('initializePlayer', () => {
    it('wires subtitles and source on ready', () => {
      const player: any = {
        ready: jest.fn((cb: () => void) => cb()),
        addRemoteTextTrack: jest.fn(),
        src: jest.fn(),
      }
      videoJsInitializer.mockReturnValue({ player, dispose: jest.fn() })
      const c = build({
        url: 'x.mp4',
        resumePoint: 5,
        subtitles: [{ label: 'EN', srclang: 'en', url: 's.vtt' }],
        disableTelemetry: false,
      })
      c.videoTag = { nativeElement: {} } as any
      ;(c as any).initializePlayer()
      expect(videoJsInitializer).toHaveBeenCalled()
      expect(player.addRemoteTextTrack).toHaveBeenCalled()
      expect(player.src).toHaveBeenCalledWith('x.mp4')
    })

    it('drives the saveContinueLearning callback in the non-playlist branch', () => {
      const player: any = { ready: jest.fn(), addRemoteTextTrack: jest.fn(), src: jest.fn() }
      videoJsInitializer.mockReturnValue({ player, dispose: jest.fn() })
      const c = build({ url: 'x.mp4' })
      c.videoTag = { nativeElement: {} } as any
      ;(c as any).initializePlayer()
      const saveCLearning: any = videoJsInitializer.mock.calls[0][3]
      saveCLearning({ resourceId: 'do_1', progress: 2 })
      expect(contentSvc.saveContinueLearning).toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('disposes the player and dispose handle', () => {
      const c = build()
      const dispose = jest.fn()
      ;(c as any).player = { dispose: jest.fn() }
      ;(c as any).dispose = dispose
      c.ngOnDestroy()
      expect((c as any).player.dispose).toHaveBeenCalled()
      expect(dispose).toHaveBeenCalled()
    })

    it('is safe with nothing to dispose', () => {
      const c = build()
      expect(() => c.ngOnDestroy()).not.toThrow()
    })
  })
})
