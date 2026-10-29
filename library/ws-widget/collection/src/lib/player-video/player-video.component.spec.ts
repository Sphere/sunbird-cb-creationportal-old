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
import { PlayerVideoComponent, parseVideoQuestions } from './player-video.component'

describe('parseVideoQuestions', () => {
  it('returns an array unchanged (Sunbird Spark)', () => {
    const qs = [{ timestampInSeconds: 3 }]
    expect(parseVideoQuestions(qs)).toBe(qs)
    expect(parseVideoQuestions([])).toEqual([])
  })

  it('parses a JSON string (legacy platform)', () => {
    expect(parseVideoQuestions('[{"timestampInSeconds":3}]')).toEqual([{ timestampInSeconds: 3 }])
  })

  it('yields [] for empty, malformed or non-array input', () => {
    expect(parseVideoQuestions(undefined)).toEqual([])
    expect(parseVideoQuestions(null)).toEqual([])
    expect(parseVideoQuestions('')).toEqual([])
    expect(parseVideoQuestions('  ')).toEqual([])
    expect(parseVideoQuestions('{bad')).toEqual([])
    expect(parseVideoQuestions('{"a":1}')).toEqual([])
    expect(parseVideoQuestions({ a: 1 })).toEqual([])
  })
})

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

    it('takes Spark array questions as-is and still sets the url (empty array used to throw)', async () => {
      contentSvc.readcontentV3 = jest.fn(() => of({ videoQuestions: [], artifactUrl: '/content-store/video.mp4', appIcon: 'icon.png' }))
      const c = build()
      await c.fetchContent()
      expect(c.widgetData.videoQuestions).toEqual([])
      expect(c.widgetData.url).toBe('/content-store/video.mp4')

      contentSvc.readcontentV3 = jest.fn(() => of({ videoQuestions: [{ timestampInSeconds: 7 }] }))
      await c.fetchContent()
      expect(c.widgetData.videoQuestions).toEqual([{ timestampInSeconds: 7 }])
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
    const q = (at: any) => ({ timestampInSeconds: at, question: [{ text: `Q@${at}` }] })
    /** Play the video forward in timeupdate ticks of `step` seconds. */
    const playTo = (to: number, step = 0.25) => {
      let t = lastPlayer.currentTime()
      while (t < to) {
        t = Math.min(to, t + step)
        lastPlayer.setCurrentTime(t)
        lastPlayer.fire('timeupdate')
      }
    }

    it('fires a question when playback crosses its timestamp', () => {
      const c = build({ videoQuestions: [q(2)] })
      const openSpy = jest.spyOn(c, 'openPopup').mockImplementation(() => undefined)
      c.addTimeUpdateListener({ id: 'v1' } as any)
      playTo(1.9)
      expect(openSpy).not.toHaveBeenCalled()
      playTo(2.1)
      expect(lastPlayer.pause).toHaveBeenCalled()
      expect(openSpy).toHaveBeenCalledWith([{ text: 'Q@2' }], lastPlayer, 'v1')
      expect(c.videoStates.v1.currentMilestone).toBe(2)
    })

    it('still fires at 3x speed, where a tick can step over the exact second', () => {
      const c = build({ videoQuestions: [q(5)] })
      const openSpy = jest.spyOn(c, 'openPopup').mockImplementation(() => undefined)
      c.addTimeUpdateListener({ id: 'v1' } as any)
      playTo(7, 0.75) // 0, 0.75 ... 4.5, 5.25: never exactly 5
      expect(openSpy).toHaveBeenCalledTimes(1)
    })

    it('accepts a timestamp saved as a string', () => {
      const c = build({ videoQuestions: [q('3')] })
      const openSpy = jest.spyOn(c, 'openPopup').mockImplementation(() => undefined)
      c.addTimeUpdateListener({ id: 'v1' } as any)
      playTo(3.2)
      expect(openSpy).toHaveBeenCalledTimes(1)
    })

    it('fires once per pass, not again while the popup is open or after it closes', () => {
      const c = build({ videoQuestions: [q(2)] })
      const openSpy = jest.spyOn(c, 'openPopup').mockImplementation(() => undefined)
      c.addTimeUpdateListener({ id: 'v1' } as any)
      playTo(2.2)
      lastPlayer.fire('timeupdate')
      c.videoStates.v1.popupOpen = false // dialog closed
      playTo(4)
      expect(openSpy).toHaveBeenCalledTimes(1)
    })

    it('does not fire on a forward seek past the question', () => {
      const c = build({ videoQuestions: [q(10)] })
      const openSpy = jest.spyOn(c, 'openPopup').mockImplementation(() => undefined)
      c.addTimeUpdateListener({ id: 'v1' } as any)
      lastPlayer.setCurrentTime(30)
      lastPlayer.fire('timeupdate')
      expect(openSpy).not.toHaveBeenCalled()
    })

    it('shows the question again after seeking back before it', () => {
      const c = build({ videoQuestions: [q(2)] })
      const openSpy = jest.spyOn(c, 'openPopup').mockImplementation(() => undefined)
      c.addTimeUpdateListener({ id: 'v2' } as any)
      playTo(2.2)
      c.videoStates.v2.popupOpen = false
      lastPlayer.setCurrentTime(1)
      lastPlayer.fire('timeupdate')
      expect(c.videoStates.v2.popupTriggered.has(2)).toBe(false)
      playTo(2.2)
      expect(openSpy).toHaveBeenCalledTimes(2)
    })

    it('skips a milestone with no questions and copes with none at all', () => {
      const c = build({ videoQuestions: [{ timestampInSeconds: 1, question: [] }] })
      const openSpy = jest.spyOn(c, 'openPopup').mockImplementation(() => undefined)
      c.addTimeUpdateListener({ id: 'v1' } as any)
      playTo(2)
      expect(openSpy).not.toHaveBeenCalled()

      const none = build({})
      none.addTimeUpdateListener({ id: 'v3' } as any)
      expect(() => playTo(2)).not.toThrow()
    })

    it('registers only once per video element', () => {
      const c = build({ videoQuestions: [q(2)] })
      c.addTimeUpdateListener({ id: 'v1' } as any)
      const calls = videoJsFactory.mock.calls.length
      c.addTimeUpdateListener({ id: 'v1' } as any)
      expect(lastPlayer.on).toHaveBeenCalledTimes(1)
      expect(videoJsFactory.mock.calls.length).toBe(calls)
    })
  })

  describe('reviewer question overview', () => {
    const milestones = [
      { timestampInSeconds: 10, question: [{ text: 'A' }, { text: 'B' }] },
      { timestampInSeconds: 20, question: [] },
      { timestampInSeconds: 40, question: [{ text: 'C' }] },
    ]

    it('counts only points that hold questions', () => {
      const c = build({ videoQuestions: milestones })
      expect(c.questionMilestones.length).toBe(2)
      expect(c.questionCount).toBe(3)
      expect(build({}).questionCount).toBe(0)
    })

    it('pauses, opens the review dialog and jumps when asked', () => {
      dialog.open = jest.fn(() => ({ afterClosed: () => of({ jumpTo: 40 }) }))
      const c = build({ videoQuestions: milestones })
      c.addTimeUpdateListener({ id: 'v1' } as any)
      const jump = jest.spyOn(c, 'jumpToQuestion')
      c.openQuestionsReview()
      expect(lastPlayer.pause).toHaveBeenCalled()
      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: { milestones: c.questionMilestones } }))
      expect(jump).toHaveBeenCalledWith(40)
    })

    it('does not jump when the dialog is just closed', () => {
      dialog.open = jest.fn(() => ({ afterClosed: () => of(undefined) }))
      const c = build({ videoQuestions: milestones })
      const jump = jest.spyOn(c, 'jumpToQuestion')
      c.openQuestionsReview()
      expect(jump).not.toHaveBeenCalled()
    })

    it('Jump to seeks just before the question and the popup fires again on play', () => {
      const c = build({ videoQuestions: milestones })
      const openSpy = jest.spyOn(c, 'openPopup').mockImplementation(() => undefined)
      c.addTimeUpdateListener({ id: 'v1' } as any)
      c.videoStates.v1.popupTriggered.add(40)
      c.videoStates.v1.lastTime = 55
      c.jumpToQuestion(40)
      expect(lastPlayer.currentTime()).toBe(38)
      expect(lastPlayer.play).toHaveBeenCalled()
      expect(c.videoStates.v1.popupTriggered.has(40)).toBe(false)
      lastPlayer.setCurrentTime(40.2)
      lastPlayer.fire('timeupdate')
      expect(openSpy).toHaveBeenCalledWith([{ text: 'C' }], lastPlayer, 'v1')
    })

    it('Jump to is a no-op before the player exists', () => {
      expect(() => build({ videoQuestions: milestones }).jumpToQuestion(10)).not.toThrow()
    })
  })

  describe('openPopup', () => {
    it('opens the dialog and resumes playback after it closes, without re-registering', () => {
      dialog.open = jest.fn(() => ({ afterClosed: () => of(undefined) }))
      const c = build()
      c.videoStates.v1 = { popupTriggered: new Set(), currentMilestone: 2, lastTime: 2, popupOpen: true }
      const player = { play: jest.fn() }
      const listenerSpy = jest.spyOn(c, 'addTimeUpdateListener')
      c.openPopup([{ text: 'Q' }], player, 'v1')
      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: { questions: [{ text: 'Q' }] } }))
      expect(player.play).toHaveBeenCalled()
      expect(c.videoStates.v1.popupOpen).toBe(false)
      expect(listenerSpy).not.toHaveBeenCalled()
    })

    it('resumes playback when the dialog cannot open', () => {
      dialog.open = jest.fn(() => null)
      const c = build()
      const player = { play: jest.fn() }
      expect(() => c.openPopup([], player)).not.toThrow()
      expect(player.play).toHaveBeenCalled()
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
