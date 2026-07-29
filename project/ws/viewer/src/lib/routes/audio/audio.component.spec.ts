import { BehaviorSubject, Subject, of } from 'rxjs'
import { AudioComponent } from './audio.component'

/**
 * Full, non-null mock content — every subscribed observable in ngOnInit
 * reads these fields, so any null path would throw inside the subscribe
 * callback and crash the jest worker. Keep this complete.
 */
const fullContent = (over: any = {}) => ({
  identifier: 'audio-1',
  name: 'An audio resource',
  description: 'A description',
  artifactUrl: 'http://my-bucket/audio.mp3',
  mimeType: 'audio/mp3',
  subTitles: [{ url: 'http://cdn/sub.vtt' }],
  ...over,
})

describe('AudioComponent', () => {
  let activatedRoute: any
  let contentSvc: any
  let valueSvc: any
  let viewerSvc: any
  let accessControlSvc: any
  let isXSmall$: Subject<boolean>
  let routeData$: BehaviorSubject<any>

  const build = () => new AudioComponent(activatedRoute, contentSvc, valueSvc, viewerSvc, accessControlSvc)

  beforeEach(() => {
    isXSmall$ = new Subject<boolean>()
    // Seed the route-data stream with a FULL payload so the subscribe path never throws.
    routeData$ = new BehaviorSubject<any>({ content: { data: fullContent() } })
    valueSvc = { isXSmall$ }
    viewerSvc = { getContent: jest.fn(() => of(fullContent())) }
    contentSvc = {
      fetchContentHistory: jest.fn(() => of({ identifier: 'audio-1', continueData: { progress: '42' } })),
    }
    accessControlSvc = { authoringConfig: { newDesign: false } }
    activatedRoute = {
      data: routeData$.asObservable(),
      snapshot: {
        queryParamMap: { get: jest.fn(() => null) },
        queryParams: {},
        paramMap: { get: jest.fn(() => 'audio-1') },
      },
    }
    ;(window as any).env = { azureBucket: 'my-bucket' }
  })

  it('should create', () => {
    expect(build()).toBeTruthy()
  })

  describe('ngOnInit — route-data branch', () => {
    it('subscribes to screen size and updates the flag', () => {
      const c = build()
      c.ngOnInit()
      isXSmall$.next(true)
      expect(c.isScreenSizeSmall).toBe(true)
    })

    it('populates audioData, discussion forum and widget resolver data', async () => {
      const c = build()
      c.ngOnInit()
      await Promise.resolve()
      await Promise.resolve()
      expect(c.audioData).toBeTruthy()
      expect((c.audioData as any).identifier).toBe('audio-1')
      expect(c.discussionForumWidget).toBeTruthy()
      expect(c.widgetResolverAudioData).toBeTruthy()
      expect((c.widgetResolverAudioData as any).widgetData.identifier).toBe('audio-1')
      expect(c.isFetchingDataComplete).toBe(true)
    })

    it('builds subtitle url from a content-store url', async () => {
      routeData$.next({
        content: { data: fullContent({ subTitles: [{ url: 'http://host/content-store/x/sub.vtt' }] }) },
      })
      const c = build()
      c.ngOnInit()
      await Promise.resolve()
      await Promise.resolve()
      const url = (c.widgetResolverAudioData as any).widgetData.subtitles[0].url
      expect(url).toContain('/apis/authContent/')
      expect(url).toContain('/content-store/')
    })

    it('encodes subtitle url when not a content-store url', async () => {
      const c = build()
      c.ngOnInit()
      await Promise.resolve()
      await Promise.resolve()
      const url = (c.widgetResolverAudioData as any).widgetData.subtitles[0].url
      expect(url).toContain('/apis/authContent/')
    })

    it('uses collectionId query param for continue-learning when present', async () => {
      activatedRoute.snapshot.queryParams = { collectionId: 'coll-9' }
      const c = build()
      c.ngOnInit()
      await Promise.resolve()
      await Promise.resolve()
      expect(contentSvc.fetchContentHistory).toHaveBeenCalledWith('coll-9')
      // resumePoint set from continueData.progress
      expect((c.widgetResolverAudioData as any).widgetData.resumePoint).toBe(42)
    })

    it('sets disableTelemetry when previewing from /author/', async () => {
      const c = build()
      ;(c as any).forPreview = true
      c.ngOnInit()
      await Promise.resolve()
      await Promise.resolve()
      expect((c.widgetResolverAudioData as any).widgetData.disableTelemetry).toBe(true)
    })
  })

  describe('ngOnInit — preview branch', () => {
    beforeEach(() => {
      activatedRoute.snapshot.queryParamMap.get = jest.fn((k: string) => (k === 'preview' ? 'true' : null))
    })

    it('fetches content via viewerSvc and populates widget data', () => {
      const c = build()
      c.ngOnInit()
      expect(viewerSvc.getContent).toHaveBeenCalledWith('audio-1')
      expect(c.audioData).toBeTruthy()
      expect(c.isFetchingDataComplete).toBe(true)
      expect((c.widgetResolverAudioData as any).widgetData.disableTelemetry).toBe(true)
    })

    it('builds subtitle url from content-store in preview branch', () => {
      viewerSvc.getContent = jest.fn(() => of(fullContent({ subTitles: [{ url: 'http://host/content-store/y/sub.vtt' }] })))
      const c = build()
      c.ngOnInit()
      const url = (c.widgetResolverAudioData as any).widgetData.subtitles[0].url
      expect(url).toContain('/apis/authContent/')
    })
  })

  describe('generateUrl', () => {
    it('returns the same url when it already contains the bucket', () => {
      expect(build().generateUrl('http://my-bucket/a.mp3')).toBe('http://my-bucket/a.mp3')
    })

    it('returns undefined when url does not contain the bucket', () => {
      expect(build().generateUrl('http://other/a.mp3')).toBeUndefined()
    })
  })

  describe('initWidgetResolverAudioData', () => {
    it('returns a player/playerAudio config with defaults', () => {
      const res = build().initWidgetResolverAudioData()
      expect(res.widgetType).toBe('player')
      expect(res.widgetSubType).toBe('playerAudio')
      expect(res.widgetData.continueLearning).toBe(true)
    })
  })

  describe('formDiscussionForumWidget', () => {
    it('builds the discussion forum widget config', () => {
      const c = build()
      c.formDiscussionForumWidget({ description: 'd', identifier: 'id', name: 'n' } as any)
      expect(c.discussionForumWidget).toBeTruthy()
      expect((c.discussionForumWidget as any).widgetData.id).toBe('id')
      expect((c.discussionForumWidget as any).widgetType).toBe('discussionForum')
    })
  })

  describe('fetchContinueLearning', () => {
    it('resolves true and sets resumePoint when history matches', async () => {
      const c = build()
      c.widgetResolverAudioData = c.initWidgetResolverAudioData() as any
      const result = await c.fetchContinueLearning('audio-1', 'audio-1')
      expect(result).toBe(true)
      expect((c.widgetResolverAudioData as any).widgetData.resumePoint).toBe(42)
    })

    it('resolves true on error', async () => {
      contentSvc.fetchContentHistory = jest.fn(() => ({
        subscribe: (_next: any, err: any) => err('boom'),
      }))
      const c = build()
      expect(await c.fetchContinueLearning('a', 'b')).toBe(true)
    })

    it('resolves true when data has no matching identifier', async () => {
      contentSvc.fetchContentHistory = jest.fn(() => of({ identifier: 'other' }))
      const c = build()
      c.widgetResolverAudioData = c.initWidgetResolverAudioData() as any
      expect(await c.fetchContinueLearning('a', 'audio-1')).toBe(true)
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes all subscriptions', () => {
      const c = build()
      const s1 = { unsubscribe: jest.fn() }
      const s2 = { unsubscribe: jest.fn() }
      const s3 = { unsubscribe: jest.fn() }
      ;(c as any).routeDataSubscription = s1
      ;(c as any).screenSizeSubscription = s2
      ;(c as any).viewerDataSubscription = s3
      c.ngOnDestroy()
      expect(s1.unsubscribe).toHaveBeenCalled()
      expect(s2.unsubscribe).toHaveBeenCalled()
      expect(s3.unsubscribe).toHaveBeenCalled()
    })

    it('is safe with no subscriptions', () => {
      expect(() => build().ngOnDestroy()).not.toThrow()
    })
  })
})
