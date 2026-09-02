import { HtmlComponent } from './html.component'

/**
 * Direct-instantiation unit tests for HtmlComponent.
 * The component has heavy DOM / SCORM / iframe wiring, so we construct it with
 * mocked collaborators and exercise its public methods + ngOnChanges branches
 * instead of full TestBed rendering (house rule for heavy components).
 */
describe('HtmlComponent', () => {
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
    scormAdapterService = { contentId: '', loadDataV2: jest.fn(), echo: jest.fn((x: any) => x) }
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

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('constructs and registers the SCORM adapter on window.API', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect((window as any).API).toBe(scormAdapterService)
  })

  it('ngOnInit / ngAfterViewInit are safe no-ops', () => {
    const c = build()
    expect(() => {
      c.ngOnInit()
      c.ngAfterViewInit()
    }).not.toThrow()
  })

  it('ngOnDestroy releases the window.API reference when it still points at this instance', () => {
    const c = build()
    c.ngOnDestroy()
    expect((window as any).API).toBeUndefined()
  })

  it('ngOnChanges sets error status when there is no htmlContent', () => {
    const c = build()
    c.htmlContent = null
    c.ngOnChanges()
    expect(c.iframeUrl).toBeNull()
    expect(c.pageFetchStatus).toBe('error')
  })

  it('ngOnChanges flags a missing artifact url', () => {
    const c = build()
    c.htmlContent = { identifier: '', artifactUrl: '' } as any
    c.ngOnChanges()
    expect(c.pageFetchStatus).toBe('artifactUrlMissing')
    expect(c.iframeUrl).toBeNull()
  })

  it('ngOnChanges builds a safe iframe url for a plain (non-iframe) url', () => {
    const c = build()
    c.htmlContent = {
      identifier: 'id1',
      artifactUrl: 'https://example.com/page',
      mimeType: 'text/html',
      isIframeSupported: 'No',
      isExternal: false,
    } as any
    c.ngOnChanges()
    expect(domSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('https://example.com/page')
    expect(c.iframeUrl).toBe('safe:https://example.com/page')
    expect(c.mimeType).toBe('text/html')
    expect(c.isIntranetUrl).toBe(false)
  })

  it('ngOnChanges marks intranet urls that match a configured pattern', () => {
    const c = build()
    c.htmlContent = {
      identifier: 'id1',
      artifactUrl: 'https://intranet.example.com/x',
      mimeType: 'text/html',
      isIframeSupported: 'No',
      isExternal: false,
    } as any
    c.ngOnChanges()
    expect(c.isIntranetUrl).toBe(true)
  })

  it('ngOnChanges starts docs.google telemetry', () => {
    const c = build()
    c.htmlContent = {
      identifier: 'id1',
      artifactUrl: 'https://docs.google.com/forms/x',
      mimeType: 'text/x-url',
      isIframeSupported: 'No',
      isExternal: false,
    } as any
    c.ngOnChanges()
    expect(telemetrySvc.start).toHaveBeenCalledWith('docs.google', 'docs.google-start', 'id1')
  })

  it('ngOnChanges loads a zip SCORM package from the backend streaming url via proxy', () => {
    const c = build()
    c.htmlContent = {
      identifier: 'scorm1',
      artifactUrl: 'https://static.sphere.aastrika.org/content/x.zip',
      streamingUrl: 'https://static.sphere.aastrika.org/content/html/scorm1/',
      mimeType: 'application/vnd.ekstep.html-archive',
      entryPoint: 'index_lms.html',
    } as any
    c.ngOnChanges()
    expect(scormAdapterService.contentId).toBe('scorm1')
    expect(scormAdapterService.loadDataV2).toHaveBeenCalled()
    expect(domSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith(
      '/apis/proxies/v8/getContents/content/html/scorm1/index_lms.html',
    )
    expect(c.showIsLoadingMessage).toBe(true)
    expect(c.mimeType).toBe('application/vnd.ekstep.html-archive')
  })

  it('ngOnChanges errors when a SCORM archive artifact url is not a zip', () => {
    const c = build()
    c.htmlContent = {
      identifier: 'scorm2',
      artifactUrl: 'https://static.sphere.aastrika.org/content/notzip',
      mimeType: 'application/vnd.ekstep.html-archive',
    } as any
    c.ngOnChanges()
    expect(c.pageFetchStatus).toBe('error')
  })

  it('backToDetailsPage navigates to the toc overview with the primaryCategory query param', () => {
    const c = build()
    c.htmlContent = { identifier: 'id1', primaryCategory: 'Learning Resource' } as any
    c.backToDetailsPage()
    expect(router.navigate).toHaveBeenCalledWith(['/app/toc/id1/overview'], {
      queryParams: { primaryCategory: 'Learning Resource' },
    })
  })

  it('raiseTelemetry forwards interact telemetry with the content id', () => {
    const c = build()
    c.htmlContent = { identifier: 'id1' } as any
    c.raiseTelemetry({ event: 'play', foo: 'bar' })
    expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('play', 'scrom', {
      contentId: 'id1',
      event: 'play',
      foo: 'bar',
    })
  })

  it('receiveMessage routes a SCORM_API_CALL to the adapter method', () => {
    const c = build()
    c.receiveMessage({ data: { type: 'SCORM_API_CALL', method: 'echo', args: ['hi'], id: 7 } })
    expect(scormAdapterService.echo).toHaveBeenCalledWith('hi')
  })

  it('receiveMessage raises telemetry for a normal data message', () => {
    const c = build()
    c.htmlContent = { identifier: 'id1' } as any
    c.receiveMessage({ data: { event: 'ping' } })
    expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('ping', 'scrom', expect.objectContaining({ contentId: 'id1' }))
  })

  it('receiveMessage falls back to message/id when there is no data payload', () => {
    const c = build()
    c.htmlContent = { identifier: 'id1' } as any
    c.receiveMessage({ message: 'evt', id: 9 })
    expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('evt', 'scrom', expect.objectContaining({ id: 9 }))
  })

  it('openInNewTab clicks the mobile anchor when on mobile', () => {
    jest.useFakeTimers()
    const c = build()
    mobAppSvc.isMobile = true
    const click = jest.fn()
    c.mobileOpenInNewTab = { nativeElement: { click } } as any
    c.htmlContent = { artifactUrl: 'https://example.com' } as any
    c.openInNewTab()
    jest.runAllTimers()
    expect(click).toHaveBeenCalled()
  })

  it('openInNewTab shows a snackbar when the popup is blocked on desktop', () => {
    const c = build()
    mobAppSvc.isMobile = false
    jest.spyOn(window, 'open').mockReturnValue(null)
    c.htmlContent = { artifactUrl: 'https://example.com' } as any
    c.openInNewTab()
    expect(snackBar.open).toHaveBeenCalled()
  })

  it('dismiss hides the iframe support warning and intranet notice', () => {
    const c = build()
    c.showIframeSupportWarning = true
    c.isIntranetUrl = true
    c.dismiss()
    expect(c.showIframeSupportWarning).toBe(false)
    expect(c.isIntranetUrl).toBe(false)
  })

  it('onIframeLoadOrError sets error status on an error event', () => {
    const c = build()
    c.onIframeLoadOrError('error')
    expect(c.pageFetchStatus).toBe('error')
  })

  it('onIframeLoadOrError clears the loading message on a successful load', () => {
    const c = build()
    c.showIsLoadingMessage = true
    const iframe = {
      src: 'x',
      contentWindow: { addEventListener: jest.fn() },
    } as any
    c.onIframeLoadOrError('load', iframe)
    expect(c.showIsLoadingMessage).toBe(false)
  })

  it('onBlur is a safe no-op for non-youtube urls', () => {
    const c = build()
    c.urlContains = 'https://example.com'
    expect(() => c.onBlur()).not.toThrow()
  })
})
