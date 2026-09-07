import { ConfigurationsService } from './configurations.service'

describe('ConfigurationsService', () => {
  let svc: ConfigurationsService

  beforeEach(() => {
    svc = new ConfigurationsService()
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('exposes sane defaults', () => {
    expect(svc.appSetup).toBe(true)
    expect(svc.userUrl).toBe('')
    expect(svc.baseUrl).toBe('assets/configurations')
    expect(svc.sitePath).toBe('assets/configurations')
    expect(svc.isProduction).toBe(false)
    expect(svc.isAuthenticated).toBe(false)
    expect(svc.isDarkMode).toBe(false)
    expect(svc.isRTL).toBe(false)
    expect(svc.userRoles).toBeNull()
    expect(svc.instanceConfig).toBeNull()
    expect(svc.profileSettings).toEqual(['profilePicture', 'learningTime', 'learningPoints'])
  })

  it('exposes the reactive notifiers and pinnedApps subject', done => {
    expect(svc.pinnedApps).toBeDefined()
    svc.pinnedApps.subscribe(set => {
      expect(set instanceof Set).toBe(true)
      done()
    })
  })

  it('prefChangeNotifier emits the latest preference (ReplaySubject)', done => {
    svc.prefChangeNotifier.next({ selectedLocale: 'en' } as any)
    svc.prefChangeNotifier.subscribe(pref => {
      expect(pref).toEqual({ selectedLocale: 'en' })
      done()
    })
  })

  it('primaryNavBar / pageNavBar default to primary color', () => {
    expect(svc.primaryNavBar.color).toBe('primary')
    expect(svc.pageNavBar.color).toBe('primary')
  })
})
