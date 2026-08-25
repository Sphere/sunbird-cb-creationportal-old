import { of } from 'rxjs'
import { AuthNavigationComponent } from './auth-navigation.component'

describe('AuthNavigationComponent', () => {
  let domSanitizer: any
  let configSvc: any
  let authNavBarSvc: any

  const build = () => new AuthNavigationComponent(domSanitizer, configSvc, authNavBarSvc)

  beforeEach(() => {
    domSanitizer = {
      bypassSecurityTrustResourceUrl: jest.fn((url: string) => `safe:${url}`),
    }
    configSvc = {
      instanceConfig: null,
      primaryNavBar: { background: 'primary' },
      pageNavBar: { background: 'page' },
    }
    authNavBarSvc = {
      toggleNavBar: of(true),
    }
  })

  it('is created with default state', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.canShow).toBe(true)
    expect(c.search).toBe(false)
    expect(c.appIcon).toBeNull()
    expect(c.backData).toEqual({ url: 'back' })
  })

  describe('ngOnInit', () => {
    it('updates canShow from the toggle service', () => {
      authNavBarSvc.toggleNavBar = of(false)
      const c = build()
      c.ngOnInit()
      expect(c.canShow).toBe(false)
    })

    it('sets the app icon and navbars when instance config is present', () => {
      configSvc.instanceConfig = { logos: { app: 'logo.png' } }
      const c = build()
      c.ngOnInit()
      expect(domSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('logo.png')
      expect(c.appIcon).toBe('safe:logo.png')
      expect(c.primaryNavbar).toEqual({ background: 'primary' })
      expect(c.pageNavbar).toEqual({ background: 'page' })
    })

    it('leaves the app icon null when there is no instance config', () => {
      configSvc.instanceConfig = null
      const c = build()
      c.ngOnInit()
      expect(c.appIcon).toBeNull()
      expect(domSanitizer.bypassSecurityTrustResourceUrl).not.toHaveBeenCalled()
    })
  })

  describe('back', () => {
    it('navigates back in browser history', () => {
      const c = build()
      const backSpy = jest.spyOn(window.history, 'back').mockImplementation(() => undefined)
      c.back()
      expect(backSpy).toHaveBeenCalled()
      backSpy.mockRestore()
    })
  })
})
