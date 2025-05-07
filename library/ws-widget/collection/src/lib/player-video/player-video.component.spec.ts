import { PlayerVideoComponent } from './player-video.component'
import { EventService } from '@ws-widget/utils'
import { WidgetContentService } from '../_services/widget-content.service'
import { ViewerDataService } from 'project/ws/viewer/src/lib/viewer-data.service'
import { MatDialog } from '@angular/material/dialog'
import { of, Subscription } from 'rxjs'
import { PlayerVideoPopupComponent } from '../player-video-popup/player-video-popup-component'

// Mock videojs-markers
jest.mock('videojs-markers', () => ({
  __esModule: true,
  default: jest.fn()
}))

// Custom type for mocked video.js
type MockVideoJs = jest.Mock & {
  registerPlugin: jest.Mock
  plugins?: {
    markers: jest.Mock
  }
}

// Mock video.js with proper typing
jest.mock('video.js', () => {
  const mockPlayer = {
    dispose: jest.fn(),
    on: jest.fn(),
    pause: jest.fn(),
    play: jest.fn(),
    currentTime: jest.fn().mockReturnValue(0),
    addRemoteTextTrack: jest.fn(),
    src: jest.fn(),
    ready: jest.fn((callback) => callback()),
    markers: jest.fn()
  }

  const videoJs = jest.fn(() => mockPlayer) as MockVideoJs
  videoJs.registerPlugin = jest.fn()
  videoJs.plugins = {
    markers: jest.fn()
  }

  return videoJs
})

// Mock videojs-util
jest.mock('../_services/videojs-util', () => ({
  videoInitializer: jest.fn(() => ({ dispose: jest.fn() })),
  videoJsInitializer: jest.fn(() => ({
    player: {
      addRemoteTextTrack: jest.fn(),
      src: jest.fn(),
      ready: jest.fn((callback) => callback()),
      markers: jest.fn()
    },
    dispose: jest.fn()
  }))
}))

describe('PlayerVideoComponent', () => {
  let component: PlayerVideoComponent

  // Mock services
  const mockEventSvc = {
    dispatchEvent: jest.fn()
  } as unknown as EventService

  const mockContentSvc = {
    readcontentV3: jest.fn().mockReturnValue(of({})),
    saveContinueLearning: jest.fn().mockReturnValue(of({}))
  } as unknown as WidgetContentService

  const mockViewerDataSvc = {} as ViewerDataService

  const mockDialog = {
    open: jest.fn().mockReturnValue({ afterClosed: () => of({}) }),
    closeAll: jest.fn()
  } as unknown as MatDialog

  // Mock ActivatedRoute
  const mockActivatedRoute = {
    snapshot: {
      queryParams: {},
      paramMap: { get: jest.fn() },
      params: {},
      url: [],
      queryParamMap: { get: jest.fn() },
      fragment: null,
      data: {},
      outlet: '',
      component: null,
      routeConfig: null,
      root: {} as any,
      parent: null,
      firstChild: null,
      children: [],
      pathFromRoot: [],
    },
    queryParams: of({}),
    params: of({}),
    fragment: of(null),
    data: of({}),
    url: of([]),
    outlet: '',
    component: null,
    routeConfig: null,
    root: {} as any,
    parent: null,
    firstChild: null,
    children: [],
    pathFromRoot: [],
    paramMap: of({ get: jest.fn() }),
    queryParamMap: of({ get: jest.fn() }),
    toString: jest.fn()
  } as any

  beforeEach(() => {
    component = new PlayerVideoComponent(
      mockEventSvc,
      mockContentSvc,
      mockActivatedRoute,
      mockViewerDataSvc,
      mockDialog
    )

    // Setup default widgetData
    component.widgetData = {
      identifier: 'test-video',
      url: 'https://test.video',
      isVideojs: false,
      autoplay: false,
      posterImage: 'test-poster.jpg',
      disableTelemetry: false,
      resumePoint: 0,
      mimeType: 'video/mp4'
    }

    // Mock DOM elements
    component.videoTag = { nativeElement: {} } as any
    component.realvideoTag = { nativeElement: {} } as any

    jest.clearAllMocks()
  })

  // 1. Component Initialization Tests
  describe('Component Initialization', () => {
    it('should create successfully', () => {
      expect(component).toBeTruthy()
    })

    it('should initialize with null player and dispose', () => {
      expect(component.player).toBeNull()
      expect(component.dispose).toBeNull()
    })

    it('should initialize with empty videoStates', () => {
      expect(component.videoStates).toEqual({})
    })
  })

  // 2. Lifecycle Hook Tests
  describe('Lifecycle Hooks', () => {
    it('should log widget data on init', () => {
      const consoleSpy = jest.spyOn(console, 'log')
      component.ngOnInit()
      expect(consoleSpy).toHaveBeenCalledWith(
        'videoDatas',
        component.widgetData,
        undefined
      )
    })

    it('should fetch content when URL is missing in ngAfterViewInit', async () => {
      component.widgetData.url = undefined
      const fetchSpy = jest.spyOn(component, 'fetchContent').mockResolvedValue(undefined)

      await component.ngAfterViewInit()
      expect(fetchSpy).toHaveBeenCalled()
    })

    it('should initialize native player when isVideojs is false', async () => {
      component.widgetData.isVideojs = false
      const initSpy = jest.spyOn(component, 'initializeVPlayer')

      await component.ngAfterViewInit()
      expect(initSpy).toHaveBeenCalled()
    })

    it('should initialize video.js player when isVideojs is true', async () => {
      component.widgetData.isVideojs = true
      const initSpy = jest.spyOn(component, 'initializePlayer')

      await component.ngAfterViewInit()
      expect(initSpy).toHaveBeenCalled()
    })

    it('should clean up resources on destroy', () => {
      const mockDispose = jest.fn()
      const mockPlayer = { dispose: jest.fn() }

      component.dispose = mockDispose
      component.player = mockPlayer as any

      component.ngOnDestroy()

      expect(mockPlayer.dispose).toHaveBeenCalled()
      expect(mockDispose).toHaveBeenCalled()
    })
  })

  // 3. Content Fetching Tests
  describe('Content Fetching', () => {
    it('should update widgetData with fetched content', async () => {
      const mockContent = {
        artifactUrl: '/content-store/video123',
        appIcon: 'thumbnail.jpg',
        videoQuestions: JSON.stringify([{ timestampInSeconds: 30 }])
      }
      mockContentSvc.readcontentV3 = jest.fn().mockReturnValue(of(mockContent))

      await component.fetchContent()

      expect(component.widgetData.url).toBe('/content-store/video123')
      expect(component.widgetData.posterImage).toBe('thumbnail.jpg')
      expect(component.widgetData.videoQuestions).toEqual([{ timestampInSeconds: 30 }])
    })
  })

  // 4. Video Player Initialization Tests
  describe('Video Player Initialization', () => {
    describe('Native Player (initializeVPlayer)', () => {
      it('should initialize with correct options', () => {
        component.initializeVPlayer()
        expect(require('../_services/videojs-util').videoInitializer).toHaveBeenCalled()
        expect(component.dispose).toBeDefined()
      })

      it('should set resume point if provided', () => {
        component.widgetData.resumePoint = 30
        component.realvideoTag = { nativeElement: { currentTime: 0 } } as any

        component.initializeVPlayer()
        expect(component.realvideoTag.nativeElement.currentTime).toBe(30)
      })
    })

    describe('Video.js Player (initializePlayer)', () => {
      beforeEach(() => {
        component.widgetData.subtitles = [
          { label: 'English', srclang: 'en', url: 'subtitle.vtt' }
        ]
      })

      it('should initialize with correct options', () => {
        component.initializePlayer()
        expect(require('../_services/videojs-util').videoJsInitializer).toHaveBeenCalled()
        expect(component.player).toBeDefined()
        expect(component.dispose).toBeDefined()
      })

      it('should add subtitle tracks when available', () => {
        component.initializePlayer()

        if (component.player) {
          expect(component.player.addRemoteTextTrack).toHaveBeenCalledWith({
            default: true,
            kind: 'captions',
            label: 'English',
            srclang: 'en',
            src: 'subtitle.vtt'
          }, false)
        } else {
          fail('Player should be defined')
        }
      })

    })
  })

  // 5. Playback Monitoring Tests
  describe('Playback Monitoring', () => {
    let mockPlayer: any
    // let mockVideoElement: any

    beforeEach(() => {
      mockPlayer = {
        on: jest.fn(),
        pause: jest.fn(),
        currentTime: jest.fn().mockReturnValue(0),
        play: jest.fn()
      }
      // mockVideoElement = {}
      jest.spyOn(require('video.js'), 'default').mockReturnValue(mockPlayer)

      component.widgetData.videoQuestions = [
        {
          timestampInSeconds: 30,
          question: [{ text: 'What did you learn?' }]
        }
      ]
    })

  })

  // 6. Popup Handling Tests
  describe('Popup Handling', () => {
    beforeEach(() => {
      component.widgetData = { identifier: 'test-video' }
    })

    it('should open dialog with questions', () => {
      const questions = [{ text: 'Test question?' }]
      const mockInterval = {
        unsubscribe: jest.fn(),
        closed: false,
      } as unknown as Subscription

      component.openPopup(questions, {} as any, mockInterval)
      expect(mockDialog.open).toHaveBeenCalledWith(PlayerVideoPopupComponent, {
        width: '600px',
        data: { questions }
      })
    })

    it('should resume playback after dialog closes', () => {
      const mockVideo = { play: jest.fn() }
      const mockInterval = {
        unsubscribe: jest.fn(),
        closed: false,
      } as unknown as Subscription

      component.openPopup(
        [{ text: 'Q?' }],
        mockVideo,
        mockInterval
      )

      expect(mockVideo.play).toHaveBeenCalled()
      expect(mockInterval.unsubscribe).toHaveBeenCalled()
    })
  })

  // 7. Edge Case Tests
  describe('Edge Cases', () => {
    it('should handle null player in ngOnDestroy', () => {
      component.dispose = null
      component.player = null
      expect(() => component.ngOnDestroy()).not.toThrow()
    })

  })
})