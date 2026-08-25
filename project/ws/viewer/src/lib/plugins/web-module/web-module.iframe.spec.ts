import { of, Subject } from 'rxjs'

import { WebModuleComponent } from './web-module.component'

/**
 * Wave 18 — the iframe styling and instrumentation of the viewer's WebModule
 * plugin: `modifyIframeDom`, `setTheme`, `modifyIframeStyle`, `raiseTelemetry`
 * and the lifecycle hooks around them.
 */
describe('WebModuleComponent (iframe styling)', () => {
  let events: any
  let domSanitizer: any
  let valueSvc: any
  let contentSvc: any
  let viewerSvc: any
  let configurationSvc: any
  let activatedRoute: any
  let prefChangeNotifier: Subject<any>

  function build(): WebModuleComponent {
    events = { raiseInteractTelemetry: jest.fn() }
    domSanitizer = {
      bypassSecurityTrustResourceUrl: jest.fn((u: string) => `safeR:${u}`),
      bypassSecurityTrustUrl: jest.fn((u: string) => `safeU:${u}`),
    }
    valueSvc = { isXSmall$: of(false) }
    contentSvc = { saveContinueLearning: jest.fn(() => ({ toPromise: () => Promise.resolve({}) })) }
    viewerSvc = { realTimeProgressUpdate: jest.fn() }
    prefChangeNotifier = new Subject<any>()
    configurationSvc = { activeFontObject: null, prefChangeNotifier }
    activatedRoute = { snapshot: { queryParams: {} } }
    return new WebModuleComponent(events, domSanitizer, valueSvc, contentSvc, viewerSvc, configurationSvc, activatedRoute)
  }

  /** A real detached iframe, so the component gets a genuine document to write into. */
  const mountIframe = () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    return iframe
  }

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => {
    document.querySelectorAll('iframe').forEach(f => f.remove())
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  // ------------------------------------------------------- modifyIframeDom --

  describe('modifyIframeDom', () => {
    it('injects the stylesheets and scripts into the frame', async () => {
      const c = build()
      const iframe = mountIframe()
      await c.modifyIframeDom(iframe)
      const head = iframe.contentWindow!.document.head
      expect(head.querySelectorAll('link')).toHaveLength(4)
      expect(head.querySelectorAll('script')).toHaveLength(2)
      expect(head.querySelector('style')).toBeTruthy()
    })

    it('clears the loading flag and applies the theme shortly after', async () => {
      jest.useFakeTimers()
      const c = build()
      const setTheme = jest.spyOn(c, 'setTheme').mockImplementation(() => undefined)
      c.iframeLoadingInProgress = true
      await c.modifyIframeDom(mountIframe())
      jest.advanceTimersByTime(1100)
      expect(c.iframeLoadingInProgress).toBe(false)
      expect(setTheme).toHaveBeenCalled()
    })

    it('reports the first scroll inside the frame', async () => {
      const c = build()
      c.widgetData = { identifier: 'do_1' } as any
      const iframe = mountIframe()
      await c.modifyIframeDom(iframe)
      iframe.contentWindow!.document.dispatchEvent(new Event('scroll'))
      expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('pageScroll', 'scroll', { contentId: 'do_1' })
      expect(c.firstScroll).toBe(false)
    })

    it('records a later scroll without re-reporting it', async () => {
      const c = build()
      c.widgetData = { identifier: 'do_1' } as any
      const iframe = mountIframe()
      await c.modifyIframeDom(iframe)
      iframe.contentWindow!.document.dispatchEvent(new Event('scroll'))
      events.raiseInteractTelemetry.mockClear()
      iframe.contentWindow!.document.dispatchEvent(new Event('scroll'))
      expect(events.raiseInteractTelemetry).not.toHaveBeenCalled()
      expect(c.isScrolled).toBe(true)
    })

    it('does nothing for a frame with no content window', async () => {
      const c = build()
      await expect(c.modifyIframeDom({} as any)).resolves.toBeUndefined()
    })
  })

  // ------------------------------------------------------ raiseScrollTelemetry --

  describe('raiseScrollTelemetry', () => {
    it('reports the accumulated scrolling on a timer', () => {
      jest.useFakeTimers()
      const c = build()
      c.widgetData = { identifier: 'do_1' } as any
      c.raiseScrollTelemetry()
      c.isScrolled = true
      jest.advanceTimersByTime(2 * 60000)
      expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('pageScroll', 'scroll', { contentId: 'do_1' })
    })

    it('stays quiet when nothing was scrolled', () => {
      jest.useFakeTimers()
      const c = build()
      c.widgetData = { identifier: 'do_1' } as any
      c.raiseScrollTelemetry()
      c.isScrolled = false
      jest.advanceTimersByTime(2 * 60000)
      expect(events.raiseInteractTelemetry).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------- raiseTelemetry --

  describe('raiseTelemetry', () => {
    it('reports an action against the open module', () => {
      const c = build()
      c.widgetData = { identifier: 'do_1' } as any
      c.raiseTelemetry('pageChange', 'click')
      expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('pageChange', 'click', { contentId: 'do_1' })
    })

    it('stays quiet for a module with no identifier', () => {
      const c = build()
      c.widgetData = {} as any
      c.raiseTelemetry('pageChange', 'click')
      expect(events.raiseInteractTelemetry).not.toHaveBeenCalled()
    })

    it('resets the scroll flag once a scroll is reported', () => {
      const c = build()
      c.widgetData = { identifier: 'do_1' } as any
      c.isScrolled = true
      c.raiseTelemetry('pageScroll', 'scroll')
      expect(c.isScrolled).toBe(false)
    })
  })

  // ----------------------------------------------------- theme and styling --

  describe('setTheme and modifyIframeStyle', () => {
    it('applies the colours to the frame body', () => {
      const c = build()
      // jsdom reports no computed colour, so the derived hex would be unusable.
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({ color: 'rgb(1, 2, 3)', backgroundColor: 'rgb(4, 5, 6)' } as any)
      const iframe = mountIframe()
      c.iframeElem = { nativeElement: iframe } as any
      c.setTheme()
      expect(iframe.contentWindow!.document.body.style.color).toBeTruthy()
      expect(iframe.contentWindow!.document.body.style.backgroundColor).toBeTruthy()
    })

    it('applies the reader font size when one is chosen', () => {
      const c = build()
      const iframe = mountIframe()
      c.iframeElem = { nativeElement: iframe } as any
      c.currentFontSize = '18px'
      c.setTheme()
      expect(iframe.contentWindow!.document.body.style.fontSize).toBe('18px')
    })

    it('leaves the font size alone when none is chosen', () => {
      const c = build()
      const iframe = mountIframe()
      c.iframeElem = { nativeElement: iframe } as any
      c.currentFontSize = ''
      c.setTheme()
      expect(iframe.contentWindow!.document.body.style.fontSize).toBe('')
    })

    it('remembers the font size it applied', () => {
      const c = build()
      const iframe = mountIframe()
      c.iframeElem = { nativeElement: iframe } as any
      c.modifyIframeStyle('fontSize', '20px')
      expect(c.currentFontSize).toBe('20px')
    })

    it('survives with no frame mounted', () => {
      const c = build()
      c.iframeElem = undefined as any
      expect(() => c.modifyIframeStyle('color', '#000000')).not.toThrow()
    })
  })

  // ---------------------------------------------------------------- getColor --

  describe('getColor', () => {
    it('renders a computed colour as a hex string', () => {
      const c = build()
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({ color: 'rgb(255, 0, 16)' } as any)
      expect(c.getColor('color')).toBe('#ff0010')
    })

    it('renders a translucent colour as a hex string too', () => {
      const c = build()
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({ color: 'rgba(0, 128, 255, 0.5)' } as any)
      expect(c.getColor('color')).toBe('#0080ff')
    })
  })

  // -------------------------------------------------------------- lifecycle --

  describe('lifecycle', () => {
    it('takes the reader font size from the configuration', () => {
      const c = build()
      configurationSvc.activeFontObject = { baseFontSize: '18px' }
      jest.spyOn(c, 'loadWebModule').mockImplementation(() => undefined)
      c.ngOnInit()
      expect(c.currentFontSize).toBe('18px')
      expect(c.defaultFontSize).toBe(18)
    })

    it('leaves the font size alone with no configured preference', () => {
      const c = build()
      jest.spyOn(c, 'loadWebModule').mockImplementation(() => undefined)
      c.ngOnInit()
      expect(c.defaultFontSize).not.toBe(18)
    })

    it('reapplies the theme when the reader changes a preference', () => {
      const c = build()
      jest.spyOn(c, 'loadWebModule').mockImplementation(() => undefined)
      const setTheme = jest.spyOn(c, 'setTheme').mockImplementation(() => undefined)
      c.ngOnInit()
      prefChangeNotifier.next(null)
      expect(setTheme).toHaveBeenCalled()
    })

    it('stops the scroll timer when the module closes', () => {
      jest.useFakeTimers()
      const c = build()
      c.widgetData = { identifier: 'do_1' } as any
      c.raiseScrollTelemetry()
      const clear = jest.spyOn(global, 'clearInterval')
      c.ngOnDestroy()
      expect(clear).toHaveBeenCalled()
    })

    it('releases the screen-size subscription', () => {
      const c = build()
      jest.spyOn(c, 'loadWebModule').mockImplementation(() => undefined)
      c.ngOnInit()
      const unsubscribe = jest.spyOn((c as any).screenSizeSubscription, 'unsubscribe')
      c.widgetData = { identifier: 'do_1' } as any
      c.ngOnDestroy()
      expect(unsubscribe).toHaveBeenCalled()
    })
  })
})
