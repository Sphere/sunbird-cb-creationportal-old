import { of, Subject } from 'rxjs'

import { SubapplicationRespondService } from './subapplication-respond.service'

describe('SubapplicationRespondService', () => {
  let service: SubapplicationRespondService
  let configSvc: any
  let contentSvc: any
  let keyCloakSvc: any
  let activatedRoute: any
  let router: any
  let eventSvc: any
  let teleSvc: any
  let prefNotifier: Subject<any>

  const build = () => {
    prefNotifier = new Subject()
    configSvc = {
      prefChangeNotifier: prefNotifier,
      userProfile: { userName: 'John Doe', userId: 'u1' },
      activeThemeObject: { themeName: 'A', color: { primary: '#111' } },
      activeFontObject: { baseFontSize: '15px' },
      isDarkMode: false,
      rootOrg: 'rootOrg1',
      userRoles: new Set(['admin']),
      userPreference: { selectedLocale: 'en' },
    }
    contentSvc = {
      fetchContentHistory: jest.fn().mockReturnValue(of({ continueData: { data: { foo: 1 } } })),
      saveContinueLearning: jest.fn().mockReturnValue({ toPromise: () => Promise.resolve({}) }),
    }
    keyCloakSvc = { token: 'tok-123' }
    activatedRoute = { snapshot: { queryParams: {} } }
    router = { url: '/viewer/x' }
    eventSvc = { dispatchEvent: jest.fn() }
    teleSvc = { externalImpression: jest.fn() }
    return new SubapplicationRespondService(configSvc, contentSvc, keyCloakSvc, activatedRoute, router, eventSvc, teleSvc)
  }

  beforeEach(() => {
    service = build()
  })

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('loadedRespond (non-resume) posts a LOADED context message to the content window', () => {
    const contentWindow = { postMessage: jest.fn() }
    service.loadedRespond(contentWindow, 'myApp', 'id1', 'https://sub.test')

    expect(contentWindow.postMessage).toHaveBeenCalledTimes(1)
    const [msg, origin] = contentWindow.postMessage.mock.calls[0]
    expect(msg.requestId).toBe('LOADED')
    expect(msg.subApplicationName).toBe('myApp')
    expect(msg.parentContext.user.firstName).toBe('John')
    expect(msg.parentContext.user.lastName).toBe('Doe')
    expect(msg.parentContext.user.token).toBe('tok-123')
    expect(origin).toBe('https://sub.test')
    expect(service.loaded).toBe(true)
    expect(service.subAppname).toBe('myApp')
  })

  it('loadedRespond (resume) fetches history and includes continueLearning data', () => {
    activatedRoute.snapshot.queryParams.viewMode = 'RESUME'
    const contentWindow = { postMessage: jest.fn() }

    service.loadedRespond(contentWindow, 'resumeApp', 'id2')

    expect(contentSvc.fetchContentHistory).toHaveBeenCalledWith('id2')
    const [msg] = contentWindow.postMessage.mock.calls[0]
    expect(msg.data.continueLearning).toEqual({ foo: 1 })
    expect(msg.parentContext.subApplicationStartMode).toBe('RESUME')
  })

  it('continueLearningRespond saves progress through the content service', () => {
    service.continueLearningRespond('id3', { pos: 5 })
    expect(contentSvc.saveContinueLearning).toHaveBeenCalledTimes(1)
    const arg = contentSvc.saveContinueLearning.mock.calls[0][0]
    expect(arg.contextPathId).toBe('id3')
    expect(arg.resourceId).toBe('id3')
    expect(typeof arg.data).toBe('string')
  })

  it('telemetryEvents dispatches an INTERACT telemetry event', () => {
    service.telemetryEvents({ eventId: 'INTERACT', data: {}, subApplicationName: 'appX' })
    expect(eventSvc.dispatchEvent).toHaveBeenCalledTimes(1)
    const evt = eventSvc.dispatchEvent.mock.calls[0][0]
    expect(evt.from).toBe('appX')
    expect(evt.to).toBe('Telemetry')
  })

  it('telemetryEvents dispatches a HEARTBEAT telemetry event', () => {
    service.telemetryEvents({ eventId: 'HEARTBEAT', data: {}, subApplicationName: 'appY' })
    expect(eventSvc.dispatchEvent).toHaveBeenCalledTimes(1)
  })

  it('telemetryEvents routes IMPRESSION to the telemetry service', () => {
    service.telemetryEvents({ eventId: 'IMPRESSION', data: { id: 'p1' } })
    expect(teleSvc.externalImpression).toHaveBeenCalledWith({ id: 'p1' })
  })

  it('telemetryEvents ignores falsy input', () => {
    service.telemetryEvents(null)
    expect(eventSvc.dispatchEvent).not.toHaveBeenCalled()
    expect(teleSvc.externalImpression).not.toHaveBeenCalled()
  })

  it('unsubscribeResponse clears the tracked sub-application state', () => {
    service.loaded = true
    service.subAppname = 'appZ'
    service.contentWindowinfo = {}
    service.continueLearningData = { x: 1 }

    service.unsubscribeResponse()

    expect(service.loaded).toBe(false)
    expect(service.subAppname).toBe('')
    expect(service.contentWindowinfo).toBeNull()
    expect(service.continueLearningData).toBeNull()
  })

  it('changeContextrespond posts a CONTEXT_CHANGE message when a window is loaded', () => {
    const contentWindow = { postMessage: jest.fn() }
    service.loaded = true
    service.contentWindowinfo = contentWindow
    service.subAppname = 'appCtx'

    service.changeContextrespond()

    const [msg] = contentWindow.postMessage.mock.calls[0]
    expect(msg.requestId).toBe('CONTEXT_CHANGE')
    expect(msg.subApplicationName).toBe('appCtx')
  })

  it('changeContextrespond does nothing when not loaded', () => {
    const contentWindow = { postMessage: jest.fn() }
    service.contentWindowinfo = contentWindow
    service.loaded = false

    service.changeContextrespond()

    expect(contentWindow.postMessage).not.toHaveBeenCalled()
  })
})
