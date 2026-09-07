import { of } from 'rxjs'

import { WebModuleComponent } from './web-module.component'

/**
 * Direct-instantiation unit tests for WebModuleComponent.
 * Iframe DOM manipulation is skipped; we exercise the slide navigation,
 * telemetry, continue-learning persistence, theming helpers and lifecycle.
 */
describe('WebModuleComponent', () => {
  let events: any
  let domSanitizer: any
  let valueSvc: any
  let contentSvc: any
  let viewerSvc: any
  let configurationSvc: any
  let activatedRoute: any

  function build(): WebModuleComponent {
    events = { raiseInteractTelemetry: jest.fn() }
    domSanitizer = {
      bypassSecurityTrustResourceUrl: jest.fn((u: string) => `safeR:${u}`),
      bypassSecurityTrustUrl: jest.fn((u: string) => `safeU:${u}`),
    }
    valueSvc = { isXSmall$: of(false) }
    contentSvc = { saveContinueLearning: jest.fn(() => of({})) }
    viewerSvc = { realTimeProgressUpdate: jest.fn() }
    configurationSvc = { activeFontObject: null, prefChangeNotifier: of(null) }
    activatedRoute = { snapshot: { queryParams: {} } }
    return new WebModuleComponent(events, domSanitizer, valueSvc, contentSvc, viewerSvc, configurationSvc, activatedRoute)
  }

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('constructs with an empty iframe element ref', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.iframeElem).toBeTruthy()
  })

  it('loadWebModule maps a resources-based manifest into safe slide urls', () => {
    const c = build()
    c.urlPrefix = 'http://host'
    c.widgetData = { resumePage: 1 }
    c.webModuleManifest = { resources: [{ artifactUrl: '/a.html', title: 'A' }] }
    c.loadWebModule()
    expect(c.slides).toHaveLength(1)
    expect(domSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('http://host/a.html')
    expect(c.slides[0].safeUrl).toBe('safeR:http://host/a.html')
  })

  it('loadWebModule maps an array manifest (URL based) into safe slide urls', () => {
    const c = build()
    c.urlPrefix = 'http://host'
    c.widgetData = { resumePage: 1 }
    c.webModuleManifest = [{ URL: '/s1.html', title: 'S1' }, { URL: '/s2.html', title: 'S2' }]
    c.loadWebModule()
    expect(c.slides).toHaveLength(2)
    expect(c.currentSlideNumber).toBe(1)
  })

  it('setPage advances to a valid page and records visited pages', () => {
    const c = build()
    c.slides = [
      { title: 'A', URL: '/a', safeUrl: 'safeR:a' },
      { title: 'B', URL: '/b', safeUrl: 'safeR:b' },
    ] as any
    const page = c.setPage(2)
    expect(page).toBe(2)
    expect(c.currentSlideNumber).toBe(2)
    expect(c.iframeUrl).toBe('safeR:b')
    expect(c.isCompleted).toBe(true)
    expect(c.maxLastPageNumber).toBe(2)
    expect(c.current).toContain('2')
  })

  it('setAudio builds a safe audio url when an audio track exists', () => {
    const c = build()
    c.urlPrefix = 'http://host'
    c.setAudio([{ URL: '/track.mp3' }] as any)
    expect(domSanitizer.bypassSecurityTrustUrl).toHaveBeenCalledWith('http://host/track.mp3')
    expect(c.slideAudioUrl).toBe('safeU:http://host/track.mp3')
  })

  it('setAudio clears the audio url when there is no track', () => {
    const c = build()
    c.setAudio([] as any)
    expect(c.slideAudioUrl).toBeNull()
  })

  it('pageChange forwards to the next slide and raises telemetry', () => {
    const c = build()
    c.widgetData = { identifier: 'id1' }
    c.slides = [{ safeUrl: 'a' }, { safeUrl: 'b' }] as any
    c.currentSlideNumber = 1
    c.pageChange(1)
    expect(c.currentSlideNumber).toBe(2)
    expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('pageChange', 'click', { contentId: 'id1' })
  })

  it('pageChange does not go below the first slide', () => {
    const c = build()
    c.widgetData = { identifier: 'id1' }
    c.slides = [{ safeUrl: 'a' }, { safeUrl: 'b' }] as any
    c.currentSlideNumber = 1
    c.pageChange(-1)
    expect(c.currentSlideNumber).toBe(1)
  })

  it('raiseTelemetry resets the scroll flag on a scroll event', () => {
    const c = build()
    c.widgetData = { identifier: 'id1' }
    c.isScrolled = true
    c.raiseTelemetry('pageScroll', 'scroll')
    expect(c.isScrolled).toBe(false)
    expect(events.raiseInteractTelemetry).toHaveBeenCalled()
  })

  it('saveContinueLearning posts a playlist-context body for playlist collections', () => {
    const c = build()
    c.collectionId = 'col1'
    c.widgetData = { mimeType: 'application/web-module', identifier: 'r1' }
    activatedRoute.snapshot.queryParams = { collectionType: 'Playlist', collectionId: 'col1' }
    c.saveContinueLearning('r1')
    expect(contentSvc.saveContinueLearning).toHaveBeenCalled()
    const body = contentSvc.saveContinueLearning.mock.calls[0][0]
    expect(body.contextType).toBe('playlist')
    expect(body.resourceId).toBe('r1')
  })

  it('fireRealTimeProgress reports progress once slides have been visited', () => {
    const c = build()
    c.widgetData = { mimeType: 'application/web-module' }
    c.current = ['1']
    c.slides = [{ safeUrl: 'a' }] as any
    c.fireRealTimeProgress('r1')
    expect(viewerSvc.realTimeProgressUpdate).toHaveBeenCalledWith('r1', expect.objectContaining({ max_size: 1 }))
  })

  it('getColor converts an rgb computed style into a hex string', () => {
    const c = build()
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({ color: 'rgb(18, 52, 86)' } as any)
    expect(c.getColor('color')).toBe('#123456')
  })

  it('modifyIframeStyle writes the style onto the iframe body and tracks fontSize', () => {
    const c = build()
    const style: any = {}
    c.iframeElem = { nativeElement: { contentWindow: { document: { body: { style } } } } } as any
    c.modifyIframeStyle('fontSize', '16px')
    expect(style.fontSize).toBe('16px')
    expect(c.currentFontSize).toBe('16px')
  })

  it('ngOnInit wires the screen-size subscription and loads the module', () => {
    const c = build()
    c.widgetData = { resumePage: 1, artifactUrl: 'http://host/a/b.html', identifier: 'id1' }
    c.webModuleManifest = [{ URL: '/s1.html', title: 'S1' }]
    c.ngOnInit()
    expect(c.screenSizeIsXSmall).toBe(false)
    expect(c.slides).toHaveLength(1)
  })

  it('ngOnChanges recomputes the url prefix and reloads slides', () => {
    const c = build()
    c.widgetData = { identifier: 'id2', artifactUrl: 'http://host/dir/index.html', resumePage: 1 }
    c.webModuleManifest = [{ URL: '/s1.html', title: 'S1' }]
    c.ngOnChanges({ widgetData: { currentValue: c.widgetData } } as any)
    expect(c.urlPrefix).toBe('http://host/dir')
    expect(c.oldIdentifier).toBe('id2')
    expect(c.slides).toHaveLength(1)
  })

  it('ngOnDestroy unsubscribes, clears the interval and flushes progress', () => {
    const c = build()
    c.widgetData = { mimeType: 'application/vnd.ekstep.content-collection', identifier: 'r1' }
    const clearSpy = jest.spyOn(global, 'clearInterval')
    c.scrollTimeInterval = setInterval(() => undefined, 100000) as any
    expect(() => c.ngOnDestroy()).not.toThrow()
    expect(clearSpy).toHaveBeenCalled()
  })
})
