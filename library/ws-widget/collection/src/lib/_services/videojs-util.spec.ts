import { WsEvents } from '@ws-widget/utils'

const playerFactory = jest.fn()

jest.mock('video.js', () => ({
  __esModule: true,
  default: (...args: any[]) => playerFactory(...args),
}))

// tslint:disable-next-line: no-import-side-effect
import { videojsEventNames, videoJsInitializer, videoInitializer, youtubeInitializer } from './videojs-util'

describe('videojs-util', () => {
  let dispatcher: jest.Mock
  let saveCLearning: jest.Mock
  let fireRProgress: jest.Mock
  let logSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance

  const MIME = 'video/mp4' as any
  const widget = (over: any = {}) => ({ identifier: 'do_123', ...over })

  /** A videojs Player double whose registered handlers can be fired by name. */
  const makePlayer = () => {
    const handlers: Record<string, () => void> = {}
    let time = 0
    return {
      handlers,
      volume: jest.fn(),
      muted: jest.fn(),
      on: jest.fn((name: string, cb: () => void) => {
        handlers[name] = cb
      }),
      fire: (name: string) => handlers[name] && handlers[name](),
      currentTime: jest.fn((v?: number) => {
        if (v !== undefined) {
          time = v
          return undefined
        }
        return time
      }),
      setTime: (v: number) => {
        time = v
      },
      duration: jest.fn().mockReturnValue(100),
    } as any
  }

  /** A <video> element with writable currentTime/duration (jsdom leaves them at 0). */
  const makeMediaElement = () => {
    const elem = document.createElement('video')
    let currentTime = 0
    let duration = 100
    Object.defineProperty(elem, 'currentTime', {
      get: () => currentTime,
      set: (v: number) => (currentTime = v),
      configurable: true,
    })
    Object.defineProperty(elem, 'duration', {
      get: () => duration,
      set: (v: number) => (duration = v),
      configurable: true,
    })
    return elem
  }

  const lastEvent = () => dispatcher.mock.calls[dispatcher.mock.calls.length - 1][0]
  const statesDispatched = () => dispatcher.mock.calls.map(c => c[0].data.state).filter(Boolean)

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    dispatcher = jest.fn()
    saveCLearning = jest.fn()
    fireRProgress = jest.fn()
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('exposes the videojs event names it binds to', () => {
    expect(videojsEventNames).toEqual({
      disposing: 'disposing',
      ended: 'ended',
      exitfullscreen: 'exitfullscreen',
      fullscreen: 'fullscreen',
      mute: 'mute',
      pause: 'pause',
      play: 'play',
      ready: 'ready',
      seeked: 'seeked',
      unmute: 'unmute',
      volumechange: 'volumechange',
      loadeddata: 'loadeddata',
    })
  })

  describe('videoJsInitializer', () => {
    let player: any

    const init = (over: { telemetry?: boolean; resume?: number; data?: any } = {}) => {
      player = makePlayer()
      if (over.data) {
        Object.assign(player, over.data.playerExtras || {})
      }
      playerFactory.mockReturnValue(player)
      const elem = makeMediaElement()
      return videoJsInitializer(
        elem,
        { autoplay: false } as any,
        dispatcher,
        saveCLearning,
        fireRProgress,
        { rootOrg: 'org' },
        'video',
        over.resume ?? 0,
        over.telemetry !== false,
        over.data?.widget ?? widget(),
        MIME,
      )
    }

    it('builds the player with sane audio defaults', () => {
      const res = init()

      expect(playerFactory).toHaveBeenCalledWith(expect.anything(), { autoplay: false })
      expect(player.volume).toHaveBeenCalledWith(0.8)
      expect(player.muted).toHaveBeenCalledWith(false)
      expect(res.player).toBe(player)
    })

    it('binds no telemetry handlers when telemetry is off', () => {
      init({ telemetry: false })
      expect(player.on).not.toHaveBeenCalled()
    })

    it('seeks to the resume point once data has loaded', () => {
      init({ resume: 42 })
      player.fire(videojsEventNames.loadeddata)

      expect(player.currentTime).toHaveBeenCalledWith(42)
    })

    it('ignores a zero resume point', () => {
      init({ resume: 0 })
      player.fire(videojsEventNames.loadeddata)

      expect(player.currentTime).not.toHaveBeenCalledWith(0)
    })

    it('swallows a seek failure', () => {
      init({ resume: 42 })
      player.currentTime.mockImplementation(() => {
        throw new Error('not seekable')
      })

      expect(() => player.fire(videojsEventNames.loadeddata)).not.toThrow()
    })

    it('raises a Loaded event on the first play', () => {
      init()
      player.fire(videojsEventNames.play)

      const event = lastEvent()
      expect(event.data.state).toBe(WsEvents.EnumTelemetrySubType.Loaded)
      expect(event.data.identifier).toBe('do_123')
      expect(event.data.mimeType).toBe(MIME)
      expect(event.data.passThroughData).toEqual({ rootOrg: 'org' })
      expect(event.from.widgetSubType).toBe('video')
      expect(event.eventType).toBe(WsEvents.WsEventType.Telemetry)
    })

    it('emits a heartbeat every two minutes while playing', () => {
      init()
      player.fire(videojsEventNames.play)
      dispatcher.mockClear()

      jest.advanceTimersByTime(2 * 60000)

      expect(dispatcher.mock.calls.some(c => c[0].data.eventSubType === WsEvents.EnumTelemetrySubType.HeartBeat)).toBe(true)
    })

    it('reports progress when the rounded percentage moves', () => {
      init()
      player.fire(videojsEventNames.play)
      player.setTime(10)

      jest.advanceTimersByTime(500)

      expect(fireRProgress).toHaveBeenCalledWith('do_123', {
        content_type: 'Resource',
        current: ['10'],
        max_size: 100,
        mime_type: MIME,
        user_id_type: 'uuid',
      })
    })

    it('does not report progress twice for the same percentage bucket', () => {
      init()
      player.fire(videojsEventNames.play)
      player.setTime(10)
      jest.advanceTimersByTime(500)
      fireRProgress.mockClear()

      player.setTime(11)
      jest.advanceTimersByTime(500)

      expect(fireRProgress).not.toHaveBeenCalled()
    })

    it('skips progress reporting for content with no identifier', () => {
      init({ data: { widget: widget({ identifier: '' }) } })
      player.fire(videojsEventNames.play)
      player.setTime(10)

      jest.advanceTimersByTime(500)

      expect(fireRProgress).not.toHaveBeenCalled()
    })

    it('raises Loaded only once across repeated plays', () => {
      init()
      player.fire(videojsEventNames.play)
      player.fire(videojsEventNames.play)

      expect(statesDispatched().filter(s => s === WsEvents.EnumTelemetrySubType.Loaded).length).toBe(1)
    })

    it('unloads and stops the timers on pause', () => {
      init()
      player.fire(videojsEventNames.play)
      player.setTime(30)
      dispatcher.mockClear()

      player.fire(videojsEventNames.pause)

      expect(lastEvent().data.state).toBe(WsEvents.EnumTelemetrySubType.Unloaded)
      expect(lastEvent().data.playerStatus).toBe(WsEvents.EnumTelemetryMediaActivity.PAUSED)

      fireRProgress.mockClear()
      jest.advanceTimersByTime(5000)
      expect(fireRProgress).not.toHaveBeenCalled()
    })

    it('only records the time on a pause that was never loaded', () => {
      init()
      player.setTime(12)

      player.fire(videojsEventNames.pause)

      expect(dispatcher).not.toHaveBeenCalled()
    })

    it('unloads and stops the timers when the video ends', () => {
      init()
      player.fire(videojsEventNames.play)
      dispatcher.mockClear()

      player.fire(videojsEventNames.ended)

      expect(lastEvent().data.playerStatus).toBe(WsEvents.EnumTelemetryMediaActivity.ENDED)
    })

    it('ignores an end event for a player that never played', () => {
      init()
      player.fire(videojsEventNames.ended)

      expect(dispatcher).not.toHaveBeenCalled()
    })

    it('saves continue-learning progress on dispose', () => {
      const res = init()
      player.fire(videojsEventNames.play)
      player.setTime(35)
      player.fire(videojsEventNames.pause)

      res.dispose()

      expect(saveCLearning).toHaveBeenCalledWith({
        resourceId: 'do_123',
        dateAccessed: expect.any(Number),
        data: JSON.stringify({ progress: 35, timestamp: Date.now() }),
      })
    })

    it('raises a final Unloaded event when disposed mid-play', () => {
      const res = init()
      player.fire(videojsEventNames.play)
      dispatcher.mockClear()

      res.dispose()

      expect(lastEvent().data.playerStatus).toBe(WsEvents.EnumTelemetryMediaActivity.ENDED)
    })

    it('disposes cleanly when the player never started', () => {
      const res = init()

      expect(() => res.dispose()).not.toThrow()
      expect(saveCLearning).toHaveBeenCalled()
      expect(dispatcher).not.toHaveBeenCalled()
    })

    describe('quiz markers', () => {
      it('registers markers for timed video questions', () => {
        player = makePlayer()
        player.markers = jest.fn()
        playerFactory.mockReturnValue(player)

        videoJsInitializer(
          makeMediaElement(),
          {} as any,
          dispatcher,
          saveCLearning,
          fireRProgress,
          {},
          'video',
          0,
          false,
          widget({
            videoQuestions: [
              { timestampInSeconds: 10, question: [{ text: 'Q1' }] },
              { timestampInSeconds: 20, question: [{ text: 'Q2' }] },
            ],
          }) as any,
          MIME,
        )

        expect(player.markers).toHaveBeenCalledWith(
          expect.objectContaining({
            markers: [
              { time: 10, text: 'Q1' },
              { time: 20, text: 'Q2' },
            ],
          }),
        )
        expect(player.markers.mock.calls[0][0].markerTip.text()).toBe('Quiz')
      })

      it('warns when the markers plugin is missing', () => {
        player = makePlayer()
        playerFactory.mockReturnValue(player)

        videoJsInitializer(
          makeMediaElement(),
          {} as any,
          dispatcher,
          saveCLearning,
          fireRProgress,
          {},
          'video',
          0,
          false,
          widget({ videoQuestions: [{ timestampInSeconds: 1, question: [{ text: 'Q' }] }] }) as any,
          MIME,
        )

        expect(errorSpy).toHaveBeenCalledWith('Markers plugin is not loaded.')
      })

      it('does nothing for content without video questions', () => {
        player = makePlayer()
        player.markers = jest.fn()
        playerFactory.mockReturnValue(player)

        videoJsInitializer(
          makeMediaElement(),
          {} as any,
          dispatcher,
          saveCLearning,
          fireRProgress,
          {},
          'video',
          0,
          false,
          widget() as any,
          MIME,
        )

        expect(player.markers).not.toHaveBeenCalled()
      })
    })
  })

  describe('videoInitializer', () => {
    let elem: HTMLVideoElement

    const init = (telemetry = true, data: any = widget()) => {
      playerFactory.mockReturnValue(makePlayer())
      elem = makeMediaElement()
      return videoInitializer(elem, dispatcher, saveCLearning, fireRProgress, { rootOrg: 'org' }, 'video', telemetry, data, MIME)
    }

    const fire = (name: string) => elem.dispatchEvent(new Event(name))

    it('subscribes to no media events when telemetry is off', () => {
      const res = init(false)
      fire('play')

      expect(dispatcher).not.toHaveBeenCalled()
      expect(() => res.dispose()).not.toThrow()
    })

    it('raises a Loaded event on the first play', () => {
      init()
      fire('play')

      expect(lastEvent().data.state).toBe(WsEvents.EnumTelemetrySubType.Loaded)
      expect(lastEvent().data.playerStatus).toBe(WsEvents.EnumTelemetryMediaActivity.PLAYED)
    })

    it('emits a heartbeat every two minutes while playing', () => {
      init()
      fire('play')
      dispatcher.mockClear()

      jest.advanceTimersByTime(2 * 60000)

      expect(lastEvent().data.eventSubType).toBe(WsEvents.EnumTelemetrySubType.HeartBeat)
    })

    it('arms progress reporting once past 5% and fires it past 95%', () => {
      init()
      fire('play')

      elem.currentTime = 10
      jest.advanceTimersByTime(500)
      expect(fireRProgress).not.toHaveBeenCalled()

      elem.currentTime = 96
      jest.advanceTimersByTime(500)

      expect(fireRProgress).toHaveBeenCalledWith('do_123', {
        content_type: 'Resource',
        current: ['96'],
        max_size: 100,
        mime_type: MIME,
        user_id_type: 'uuid',
      })
    })

    it('does not fire progress when the video jumps straight to the end', () => {
      init()
      fire('play')

      elem.currentTime = 99
      jest.advanceTimersByTime(500)

      expect(fireRProgress).not.toHaveBeenCalled()
    })

    it('unloads on pause and records the time', () => {
      const res = init()
      fire('play')
      elem.currentTime = 40
      dispatcher.mockClear()

      fire('pause')

      expect(lastEvent().data.playerStatus).toBe(WsEvents.EnumTelemetryMediaActivity.PAUSED)

      res.dispose()
      expect(saveCLearning).toHaveBeenCalledWith(expect.objectContaining({ data: JSON.stringify({ progress: 40, timestamp: Date.now() }) }))
    })

    it('ignores a pause that follows no play', () => {
      init()
      elem.currentTime = 5

      fire('pause')

      expect(dispatcher).not.toHaveBeenCalled()
    })

    it('unloads when the video ends', () => {
      init()
      fire('play')
      dispatcher.mockClear()

      fire('ended')

      expect(lastEvent().data.playerStatus).toBe(WsEvents.EnumTelemetryMediaActivity.ENDED)
    })

    it('ignores an end event that follows no play', () => {
      init()
      fire('ended')

      expect(dispatcher).not.toHaveBeenCalled()
    })

    it('flushes an armed progress report on dispose', () => {
      const res = init()
      fire('play')
      elem.currentTime = 50
      jest.advanceTimersByTime(500)

      res.dispose()

      expect(fireRProgress).toHaveBeenCalledWith('do_123', expect.objectContaining({ max_size: 100 }))
    })

    it('detaches every media subscription on dispose', () => {
      const res = init()
      fire('play')
      res.dispose()
      dispatcher.mockClear()

      fire('play')
      fire('pause')
      fire('ended')

      expect(dispatcher).not.toHaveBeenCalled()
    })
  })

  describe('youtubeInitializer', () => {
    let ytPlayer: any
    let onStateChange: (e: any) => void

    const PLAYING = 1
    const PAUSED = 2
    const ENDED = 0

    const init = (telemetry = true, data: any = widget()) => {
      ytPlayer = {
        getCurrentTime: jest.fn().mockReturnValue(0),
        getDuration: jest.fn().mockReturnValue(100),
      }
      ;(window as any).YT = {
        PlayerState: { PLAYING, PAUSED, ENDED },
        Player: jest.fn((_elem: any, opts: any) => {
          onStateChange = opts.events.onStateChange
          return ytPlayer
        }),
      }
      return youtubeInitializer(
        document.createElement('div'),
        'yt_abc',
        dispatcher,
        saveCLearning,
        fireRProgress,
        { rootOrg: 'org' },
        'video',
        telemetry,
        data,
        MIME,
        '480px',
      )
    }

    afterEach(() => {
      delete (window as any).YT
    })

    it('builds the YT player with the requested video and height', () => {
      init()

      expect((window as any).YT.Player).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ videoId: 'yt_abc', width: '100%', height: '480px' }),
      )
    })

    it('raises a Loaded event when playback starts', () => {
      init()
      onStateChange({ data: PLAYING })

      expect(lastEvent().data.state).toBe(WsEvents.EnumTelemetrySubType.Loaded)
    })

    it('stays silent when telemetry is off', () => {
      init(false)
      onStateChange({ data: PLAYING })

      expect(dispatcher).not.toHaveBeenCalled()
    })

    it('emits a heartbeat every two minutes while playing', () => {
      init()
      onStateChange({ data: PLAYING })
      dispatcher.mockClear()

      jest.advanceTimersByTime(2 * 60000)

      expect(lastEvent().data.eventSubType).toBe(WsEvents.EnumTelemetrySubType.HeartBeat)
    })

    it('arms progress reporting past 5% and fires it past 95%', () => {
      init()
      onStateChange({ data: PLAYING })

      ytPlayer.getCurrentTime.mockReturnValue(10)
      jest.advanceTimersByTime(500)
      expect(fireRProgress).not.toHaveBeenCalled()

      ytPlayer.getCurrentTime.mockReturnValue(97)
      jest.advanceTimersByTime(500)

      expect(fireRProgress).toHaveBeenCalledWith('do_123', expect.objectContaining({ current: ['97'] }))
    })

    it('unloads on pause and keeps the last known time', () => {
      const res = init()
      onStateChange({ data: PLAYING })
      ytPlayer.getCurrentTime.mockReturnValue(60)
      dispatcher.mockClear()

      onStateChange({ data: PAUSED })

      expect(lastEvent().data.playerStatus).toBe(WsEvents.EnumTelemetryMediaActivity.PAUSED)

      res.dispose()
      expect(saveCLearning).toHaveBeenCalledWith(expect.objectContaining({ data: JSON.stringify({ progress: 60, timestamp: Date.now() }) }))
    })

    it('unloads when the video ends', () => {
      init()
      onStateChange({ data: PLAYING })
      dispatcher.mockClear()

      onStateChange({ data: ENDED })

      expect(lastEvent().data.playerStatus).toBe(WsEvents.EnumTelemetryMediaActivity.ENDED)
    })

    it('ignores pause and end events before any play', () => {
      init()
      onStateChange({ data: PAUSED })
      onStateChange({ data: ENDED })

      expect(dispatcher).not.toHaveBeenCalled()
    })

    it('ignores an unrecognised player state', () => {
      init()
      onStateChange({ data: 99 })

      expect(dispatcher).not.toHaveBeenCalled()
    })

    it('flushes an armed progress report on dispose', () => {
      const res = init()
      onStateChange({ data: PLAYING })
      ytPlayer.getCurrentTime.mockReturnValue(50)
      jest.advanceTimersByTime(500)

      res.dispose()

      expect(fireRProgress).toHaveBeenCalledWith('do_123', expect.objectContaining({ max_size: 100 }))
    })

    it('disposes cleanly when nothing ever played', () => {
      const res = init()

      expect(() => res.dispose()).not.toThrow()
      expect(saveCLearning).toHaveBeenCalled()
    })
  })
})
