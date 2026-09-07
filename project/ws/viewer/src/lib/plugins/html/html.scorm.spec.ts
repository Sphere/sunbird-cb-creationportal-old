import { HtmlComponent } from './html.component'

/**
 * Wave 18 — the SCORM/iframe plumbing of the viewer's HtmlComponent plugin:
 * `onIframeLoadOrError`, the streaming-url rewriting of `loadScormFromBackend`
 * and the SCORM postMessage bridge.
 */
describe('HtmlComponent (SCORM plumbing)', () => {
  let domSanitizer: any
  let mobAppSvc: any
  let scormAdapterService: any
  let router: any
  let configSvc: any
  let snackBar: any
  let events: any
  let activatedRoute: any
  let telemetrySvc: any

  function build(): HtmlComponent {
    domSanitizer = { bypassSecurityTrustResourceUrl: jest.fn((u: string) => `safe:${u}`) }
    mobAppSvc = { isMobile: false }
    scormAdapterService = {
      contentId: '',
      loadDataV2: jest.fn(),
      echo: jest.fn((x: any) => x),
      LMSGetValue: jest.fn().mockReturnValue('ok'),
    }
    router = { navigate: jest.fn() }
    configSvc = { instanceConfig: { intranetIframeUrls: ['https://intranet.example.com'] } }
    snackBar = { open: jest.fn() }
    events = { raiseInteractTelemetry: jest.fn() }
    activatedRoute = { snapshot: { queryParams: {} } }
    telemetrySvc = { start: jest.fn(), end: jest.fn() }
    return new HtmlComponent(
      domSanitizer,
      mobAppSvc,
      scormAdapterService,
      router,
      configSvc,
      snackBar,
      events,
      activatedRoute,
      telemetrySvc,
    )
  }

  /** A stub iframe whose content window records the listeners it is given. */
  const iframeStub = () => {
    const listeners: Record<string, any> = {}
    const postMessage = jest.fn()
    return {
      contentWindow: {
        addEventListener: (name: string, fn: any) => (listeners[name] = fn),
        postMessage,
      },
      listeners,
      postMessage,
      onload: undefined as any,
    }
  }

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  // ------------------------------------------------------ onIframeLoadOrError --

  describe('onIframeLoadOrError', () => {
    it('watches the loaded frame for script failures', () => {
      const c = build()
      const iframe = iframeStub()
      c.onIframeLoadOrError('load', iframe as any)
      expect(Object.keys(iframe.listeners)).toEqual(['error', 'unhandledrejection'])
      expect(c.showIsLoadingMessage).toBe(false)
    })

    it('marks the page done once the frame reports a target', () => {
      const c = build()
      const iframe = iframeStub()
      c.onIframeLoadOrError('load', iframe as any)
      iframe.onload({ target: {} })
      expect(c.pageFetchStatus).toBe('done')
    })

    it('leaves the status alone for a frame load with no target', () => {
      const c = build()
      const iframe = iframeStub()
      c.pageFetchStatus = 'fetching'
      c.onIframeLoadOrError('load', iframe as any)
      iframe.onload({})
      expect(c.pageFetchStatus).toBe('fetching')
    })

    it('forwards the original load handler when one was already attached', () => {
      const c = build()
      const iframe = iframeStub()
      const original = jest.fn()
      iframe.onload = original
      const event = { target: {} }
      c.onIframeLoadOrError('load', iframe as any, event)
      expect(original).toHaveBeenCalledWith(event)
    })

    it('reports the script failures the frame raises', () => {
      const c = build()
      const iframe = iframeStub()
      c.onIframeLoadOrError('load', iframe as any)
      iframe.listeners.error(new Error('boom'))
      iframe.listeners.unhandledrejection({ reason: 'nope' })
      expect(console.error).toHaveBeenCalled()
    })

    it('ignores a frame with no content window', () => {
      const c = build()
      expect(() => c.onIframeLoadOrError('load', {} as any)).not.toThrow()
    })

    it('ignores a load event with no frame at all', () => {
      const c = build()
      expect(() => c.onIframeLoadOrError('load')).not.toThrow()
    })
  })

  // ---------------------------------------------------- loadScormFromBackend --

  describe('loadScormFromBackend', () => {
    const load = (c: HtmlComponent, entryPoint = '') => (c as any).loadScormFromBackend(entryPoint)

    it('rewrites a CDN streaming url onto the proxy', () => {
      const c = build()
      c.htmlContent = { streamingUrl: 'https://static.sphere.aastrika.org/content/html/do_1/', entryPoint: '' } as any
      load(c, 'index.html')
      expect(domSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('/apis/proxies/v8/getContents/content/html/do_1/index.html')
      expect(c.showIsLoadingMessage).toBe(true)
    })

    it('rewrites a staging S3 streaming url onto the proxy', () => {
      const c = build()
      c.htmlContent = {
        streamingUrl: 'https://sunbirdcontent-stage.s3-ap-south-1.amazonaws.com/content/html/do_2/',
      } as any
      load(c, 'start.html')
      expect(domSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('/apis/proxies/v8/getContents/content/html/do_2/start.html')
    })

    it('falls back to a fixed offset for any other host', () => {
      const c = build()
      c.htmlContent = { streamingUrl: 'https://some-other-bucket.example.com/x/content/html/do_3/' } as any
      load(c, 'a.html')
      const url = domSanitizer.bypassSecurityTrustResourceUrl.mock.calls[0][0]
      expect(url.startsWith('/apis/proxies/v8/getContents/')).toBe(true)
    })

    it('falls back to the content entry point when none was passed', () => {
      const c = build()
      c.htmlContent = {
        streamingUrl: 'https://static.sphere.aastrika.org/content/html/do_1/',
        entryPoint: 'story.html',
      } as any
      load(c)
      expect(domSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('/apis/proxies/v8/getContents/content/html/do_1/story.html')
    })

    it('copes with content that declares no entry point at all', () => {
      const c = build()
      c.htmlContent = { streamingUrl: 'https://static.sphere.aastrika.org/content/html/do_1/' } as any
      load(c)
      expect(domSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('/apis/proxies/v8/getContents/content/html/do_1/')
    })

    it('reports an error when the content has no streaming url', () => {
      const c = build()
      c.htmlContent = {} as any
      load(c)
      expect(c.pageFetchStatus).toBe('error')
    })

    it('reports an error when there is no content at all', () => {
      const c = build()
      c.htmlContent = undefined as any
      load(c)
      expect(c.pageFetchStatus).toBe('error')
    })
  })

  // ------------------------------------------- handleSCORMApiCallViaMessage --

  describe('handleSCORMApiCallViaMessage', () => {
    const handle = (c: HtmlComponent, request: any) => (c as any).handleSCORMApiCallViaMessage(request)

    it('runs the requested adapter method and answers the frame', () => {
      const c = build()
      const postMessage = jest.fn()
      c.iframeElem = { nativeElement: { contentWindow: { postMessage } } } as any
      handle(c, { method: 'LMSGetValue', args: ['cmi.core.lesson_status'], id: 7 })
      expect(scormAdapterService.LMSGetValue).toHaveBeenCalledWith('cmi.core.lesson_status')
      expect(postMessage).toHaveBeenCalledWith({ type: 'SCORM_API_RESPONSE', id: 7, result: 'ok' }, window.location.origin)
    })

    it('defaults to no arguments', () => {
      const c = build()
      c.iframeElem = { nativeElement: { contentWindow: { postMessage: jest.fn() } } } as any
      handle(c, { method: 'LMSGetValue', id: 1 })
      expect(scormAdapterService.LMSGetValue).toHaveBeenCalledWith()
    })

    it('runs the method even with no frame to answer', () => {
      const c = build()
      c.iframeElem = undefined as any
      handle(c, { method: 'LMSGetValue', args: [], id: 1 })
      expect(scormAdapterService.LMSGetValue).toHaveBeenCalled()
    })

    it('warns about a method the adapter does not have', () => {
      const c = build()
      handle(c, { method: 'NoSuchMethod', args: [], id: 1 })
      expect(console.warn).toHaveBeenCalled()
    })

    it('swallows a failure inside the adapter method', () => {
      const c = build()
      scormAdapterService.LMSGetValue.mockImplementation(() => {
        throw new Error('boom')
      })
      expect(() => handle(c, { method: 'LMSGetValue', args: [], id: 1 })).not.toThrow()
      expect(console.error).toHaveBeenCalled()
    })
  })
})
