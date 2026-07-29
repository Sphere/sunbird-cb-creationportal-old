import { of } from 'rxjs'
import { NsContent } from '@ws-widget/collection'
import { WsEvents } from '@ws-widget/utils'
import { HtmlComponent } from './html.component'

describe('HtmlComponent', () => {
  let component: HtmlComponent
  let activatedRoute: any
  let contentSvc: any
  let viewerSvc: any
  let respondSvc: any
  let configSvc: any
  let eventSvc: any
  let accessControlSvc: any

  /** Drain the promise chain the async subscribe handlers await. */
  const flush = async () => {
    for (let i = 0; i < 12; i += 1) {
      await Promise.resolve()
    }
  }

  const paramMap = (params: Record<string, string | null>) => ({
    get: (key: string) => (key in params ? params[key] : null),
  })

  const content = (over: any = {}) => ({
    identifier: 'do_1',
    name: 'An HTML resource',
    description: 'desc',
    artifactUrl: 'https://cdn.example.com/a',
    contentType: 'Resource',
    mimeType: NsContent.EMimeTypes.HTML,
    ...over,
  })

  const build = () => new HtmlComponent(activatedRoute, contentSvc, viewerSvc, respondSvc, configSvc, eventSvc, accessControlSvc)

  beforeEach(() => {
    activatedRoute = {
      snapshot: {
        queryParams: {},
        queryParamMap: paramMap({}),
        paramMap: paramMap({ resourceId: 'do_1' }),
      },
      data: of({ content: { data: content() } }),
    }
    contentSvc = {
      saveContinueLearning: jest.fn().mockReturnValue(of({})),
      setS3Cookie: jest.fn().mockReturnValue(of({})),
    }
    viewerSvc = {
      getContent: jest.fn().mockReturnValue(of(content({ artifactUrl: 'cdn.example.com/a' }))),
      realTimeProgressUpdate: jest.fn(),
    }
    respondSvc = {
      loadedRespond: jest.fn().mockResolvedValue(undefined),
      continueLearningRespond: jest.fn().mockResolvedValue(undefined),
      telemetryEvents: jest.fn().mockResolvedValue(undefined),
      unsubscribeResponse: jest.fn(),
    }
    configSvc = { userProfile: { userId: 'u1' } }
    eventSvc = { dispatchEvent: jest.fn() }
    accessControlSvc = {
      authoringConfig: { newDesign: false },
      hasAccess: jest.fn().mockReturnValue(true),
    }
    component = build()
  })

  it('is created with sensible defaults', () => {
    expect(component).toBeTruthy()
    expect(component.forPreview).toBe(false)
    expect(component.isNotEmbed).toBe(true)
    expect(component.isFetchingDataComplete).toBe(false)
  })

  describe('ngOnInit (route-data branch)', () => {
    it('resolves the content, wires the discussion widget and finishes', async () => {
      component.ngOnInit()
      await flush()

      expect(component.uuid).toBe('u1')
      expect(component.htmlData).toBeTruthy()
      expect(component.htmlData!.identifier).toBe('do_1')
      expect(component.discussionForumWidget).toBeTruthy()
      expect(component.alreadyRaised).toBe(true)
      expect(component.isFetchingDataComplete).toBe(true)
      expect(eventSvc.dispatchEvent).toHaveBeenCalled()
    })

    it('appends the uuid for a Scorm course player url', async () => {
      activatedRoute.data = of({
        content: { data: content({ artifactUrl: 'https://x/ScormCoursePlayer/index.html' }) },
      })
      component = build()

      component.ngOnInit()
      await flush()

      expect(component.htmlData!.artifactUrl).toContain('Param1=u1')
    })

    it('sets the S3 cookie for content-store artifacts', async () => {
      activatedRoute.data = of({
        content: { data: content({ artifactUrl: 'https://host/content-store/a' }) },
      })
      component = build()

      component.ngOnInit()
      await flush()

      expect(contentSvc.setS3Cookie).toHaveBeenCalledWith('do_1')
    })

    it('marks embed mode from the query params', () => {
      activatedRoute.snapshot.queryParams = { embed: 'true' }
      component = build()

      component.ngOnInit()

      expect(component.isNotEmbed).toBe(false)
    })

    it('defaults the uuid to empty without a user profile', () => {
      configSvc.userProfile = null
      component = build()

      component.ngOnInit()

      expect(component.uuid).toBe('')
    })
  })

  describe('ngOnInit (preview branch)', () => {
    beforeEach(() => {
      activatedRoute.snapshot.queryParamMap = paramMap({ preview: 'true' })
    })

    it('fetches preview content and disables the discussion widget', async () => {
      component = build()

      component.ngOnInit()
      await flush()

      expect(component.isPreviewMode).toBe(true)
      expect(viewerSvc.getContent).toHaveBeenCalledWith('do_1')
      expect(component.htmlData).toBeTruthy()
      expect(component.htmlData!.artifactUrl).toBe('https://cdn.example.com/a')
      expect(component.discussionForumWidget!.widgetData.isDisabled).toBe(true)
    })

    it('skips preview mode when the new design authoring config is on', () => {
      accessControlSvc.authoringConfig.newDesign = true
      component = build()

      component.ngOnInit()

      expect(component.isPreviewMode).toBe(false)
    })

    it('does not set html data when access is denied', async () => {
      accessControlSvc.hasAccess.mockReturnValue(false)
      component = build()

      component.ngOnInit()
      await flush()

      expect(component.htmlData).toBeNull()
    })
  })

  describe('formDiscussionForumWidget', () => {
    it('builds the discussion forum widget config', () => {
      component.formDiscussionForumWidget(content() as any)

      expect(component.discussionForumWidget).toEqual({
        widgetData: {
          description: 'desc',
          id: 'do_1',
          name: NsDiscussionForumName(),
          title: 'An HTML resource',
          initialPostCount: 2,
          isDisabled: false,
        },
        widgetSubType: 'discussionForum',
        widgetType: 'discussionForum',
      })
    })
  })

  describe('raiseEvent', () => {
    it('dispatches a telemetry event with the content context', () => {
      component.raiseEvent(WsEvents.EnumTelemetrySubType.Loaded, content() as any)

      expect(eventSvc.dispatchEvent).toHaveBeenCalledTimes(1)
      const arg = eventSvc.dispatchEvent.mock.calls[0][0]
      expect(arg.from).toBe('html')
      expect(arg.data.identifier).toBe('do_1')
    })

    it('stays silent in preview mode', () => {
      component.forPreview = true
      component.raiseEvent(WsEvents.EnumTelemetrySubType.Loaded, content() as any)

      expect(eventSvc.dispatchEvent).not.toHaveBeenCalled()
    })
  })

  describe('saveContinueLearning', () => {
    it('saves with a playlist context', async () => {
      activatedRoute.snapshot.queryParams = {
        collectionType: 'playlist',
        collectionId: 'coll_1',
      }

      await component.saveContinueLearning(content() as any)

      expect(contentSvc.saveContinueLearning).toHaveBeenCalled()
      const body = contentSvc.saveContinueLearning.mock.calls[0][0]
      expect(body.contextType).toBe('playlist')
      expect(body.contextPathId).toBe('coll_1')
    })

    it('saves with the default context otherwise', async () => {
      await component.saveContinueLearning(content() as any)

      expect(contentSvc.saveContinueLearning).toHaveBeenCalled()
      const body = contentSvc.saveContinueLearning.mock.calls[0][0]
      expect(body.resourceId).toBe('do_1')
      expect(body.contextType).toBeUndefined()
    })
  })

  describe('fireRealTimeProgress', () => {
    it('updates progress for a plain resource', () => {
      component.htmlData = content() as any
      ;(component as any).fireRealTimeProgress()

      expect(viewerSvc.realTimeProgressUpdate).toHaveBeenCalledWith('do_1', expect.anything())
    })

    it('skips an external course', () => {
      component.htmlData = content({ contentType: NsContent.EContentTypes.COURSE, isExternal: true }) as any
      ;(component as any).fireRealTimeProgress()

      expect(viewerSvc.realTimeProgressUpdate).not.toHaveBeenCalled()
    })

    it('skips a certification resource type', () => {
      component.htmlData = content({ resourceType: 'certification' }) as any
      ;(component as any).fireRealTimeProgress()

      expect(viewerSvc.realTimeProgressUpdate).not.toHaveBeenCalled()
    })

    it('skips Cross Knowledge content', () => {
      component.htmlData = content({ sourceName: 'Cross Knowledge' }) as any
      ;(component as any).fireRealTimeProgress()

      expect(viewerSvc.realTimeProgressUpdate).not.toHaveBeenCalled()
    })

    it('skips entirely in preview mode', () => {
      component.forPreview = true
      component.htmlData = content() as any
      ;(component as any).fireRealTimeProgress()

      expect(viewerSvc.realTimeProgressUpdate).not.toHaveBeenCalled()
    })
  })

  describe('raiseRealTimeProgress', () => {
    it('primes the progress request and schedules a timer', () => {
      ;(component as any).raiseRealTimeProgress()

      expect(component.realTimeProgressRequest.max_size).toBe(1)
      expect(component.realTimeProgressRequest.current).toEqual(['1'])
      expect(component.hasFiredRealTimeProgress).toBe(false)
      clearTimeout(component.realTimeProgressTimer)
    })

    it('does nothing in preview mode', () => {
      component.forPreview = true
      ;(component as any).raiseRealTimeProgress()

      expect(component.realTimeProgressRequest.max_size).toBe(0)
    })
  })

  describe('ngOnDestroy', () => {
    it('saves continue learning, raises unload and unsubscribes', async () => {
      component.htmlData = content() as any
      const unsubscribe = jest.fn()
      ;(component as any).routeDataSubscription = { unsubscribe }
      ;(component as any).responseSubscription = { unsubscribe }
      ;(component as any).viewerDataSubscription = { unsubscribe }

      await component.ngOnDestroy()

      expect(contentSvc.saveContinueLearning).toHaveBeenCalled()
      expect(eventSvc.dispatchEvent).toHaveBeenCalled()
      expect(respondSvc.unsubscribeResponse).toHaveBeenCalled()
      expect(unsubscribe).toHaveBeenCalledTimes(3)
    })

    it('is safe with no data and no subscriptions', async () => {
      await expect(component.ngOnDestroy()).resolves.toBeUndefined()
    })
  })
})

function NsDiscussionForumName(): any {
  // The component uses NsDiscussionForum.EDiscussionType.LEARNING for the widget name.
  // Resolved lazily to avoid an unused static import mismatch across versions.
  const mod = require('@ws-widget/collection')
  return mod.NsDiscussionForum.EDiscussionType.LEARNING
}
