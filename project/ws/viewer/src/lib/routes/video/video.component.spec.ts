import { Subject, of } from 'rxjs'
import { VideoComponent } from './video.component'

describe('VideoComponent', () => {
  let activatedRoute: any
  let valueSvc: any
  let viewerSvc: any
  let platform: any
  let accessControlSvc: any
  let isXSmall$: Subject<boolean>
  let routeData$: Subject<any>

  const build = () => new VideoComponent(activatedRoute, valueSvc, viewerSvc, platform, accessControlSvc)

  beforeEach(() => {
    isXSmall$ = new Subject<boolean>()
    routeData$ = new Subject<any>()
    valueSvc = { isXSmall$ }
    viewerSvc = { getContent: jest.fn(() => of(null)) }
    platform = { IOS: false, WEBKIT: false, SAFARI: false, ANDROID: false }
    accessControlSvc = { authoringConfig: { newDesign: false } }
    activatedRoute = {
      data: routeData$.asObservable(),
      snapshot: {
        queryParamMap: { get: jest.fn(() => null) },
        paramMap: { get: jest.fn(() => 'res1') },
      },
    }
    ;(window as any).env = { azureBucket: 'my-bucket' }
  })

  it('should create', () => {
    expect(build()).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('subscribes to screen size and updates flag', () => {
      const c = build()
      c.ngOnInit()
      isXSmall$.next(true)
      expect(c.isScreenSizeSmall).toBe(true)
    })

    it('sets isNotEmbed false when embed=true query param', () => {
      activatedRoute.snapshot.queryParamMap.get = jest.fn((k: string) => (k === 'embed' ? 'true' : null))
      const c = build()
      c.ngOnInit()
      expect(c.isNotEmbed).toBe(false)
    })

    it('uses the route-data branch and populates widget resolver data', () => {
      const c = build()
      c.ngOnInit()
      const content = {
        identifier: 'id1',
        artifactUrl: 'http://my-bucket/video.mp4',
        mimeType: 'video/mp4',
        name: 'A video',
        description: 'desc',
        duration: 100,
        subTitles: [{ url: 'http://cdn/sub.vtt' }],
      }
      routeData$.next({ content: { data: content } })
      expect(c.isFetchingDataComplete).toBe(true)
      expect(c.widgetResolverVideoData).toBeTruthy()
      expect((c.widgetResolverVideoData as any).widgetData.identifier).toBe('id1')
      expect((c.widgetResolverVideoData as any).widgetData.subtitles[0].url).toContain('/apis/authContent/')
    })

    it('uses the preview branch and fetches content', () => {
      activatedRoute.snapshot.queryParamMap.get = jest.fn((k: string) => (k === 'preview' ? 'true' : null))
      const content = {
        identifier: 'id2',
        artifactUrl: 'http://other-host/video.mp4',
        name: 'B',
        description: 'd',
        duration: 50,
        subTitles: [{ url: '/content-store/x/sub.vtt' }],
      }
      viewerSvc.getContent = jest.fn(() => of(content))
      const c = build()
      c.ngOnInit()
      expect(viewerSvc.getContent).toHaveBeenCalledWith('res1')
      expect(c.videoData).toEqual(content)
      expect(c.isFetchingDataComplete).toBe(true)
      expect((c.widgetResolverVideoData as any).widgetData.disableTelemetry).toBe(true)
    })
  })

  describe('generateUrl', () => {
    it('returns the same url when it already contains the bucket', () => {
      const c = build()
      expect(c.generateUrl('http://my-bucket/a.mp4')).toBe('http://my-bucket/a.mp4')
    })

    it('returns undefined when url does not contain the bucket', () => {
      const c = build()
      expect(c.generateUrl('http://other/a.mp4')).toBeUndefined()
    })
  })

  describe('getResumePoint', () => {
    it('returns 0 for null content', () => {
      expect(build().getResumePoint(null)).toBe(0)
    })

    it('returns 0 when progress not supported', () => {
      expect(build().getResumePoint({ duration: 100 } as any)).toBe(0)
    })

    it('computes floor(duration * progress) when supported', () => {
      const content = { duration: 200, progress: { progressSupported: true, progress: 0.5 } } as any
      expect(build().getResumePoint(content)).toBe(100)
    })
  })

  describe('initWidgetResolverVideoData', () => {
    it('sets isVideojs true for IOS', () => {
      platform.IOS = true
      const res = build().initWidgetResolverVideoData({ mimeType: 'video/mp4' } as any)
      expect(res.widgetData.isVideojs).toBe(true)
      expect(res.widgetType).toBe('player')
    })

    it('sets isVideojs true for a non-webkit/non-safari desktop browser', () => {
      const res = build().initWidgetResolverVideoData({ mimeType: 'video/mp4' } as any)
      expect(res.widgetData.isVideojs).toBe(true)
    })

    it('sets isVideojs false on Safari/Webkit', () => {
      platform.WEBKIT = true
      platform.SAFARI = true
      const res = build().initWidgetResolverVideoData({ mimeType: 'video/mp4' } as any)
      expect(res.widgetData.isVideojs).toBe(false)
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

  describe('ngOnDestroy', () => {
    it('unsubscribes all subscriptions', () => {
      const c = build()
      c.ngOnInit()
      // trigger preview subscription too
      const s1 = { unsubscribe: jest.fn() }
      ;(c as any).routeDataSubscription = s1
      const s2 = { unsubscribe: jest.fn() }
      ;(c as any).viewerDataSubscription = s2
      c.ngOnDestroy()
      expect(s1.unsubscribe).toHaveBeenCalled()
      expect(s2.unsubscribe).toHaveBeenCalled()
    })

    it('is safe with no subscriptions', () => {
      const c = build()
      expect(() => c.ngOnDestroy()).not.toThrow()
    })
  })
})
