import { AppPublicNavBarComponent } from './app-public-nav-bar.component'

describe('AppPublicNavBarComponent', () => {
  let domSanitizer: any
  let configSvc: any

  const build = () => new AppPublicNavBarComponent(domSanitizer, configSvc)

  beforeEach(() => {
    domSanitizer = { bypassSecurityTrustResourceUrl: jest.fn((url: string) => `safe:${url}`) }
    configSvc = { instanceConfig: undefined, primaryNavBar: undefined }
  })

  it('starts empty', () => {
    const comp = build()
    expect(comp.appIcon).toBeNull()
    expect(comp.logo).toBe('')
    expect(comp.appName).toBe('')
    expect(comp.navBar).toBeNull()
  })

  it('always shows the public navbar', () => {
    expect(build().showPublicNavbar).toBe(true)
  })

  it('populates the logo, app name and nav bar from the instance config', () => {
    configSvc.instanceConfig = {
      logos: { appTransparent: 'https://cdn/transparent.png' },
      details: { appName: 'Creation Portal' },
    }
    configSvc.primaryNavBar = { background: 'primary' }

    const comp = build()
    comp.ngOnInit()

    // No sanitizer bypass: the value is bound to <img [src]>, which Angular
    // already sanitises as SecurityContext.URL (http/https/relative allowed).
    expect(domSanitizer.bypassSecurityTrustResourceUrl).not.toHaveBeenCalled()
    expect(comp.appIcon).toBe('https://cdn/transparent.png')
    expect(comp.appName).toBe('Creation Portal')
    expect(comp.navBar).toEqual({ background: 'primary' })
  })

  it('leaves everything untouched when there is no instance config', () => {
    const comp = build()
    comp.ngOnInit()
    expect(comp.appIcon).toBeNull()
    expect(comp.appName).toBe('')
    expect(comp.navBar).toBeNull()
    expect(domSanitizer.bypassSecurityTrustResourceUrl).not.toHaveBeenCalled()
  })
})
