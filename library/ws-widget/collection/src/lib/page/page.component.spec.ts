import { Subject } from 'rxjs'
import { WsEvents } from '@ws-widget/utils'
import { PageComponent } from './page.component'

describe('PageComponent', () => {
  let component: PageComponent
  let activateRoute: any
  let logger: any
  let configSvc: any
  let valueSvc: any
  let eventSvc: any
  let tour: any
  let domSanitizer: any
  let respondSvc: any
  let isXSmall$: Subject<boolean>
  let routeData$: Subject<any>
  let tourGuide$: Subject<boolean>

  const link = (actionBtnId: string) => ({
    widgetType: 'navLink',
    widgetSubType: 'navLink',
    widgetData: { actionBtnId, config: { type: 'button' } },
  })

  const page = (over: any = {}) => ({
    navigationBar: {
      links: [link('home'), link('channel_how_to')],
      background: { color: 'primary' },
    },
    ...over,
  })

  const build = () => new PageComponent(activateRoute, logger, configSvc, valueSvc, eventSvc, tour, domSanitizer, respondSvc)

  const load = (routeData: any = { pageData: { data: page() } }) => {
    component.ngOnInit()
    routeData$.next(routeData)
  }

  const dispatchedStates = () => eventSvc.dispatchEvent.mock.calls.map((c: any[]) => c[0].data.state)

  beforeEach(() => {
    jest.useFakeTimers()
    isXSmall$ = new Subject<boolean>()
    routeData$ = new Subject<any>()
    tourGuide$ = new Subject<boolean>()

    activateRoute = { data: routeData$ }
    logger = { warn: jest.fn() }
    configSvc = {
      instanceConfig: { logos: { navbarLogo: 'nav.svg' } },
      restrictedFeatures: new Set<string>(),
      tourGuideNotifier: tourGuide$,
      pageNavBar: { color: 'default' },
    }
    valueSvc = { isXSmall$ }
    eventSvc = { dispatchEvent: jest.fn() }
    tour = { data: null, startTour: jest.fn() }
    domSanitizer = { bypassSecurityTrustResourceUrl: jest.fn((u: string) => `safe:${u}`) }
    respondSvc = { loadedRespond: jest.fn(), unsubscribeResponse: jest.fn() }

    component = build()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should be created with a unique host id', () => {
    expect(component).toBeTruthy()
    expect(component.id).toMatch(/^page_/)
    expect(component.pageData).toBeNull()
    expect(component.links).toEqual([])
    expect(component.alreadyRaised).toBe(false)
  })

  it('recomputes the nav links when the breakpoint changes', () => {
    load()

    isXSmall$.next(true)

    expect(component.isXSmall).toBe(true)
    expect(component.links.length).toBe(2)
    expect(component.links[0].widgetData.config.type).toBe('mat-menu-item')
  })

  describe('ngOnInit', () => {
    it('binds the navbar logo url', () => {
      component.ngOnInit()

      // Bound directly: an <img [src]> goes through Angular's URL sanitizer,
      // which already allows ordinary urls, so no bypass is needed.
      expect(component.navbarIcon).toBe('nav.svg')
    })

    it('leaves the logo unset when the instance has none', () => {
      configSvc.instanceConfig = { logos: {} }
      const c = build()

      c.ngOnInit()

      expect(c.navbarIcon).toBeUndefined()
    })

    it('skips the instance lookups without an instance config', () => {
      configSvc.instanceConfig = null
      const c = build()

      c.ngOnInit()

      expect(c.navbarIcon).toBeUndefined()
      expect(c.isHlpMenuXs).toBe(false)
    })

    it('honours a restricted mobile help menu', () => {
      configSvc.restrictedFeatures = new Set(['helpMenuXs'])
      const c = build()

      c.ngOnInit()

      expect(c.isHlpMenuXs).toBe(true)
    })

    it('shows the tour guide when it is not restricted', () => {
      component.ngOnInit()

      tourGuide$.next(true)

      expect(component.isTourGuideAvailable).toBe(true)
    })

    it('keeps the tour guide hidden when it is restricted', () => {
      configSvc.restrictedFeatures = new Set(['tourGuide'])
      const c = build()
      c.ngOnInit()

      tourGuide$.next(true)

      expect(c.isTourGuideAvailable).toBe(false)
    })

    it('takes the page out of the resolved route data', () => {
      load()

      expect(component.pageData).toEqual(page())
      expect(component.error).toBeNull()
      expect(component.navBackground).toEqual({ color: 'primary' })
      expect(component.alreadyRaised).toBe(true)
      expect(dispatchedStates()).toContain(WsEvents.EnumTelemetrySubType.Loaded)
    })

    it('hides the channel how-to link on wide screens', () => {
      load()

      expect(component.links.map(l => l.widgetData.actionBtnId)).toEqual(['home'])
    })

    it('keeps every link on the smallest screens', () => {
      isXSmall$.next(true)
      load()

      expect(component.links.length).toBe(2)
    })

    it('falls back to the instance nav bar when the page defines none', () => {
      load({ pageData: { data: page({ navigationBar: { links: [] } }) } })

      expect(component.navBackground).toEqual({ color: 'default' })
    })

    it('falls back to the widget data when the route resolves nothing', () => {
      component.widgetData = page() as any

      load({ pageData: {} })

      expect(component.pageData).toEqual(page())
      expect(component.links.map(l => l.widgetData.actionBtnId)).toEqual(['home'])
    })

    it('records the resolver error when there is no page at all', () => {
      load({ pageData: { error: 'notFound' } })

      expect(component.pageData).toBeNull()
      expect(component.error).toBe('notFound')
      expect(logger.warn).toHaveBeenCalledWith('No page data available')
      expect(eventSvc.dispatchEvent).not.toHaveBeenCalled()
    })

    it('unloads the previous page before loading the next one', () => {
      load()
      eventSvc.dispatchEvent.mockClear()

      routeData$.next({ pageData: { data: page() } })

      expect(dispatchedStates()).toEqual([WsEvents.EnumTelemetrySubType.Unloaded, WsEvents.EnumTelemetrySubType.Loaded])
    })

    it('answers a LOADED handshake from an embedded sub-application', () => {
      load()
      const source = { postMessage: jest.fn() }

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { requestId: 'LOADED', subApplicationName: 'assessment' },
          source: source as any,
        }),
      )

      expect(respondSvc.loadedRespond).toHaveBeenCalledWith(source, 'assessment')
    })

    it('ignores an unrecognised sub-application request', () => {
      load()

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { requestId: 'OTHER' },
          source: { postMessage: jest.fn() } as any,
        }),
      )

      expect(respondSvc.loadedRespond).not.toHaveBeenCalled()
    })

    it('ignores a message with no request id', () => {
      load()

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { hello: true },
          source: { postMessage: jest.fn() } as any,
        }),
      )

      expect(respondSvc.loadedRespond).not.toHaveBeenCalled()
    })

    it('ignores a message with no usable source', () => {
      load()

      window.dispatchEvent(new MessageEvent('message', { data: { requestId: 'LOADED' } }))

      expect(respondSvc.loadedRespond).not.toHaveBeenCalled()
    })
  })

  describe('getNavLinks', () => {
    it('returns nothing before a page is loaded', () => {
      expect(component.getNavLinks()).toEqual([])
    })

    it('returns nothing for a page with no navigation bar', () => {
      load({ pageData: { data: {} } })

      expect(component.getNavLinks()).toEqual([])
    })

    it('returns the links untouched on wide screens', () => {
      load()

      expect(component.getNavLinks()).toEqual(page().navigationBar.links)
    })

    it('turns the links into menu items on the smallest screens', () => {
      load()
      component.isXSmall = true

      expect(component.getNavLinks().every(l => l.widgetData.config.type === 'mat-menu-item')).toBe(true)
    })
  })

  describe('ngAfterViewInit', () => {
    afterEach(() => {
      window.location.hash = ''
    })

    it('scrolls to the anchor named in the url hash', () => {
      const target = document.createElement('div')
      target.id = 'section-two'
      target.scrollIntoView = jest.fn()
      document.body.appendChild(target)
      window.location.hash = '#section-two'

      component.ngAfterViewInit()
      jest.advanceTimersByTime(1000)

      expect(target.scrollIntoView).toHaveBeenCalled()
      document.body.removeChild(target)
    })

    it('tolerates a hash that matches no element', () => {
      window.location.hash = '#missing'

      component.ngAfterViewInit()

      expect(() => jest.advanceTimersByTime(1000)).not.toThrow()
    })

    it('ignores a numeric hash', () => {
      window.location.hash = '#42'

      expect(() => {
        component.ngAfterViewInit()
        jest.advanceTimersByTime(1000)
      }).not.toThrow()
    })

    it('arms the tour guide for a page that defines one', () => {
      const notifier = jest.spyOn(tourGuide$, 'next')
      load({ pageData: { data: page({ tourGuide: { steps: [1] } }) } })

      component.ngAfterViewInit()

      expect(notifier).toHaveBeenCalledWith(true)
      expect(tour.data).toEqual({ steps: [1] })
    })

    it('leaves the tour guide alone for a page without one', () => {
      load()
      const notifier = jest.spyOn(tourGuide$, 'next')

      component.ngAfterViewInit()

      expect(notifier).not.toHaveBeenCalled()
    })
  })

  describe('raiseEvent', () => {
    it('dispatches a page telemetry event carrying the current path', () => {
      component.raiseEvent(WsEvents.EnumTelemetrySubType.Loaded)

      const event = eventSvc.dispatchEvent.mock.calls[0][0]
      expect(event.from).toBe('channel-page')
      expect(event.eventType).toBe(WsEvents.WsEventType.Telemetry)
      expect(event.data.type).toBe(WsEvents.WsTimeSpentType.Page)
      expect(event.data.pageId).toBe(window.location.pathname.replace('/', ''))
    })
  })

  describe('startTour', () => {
    it('starts the tour and releases the sub-application listener', () => {
      load()

      component.startTour()

      expect(tour.startTour).toHaveBeenCalled()
      expect(respondSvc.unsubscribeResponse).toHaveBeenCalled()

      respondSvc.loadedRespond.mockClear()
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { requestId: 'LOADED' },
          source: { postMessage: jest.fn() } as any,
        }),
      )
      expect(respondSvc.loadedRespond).not.toHaveBeenCalled()
    })

    it('starts the tour when no sub-application is listening', () => {
      component.startTour()

      expect(tour.startTour).toHaveBeenCalled()
      expect(respondSvc.unsubscribeResponse).not.toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('unloads the page and stands the tour guide down', () => {
      const notifier = jest.spyOn(tourGuide$, 'next')
      load()
      eventSvc.dispatchEvent.mockClear()

      component.ngOnDestroy()

      expect(dispatchedStates()).toEqual([WsEvents.EnumTelemetrySubType.Unloaded])
      expect(notifier).toHaveBeenCalledWith(false)
    })

    it('raises no unload event when no page was loaded', () => {
      component.ngOnDestroy()

      expect(eventSvc.dispatchEvent).not.toHaveBeenCalled()
    })
  })
})
