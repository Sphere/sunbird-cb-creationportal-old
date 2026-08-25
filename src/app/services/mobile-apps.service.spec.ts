import { MobileAppsService } from './mobile-apps.service'
import { DISPLAY_SETTING, GO_OFFLINE } from '../models/mobile-events.model'

describe('MobileAppsService', () => {
  let navigateSvc: { init: jest.Mock }
  let svc: MobileAppsService
  const w = window as any

  beforeEach(() => {
    navigateSvc = { init: jest.fn() }
    svc = new MobileAppsService(navigateSvc as any)
    delete w.appRef
    delete w.webkit
    delete w.navigateTo
    delete w.dispatchEventFlag
  })
  afterEach(() => {
    delete w.appRef
    delete w.webkit
    delete w.navigateTo
    delete w.dispatchEventFlag
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('init wires global methods and initialises navigation', () => {
    svc.init()
    expect(navigateSvc.init).toHaveBeenCalled()
    expect(typeof w.navigateTo).toBe('function')
  })

  it('isAndroidApp / isMobile reflect window.appRef', () => {
    expect(svc.isAndroidApp).toBe(false)
    expect(svc.isMobile).toBe(false)
    w.appRef = {}
    expect(svc.isAndroidApp).toBe(true)
    expect(svc.isMobile).toBe(true)
  })

  it('iOsAppRef returns the webkit appRef handler when present', () => {
    expect(svc.iOsAppRef).toBeNull()
    w.webkit = { messageHandlers: { appRef: { postMessage: jest.fn() } } }
    expect(svc.iOsAppRef).toBe(w.webkit.messageHandlers.appRef)
  })

  it('canShowSettings true when android appRef has DISPLAY_SETTING', () => {
    w.appRef = { [DISPLAY_SETTING]: () => {} }
    expect(svc.canShowSettings).toBe(true)
  })

  it('sendDataAppToClient calls android appRef handler with stringified data', () => {
    const handler = jest.fn()
    w.appRef = { [GO_OFFLINE]: handler }
    svc.goOffline()
    expect(handler).toHaveBeenCalledWith(JSON.stringify({}))
  })

  it('sendDataAppToClient calls DISPLAY_SETTING handler with no args', () => {
    const handler = jest.fn()
    w.appRef = { [DISPLAY_SETTING]: handler }
    svc.viewSettings()
    expect(handler).toHaveBeenCalledWith()
  })

  it('sendDataAppToClient posts to iOS handler when no android appRef', () => {
    const postMessage = jest.fn()
    w.webkit = { messageHandlers: { appRef: { postMessage } } }
    svc.goOffline()
    expect(postMessage).toHaveBeenCalledWith(JSON.stringify({ eventName: GO_OFFLINE, data: {} }))
  })

  it('isFunctionAvailableInAndroid checks the appRef map', () => {
    expect(svc.isFunctionAvailableInAndroid('foo')).toBe(false)
    w.appRef = { foo: () => {} }
    expect(svc.isFunctionAvailableInAndroid('foo')).toBe(true)
  })

  it('simulateMobile sets appRef and webkit stubs', () => {
    svc.simulateMobile()
    expect(w.appRef).toBeDefined()
    expect(w.webkit).toBeDefined()
  })
})
