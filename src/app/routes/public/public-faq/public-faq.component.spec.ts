import { BehaviorSubject } from 'rxjs'
import { PublicFaqComponent } from './public-faq.component'

describe('PublicFaqComponent', () => {
  let component: PublicFaqComponent
  let route: any
  let valueSvc: any
  let configSvc: any
  let isLtMedium$: BehaviorSubject<boolean>
  let paramMap$: BehaviorSubject<any>

  const paramMap = (tab: string | null) => ({ get: (_: string) => tab })

  const build = () => new PublicFaqComponent(route, valueSvc, configSvc)

  beforeEach(() => {
    isLtMedium$ = new BehaviorSubject<boolean>(false)
    paramMap$ = new BehaviorSubject<any>(paramMap(null))
    route = { paramMap: paramMap$ }
    valueSvc = { isLtMedium$ }
    configSvc = {
      pageNavBar: { title: 'FAQ' },
      restrictedFeatures: new Set<string>(),
    }
    component = build()
  })

  it('should be created with default field values', () => {
    expect(component).toBeTruthy()
    expect(component.sideNavBarOpened).toBe(true)
    expect(component.isFaqFeature).toBe(true)
    expect(component.errorMessageCode).toBe('NONE')
    expect(component.tabs).toContain('login')
    expect(component.pageNavbar).toEqual({ title: 'FAQ' })
  })

  describe('ngOnInit', () => {
    it('keeps the FAQ feature enabled when not restricted', () => {
      component.ngOnInit()
      expect(component.isFaqFeature).toBe(true)
    })

    it('disables the FAQ feature when it is restricted', () => {
      configSvc.restrictedFeatures = new Set(['faq'])
      const c = build()
      c.ngOnInit()
      expect(c.isFaqFeature).toBe(false)
    })

    it('leaves the feature flag untouched when there are no restricted features', () => {
      configSvc.restrictedFeatures = undefined
      const c = build()
      c.ngOnInit()
      expect(c.isFaqFeature).toBe(true)
    })

    it('updates side nav state from the isLtMedium stream', () => {
      component.ngOnInit()
      isLtMedium$.next(true)
      expect(component.sideNavBarOpened).toBe(false)
      expect(component.screenSizeIsLtMedium).toBe(true)
      isLtMedium$.next(false)
      expect(component.sideNavBarOpened).toBe(true)
      expect(component.screenSizeIsLtMedium).toBe(false)
    })

    it('sets the current tab from a valid route param', () => {
      paramMap$.next(paramMap('authoring'))
      component.ngOnInit()
      expect(component.currentTab).toBe('authoring')
    })

    it('falls back to login for an unknown tab param', () => {
      paramMap$.next(paramMap('unknown-tab'))
      component.ngOnInit()
      expect(component.currentTab).toBe('login')
    })

    it('leaves the current tab empty when there is no tab param', () => {
      paramMap$.next(paramMap(null))
      component.ngOnInit()
      expect(component.currentTab).toBe('')
    })
  })

  describe('sideNavOnClick', () => {
    it('toggles the side nav when the screen is less than medium', () => {
      component.screenSizeIsLtMedium = true
      component.sideNavBarOpened = true
      component.sideNavOnClick()
      expect(component.sideNavBarOpened).toBe(false)
    })

    it('does nothing on larger screens', () => {
      component.screenSizeIsLtMedium = false
      component.sideNavBarOpened = true
      component.sideNavOnClick()
      expect(component.sideNavBarOpened).toBe(true)
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes from the side nav stream without error', () => {
      component.ngOnInit()
      expect(() => component.ngOnDestroy()).not.toThrow()
    })

    it('is safe when nothing was subscribed', () => {
      const c = build()
      expect(() => c.ngOnDestroy()).not.toThrow()
    })
  })
})
