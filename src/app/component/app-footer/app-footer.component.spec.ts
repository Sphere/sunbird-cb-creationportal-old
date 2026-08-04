import { of } from 'rxjs'

import { AppFooterComponent } from './app-footer.component'

describe('AppFooterComponent', () => {
  let configSvc: any
  let valueSvc: any
  let domSanitizer: any

  const build = () => new AppFooterComponent(configSvc, valueSvc, domSanitizer)

  beforeEach(() => {
    configSvc = { restrictedFeatures: new Set<string>(), instanceConfig: undefined }
    valueSvc = { isXSmall$: of(false), isLtMedium$: of(false) }
    domSanitizer = { bypassSecurityTrustResourceUrl: jest.fn((url: string) => `safe:${url}`) }
  })

  it('shows the terms-of-use link by default and stamps the current year', () => {
    const comp = build()
    expect(comp.termsOfUser).toBe(true)
    expect(comp.currentYear).toBe(new Date().getFullYear())
    expect(comp.appIcon).toBeNull()
  })

  it('hides the terms-of-use link when that feature is restricted', () => {
    configSvc.restrictedFeatures = new Set(['termsOfUser'])
    expect(build().termsOfUser).toBe(false)
  })

  it('keeps the terms-of-use link when other features are restricted', () => {
    configSvc.restrictedFeatures = new Set(['share'])
    expect(build().termsOfUser).toBe(true)
  })

  it('keeps the terms-of-use link when there is no restricted-feature set', () => {
    configSvc.restrictedFeatures = undefined
    expect(build().termsOfUser).toBe(true)
  })

  it('tracks the extra-small breakpoint', () => {
    valueSvc.isXSmall$ = of(true)
    expect(build().isXSmall).toBe(true)
  })

  it('tracks the less-than-medium breakpoint', () => {
    valueSvc.isLtMedium$ = of(true)
    expect(build().isMedium).toBe(true)
  })

  it('sanitises the app logo when an instance config is present', () => {
    configSvc.instanceConfig = { logos: { app: 'https://cdn/logo.png' } }
    const comp = build()
    expect(domSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('https://cdn/logo.png')
    expect(comp.appIcon).toBe('safe:https://cdn/logo.png')
  })
})
