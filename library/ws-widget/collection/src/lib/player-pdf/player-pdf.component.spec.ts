import { of, Subject } from 'rxjs'
import { WsEvents } from '@ws-widget/utils'
import { PlayerPdfComponent } from './player-pdf.component'

describe('PlayerPdfComponent', () => {
  let activatedRoute: any
  let router: any
  let eventSvc: any
  let contentSvc: any
  let utilitySvc: any
  let queryParamMap$: Subject<any>

  const paramMap = (map: Record<string, any> = {}) => ({
    get: (k: string) => (k in map ? String(map[k]) : null),
  })

  const build = (widgetData: any = {}) => {
    const c = new PlayerPdfComponent(activatedRoute, router, eventSvc, contentSvc, utilitySvc)
    c.widgetData = { pdfUrl: 'a.pdf', identifier: 'do_1', ...widgetData } as any
    return c
  }

  beforeEach(() => {
    queryParamMap$ = new Subject<any>()
    activatedRoute = {
      queryParamMap: queryParamMap$.asObservable(),
      snapshot: {
        queryParams: {},
        queryParamMap: paramMap({}),
      },
    }
    router = { navigate: jest.fn() }
    eventSvc = { dispatchEvent: jest.fn() }
    contentSvc = { saveContinueLearning: jest.fn(() => of({})) }
    utilitySvc = { isMobile: false }
  })

  it('creates the component with defaults', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.totalPages).toBe(0)
    expect(c.currentPage.value).toBe(1)
    expect(c.isInFullScreen).toBe(false)
    expect(c.pdfZoom).toBe('28%')
  })

  describe('fullScreenState', () => {
    it('expands the layout in fullscreen', () => {
      const c = build()
      c.fullScreenState({ state: true })
      expect(c.isInFullScreen).toBe(true)
      expect(c.pdfHeight).toBe('100vh')
      expect(c.pdfMobileHeight).toBe('calc(100vh - 50px)')
      expect(c.pdfZoom).toBe('40%')
    })

    it('restores the layout when handed a falsy state', () => {
      const c = build()
      c.pdfHeight = 'x'
      // the else branch runs only when the argument itself is falsy
      c.fullScreenState(0 as any)
      expect(c.pdfHeight).toBe('calc(100vh - 224px)')
      expect(c.pdfMobileHeight).toBe('200px')
      expect(c.pdfZoom).toBe('28%')
    })

    it('keeps the expanded layout while a state object is present', () => {
      const c = build()
      c.fullScreenState({ state: false })
      expect(c.isInFullScreen).toBe(false)
      expect(c.pdfHeight).toBe('100vh')
    })
  })

  describe('ngOnInit', () => {
    afterEach(() => jest.useRealTimers())

    it('disables the page control and starts telemetry when enabled', () => {
      jest.useFakeTimers()
      const c = build({ disableTelemetry: false })
      c.ngOnInit()
      expect(c.currentPage.disabled).toBe(true)
      expect(c.widgetData.disableTelemetry).toBe(false)
      // interval telemetry runner is scheduled
      expect((c as any).runnerSubs).not.toBeNull()
      c.ngOnDestroy()
    })

    it('reacts to query params when a read key is configured', () => {
      jest.useFakeTimers()
      const c = build({ readValuesQueryParamsKey: { pageNumber: 'p' } })
      c.totalPages = 10
      c.ngOnInit()
      queryParamMap$.next(paramMap({ p: 3 }))
      expect(c.currentPage.value).toBe(3)
      c.ngOnDestroy()
    })

    it('ignores an out-of-range page from query params', () => {
      jest.useFakeTimers()
      const c = build({ readValuesQueryParamsKey: { pageNumber: 'p' } })
      c.totalPages = 2
      c.currentPage.setValue(1)
      c.ngOnInit()
      queryParamMap$.next(paramMap({ p: 99 }))
      expect(c.currentPage.value).toBe(1)
      c.ngOnDestroy()
    })
  })

  describe('loadPageNum', () => {
    it('ignores pages out of range', () => {
      const c = build()
      c.totalPages = 5
      c.loadPageNum(0)
      c.loadPageNum(6)
      expect(c.currentPage.value).toBe(1)
    })

    it('sets a valid page and dispatches a state change when telemetry is on', () => {
      const c = build({ disableTelemetry: false })
      c.enableTelemetry = true
      c.totalPages = 5
      const spy = jest.spyOn(c as any, 'eventDispatcher')
      c.loadPageNum(3)
      expect(c.currentPage.value).toBe(3)
      expect(spy).toHaveBeenCalledWith(WsEvents.EnumTelemetrySubType.StateChange)
    })

    it('does not dispatch when telemetry is disabled', () => {
      const c = build({ disableTelemetry: true })
      c.totalPages = 5
      const spy = jest.spyOn(c as any, 'eventDispatcher')
      c.loadPageNum(2)
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('saveContinueLearning', () => {
    it('saves playlist context when the route is a playlist', () => {
      activatedRoute.snapshot.queryParams = {
        collectionType: 'playlist',
        collectionId: 'col_1',
      }
      const c = build()
      c.saveContinueLearning('do_1')
      expect(contentSvc.saveContinueLearning).toHaveBeenCalledWith(
        expect.objectContaining({ contextType: 'playlist', resourceId: 'do_1', contextPathId: 'col_1' }),
      )
    })

    it('saves plain context otherwise, defaulting the path id to the resource', () => {
      const c = build()
      c.saveContinueLearning('do_9')
      const body = contentSvc.saveContinueLearning.mock.calls[0][0]
      expect(body.resourceId).toBe('do_9')
      expect(body.contextPathId).toBe('do_9')
      expect(body.contextType).toBeUndefined()
    })
  })

  describe('fireRealTimeProgress', () => {
    it('returns without error when there is progress', () => {
      const c = build()
      c.totalPages = 3
      c.current = ['1']
      expect(() => c.fireRealTimeProgress('do_1')).not.toThrow()
    })

    it('returns early with no pages', () => {
      const c = build()
      expect(() => c.fireRealTimeProgress('do_1')).not.toThrow()
    })
  })

  describe('render/refresh', () => {
    it('records the current page and draws the last render task', async () => {
      const c = build()
      const draw = jest.fn()
      ;(c as any).lastRenderTask = { draw }
      const ok = await (c as any).render()
      expect(ok).toBe(true)
      expect(c.current).toContain('1')
      expect(draw).toHaveBeenCalled()
    })

    it('does not duplicate the current page entry', async () => {
      const c = build()
      c.current = ['1']
      await (c as any).render()
      expect(c.current.filter(p => p === '1').length).toBe(1)
    })

    it('refresh triggers the render subject', () => {
      const c = build()
      const spy = jest.spyOn((c as any).renderSubject, 'next')
      c.refresh()
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('loadDocument (via documentLoded)', () => {
    it('enables the page control and resumes at the resume page', () => {
      const c = build({ resumePage: 2, disableTelemetry: true })
      c.documentLoded({ pagesCount: 10 })
      expect(c.totalPages).toBe(10)
      expect(c.currentPage.enabled).toBe(true)
      expect(c.currentPage.value).toBe(2)
    })

    it('falls back to page 1 when resume page is out of range', () => {
      const c = build({ resumePage: 99, disableTelemetry: true })
      c.documentLoded({ pagesCount: 3 })
      expect(c.currentPage.value).toBe(1)
    })

    it('ignores a falsy documentLoded event', () => {
      const c = build()
      c.documentLoded(null)
      expect(c.totalPages).toBe(0)
    })
  })

  describe('eventDispatcher', () => {
    it('does nothing when telemetry is disabled on the widget', () => {
      const c = build({ disableTelemetry: true })
      ;(c as any).eventDispatcher(WsEvents.EnumTelemetrySubType.Init)
      expect(eventSvc.dispatchEvent).not.toHaveBeenCalled()
    })

    it('dispatches a known event when telemetry is enabled', () => {
      const c = build({ disableTelemetry: false })
      c.enableTelemetry = true
      ;(c as any).eventDispatcher(WsEvents.EnumTelemetrySubType.Loaded)
      expect(eventSvc.dispatchEvent).toHaveBeenCalled()
    })

    it('skips an unrecognised event subtype', () => {
      const c = build({ disableTelemetry: false })
      c.enableTelemetry = true
      ;(c as any).eventDispatcher('Bogus' as any)
      expect(eventSvc.dispatchEvent).not.toHaveBeenCalled()
    })
  })

  describe('preserveAllApiCalls', () => {
    it('iterates document anchors without throwing', () => {
      document.body.innerHTML = '<a class="internalLink">x</a><a class="other">y</a>'
      const c = build()
      expect(() => c.preserveAllApiCalls()).not.toThrow()
      document.body.innerHTML = ''
    })
  })

  describe('getters', () => {
    it('getPDFHeight returns the mobile height on mobile', () => {
      utilitySvc.isMobile = true
      const c = build()
      expect(c.getPDFHeight).toBe(c.pdfMobileHeight)
    })

    it('getPDFHeight returns the desktop height on a wide screen', () => {
      const c = build()
      c.pdfHeight = 'DESK'
      Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true })
      expect(c.getPDFHeight).toBe('DESK')
    })

    it('getPDFZoom returns the configured zoom on mobile, auto otherwise', () => {
      const c = build()
      expect(c.getPDFZoom).toBe('auto')
      utilitySvc.isMobile = true
      expect(c.getPDFZoom).toBe(c.pdfZoom)
    })
  })

  describe('lifecycle', () => {
    it('ngOnChanges is a safe no-op', () => {
      const c = build()
      expect(() => c.ngOnChanges()).not.toThrow()
    })

    it('ngAfterViewInit copies the identifier and handles small viewports', () => {
      const c = build()
      c.containerSection = { nativeElement: { clientWidth: 100 } } as any
      c.input = null
      c.ngAfterViewInit()
      expect(c.identifier).toBe('do_1')
      expect(c.isSmallViewPort).toBe(true)
    })

    it('ngOnDestroy saves progress and cleans up', () => {
      const c = build({ disableTelemetry: true })
      c.identifier = 'do_1'
      c.totalPages = 3
      c.current = ['1']
      const save = jest.spyOn(c, 'saveContinueLearning')
      expect(() => c.ngOnDestroy()).not.toThrow()
      expect(save).toHaveBeenCalledWith('do_1')
    })
  })
})
