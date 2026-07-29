import { of } from 'rxjs'
import { NsContent } from '@ws-widget/collection'
import { WsEvents } from '@ws-widget/utils'
import { DndQuizComponent } from './dnd-quiz.component'

const flush = () => new Promise(res => setTimeout(res, 0))

describe('DndQuizComponent', () => {
  let activatedRoute: any
  let contentSvc: any
  let http: any
  let valueSvc: any
  let eventSvc: any
  let viewSvc: any

  const content = (over: Partial<NsContent.IContent> = {}): NsContent.IContent =>
    ({
      identifier: 'c1',
      artifactUrl: 'http://cdn/a.json',
      mimeType: 'application/pdf',
      ...over,
    }) as NsContent.IContent

  const build = (routeData: any = { content: { data: content() } }) => {
    activatedRoute = {
      data: of(routeData),
      snapshot: { queryParams: {} },
    }
    contentSvc = {
      setS3Cookie: jest.fn().mockReturnValue(of({})),
      continueLearning: jest.fn().mockResolvedValue(undefined),
    }
    http = { get: jest.fn().mockReturnValue(of({ nodes: [] })) }
    valueSvc = { isLtMedium$: of(false) }
    eventSvc = { dispatchEvent: jest.fn() }
    viewSvc = { getAuthoringUrl: jest.fn().mockReturnValue('http://authoring/a.json') }
    return new DndQuizComponent(activatedRoute, contentSvc, http, valueSvc, eventSvc, viewSvc)
  }

  it('should create', () => {
    expect(build()).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('should subscribe to isLtMedium$ and update isLtMedium', () => {
      const c = build()
      ;(c as any).isLtMedium$ = of(true)
      c.ngOnInit()
      expect(c.isLtMedium).toBe(true)
    })

    it('should flag an error when the content is not a class diagram', () => {
      const c = build()
      c.ngOnInit()
      expect(c.isErrorOccured).toBe(true)
      expect(c.isFetchingDataComplete).toBe(false)
    })

    it('should load manifest, mark complete and raise a Loaded event for a class diagram', async () => {
      const c = build({
        content: {
          data: content({ mimeType: NsContent.EMimeTypes.CLASS_DIAGRAM }),
        },
      })
      c.ngOnInit()
      await flush()
      expect(http.get).toHaveBeenCalled()
      expect(c.dndQuizManifest).toEqual({ nodes: [] })
      expect(c.isFetchingDataComplete).toBe(true)
      expect(c.alreadyRaised).toBe(true)
      expect(eventSvc.dispatchEvent).toHaveBeenCalled()
    })

    it('should set the s3 cookie when the artifact is served from content-store', async () => {
      const c = build({
        content: {
          data: content({
            artifactUrl: 'http://x/content-store/a.json',
            mimeType: NsContent.EMimeTypes.CLASS_DIAGRAM,
          }),
        },
      })
      c.ngOnInit()
      await flush()
      expect(contentSvc.setS3Cookie).toHaveBeenCalledWith('c1')
    })
  })

  describe('raiseEvent', () => {
    it('should dispatch a telemetry event with content details', () => {
      const c = build()
      const data = content({ identifier: 'x9', artifactUrl: 'http://cdn/x9' })
      c.raiseEvent(WsEvents.EnumTelemetrySubType.Loaded, data)
      expect(eventSvc.dispatchEvent).toHaveBeenCalledTimes(1)
      const arg = eventSvc.dispatchEvent.mock.calls[0][0]
      expect(arg.eventType).toBe(WsEvents.WsEventType.Telemetry)
      expect(arg.from).toBe('dnd-quiz')
      expect(arg.data.state).toBe(WsEvents.EnumTelemetrySubType.Loaded)
      expect(arg.data.identifier).toBe('x9')
      expect(arg.data.url).toBe('http://cdn/x9')
      expect(arg.data.mimeType).toBe(NsContent.EMimeTypes.CLASS_DIAGRAM)
    })
  })

  describe('transformClassDiagram', () => {
    it('should fetch the artifact url directly when not in preview', async () => {
      const c = build()
      c.forPreview = false
      c.dndQuizData = content()
      const res = await c['transformClassDiagram'](c.dndQuizData)
      expect(http.get).toHaveBeenCalledWith('http://cdn/a.json')
      expect(res).toEqual({ nodes: [] })
    })

    it('should use the authoring url when in preview', async () => {
      const c = build()
      c.forPreview = true
      c.dndQuizData = content()
      await c['transformClassDiagram'](c.dndQuizData)
      expect(viewSvc.getAuthoringUrl).toHaveBeenCalledWith('http://cdn/a.json')
      expect(http.get).toHaveBeenCalledWith('http://authoring/a.json')
    })

    it('should return an empty string when there is no artifact url', async () => {
      const c = build()
      c.dndQuizData = content({ artifactUrl: '' })
      const res = await c['transformClassDiagram'](c.dndQuizData)
      expect(res).toBe('')
      expect(http.get).not.toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('should call continueLearning with only the identifier when no collection params', async () => {
      const c = build()
      c.dndQuizData = content()
      await c.ngOnDestroy()
      expect(contentSvc.continueLearning).toHaveBeenCalledWith('c1')
      expect(eventSvc.dispatchEvent).toHaveBeenCalled()
    })

    it('should pass collection params to continueLearning when present', async () => {
      const c = build()
      c.dndQuizData = content()
      c['activatedRoute'].snapshot.queryParams = {
        collectionId: 'col1',
        collectionType: 'Course',
      }
      await c.ngOnDestroy()
      expect(contentSvc.continueLearning).toHaveBeenCalledWith('c1', 'col1', 'Course')
    })

    it('should not raise an event or call continueLearning when there is no content', async () => {
      const c = build()
      c.dndQuizData = null
      await c.ngOnDestroy()
      expect(contentSvc.continueLearning).not.toHaveBeenCalled()
    })

    it('should unsubscribe active subscriptions', async () => {
      const c = build()
      c.ngOnInit()
      const routeSub = c['routeDataSubscription']
      const smallSub = c['isSmallSubscription']
      const routeSpy = jest.spyOn(routeSub as any, 'unsubscribe')
      const smallSpy = jest.spyOn(smallSub as any, 'unsubscribe')
      await c.ngOnDestroy()
      expect(routeSpy).toHaveBeenCalled()
      expect(smallSpy).toHaveBeenCalled()
    })
  })
})
