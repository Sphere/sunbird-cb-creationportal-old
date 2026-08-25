import { of } from 'rxjs'
import { YoutubeComponent } from './youtube.component'

describe('YoutubeComponent', () => {
  let component: YoutubeComponent
  let activatedRoute: any
  let valueSvc: any
  let contentSvc: any
  let platform: any

  const makeContent = (over: any = {}) =>
    ({
      identifier: 'do_123',
      name: 'My Video',
      description: 'A description',
      artifactUrl: 'https://youtu.be/abc',
      ...over,
    }) as any

  const buildRoute = (content: any) => ({ data: of({ content: { data: content } }) })

  beforeEach(() => {
    activatedRoute = buildRoute(makeContent())
    valueSvc = { isXSmall$: of(false) }
    contentSvc = { setS3Cookie: jest.fn().mockReturnValue({ toPromise: () => Promise.resolve() }) }
    platform = { ANDROID: false }
    component = new YoutubeComponent(activatedRoute, valueSvc, contentSvc, platform)
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('populates youtube data and widget resolver config', () => {
      component.ngOnInit()
      expect(component.isScreenSizeSmall).toBe(false)
      expect(component.youtubeData).toBeTruthy()
      expect(component.widgetResolverYoutubeData!.widgetData.url).toBe('https://youtu.be/abc')
      expect(component.widgetResolverYoutubeData!.widgetData.identifier).toBe('do_123')
      expect(component.widgetResolverYoutubeData!.widgetData.isVideojs).toBe(true)
      expect(component.isFetchingDataComplete).toBe(true)
    })

    it('builds a discussion forum widget from content', () => {
      component.ngOnInit()
      expect(component.discussionForumWidget).toBeTruthy()
      expect(component.discussionForumWidget!.widgetData.id).toBe('do_123')
      expect(component.discussionForumWidget!.widgetData.title).toBe('My Video')
    })

    it('reflects small screen state from valueSvc', () => {
      valueSvc.isXSmall$ = of(true)
      component = new YoutubeComponent(activatedRoute, valueSvc, contentSvc, platform)
      component.ngOnInit()
      expect(component.isScreenSizeSmall).toBe(true)
    })

    it('disables videojs on Android', () => {
      platform.ANDROID = true
      component = new YoutubeComponent(activatedRoute, valueSvc, contentSvc, platform)
      component.ngOnInit()
      expect(component.widgetResolverYoutubeData!.widgetData.isVideojs).toBe(false)
    })

    it('disables telemetry when in preview mode', () => {
      component.forPreview = true
      component.ngOnInit()
      expect(component.widgetResolverYoutubeData!.widgetData.disableTelemetry).toBe(true)
      expect(component.discussionForumWidget!.widgetData.isDisabled).toBe(true)
    })

    it('handles null content gracefully', () => {
      activatedRoute = buildRoute(null)
      component = new YoutubeComponent(activatedRoute, valueSvc, contentSvc, platform)
      component.ngOnInit()
      expect(component.youtubeData).toBeNull()
      expect(component.widgetResolverYoutubeData!.widgetData.url).toBe('')
      expect(component.widgetResolverYoutubeData!.widgetData.identifier).toBe('')
    })

    it('sets the s3 cookie for content-store artifacts', async () => {
      activatedRoute = buildRoute(makeContent({ artifactUrl: 'https://x/content-store/y.mp4' }))
      component = new YoutubeComponent(activatedRoute, valueSvc, contentSvc, platform)
      component.ngOnInit()
      await Promise.resolve()
      await Promise.resolve()
      expect(contentSvc.setS3Cookie).toHaveBeenCalledWith('do_123')
    })
  })

  describe('initWidgetResolverYoutubeData', () => {
    it('returns the default player config', () => {
      const config = component.initWidgetResolverYoutubeData()
      expect(config.widgetType).toBe('player')
      expect(config.widgetSubType).toBe('playerYoutube')
      expect(config.widgetData.disableTelemetry).toBe(false)
    })
  })

  describe('formDiscussionForumWidget', () => {
    it('maps content fields into the discussion forum widget', () => {
      component.formDiscussionForumWidget(makeContent({ name: 'Lesson', identifier: 'id-9' }))
      expect(component.discussionForumWidget!.widgetType).toBe('discussionForum')
      expect(component.discussionForumWidget!.widgetData.title).toBe('Lesson')
      expect(component.discussionForumWidget!.widgetData.id).toBe('id-9')
      expect(component.discussionForumWidget!.widgetData.initialPostCount).toBe(2)
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes all active subscriptions', () => {
      component.ngOnInit()
      expect(() => component.ngOnDestroy()).not.toThrow()
    })

    it('does not throw when no subscriptions exist', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
