import { of } from 'rxjs'
import { NsContent } from '@ws-widget/collection'
import { WsEvents } from '@ws-widget/utils'
import { HtmlPickerComponent } from './html-picker.component'

describe('HtmlPickerComponent', () => {
  let component: HtmlPickerComponent
  let activatedRoute: any
  let http: any
  let contentSvc: any
  let eventSvc: any
  let viewSvc: any

  /** Drain the promise chain the async subscribe handler awaits. */
  const flush = async () => {
    for (let i = 0; i < 12; i += 1) {
      await Promise.resolve()
    }
  }

  const content = (over: any = {}): NsContent.IContent =>
    ({
      identifier: 'do_1',
      name: 'A hands-on resource',
      artifactUrl: 'https://cdn.example.com/manifest.json',
      mimeType: NsContent.EMimeTypes.HTML_PICKER,
      ...over,
    }) as NsContent.IContent

  const build = () => new HtmlPickerComponent(activatedRoute, http, contentSvc, eventSvc, viewSvc)

  beforeEach(() => {
    activatedRoute = {
      snapshot: { queryParams: {} },
      data: of({ content: { data: content() } }),
    }
    http = { get: jest.fn().mockReturnValue(of({ manifest: 'ok' })) }
    contentSvc = {
      setS3Cookie: jest.fn().mockReturnValue(of({})),
      continueLearning: jest.fn().mockResolvedValue({}),
    }
    eventSvc = { dispatchEvent: jest.fn() }
    viewSvc = { getAuthoringUrl: jest.fn().mockReturnValue('https://author/manifest.json') }
    component = build()
  })

  it('is created with sensible defaults', () => {
    expect(component).toBeTruthy()
    expect(component.forPreview).toBe(false)
    expect(component.isFetchingDataComplete).toBe(false)
    expect(component.isErrorOccured).toBe(false)
    expect(component.alreadyRaised).toBe(false)
  })

  describe('ngOnInit', () => {
    it('resolves the manifest, raises loaded and completes', async () => {
      component.ngOnInit()
      await flush()

      expect(component.htmlPickerData!.identifier).toBe('do_1')
      expect(component.htmlPickerManifest).toEqual({ manifest: 'ok' })
      expect(component.alreadyRaised).toBe(true)
      expect(component.oldData).toBe(component.htmlPickerData)
      expect(component.isFetchingDataComplete).toBe(true)
      expect(component.isErrorOccured).toBe(false)
      expect(eventSvc.dispatchEvent).toHaveBeenCalled()
    })

    it('sets the S3 cookie for content-store artifacts', async () => {
      activatedRoute.data = of({
        content: { data: content({ artifactUrl: 'https://host/content-store/manifest.json' }) },
      })
      component = build()

      component.ngOnInit()
      await flush()

      expect(contentSvc.setS3Cookie).toHaveBeenCalledWith('do_1')
      expect(component.isFetchingDataComplete).toBe(true)
    })

    it('flags an error when the manifest cannot be built', async () => {
      http.get.mockReturnValue(of(''))
      component = build()

      component.ngOnInit()
      await flush()

      expect(component.htmlPickerManifest).toBe('')
      expect(component.isErrorOccured).toBe(true)
      expect(component.isFetchingDataComplete).toBe(false)
    })

    it('flags an error for a non-html-picker mime type', async () => {
      activatedRoute.data = of({
        content: { data: content({ mimeType: NsContent.EMimeTypes.HTML }) },
      })
      component = build()

      component.ngOnInit()
      await flush()

      expect(http.get).not.toHaveBeenCalled()
      expect(component.isErrorOccured).toBe(true)
    })

    it('raises an unload for the previous content on a re-emit', async () => {
      component.alreadyRaised = true
      component.oldData = content({ identifier: 'do_old' })

      component.ngOnInit()
      await flush()

      const events = eventSvc.dispatchEvent.mock.calls.map((c: any[]) => c[0])
      const unloaded = events.find((e: any) => e.data.state === WsEvents.EnumTelemetrySubType.Unloaded)
      expect(unloaded).toBeTruthy()
      expect(unloaded.data.identifier).toBe('do_old')
    })
  })

  describe('raiseEvent', () => {
    it('dispatches a telemetry event carrying the content context', () => {
      component.raiseEvent(WsEvents.EnumTelemetrySubType.Loaded, content())

      expect(eventSvc.dispatchEvent).toHaveBeenCalledTimes(1)
      const arg = eventSvc.dispatchEvent.mock.calls[0][0]
      expect(arg.from).toBe('html-picker')
      expect(arg.eventType).toBe(WsEvents.WsEventType.Telemetry)
      expect(arg.data.identifier).toBe('do_1')
      expect(arg.data.mimeType).toBe(NsContent.EMimeTypes.HTML_PICKER)
      expect(arg.data.url).toBe('https://cdn.example.com/manifest.json')
    })

    it('stays silent in preview mode', () => {
      component.forPreview = true
      component.raiseEvent(WsEvents.EnumTelemetrySubType.Loaded, content())

      expect(eventSvc.dispatchEvent).not.toHaveBeenCalled()
    })
  })

  describe('transformHandsOn (preview url resolution)', () => {
    it('resolves the authoring url in preview mode', async () => {
      component.forPreview = true
      component.htmlPickerData = content()

      const manifest = await (component as any).transformHandsOn(component.htmlPickerData)

      expect(viewSvc.getAuthoringUrl).toHaveBeenCalledWith('https://cdn.example.com/manifest.json')
      expect(http.get).toHaveBeenCalledWith('https://author/manifest.json')
      expect(manifest).toEqual({ manifest: 'ok' })
    })

    it('uses the raw artifact url otherwise', async () => {
      component.htmlPickerData = content()

      await (component as any).transformHandsOn(component.htmlPickerData)

      expect(viewSvc.getAuthoringUrl).not.toHaveBeenCalled()
      expect(http.get).toHaveBeenCalledWith('https://cdn.example.com/manifest.json')
    })

    it('returns an empty manifest when there is no artifact url', async () => {
      component.htmlPickerData = null
      const manifest = await (component as any).transformHandsOn(content())
      expect(manifest).toBe('')
      expect(http.get).not.toHaveBeenCalled()
    })
  })

  describe('setS3Cookie', () => {
    it('delegates to the content service', async () => {
      await (component as any).setS3Cookie('do_9')
      expect(contentSvc.setS3Cookie).toHaveBeenCalledWith('do_9')
    })
  })

  describe('ngOnDestroy', () => {
    it('continues learning with a collection context and unsubscribes', async () => {
      component.htmlPickerData = content()
      activatedRoute.snapshot.queryParams = { collectionId: 'coll_1', collectionType: 'playlist' }
      const unsubscribe = jest.fn()
      ;(component as any).routeDataSubscription = { unsubscribe }

      await (component as any).onDestroyAsync()

      expect(contentSvc.continueLearning).toHaveBeenCalledWith('do_1', 'coll_1', 'playlist')
      expect(unsubscribe).toHaveBeenCalled()
      expect(eventSvc.dispatchEvent).toHaveBeenCalled()
    })

    it('continues learning without a collection context', async () => {
      component.htmlPickerData = content()

      await (component as any).onDestroyAsync()

      expect(contentSvc.continueLearning).toHaveBeenCalledWith('do_1')
    })

    it('is safe with no data and no subscription', async () => {
      await expect((component as any).onDestroyAsync()).resolves.toBeUndefined()
      expect(contentSvc.continueLearning).not.toHaveBeenCalled()
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
