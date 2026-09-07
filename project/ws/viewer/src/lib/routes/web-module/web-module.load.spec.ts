import { of, throwError } from 'rxjs'

import { WebModuleComponent } from './web-module.component'
import { NsContent } from '@ws-widget/collection'

/**
 * Wave 18 — the load chain of the route-level WebModuleComponent: `ngOnInit`,
 * `transformWebmodule`, `fetchContinueLearning` and `setS3Cookie`.
 */
describe('WebModuleComponent (loading a module)', () => {
  let activatedRoute: any
  let contentSvc: any
  let http: any
  let eventSvc: any
  let viewSvc: any

  /** A web module as the viewer service returns it. */
  const webModule = (over: any = {}) =>
    ({
      identifier: 'res-1',
      name: 'A web module',
      description: 'desc',
      artifactUrl: 'https://cdn/manifest.json',
      mimeType: NsContent.EMimeTypes.WEB_MODULE,
      ...over,
    }) as any

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
    http = { get: jest.fn(() => ({ toPromise: () => Promise.resolve({ pages: [] }) })) }
    eventSvc = { dispatchEvent: jest.fn() }
    viewSvc = {
      getContent: jest.fn(() => of(webModule())),
      getAuthoringUrl: jest.fn((u: string) => `auth:${u}`),
    }
    return new WebModuleComponent(activatedRoute, contentSvc, http, eventSvc, viewSvc)
  }

  /** Lets the async subscribe handler settle. */
  const flush = async () => {
    for (let i = 0; i < 10; i += 1) {
      await Promise.resolve()
    }
  }

  afterEach(() => jest.restoreAllMocks())

  // -------------------------------------------------------------- ngOnInit --

  describe('ngOnInit', () => {
    it('loads the module, its manifest and the discussion widget', async () => {
      const c = build()
      c.ngOnInit()
      await flush()
      expect(viewSvc.getContent).toHaveBeenCalledWith('res-1')
      expect(c.webmoduleData).toBeTruthy()
      expect(c.webmoduleManifest).toEqual({ pages: [] })
      expect(c.discussionForumWidget).toBeTruthy()
      expect(c.isFetchingDataComplete).toBe(true)
      expect(c.alreadyRaised).toBe(true)
    })

    it('flags an error when the manifest cannot be read', async () => {
      const c = build()
      http.get = jest.fn(() => ({ toPromise: () => Promise.reject(new Error('down')) }))
      c.ngOnInit()
      await flush()
      expect(c.isErrorOccured).toBe(true)
      expect(c.isFetchingDataComplete).toBe(false)
    })

    it('flags an error for a resource that is not a web module', async () => {
      const c = build()
      viewSvc.getContent = jest.fn(() => of(webModule({ mimeType: 'application/pdf' })))
      c.ngOnInit()
      await flush()
      expect(c.webmoduleManifest).toBeFalsy()
      expect(c.isErrorOccured).toBe(true)
    })

    it('accepts a web module exercise too', async () => {
      const c = build()
      viewSvc.getContent = jest.fn(() => of(webModule({ mimeType: NsContent.EMimeTypes.WEB_MODULE_EXERCISE })))
      c.ngOnInit()
      await flush()
      expect(c.webmoduleManifest).toEqual({ pages: [] })
    })

    it('sets the S3 cookie for a content-store artifact', async () => {
      const c = build()
      viewSvc.getContent = jest.fn(() => of(webModule({ artifactUrl: 'https://host/content-store/m.json' })))
      c.ngOnInit()
      await flush()
      expect(contentSvc.setS3Cookie).toHaveBeenCalledWith('res-1')
    })

    it('does not set the S3 cookie in preview', async () => {
      const c = build()
      c.forPreview = true
      viewSvc.getContent = jest.fn(() => of(webModule({ artifactUrl: 'https://host/content-store/m.json' })))
      c.ngOnInit()
      await flush()
      expect(contentSvc.setS3Cookie).not.toHaveBeenCalled()
    })

    it('resumes against the parent collection when there is one', async () => {
      const c = build()
      activatedRoute.snapshot.queryParams = { collectionId: 'do_course' }
      c.ngOnInit()
      await flush()
      expect(contentSvc.fetchContentHistory).toHaveBeenCalledWith('do_course')
    })

    it('resumes against the module itself with no collection', async () => {
      const c = build()
      c.ngOnInit()
      await flush()
      expect(contentSvc.fetchContentHistory).toHaveBeenCalledWith('res-1')
    })

    it('reports the previous module unloaded when a second one arrives', async () => {
      const c = build()
      c.alreadyRaised = true
      c.oldData = webModule({ identifier: 'res-0' })
      c.ngOnInit()
      await flush()
      expect(eventSvc.dispatchEvent).toHaveBeenCalled()
    })

    it('flags an error when nothing comes back at all', async () => {
      const c = build()
      viewSvc.getContent = jest.fn(() => of(null))
      c.ngOnInit()
      await flush()
      expect(c.isErrorOccured).toBe(true)
    })

    it('stays quiet when the load itself fails', async () => {
      const c = build()
      viewSvc.getContent = jest.fn(() => throwError(() => new Error('down')))
      c.ngOnInit()
      await flush()
      expect(c.isFetchingDataComplete).toBe(false)
    })
  })

  // --------------------------------------------------- transformWebmodule --

  describe('transformWebmodule', () => {
    it('rewrites the artifact url for the authoring preview', async () => {
      const c = build()
      c.forPreview = true
      c.webmoduleData = webModule()
      const manifest = await (c as any).transformWebmodule(c.webmoduleData)
      expect(viewSvc.getAuthoringUrl).toHaveBeenCalledWith('https://cdn/manifest.json')
      expect(c.webmoduleData!.artifactUrl).toBe('auth:https://cdn/manifest.json')
      expect(manifest).toEqual({ pages: [] })
    })

    it('returns nothing for a module with no artifact', async () => {
      const c = build()
      c.webmoduleData = webModule({ artifactUrl: '' })
      expect(await (c as any).transformWebmodule(c.webmoduleData)).toBe('')
      expect(http.get).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------------- fetchContinueLearning --

  describe('fetchContinueLearning', () => {
    it('resumes on the recorded page', async () => {
      const c = build()
      c.webmoduleData = webModule()
      contentSvc.fetchContentHistory = jest.fn(() => of({ identifier: 'res-1', continueData: { progress: '4' } }))
      await c.fetchContinueLearning('do_course', 'res-1')
      expect(c.webmoduleData!.resumePage).toBe(4)
    })

    it('ignores history for a different resource', async () => {
      const c = build()
      c.webmoduleData = webModule({ resumePage: 1 })
      contentSvc.fetchContentHistory = jest.fn(() => of({ identifier: 'other', continueData: { progress: '4' } }))
      await c.fetchContinueLearning('do_course', 'res-1')
      expect(c.webmoduleData!.resumePage).toBe(1)
    })

    it('ignores history with no recorded progress', async () => {
      const c = build()
      c.webmoduleData = webModule({ resumePage: 1 })
      contentSvc.fetchContentHistory = jest.fn(() => of({ identifier: 'res-1', continueData: {} }))
      await c.fetchContinueLearning('do_course', 'res-1')
      expect(c.webmoduleData!.resumePage).toBe(1)
    })

    it('resolves when there is no history at all', async () => {
      const c = build()
      contentSvc.fetchContentHistory = jest.fn(() => of(null))
      await expect(c.fetchContinueLearning('do_course', 'res-1')).resolves.toBe(true)
    })

    it('resolves when the history lookup fails', async () => {
      const c = build()
      contentSvc.fetchContentHistory = jest.fn(() => throwError(() => new Error('down')))
      await expect(c.fetchContinueLearning('do_course', 'res-1')).resolves.toBe(true)
    })
  })

  // ------------------------------------------------------------ ngOnDestroy --

  describe('ngOnDestroy', () => {
    it('reports the module unloaded and releases its subscriptions', () => {
      const c = build()
      c.webmoduleData = webModule()
      const dataSubscription = { unsubscribe: jest.fn() }
      const telemetry = { unsubscribe: jest.fn() }
      ;(c as any).dataSubscription = dataSubscription
      ;(c as any).telemetryIntervalSubscription = telemetry
      c.ngOnDestroy()
      expect(eventSvc.dispatchEvent).toHaveBeenCalled()
      expect(dataSubscription.unsubscribe).toHaveBeenCalled()
      expect(telemetry.unsubscribe).toHaveBeenCalled()
    })

    it('survives with nothing loaded', () => {
      const c = build()
      expect(() => c.ngOnDestroy()).not.toThrow()
      expect(eventSvc.dispatchEvent).not.toHaveBeenCalled()
    })

    it('stays quiet in the authoring preview', () => {
      const c = build()
      c.forPreview = true
      c.webmoduleData = webModule()
      c.ngOnDestroy()
      expect(eventSvc.dispatchEvent).not.toHaveBeenCalled()
    })
  })
})
