import { of, Subscription } from 'rxjs'
import { IapComponent } from './iap.component'

// Direct-instantiation spec (house convention): the component pulls in the widget
// resolver, discussion-forum types and telemetry event bus — full TestBed rendering
// is brittle, so we build the class with jest.fn() collaborators and drive the logic.
describe('IapComponent', () => {
  let activatedRoute: any
  let contentSvc: any
  let eventSvc: any
  let viewerSvc: any
  let respondSvc: any

  const content = (over: any = {}) =>
    ({
      identifier: 'res1',
      name: 'IAP Content',
      description: 'a description',
      artifactUrl: 'https://cdn.example.org/pkg/index.html',
      ...over,
    }) as any

  const build = () => new IapComponent(activatedRoute, contentSvc, eventSvc, viewerSvc, respondSvc)

  const flush = () => new Promise(res => setTimeout(res as any, 0))

  beforeEach(() => {
    activatedRoute = {
      snapshot: {
        queryParamMap: { get: jest.fn().mockReturnValue(null) },
        paramMap: { get: jest.fn().mockReturnValue('res1') },
        queryParams: {},
      },
      data: of({ content: { data: content() } }),
    }
    contentSvc = {
      setS3Cookie: jest.fn().mockReturnValue(of({})),
      continueLearning: jest.fn().mockResolvedValue({}),
    }
    eventSvc = { dispatchEvent: jest.fn() }
    viewerSvc = { getContent: jest.fn().mockReturnValue(of(content())) }
    respondSvc = { loadedRespond: jest.fn(), unsubscribeResponse: jest.fn() }
  })

  it('should be created and default to non-preview authoring flags', () => {
    const component = build()
    expect(component).toBeTruthy()
    // jsdom url has no '/author/', so preview authoring is off
    expect(component.forPreview).toBe(false)
    expect(component.isPreviewMode).toBe(false)
    expect(component.isFetchingDataComplete).toBe(false)
  })

  describe('formDiscussionForumWidget', () => {
    it('maps content fields into a discussion-forum widget config', () => {
      const component = build()
      component.formDiscussionForumWidget(content({ description: 'd', identifier: 'id7', name: 'Title' }))
      expect(component.discussionForumWidget).toEqual({
        widgetData: {
          description: 'd',
          id: 'id7',
          name: 'Learning',
          title: 'Title',
          initialPostCount: 2,
          isDisabled: false,
        },
        widgetSubType: 'discussionForum',
        widgetType: 'discussionForum',
      })
    })
  })

  describe('raiseEvent', () => {
    it('dispatches a telemetry event with the content payload', () => {
      const component = build()
      component.raiseEvent('loaded' as any, content({ identifier: 'res9', artifactUrl: 'u9' }))
      expect(eventSvc.dispatchEvent).toHaveBeenCalledTimes(1)
      const dispatched = eventSvc.dispatchEvent.mock.calls[0][0]
      expect(dispatched.from).toBe('iap')
      expect(dispatched.data.state).toBe('loaded')
      expect(dispatched.data.identifier).toBe('res9')
      expect(dispatched.data.url).toBe('u9')
    })

    it('does not dispatch when in author preview mode', () => {
      const component = build()
      component.forPreview = true
      component.raiseEvent('loaded' as any, content())
      expect(eventSvc.dispatchEvent).not.toHaveBeenCalled()
    })
  })

  describe('ngOnInit - preview mode', () => {
    beforeEach(() => {
      activatedRoute.snapshot.queryParamMap.get.mockReturnValue('true')
    })

    it('fetches content, disables the forum and completes fetching', async () => {
      const component = build()
      component.ngOnInit()
      await flush()
      expect(component.isPreviewMode).toBe(true)
      expect(viewerSvc.getContent).toHaveBeenCalledWith('res1')
      expect(component.iapData).toBeTruthy()
      expect(component.discussionForumWidget!.widgetData.isDisabled).toBe(true)
      expect(component.isFetchingDataComplete).toBe(true)
    })

    it('sets the S3 cookie for content-store artifacts', async () => {
      viewerSvc.getContent.mockReturnValue(of(content({ artifactUrl: 'https://x/content-store/a.zip' })))
      const component = build()
      component.ngOnInit()
      await flush()
      expect(contentSvc.setS3Cookie).toHaveBeenCalledWith('res1')
    })
  })

  describe('ngOnInit - route data mode', () => {
    it('loads content, raises Loaded telemetry and sets up the response subscription', async () => {
      const component = build()
      component.ngOnInit()
      await flush()
      expect(component.iapData).toBeTruthy()
      expect(component.alreadyRaised).toBe(true)
      expect(component.oldData).toBe(component.iapData)
      expect(eventSvc.dispatchEvent).toHaveBeenCalled()
      expect(component.isFetchingDataComplete).toBe(true)
    })

    it('raises an Unloaded event for the previous content before loading new content', async () => {
      const component = build()
      component.alreadyRaised = true
      component.oldData = content({ identifier: 'old1' })
      component.ngOnInit()
      await flush()
      // once for the previous Unloaded, once for the new Loaded
      expect(eventSvc.dispatchEvent).toHaveBeenCalledTimes(2)
    })

    it('sets the S3 cookie for content-store artifacts in route mode', async () => {
      activatedRoute.data = of({ content: { data: content({ artifactUrl: 'https://x/content-store/b.zip' }) } })
      const component = build()
      component.ngOnInit()
      await flush()
      expect(contentSvc.setS3Cookie).toHaveBeenCalledWith('res1')
    })
  })

  describe('ngOnDestroy', () => {
    it('calls continueLearning without collection and raises an Unloaded event', async () => {
      const component = build()
      component.iapData = content()
      await (component as any).onDestroyAsync()
      expect(contentSvc.continueLearning).toHaveBeenCalledWith('res1')
      expect(eventSvc.dispatchEvent).toHaveBeenCalled()
    })

    it('passes collection info to continueLearning when present on the route', async () => {
      activatedRoute.snapshot.queryParams = { collectionId: 'c1', collectionType: 'Course' }
      const component = build()
      component.iapData = content()
      await (component as any).onDestroyAsync()
      expect(contentSvc.continueLearning).toHaveBeenCalledWith('res1', 'c1', 'Course')
    })

    it('unsubscribes route and response subscriptions', async () => {
      const component = build()
      component.iapData = content()
      const routeSub = new Subscription()
      const respSub = new Subscription()
      const routeSpy = jest.spyOn(routeSub, 'unsubscribe')
      const respSpy = jest.spyOn(respSub, 'unsubscribe')
      ;(component as any).routeDataSubscription = routeSub
      ;(component as any).responseSubscription = respSub
      await (component as any).onDestroyAsync()
      expect(routeSpy).toHaveBeenCalled()
      expect(respSpy).toHaveBeenCalled()
      expect(respondSvc.unsubscribeResponse).toHaveBeenCalled()
    })

    it('does nothing telemetry-wise when there is no content', async () => {
      const component = build()
      component.iapData = null
      await (component as any).onDestroyAsync()
      expect(contentSvc.continueLearning).not.toHaveBeenCalled()
      expect(eventSvc.dispatchEvent).not.toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy delegation', () => {
    it('fires the async teardown and returns void, since Angular never awaits lifecycle hooks', () => {
      const c = build()
      const spy = jest.spyOn(c as any, 'onDestroyAsync').mockResolvedValue(undefined as never)
      expect(c.ngOnDestroy()).toBeUndefined()
      expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
