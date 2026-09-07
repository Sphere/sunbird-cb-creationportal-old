import { of } from 'rxjs'

import { HtmlComponent } from './html.component'
import { NsContent } from '@ws-widget/collection'

/**
 * Wave 18 — the preview branch of `ngOnInit` and the sub-application message
 * bridge of the viewer's route-level HtmlComponent.
 */
describe('HtmlComponent (preview and sub-application messages)', () => {
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

  /** Posts a message as a sub-application would. */
  const postFromSubApp = (data: any) => {
    const event = new MessageEvent('message', { data })
    Object.defineProperty(event, 'source', { value: { postMessage: jest.fn() } })
    Object.defineProperty(event, 'origin', { value: 'https://sub.app' })
    window.dispatchEvent(event)
    return event
  }

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
    accessControlSvc = { authoringConfig: { newDesign: false }, hasAccess: jest.fn().mockReturnValue(true) }
    component = build()
  })

  afterEach(() => {
    if (component && component.responseSubscription) {
      component.responseSubscription.unsubscribe()
    }
    jest.clearAllMocks()
  })

  // -------------------------------------------------------- preview branch --

  describe('ngOnInit (preview branch)', () => {
    const asPreview = (over: any = {}) => {
      activatedRoute.snapshot.queryParams = { preview: 'true' }
      activatedRoute.snapshot.queryParamMap = paramMap({ preview: 'true' })
      viewerSvc.getContent.mockReturnValue(of(content(over)))
      component = build()
    }

    it('loads the previewed content', async () => {
      asPreview()
      component.ngOnInit()
      await flush()
      expect(viewerSvc.getContent).toHaveBeenCalledWith('do_1')
      expect(component.htmlData).toBeTruthy()
      expect(component.discussionForumWidget).toBeTruthy()
    })

    it('disables the discussion forum in preview', async () => {
      asPreview()
      component.ngOnInit()
      await flush()
      expect(component.discussionForumWidget!.widgetData.isDisabled).toBe(true)
    })

    it('sets the S3 cookie for a content-store artifact', async () => {
      asPreview({ artifactUrl: 'https://host/content-store/a' })
      component.ngOnInit()
      await flush()
      expect(contentSvc.setS3Cookie).toHaveBeenCalledWith('do_1')
      expect(component.htmlData).toBeTruthy()
    })

    it('withholds content the learner cannot access', async () => {
      asPreview()
      accessControlSvc.hasAccess.mockReturnValue(false)
      component.ngOnInit()
      await flush()
      expect(component.htmlData).toBeFalsy()
    })

    it('strips the escaped spaces out of the artifact url', async () => {
      asPreview({ artifactUrl: 'https://cdn.example.com/a%20b%20c' })
      component.ngOnInit()
      await flush()
      expect(component.htmlData!.artifactUrl).not.toContain('%20')
    })
  })

  // ------------------------------------------------ sub-application messages --

  describe('sub-application messages', () => {
    beforeEach(async () => {
      component.ngOnInit()
      await flush()
    })

    it('answers a LOADED handshake', async () => {
      postFromSubApp({ requestId: 'LOADED', subApplicationName: 'OTHER' })
      await flush()
      expect(respondSvc.loadedRespond).toHaveBeenCalledWith(expect.anything(), 'OTHER', 'do_1', 'https://sub.app')
      expect(component.subApp).toBe(false)
    })

    it('remembers that the RBCP sub-application is driving', async () => {
      postFromSubApp({ requestId: 'LOADED', subApplicationName: 'RBCP' })
      await flush()
      expect(component.subApp).toBe(true)
    })

    it('answers a CONTINUE_LEARNING request', async () => {
      postFromSubApp({ requestId: 'CONTINUE_LEARNING', data: { continueLearning: { page: 3 } } })
      await flush()
      expect(respondSvc.continueLearningRespond).toHaveBeenCalledWith('do_1', { page: 3 })
    })

    it('forwards a TELEMETRY message', async () => {
      const data = { requestId: 'TELEMETRY', data: { event: 'x' } }
      postFromSubApp(data)
      await flush()
      expect(respondSvc.telemetryEvents).toHaveBeenCalledWith(data)
    })

    it('ignores an unrecognised request', async () => {
      postFromSubApp({ requestId: 'SOMETHING_ELSE' })
      await flush()
      expect(respondSvc.loadedRespond).not.toHaveBeenCalled()
      expect(respondSvc.telemetryEvents).not.toHaveBeenCalled()
    })

    it('ignores a message with no request id', async () => {
      postFromSubApp({ hello: 'there' })
      await flush()
      expect(respondSvc.loadedRespond).not.toHaveBeenCalled()
    })
  })
})
