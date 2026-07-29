import { BehaviorSubject } from 'rxjs'
import { BtnProfileComponent } from './btn-profile.component'

describe('BtnProfileComponent', () => {
  let component: BtnProfileComponent
  let configSvc: any
  let dialog: any
  let pinnedApps$: BehaviorSubject<Set<string>>

  const build = () => new BtnProfileComponent(configSvc, dialog)

  beforeEach(() => {
    localStorage.clear()
    pinnedApps$ = new BehaviorSubject<Set<string>>(new Set())
    configSvc = {
      userProfile: undefined,
      userProfileV2: undefined,
      appsConfig: { features: {} },
      pinnedApps: pinnedApps$,
    }
    dialog = { open: jest.fn() }

    component = build()
  })

  it('should create with defaults', () => {
    expect(component).toBeTruthy()
    expect(component.id).toBe('Profile_link')
    expect(component.class).toBe('profile-link')
    expect(component.givenName).toBe('Guest')
    expect(component.btnAppsConfig).toEqual(component['basicBtnAppsConfig'])
    expect(component.btnSettingsConfig).toEqual(component['settingBtnConfig'])
  })

  describe('constructor profile resolution', () => {
    it('reads the given name from the user profile', () => {
      configSvc.userProfile = { userId: 'u1', givenName: 'Ada' }
      const c = build()
      expect(c.givenName).toBe('Ada')
    })

    it('prefers the primary profile image', () => {
      configSvc.userProfile = { userId: 'u1', givenName: 'Ada', profileImage: 'p1.png' }
      const c = build()
      expect(c.profileImage).toBe('p1.png')
    })

    it('falls back to the v2 profile image', () => {
      configSvc.userProfile = { userId: 'u1', givenName: 'Ada' }
      configSvc.userProfileV2 = { profileImage: 'v2.png' }
      const c = build()
      expect(c.profileImage).toBe('v2.png')
    })

    it('falls back to a locally stored image keyed by user id', () => {
      localStorage.setItem('u1', 'local.png')
      configSvc.userProfile = { userId: 'u1', givenName: 'Ada' }
      const c = build()
      expect(c.profileImage).toBe('local.png')
    })

    it('defaults given name to empty when missing', () => {
      configSvc.userProfile = { userId: 'u1' }
      const c = build()
      expect(c.givenName).toBe('')
    })
  })

  describe('ngOnInit', () => {
    it('sets pinned apps and keeps the default host id', () => {
      component.widgetData = {}
      component.ngOnInit()
      expect(component.id).toBe('Profile_link')
    })

    it('overrides the host id from widget data', () => {
      component.widgetData = { actionBtnId: 'custom-id' }
      component.ngOnInit()
      expect(component.id).toBe('custom-id')
    })
  })

  describe('setPinnedApps', () => {
    it('does nothing when there is no apps config', () => {
      configSvc.appsConfig = null
      const c = build()

      c.setPinnedApps()
      pinnedApps$.next(new Set(['search']))

      expect(c.pinnedApps).toEqual([])
    })

    it('maps only pinned ids that exist in the apps config features', () => {
      configSvc.appsConfig = {
        features: {
          search: { id: 'search', name: 'Search' },
        },
      }
      const c = build()

      c.setPinnedApps()
      pinnedApps$.next(new Set(['search', 'unknown']))

      expect(c.pinnedApps.length).toBe(1)
      expect(c.pinnedApps[0].widgetData.actionBtn).toEqual({ id: 'search', name: 'Search' })
      expect(c.pinnedApps[0].widgetData.config).toEqual({
        type: 'feature-item',
        useShortName: true,
      })
    })
  })

  describe('logout', () => {
    it('opens the logout dialog', () => {
      component.logout()
      expect(dialog.open).toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes from the pinned apps stream', () => {
      component.ngOnInit()
      expect(() => component.ngOnDestroy()).not.toThrow()
    })

    it('is safe when nothing was subscribed', () => {
      const c = build()
      expect(() => c.ngOnDestroy()).not.toThrow()
    })
  })
})
