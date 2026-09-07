import { Subject, of } from 'rxjs'

jest.mock('video.js', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const youtubeInitializer = jest.fn()
const videoJsInitializer = jest.fn()

jest.mock('../_services/videojs-util', () => ({
  youtubeInitializer: (...args: any[]) => youtubeInitializer(...args),
  videoJsInitializer: (...args: any[]) => videoJsInitializer(...args),
}))

// tslint:disable-next-line: no-import-side-effect
import { PlayerYoutubeComponent } from './player-youtube.component'

describe('PlayerYoutubeComponent', () => {
  let eventSvc: any
  let contentSvc: any
  let viewerSvc: any
  let activatedRoute: any
  let valueSvc: any
  let isXSmall$: Subject<boolean>

  const build = () => new PlayerYoutubeComponent(eventSvc, contentSvc, viewerSvc, activatedRoute, valueSvc)

  beforeEach(() => {
    youtubeInitializer.mockReset()
    videoJsInitializer.mockReset()
    youtubeInitializer.mockReturnValue({ dispose: jest.fn() })
    videoJsInitializer.mockReturnValue({ player: { dispose: jest.fn() }, dispose: jest.fn() })

    eventSvc = { dispatchEvent: jest.fn() }
    contentSvc = { saveContinueLearning: jest.fn(() => of({})) }
    viewerSvc = { realTimeProgressUpdate: jest.fn() }
    isXSmall$ = new Subject<boolean>()
    valueSvc = { isXSmall$ }
    activatedRoute = {
      snapshot: { queryParams: {} },
    }
  })

  it('should create', () => {
    expect(build()).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('sets screenHeight to 100% on extra-small screens', () => {
      const c = build()
      c.ngOnInit()
      isXSmall$.next(true)
      expect(c.screenHeight).toBe('100%')
      expect(c.screenSubscription).toBeTruthy()
    })

    it('sets screenHeight to 500vh on larger screens', () => {
      const c = build()
      c.ngOnInit()
      isXSmall$.next(false)
      expect(c.screenHeight).toBe('500vh')
    })
  })

  describe('ngAfterViewInit', () => {
    it('does nothing when widgetData has no url', () => {
      const c = build()
      c.widgetData = {} as any
      c.ngAfterViewInit()
      expect(youtubeInitializer).not.toHaveBeenCalled()
      expect(videoJsInitializer).not.toHaveBeenCalled()
    })

    it('initializes videojs player when isVideojs is true', () => {
      const c = build()
      c.widgetData = { url: 'http://x/y', isVideojs: true, identifier: 'id1', disableTelemetry: false } as any
      ;(c as any).videoTag = { nativeElement: {} }
      c.ngAfterViewInit()
      expect(videoJsInitializer).toHaveBeenCalled()
      expect(youtubeInitializer).not.toHaveBeenCalled()
    })

    it('initializes youtube player and passes the embed id when not videojs', () => {
      const c = build()
      c.widgetData = { url: 'http://x/embed/ABC123', isVideojs: false, identifier: 'id1', disableTelemetry: false } as any
      ;(c as any).youtubeTag = { nativeElement: {} }
      c.ngAfterViewInit()
      expect(youtubeInitializer).toHaveBeenCalled()
      expect(youtubeInitializer.mock.calls[0][1]).toBe('ABC123')
    })
  })

  describe('youtube initializer callbacks', () => {
    const setup = (over: any = {}) => {
      const c = build()
      c.widgetData = { url: 'http://x/embed/VID', isVideojs: false, identifier: 'id1', disableTelemetry: false, ...over } as any
      ;(c as any).youtubeTag = { nativeElement: {} }
      c.ngAfterViewInit()
      const args = youtubeInitializer.mock.calls[0]
      return { dispatcher: args[2], saveCLearning: args[3], fireRProgress: args[4] }
    }

    it('dispatcher dispatches events when identifier present', () => {
      const { dispatcher } = setup()
      dispatcher({ some: 'event' })
      expect(eventSvc.dispatchEvent).toHaveBeenCalledWith({ some: 'event' })
    })

    it('saveCLearning saves playlist continue-learning data', () => {
      activatedRoute.snapshot.queryParams = { collectionType: 'Playlist', collectionId: 'col1' }
      const { saveCLearning } = setup()
      saveCLearning({ resourceId: 'r1', progress: 0.5 })
      expect(contentSvc.saveContinueLearning).toHaveBeenCalled()
      const payload = contentSvc.saveContinueLearning.mock.calls[0][0]
      expect(payload.contextType).toBe('playlist')
      expect(payload.contextPathId).toBe('col1')
    })

    it('saveCLearning saves non-playlist continue-learning data', () => {
      const { saveCLearning } = setup()
      saveCLearning({ resourceId: 'r1', progress: 0.5 })
      const payload = contentSvc.saveContinueLearning.mock.calls[0][0]
      expect(payload.contextPathId).toBe('id1')
      expect(payload.contextType).toBeUndefined()
    })

    it('fireRProgress delegates to viewer service', () => {
      const { fireRProgress } = setup()
      fireRProgress('id1', { p: 1 })
      expect(viewerSvc.realTimeProgressUpdate).toHaveBeenCalledWith('id1', { p: 1 })
    })
  })

  describe('videojs initializer callbacks', () => {
    it('wires dispatcher/save/progress and enables telemetry when flag defined+false', () => {
      const c = build()
      c.widgetData = { url: 'http://x/y', isVideojs: true, identifier: 'id1', disableTelemetry: false } as any
      ;(c as any).videoTag = { nativeElement: {} }
      c.ngAfterViewInit()
      const args = videoJsInitializer.mock.calls[0]
      const enableTelemetry = args[8]
      expect(enableTelemetry).toBe(true)
      // exercise the closures
      args[2]({ e: 1 })
      expect(eventSvc.dispatchEvent).toHaveBeenCalled()
      args[3]({ resourceId: 'r', progress: 0.2 })
      expect(contentSvc.saveContinueLearning).toHaveBeenCalled()
      args[4]('id1', {})
      expect(viewerSvc.realTimeProgressUpdate).toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('disposes player, dispose fn and unsubscribes', () => {
      const c = build()
      const playerDispose = jest.fn()
      const disposeFn = jest.fn()
      const unsub = jest.fn()
      ;(c as any).player = { dispose: playerDispose }
      ;(c as any).dispose = disposeFn
      c.screenSubscription = { unsubscribe: unsub } as any
      c.ngOnDestroy()
      expect(playerDispose).toHaveBeenCalled()
      expect(disposeFn).toHaveBeenCalled()
      expect(unsub).toHaveBeenCalled()
    })

    it('is safe when nothing is set', () => {
      const c = build()
      expect(() => c.ngOnDestroy()).not.toThrow()
    })
  })
})
