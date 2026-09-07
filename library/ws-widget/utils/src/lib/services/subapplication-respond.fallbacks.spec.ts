import { of, Subject } from 'rxjs'

import { SubapplicationRespondService } from './subapplication-respond.service'

/**
 * Wave 18 — the fallback branches of the sub-application handshake: a profile with
 * no name, no theme or font preference, no locale and no roles, in both the resume
 * and the plain LOADED paths.
 */
describe('SubapplicationRespondService (context fallbacks)', () => {
  let service: SubapplicationRespondService
  let configSvc: any
  let contentSvc: any
  let keyCloakSvc: any
  let activatedRoute: any
  let router: any
  let eventSvc: any
  let teleSvc: any
  let prefNotifier: Subject<any>
  let contentWindow: any

  const build = (configOver: any = {}) => {
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
      ...configOver,
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
    contentWindow = { postMessage: jest.fn() }
    return new SubapplicationRespondService(configSvc, contentSvc, keyCloakSvc, activatedRoute, router, eventSvc, teleSvc)
  }

  /** The parent context of the last handshake sent to the sub-application. */
  const sentContext = () => contentWindow.postMessage.mock.calls.at(-1)[0].parentContext

  describe('loadedRespond (plain)', () => {
    it('splits the user name into first and last', () => {
      service = build()
      service.loadedRespond(contentWindow, 'RBCP')
      expect(sentContext().user).toEqual(expect.objectContaining({ firstName: 'John', lastName: 'Doe', token: 'tok-123' }))
    })

    it('sends blank names for a profile with no user name', () => {
      service = build({ userProfile: { userId: 'u1' } })
      service.loadedRespond(contentWindow, 'RBCP')
      expect(sentContext().user).toEqual(expect.objectContaining({ firstName: '', lastName: '' }))
    })

    it('sends a blank user id for a profile that has none', () => {
      service = build({ userProfile: { userName: 'John Doe' } })
      service.loadedRespond(contentWindow, 'RBCP')
      expect(sentContext().user.userId).toBe('')
    })

    it('sends an empty theme when none is active', () => {
      service = build({ activeThemeObject: null })
      service.loadedRespond(contentWindow, 'RBCP')
      expect(sentContext().theme).toBe('')
    })

    it('sends the default font size when none is chosen', () => {
      service = build({ activeFontObject: null })
      service.loadedRespond(contentWindow, 'RBCP')
      expect(sentContext().fontSize).toBe('14px')
    })

    it('falls back to English when no locale is stored', () => {
      service = build({ userPreference: null })
      service.loadedRespond(contentWindow, 'RBCP')
      expect(sentContext().locale).toBe('en')
    })

    it('sends an empty role list for a user with no roles', () => {
      service = build({ userRoles: null })
      service.loadedRespond(contentWindow, 'RBCP')
      expect(sentContext().user.roles).toEqual([])
    })

    it('sends a blank start mode outside a view-mode route', () => {
      service = build()
      service.loadedRespond(contentWindow, 'RBCP')
      expect(sentContext().subApplicationStartMode).toBe('')
    })

    it('sends nothing at all with no user profile', () => {
      service = build({ userProfile: null })
      service.loadedRespond(contentWindow, 'RBCP')
      expect(contentWindow.postMessage).not.toHaveBeenCalled()
      expect(service.loaded).toBe(false)
    })

    it('remembers the target origin it was given', () => {
      service = build()
      service.loadedRespond(contentWindow, 'RBCP', undefined, 'https://sub.app')
      expect(contentWindow.postMessage).toHaveBeenCalledWith(expect.anything(), 'https://sub.app')
    })
  })

  describe('loadedRespond (resume)', () => {
    const resuming = (configOver: any = {}) => {
      service = build(configOver)
      activatedRoute.snapshot.queryParams = { viewMode: 'RESUME' }
      return service
    }

    it('sends the stored progress back to the sub-application', () => {
      resuming().loadedRespond(contentWindow, 'RBCP', 'do_1')
      expect(contentSvc.fetchContentHistory).toHaveBeenCalledWith('do_1')
      expect(contentWindow.postMessage.mock.calls[0][0].data).toEqual({ continueLearning: { foo: 1 } })
      expect(sentContext().subApplicationStartMode).toBe('RESUME')
      expect(service.loaded).toBe(true)
    })

    it('sends no progress when the history carries none', () => {
      const svc = resuming()
      contentSvc.fetchContentHistory.mockReturnValue(of({ continueData: {} }))
      svc.loadedRespond(contentWindow, 'RBCP', 'do_1')
      expect(contentWindow.postMessage.mock.calls[0][0].data).toBeNull()
    })

    it('sends blank names for a profile with no user name', () => {
      resuming({ userProfile: { userId: 'u1' } }).loadedRespond(contentWindow, 'RBCP', 'do_1')
      expect(sentContext().user).toEqual(expect.objectContaining({ firstName: '', lastName: '' }))
    })

    it('sends an empty theme when none is active', () => {
      resuming({ activeThemeObject: null }).loadedRespond(contentWindow, 'RBCP', 'do_1')
      expect(sentContext().theme).toBe('')
    })

    it('sends the default font size when none is chosen', () => {
      resuming({ activeFontObject: null }).loadedRespond(contentWindow, 'RBCP', 'do_1')
      expect(sentContext().fontSize).toBe('14px')
    })

    it('sends an empty role list for a user with no roles', () => {
      resuming({ userRoles: null }).loadedRespond(contentWindow, 'RBCP', 'do_1')
      expect(sentContext().user.roles).toEqual([])
    })

    it('sends nothing at all with no user profile', () => {
      resuming({ userProfile: null }).loadedRespond(contentWindow, 'RBCP', 'do_1')
      expect(contentWindow.postMessage).not.toHaveBeenCalled()
    })

    it('takes the plain path when no content id was given', () => {
      resuming().loadedRespond(contentWindow, 'RBCP')
      expect(contentSvc.fetchContentHistory).not.toHaveBeenCalled()
      expect(contentWindow.postMessage).toHaveBeenCalled()
    })
  })

  describe('unsubscribeResponse', () => {
    it('forgets everything about the mounted sub-application', () => {
      service = build()
      service.loadedRespond(contentWindow, 'RBCP')
      service.unsubscribeResponse()
      expect(service.loaded).toBe(false)
      expect(service.subAppname).toBe('')
      expect(service.contentWindowinfo).toBeNull()
      expect(service.continueLearningData).toBeNull()
    })
  })

  describe('changeContextrespond', () => {
    it('pushes a fresh context once a sub-application is mounted', () => {
      service = build()
      service.loadedRespond(contentWindow, 'RBCP')
      contentWindow.postMessage.mockClear()
      prefNotifier.next(null)
      expect(contentWindow.postMessage).toHaveBeenCalled()
      expect(contentWindow.postMessage.mock.calls[0][0].requestId).toBe('CONTEXT_CHANGE')
    })

    it('stays quiet while nothing is mounted', () => {
      service = build()
      prefNotifier.next(null)
      expect(contentWindow.postMessage).not.toHaveBeenCalled()
    })
  })
})
