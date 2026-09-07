import { of, throwError } from 'rxjs'

import { WebModuleComponent } from './web-module.component'

/**
 * Direct-instantiation unit tests for the route-level WebModuleComponent.
 * Collaborators are mocked with jest.fn(); no TestBed rendering is used.
 */
describe('WebModuleComponent (routes/web-module)', () => {
  let activatedRoute: any
  let contentSvc: any
  let http: any
  let eventSvc: any
  let viewSvc: any

  function build(): WebModuleComponent {
    activatedRoute = {
      snapshot: {
        paramMap: { get: jest.fn(() => 'res-1') },
        queryParams: {},
      },
    }
    contentSvc = {
      fetchContentHistory: jest.fn(() => of(null)),
      setS3Cookie: jest.fn(() => of({})),
    }
    http = { get: jest.fn(() => ({ toPromise: () => Promise.resolve({}) })) }
    eventSvc = { dispatchEvent: jest.fn() }
    viewSvc = {
      getContent: jest.fn(() => of(null)),
      getAuthoringUrl: jest.fn((u: string) => `auth:${u}`),
    }
    return new WebModuleComponent(activatedRoute, contentSvc, http, eventSvc, viewSvc)
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('constructs and exposes default flags', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.isFetchingDataComplete).toBe(false)
    expect(c.isErrorOccured).toBe(false)
  })

  it('formDiscussionForumWidget builds a widget config from content', () => {
    const c = build()
    c.forPreview = false
    c.formDiscussionForumWidget({
      description: 'desc',
      identifier: 'id-1',
      name: 'My Module',
    } as any)
    expect(c.discussionForumWidget).toBeTruthy()
    expect(c.discussionForumWidget!.widgetType).toBe('discussionForum')
    expect(c.discussionForumWidget!.widgetData.id).toBe('id-1')
    expect(c.discussionForumWidget!.widgetData.title).toBe('My Module')
    expect(c.discussionForumWidget!.widgetData.isDisabled).toBe(false)
  })

  it('raiseEvent returns early and dispatches nothing in preview mode', () => {
    const c = build()
    c.forPreview = true
    c.raiseEvent('loaded' as any, { identifier: 'id-1' } as any)
    expect(eventSvc.dispatchEvent).not.toHaveBeenCalled()
  })

  it('raiseEvent dispatches a telemetry event when not in preview', () => {
    const c = build()
    c.forPreview = false
    c.raiseEvent('loaded' as any, { identifier: 'id-1', artifactUrl: 'http://a/b' } as any)
    expect(eventSvc.dispatchEvent).toHaveBeenCalledTimes(1)
    const evt = eventSvc.dispatchEvent.mock.calls[0][0]
    expect(evt.from).toBe('web-module')
    expect(evt.data.identifier).toBe('id-1')
    expect(evt.data.url).toBe('http://a/b')
  })

  it('fetchContinueLearning updates resumePage when history matches the module', async () => {
    const c = build()
    c.webmoduleData = { identifier: 'id-1', resumePage: 1 } as any
    contentSvc.fetchContentHistory.mockReturnValue(of({ identifier: 'id-1', continueData: { progress: '5' } }))
    const result = await c.fetchContinueLearning('id-1', 'id-1')
    expect(result).toBe(true)
    expect(c.webmoduleData!.resumePage).toBe(5)
  })

  it('fetchContinueLearning resolves true even when history errors', async () => {
    const c = build()
    c.webmoduleData = { identifier: 'id-1', resumePage: 1 } as any
    contentSvc.fetchContentHistory.mockReturnValue(throwError(() => new Error('boom')))
    await expect(c.fetchContinueLearning('id-1', 'id-1')).resolves.toBe(true)
  })

  it('ngOnInit sets the error flag when getContent yields no data', () => {
    const c = build()
    viewSvc.getContent.mockReturnValue(of(null))
    c.ngOnInit()
    expect(viewSvc.getContent).toHaveBeenCalledWith('res-1')
    expect(c.isErrorOccured).toBe(true)
    expect(c.isFetchingDataComplete).toBe(false)
  })

  it('ngOnDestroy unsubscribes and raises an unloaded telemetry for loaded content', () => {
    const c = build()
    c.forPreview = false
    c.webmoduleData = { identifier: 'id-1', artifactUrl: 'http://a/b' } as any
    const dispatchSpy = eventSvc.dispatchEvent
    expect(() => c.ngOnDestroy()).not.toThrow()
    expect(dispatchSpy).toHaveBeenCalled()
  })
})
