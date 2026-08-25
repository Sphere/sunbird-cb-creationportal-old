import { of, Subject } from 'rxjs'
import { NsContent, NsDiscussionForum } from '@ws-widget/collection'
import { WsEvents } from '@ws-widget/utils'
import { ResourceCollectionComponent } from './resource-collection.component'

describe('ResourceCollectionComponent', () => {
  let component: ResourceCollectionComponent
  let activatedRoute: any
  let contentSvc: any
  let http: any
  let eventSvc: any
  let viewSvc: any
  let data$: Subject<any>

  const flush = async () => {
    for (let i = 0; i < 12; i += 1) {
      await Promise.resolve()
    }
  }

  const content = (over: any = {}) => ({
    identifier: 'do_1',
    name: 'A collection resource',
    description: 'desc',
    artifactUrl: 'https://cdn.example.com/manifest.json',
    mimeType: NsContent.EMimeTypes.COLLECTION_RESOURCE,
    ...over,
  })

  const build = () => new ResourceCollectionComponent(activatedRoute, contentSvc, http, eventSvc, viewSvc)

  beforeEach(() => {
    data$ = new Subject<any>()
    activatedRoute = {
      data: data$,
      snapshot: { queryParams: {} },
    }
    contentSvc = {
      setS3Cookie: jest.fn().mockReturnValue(of({})),
      continueLearning: jest.fn().mockResolvedValue({}),
    }
    http = {
      get: jest.fn().mockReturnValue(of({ items: ['a'] })),
    }
    eventSvc = { dispatchEvent: jest.fn() }
    viewSvc = { getAuthoringUrl: jest.fn((u: string) => `authoring/${u}`) }

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
    it('resolves the collection, wires the discussion widget and completes', async () => {
      component.ngOnInit()
      data$.next({ content: { data: content() } })
      await flush()

      expect(component.resourceCollectionData!.identifier).toBe('do_1')
      expect(component.discussionForumWidget).toBeTruthy()
      expect(component.resourceCollectionManifest).toEqual({ items: ['a'] })
      expect(component.alreadyRaised).toBe(true)
      expect(component.isFetchingDataComplete).toBe(true)
      expect(eventSvc.dispatchEvent).toHaveBeenCalled()
    })

    it('sets the S3 cookie for content-store artifacts', async () => {
      component.ngOnInit()
      data$.next({
        content: { data: content({ artifactUrl: 'https://host/content-store/manifest.json' }) },
      })
      await flush()

      expect(contentSvc.setS3Cookie).toHaveBeenCalledWith('do_1')
    })

    it('flags an error when the manifest cannot be built', async () => {
      http.get.mockReturnValue(of(''))

      component.ngOnInit()
      data$.next({ content: { data: content() } })
      await flush()

      expect(component.isErrorOccured).toBe(true)
      expect(component.isFetchingDataComplete).toBe(false)
    })

    it('flags an error for a non-collection resource', async () => {
      component.ngOnInit()
      data$.next({ content: { data: content({ mimeType: NsContent.EMimeTypes.HTML }) } })
      await flush()

      expect(component.resourceCollectionManifest).toBeUndefined()
      expect(component.isErrorOccured).toBe(true)
    })

    it('raises an unload for the previous content when new content arrives', async () => {
      component.ngOnInit()
      data$.next({ content: { data: content() } })
      await flush()
      eventSvc.dispatchEvent.mockClear()

      data$.next({ content: { data: content({ identifier: 'do_2' }) } })
      await flush()

      const states = eventSvc.dispatchEvent.mock.calls.map((c: any[]) => c[0].data.state)
      expect(states).toContain(WsEvents.EnumTelemetrySubType.Unloaded)
    })
  })

  describe('transformResourceCollection (preview)', () => {
    it('routes the artifact url through the authoring service', async () => {
      component.forPreview = true
      component.resourceCollectionData = content() as any

      const result = await (component as any).transformResourceCollection(content())

      expect(viewSvc.getAuthoringUrl).toHaveBeenCalledWith('https://cdn.example.com/manifest.json')
      expect(http.get).toHaveBeenCalledWith('authoring/https://cdn.example.com/manifest.json')
      expect(result).toEqual({ items: ['a'] })
    })

    it('returns an empty manifest without an artifact url', async () => {
      component.resourceCollectionData = null

      const result = await (component as any).transformResourceCollection(content())

      expect(result).toBe('')
      expect(http.get).not.toHaveBeenCalled()
    })
  })

  describe('formDiscussionForumWidget', () => {
    it('builds the discussion forum widget config', () => {
      component.formDiscussionForumWidget(content() as any)

      expect(component.discussionForumWidget).toEqual({
        widgetData: {
          description: 'desc',
          id: 'do_1',
          name: NsDiscussionForum.EDiscussionType.LEARNING,
          title: 'A collection resource',
          initialPostCount: 2,
          isDisabled: false,
        },
        widgetSubType: 'discussionForum',
        widgetType: 'discussionForum',
      })
    })

    it('disables the forum in preview mode', () => {
      component.forPreview = true

      component.formDiscussionForumWidget(content() as any)

      expect(component.discussionForumWidget!.widgetData.isDisabled).toBe(true)
    })
  })

  describe('raiseEvent', () => {
    it('dispatches a telemetry event with the content context', () => {
      component.raiseEvent(WsEvents.EnumTelemetrySubType.Loaded, content() as any)

      expect(eventSvc.dispatchEvent).toHaveBeenCalledTimes(1)
      const arg = eventSvc.dispatchEvent.mock.calls[0][0]
      expect(arg.from).toBe('resource-collection')
      expect(arg.data.identifier).toBe('do_1')
      expect(arg.data.state).toBe(WsEvents.EnumTelemetrySubType.Loaded)
    })

    it('stays silent in preview mode', () => {
      component.forPreview = true

      component.raiseEvent(WsEvents.EnumTelemetrySubType.Loaded, content() as any)

      expect(eventSvc.dispatchEvent).not.toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('saves continue learning with a collection context and raises unload', async () => {
      activatedRoute.snapshot.queryParams = { collectionId: 'coll_1', collectionType: 'playlist' }
      component.resourceCollectionData = content() as any
      const unsubscribe = jest.fn()
      ;(component as any).dataSubscription = { unsubscribe }

      await (component as any).onDestroyAsync()

      expect(contentSvc.continueLearning).toHaveBeenCalledWith('do_1', 'coll_1', 'playlist')
      expect(eventSvc.dispatchEvent).toHaveBeenCalled()
      expect(unsubscribe).toHaveBeenCalled()
    })

    it('saves continue learning with the default context otherwise', async () => {
      component.resourceCollectionData = content() as any

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
