import { BehaviorSubject } from 'rxjs'
import { ProfileComponent } from './profile.component'

describe('ProfileComponent', () => {
  let component: ProfileComponent
  let dialog: any
  let valueSvc: any
  let configSvc: any
  let activatedRoute: any
  let router: any
  let isLtMedium$: BehaviorSubject<boolean>

  const enabledTabs = {
    dashboard: { displayName: 'Dashboard' },
    learning: { displayName: 'Learning' },
    achievements: { displayName: 'Competency' },
    interests: { displayName: 'Interest' },
    settings: { displayName: 'Settings' },
  }

  const build = () => new ProfileComponent(dialog, valueSvc, configSvc, activatedRoute, router)

  beforeEach(() => {
    isLtMedium$ = new BehaviorSubject<boolean>(false)
    dialog = { open: jest.fn() }
    valueSvc = { isLtMedium$ }
    configSvc = { pageNavBar: { title: 'Profile' } }
    activatedRoute = {
      snapshot: { data: { pageData: { data: { enabledTabs } } } },
    }
    router = { url: '/app/profile/dashboard' }
    component = build()
  })

  it('should be created with the enabled tabs and page navbar', () => {
    expect(component).toBeTruthy()
    expect(component.enabledTabs).toBe(enabledTabs)
    expect(component.pageNavbar).toEqual({ title: 'Profile' })
    expect(component.showText).toBe(true)
  })

  describe('ngOnInit tab resolution', () => {
    const cases: Array<[string, string]> = [
      ['dashboard', 'Dashboard'],
      ['learning', 'Learning'],
      ['competency', 'Competency'],
      ['interest', 'Interest'],
      ['settings', 'Settings'],
    ]

    cases.forEach(([segment, displayName]) => {
      it(`sets the tab name for the ${segment} route`, () => {
        router.url = `/app/profile/${segment}`
        const c = build()
        c.ngOnInit()
        expect(c.tabName).toBe(displayName)
      })
    })

    it('leaves the tab name empty for an unknown segment', () => {
      router.url = '/app/profile/unknown'
      const c = build()
      c.ngOnInit()
      expect(c.tabName).toBe('')
    })

    it('subscribes to the isLtMedium stream and updates the flag', () => {
      component.ngOnInit()
      isLtMedium$.next(true)
      expect(component.screenSizeIsLtMedium).toBe(true)
      isLtMedium$.next(false)
      expect(component.screenSizeIsLtMedium).toBe(false)
    })
  })

  describe('tabUpdate', () => {
    it('updates the tab name and toggles showText on larger screens', () => {
      component.screenSizeIsLtMedium = false
      component.showText = true
      component.tabUpdate('Learning')
      expect(component.tabName).toBe('Learning')
      expect(component.showText).toBe(false)
    })

    it('updates the tab name but keeps showText on smaller screens', () => {
      component.screenSizeIsLtMedium = true
      component.showText = true
      component.tabUpdate('Learning')
      expect(component.tabName).toBe('Learning')
      expect(component.showText).toBe(true)
    })
  })

  describe('logout', () => {
    it('opens the logout dialog', () => {
      component.logout()
      expect(dialog.open).toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes without error after init', () => {
      component.ngOnInit()
      expect(() => component.ngOnDestroy()).not.toThrow()
    })

    it('is safe when nothing was subscribed', () => {
      const c = build()
      expect(() => c.ngOnDestroy()).not.toThrow()
    })
  })
})
