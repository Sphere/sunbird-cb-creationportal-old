import { Subject } from 'rxjs'

import { WsEvents } from './event.model'
import { TelemetryService } from './telemetry.service'

describe('TelemetryService', () => {
  let events$: Subject<any>
  let configSvc: any
  let eventsSvc: any
  let logger: any
  let t: any

  const buildInstanceConfig = () => ({
    telemetryConfig: {
      pdata: { id: 'test-pid', ver: '1.0' },
    },
  })

  beforeEach(() => {
    events$ = new Subject<any>()
    eventsSvc = { events$ }
    logger = { error: jest.fn(), log: jest.fn() }
    configSvc = {
      instanceConfig: buildInstanceConfig(),
      userProfile: { userId: 'u1' },
    }
    t = {
      start: jest.fn(),
      end: jest.fn(),
      audit: jest.fn(),
      heartbeat: jest.fn(),
      impression: jest.fn(),
      interact: jest.fn(),
      search: jest.fn(),
    }
    ;(globalThis as any).$t = t
  })

  afterEach(() => {
    delete (globalThis as any).$t
  })

  const create = () => new TelemetryService(configSvc, eventsSvc, logger)

  it('creates and populates telemetryConfig/pData from instanceConfig', () => {
    const service = create()
    expect(service).toBeTruthy()
    expect(service.telemetryConfig).toBeTruthy()
    expect((service.telemetryConfig as any).uid).toBe('u1')
    expect((service.telemetryConfig as any).pdata.pid).toBe(navigator.userAgent)
    expect(service.pData.id).toBe('test-pid')
  })

  it('start calls $t.start when config present', () => {
    const service = create()
    service.start('page', 'view', 'id1')
    expect(t.start).toHaveBeenCalledTimes(1)
    const args = t.start.mock.calls[0]
    expect(args[1]).toBe('id1')
    expect(args[3]).toMatchObject({ id: 'id1', type: 'page', mode: 'view' })
  })

  it('start logs an error when telemetryConfig is missing', () => {
    configSvc.instanceConfig = null
    const service = create()
    expect(service.telemetryConfig).toBeNull()
    service.start('page', 'view', 'id1')
    expect(logger.error).toHaveBeenCalledWith('Error Initializing Telemetry. Config missing.')
    expect(t.start).not.toHaveBeenCalled()
  })

  it('end calls $t.end with pData context', () => {
    const service = create()
    service.end('page', 'view', 'cid')
    expect(t.end).toHaveBeenCalledTimes(1)
    expect(t.end.mock.calls[0][0]).toEqual({ type: 'page', mode: 'view', contentId: 'cid' })
  })

  it('audit calls $t.audit', () => {
    const service = create()
    service.audit('created', 'name', { a: 1 })
    expect(t.audit).toHaveBeenCalledTimes(1)
    expect(t.audit.mock.calls[0][0]).toEqual({ type: 'created', props: 'name', data: { a: 1 } })
  })

  it('heartbeat calls $t.heartbeat', () => {
    const service = create()
    service.heartbeat('player', 'play', 'id9')
    expect(t.heartbeat).toHaveBeenCalledWith({ id: 'id9', mode: 'play', type: 'player' })
  })

  it('impression calls $t.impression and stores previousUrl', () => {
    const service = create()
    service.impression()
    expect(t.impression).toHaveBeenCalledTimes(1)
    expect(service.previousUrl).toBe(service.getPageDetails().pageUrl)
  })

  it('externalImpression only fires for known external apps', () => {
    const service = create()
    service.externalImpression({ subApplicationName: 'UNKNOWN', data: {} })
    expect(t.impression).not.toHaveBeenCalled()
    service.externalImpression({ subApplicationName: 'RBCP', data: { foo: 'bar' } })
    expect(t.impression).toHaveBeenCalledTimes(1)
  })

  describe('getPageDetails / extractContentIdFromUrlParts', () => {
    it('getPageDetails returns pageid/pageUrl/parts', () => {
      const service = create()
      const page = service.getPageDetails()
      expect(page).toHaveProperty('pageid')
      expect(page).toHaveProperty('pageUrl')
      expect(Array.isArray(page.pageUrlParts)).toBe(true)
    })

    it('returns null when neither toc nor viewer present', () => {
      const service = create()
      expect(service.extractContentIdFromUrlParts(['app', 'home'])).toBeNull()
    })

    it('returns the id after toc', () => {
      const service = create()
      expect(service.extractContentIdFromUrlParts(['app', 'toc', 'CID_1'])).toBe('CID_1')
    })

    it('returns the id two positions after viewer', () => {
      const service = create()
      expect(service.extractContentIdFromUrlParts(['app', 'viewer', 'pdf', 'CID_2'])).toBe('CID_2')
    })
  })

  describe('event listeners', () => {
    it('addTimeSpentListener starts on Loaded and ends on Unloaded page events', () => {
      const service = create()
      const startSpy = jest.spyOn(service, 'start')
      const endSpy = jest.spyOn(service, 'end')
      events$.next({
        eventType: WsEvents.WsEventType.Telemetry,
        data: {
          type: WsEvents.WsTimeSpentType.Page,
          mode: WsEvents.WsTimeSpentMode.View,
          state: WsEvents.EnumTelemetrySubType.Loaded,
          pageId: 'p1',
        },
      })
      expect(startSpy).toHaveBeenCalled()
      events$.next({
        eventType: WsEvents.WsEventType.Telemetry,
        data: {
          type: WsEvents.WsTimeSpentType.Page,
          mode: WsEvents.WsTimeSpentMode.View,
          state: WsEvents.EnumTelemetrySubType.Unloaded,
          pageId: 'p1',
        },
      })
      expect(endSpy).toHaveBeenCalled()
    })

    it('addPlayerListener starts on Loaded player events', () => {
      const service = create()
      const startSpy = jest.spyOn(service, 'start')
      events$.next({
        eventType: WsEvents.WsEventType.Telemetry,
        data: {
          type: WsEvents.WsTimeSpentType.Player,
          mode: WsEvents.WsTimeSpentMode.Play,
          state: WsEvents.EnumTelemetrySubType.Loaded,
          identifier: 'res1',
          content: null,
        },
      })
      expect(startSpy).toHaveBeenCalled()
    })

    it('addInteractListener fires $t.interact', () => {
      create()
      events$.next({
        eventType: WsEvents.WsEventType.Telemetry,
        from: 'someWidget',
        data: {
          eventSubType: WsEvents.EnumTelemetrySubType.Interact,
          type: 'click',
          subType: 'btn',
          object: {},
        },
      })
      expect(t.interact).toHaveBeenCalledTimes(1)
    })

    it('addHearbeatListener fires $t.heartbeat', () => {
      create()
      events$.next({
        eventType: WsEvents.WsEventType.Telemetry,
        from: 'someWidget',
        data: {
          eventSubType: WsEvents.EnumTelemetrySubType.HeartBeat,
          type: 'x',
          identifier: 'id',
          mimeType: 'm',
          mode: 'play',
        },
      })
      expect(t.heartbeat).toHaveBeenCalledTimes(1)
    })

    it('addSearchListener fires $t.search', () => {
      create()
      events$.next({
        eventType: WsEvents.WsEventType.Telemetry,
        data: {
          eventSubType: WsEvents.EnumTelemetrySubType.Search,
          query: 'q',
          filters: {},
          size: 10,
        },
      })
      expect(t.search).toHaveBeenCalledTimes(1)
      expect(t.search.mock.calls[0][0]).toMatchObject({ query: 'q', size: 10 })
    })
  })
})
