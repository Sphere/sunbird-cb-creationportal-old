import { Subject } from 'rxjs'
import { SettingsComponent } from './settings.component'

describe('SettingsComponent', () => {
  let component: SettingsComponent
  let router: any
  let configSvc: any
  let btnSettingsSvc: any
  let userPrefSvc: any
  let snackBar: any
  let route: any
  let utilitySvc: any
  let prefChangeNotifier: Subject<any>

  const params = (map: Record<string, string> = {}) => ({
    get: (k: string) => (Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null),
  })

  const instanceConfig = (over: any = {}) => ({
    themes: [{ themeClass: 'theme-orange' }],
    fontSizes: [
      { fontClass: 'lg', scale: 3 },
      { fontClass: 'sm', scale: 1 },
    ],
    locals: [
      { path: 'en', isAvailable: true, isEnabled: true },
      { path: 'hi', isAvailable: true, isEnabled: false },
    ],
    ...over,
  })

  const build = (tab?: string) => {
    route = { snapshot: { queryParamMap: params(tab ? { tab } : {}) } }
    const c = new SettingsComponent(router, configSvc, btnSettingsSvc, userPrefSvc, snackBar, route, utilitySvc)
    c.successToast = { nativeElement: { value: 'Saved' } } as any
    c.maxContentLangToast = { nativeElement: { value: 'Too many languages' } } as any
    return c
  }

  beforeEach(() => {
    prefChangeNotifier = new Subject<any>()
    router = { url: '/app/settings', navigate: jest.fn(), navigateByUrl: jest.fn() }
    configSvc = {
      restrictedFeatures: new Set<string>(),
      instanceConfig: instanceConfig(),
      userPreference: { selectedLangGroup: 'en,hi' },
      activeLocale: { path: 'en' },
      activeThemeObject: { themeClass: 'theme-orange' },
      activeFontObject: { fontClass: 'lg' },
      isDarkMode: false,
      isIntranetAllowed: true,
      userUrl: '',
      prefChangeNotifier,
    }
    btnSettingsSvc = {
      applyThemeMode: jest.fn(),
      intranetContentMode: jest.fn(),
      changeFont: jest.fn(),
      changeTheme: jest.fn(),
    }
    userPrefSvc = { saveUserPreference: jest.fn().mockResolvedValue(undefined) }
    snackBar = { open: jest.fn() }
    utilitySvc = { isMobile: false }

    component = build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('opens the general tab by default', () => {
      component.ngOnInit()
      expect(component.selectedIndex).toBe(0)
    })

    it('opens the notifications tab from the route', () => {
      const c = build('notifications')
      c.ngOnInit()
      expect(c.selectedIndex).toBe(1)
    })

    it('hides the intranet settings on desktop', () => {
      component.ngOnInit()
      expect(component.showIntranetSettings).toBe(false)
    })

    it('shows the intranet settings on mobile when the feature is allowed', () => {
      utilitySvc.isMobile = true
      const c = build()
      c.ngOnInit()
      expect(c.showIntranetSettings).toBe(true)
    })

    it('hides the intranet settings when the feature is restricted', () => {
      utilitySvc.isMobile = true
      configSvc.restrictedFeatures = new Set(['showIntranetMobile'])
      const c = build()
      c.ngOnInit()
      expect(c.showIntranetSettings).toBe(false)
    })

    it('tolerates a missing feature set', () => {
      configSvc.restrictedFeatures = null
      const c = build()
      expect(() => c.ngOnInit()).not.toThrow()
    })
  })

  describe('initSettings', () => {
    it('seeds the themes, fonts and language options', () => {
      component.ngOnInit()
      expect(component.themes).toEqual(instanceConfig().themes)
      expect(component.fonts.map(f => f.fontClass)).toEqual(['sm', 'lg'])
      expect(component.isLanguageEnabled).toBe(true)
      expect(component.allowedLangCode.en).toBeDefined()
      expect(component.allowedLangCode.hi).toBeDefined()
    })

    it('seeds the content languages from the saved preference', () => {
      component.ngOnInit()
      expect(component.contentLanguage).toEqual(['en', 'hi'])
      expect(component.contentLangForm.value).toEqual(['en', 'hi'])
    })

    it('tolerates a preference with no language group', () => {
      configSvc.userPreference = {}
      const c = build()
      c.ngOnInit()
      expect(c.contentLanguage).toEqual([''])
    })

    it('adopts the active locale as the app language', () => {
      component.ngOnInit()
      expect(component.appLanguage).toBe('en')
      expect(component.chosenLanguage).toBe('en')
    })

    it('falls back to English when no locale is active', () => {
      configSvc.activeLocale = null
      const c = build()
      c.ngOnInit()
      expect(c.appLanguage).toBe('en')
    })

    it('disables the language picker for a single-locale instance', () => {
      configSvc.instanceConfig = instanceConfig({ locals: [{ path: 'en', isAvailable: true, isEnabled: true }] })
      const c = build()
      c.ngOnInit()
      expect(c.isLanguageEnabled).toBe(false)
    })

    it('marks intranet content unavailable on mobile', () => {
      utilitySvc.isMobile = true
      const c = build()
      c.ngOnInit()
      expect(c.isIntranetAllowed).toBe(false)
    })

    it('reflects the active theme and font', () => {
      component.ngOnInit()
      expect(component.activeThemeKey).toBe('theme-orange')
      expect(component.activeFontClass).toBe('lg')
    })

    it('tolerates missing active theme and font objects', () => {
      configSvc.activeThemeObject = null
      configSvc.activeFontObject = null
      const c = build()
      c.ngOnInit()
      expect(c.activeThemeKey).toBe('')
      expect(c.activeFontClass).toBe('')
    })

    it('does nothing without an instance config', () => {
      configSvc.instanceConfig = null
      const c = build()
      c.ngOnInit()
      expect(c.themes).toEqual([])
      expect(c.modeChangeSubs).toBeNull()
    })

    it('refreshes the active status when preferences change', () => {
      jest.useFakeTimers()
      component.ngOnInit()
      configSvc.activeThemeObject = { themeClass: 'theme-igot' }
      prefChangeNotifier.next(true)
      jest.advanceTimersByTime(200)
      expect(component.activeThemeKey).toBe('theme-igot')
      jest.useRealTimers()
    })

    it('applies the dark mode toggle', () => {
      jest.useFakeTimers()
      component.ngOnInit()
      component.darkModeForm.setValue(true)
      jest.advanceTimersByTime(200)
      expect(btnSettingsSvc.applyThemeMode).toHaveBeenCalledWith(true)
      jest.useRealTimers()
    })

    it('applies the intranet content toggle', () => {
      jest.useFakeTimers()
      component.ngOnInit()
      component.intranetContentForm.setValue(false)
      jest.advanceTimersByTime(200)
      expect(btnSettingsSvc.intranetContentMode).toHaveBeenCalledWith(false)
      jest.useRealTimers()
    })
  })

  describe('ngOnDestroy', () => {
    it('releases both subscriptions', () => {
      component.ngOnInit()
      component.ngOnDestroy()
      expect(component.modeChangeSubs!.closed).toBe(true)
      expect(component.prefChangeSubs!.closed).toBe(true)
    })

    it('is safe before ngOnInit', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })

  describe('locale helpers', () => {
    beforeEach(() => component.ngOnInit())

    it('isLocaleAvailable reflects the instance config', () => {
      expect(component.isLocaleAvailable('en')).toBe(true)
      expect(component.isLocaleAvailable('ta')).toBeFalsy()
    })

    it('isLocaleEnabled reflects the instance config', () => {
      expect(component.isLocaleEnabled('en')).toBe(true)
      expect(component.isLocaleEnabled('hi')).toBe(false)
      expect(component.isLocaleEnabled('ta')).toBeFalsy()
    })

    it('isPrimary matches the chosen language', () => {
      expect(component.isPrimary('en')).toBe(true)
      expect(component.isPrimary('hi')).toBe(false)
    })

    it('localeHrefPath returns the path only for a usable locale', () => {
      expect(component.localeHrefPath('en')).toBe('en')
      expect(component.localeHrefPath('hi')).toBeNull()
      expect(component.localeHrefPath('ta')).toBeNull()
    })

    it('localeIcon marks the active locale', () => {
      expect(component.localeIcon('en')).toBe('radio_button_checked')
    })

    it('localeIcon marks an enabled but inactive locale', () => {
      configSvc.activeLocale = { path: 'hi' }
      expect(component.localeIcon('en')).toBe('radio_button_unchecked')
    })

    it('localeIcon marks a disabled locale as unavailable', () => {
      expect(component.localeIcon('hi')).toBe('not_interested')
      expect(component.localeIcon('ta')).toBe('not_interested')
    })

    it('localeIcon is unavailable with no active locale', () => {
      configSvc.activeLocale = null
      expect(component.localeIcon('en')).toBe('not_interested')
    })
  })

  describe('theme and font', () => {
    it('changeFont delegates to the settings service', () => {
      component.changeFont('lg')
      expect(btnSettingsSvc.changeFont).toHaveBeenCalledWith('lg')
    })

    it('changeTheme delegates to the settings service', () => {
      component.changeTheme('theme-igot')
      expect(btnSettingsSvc.changeTheme).toHaveBeenCalledWith('theme-igot')
    })
  })

  describe('contentLangChanged', () => {
    it('accepts up to three content languages', () => {
      component.contentLangForm.setValue(['en', 'hi', 'ta'])
      component.contentLangChanged()
      expect(component.contentLanguage).toEqual(['en', 'hi', 'ta'])
      expect(snackBar.open).not.toHaveBeenCalled()
    })

    it('refuses a fourth language and restores the previous selection', () => {
      component.contentLanguage = ['en']
      component.contentLangForm.setValue(['en', 'hi', 'ta', 'kn'])
      component.contentLangChanged()
      expect(snackBar.open).toHaveBeenCalledWith('Too many languages', 'X')
      expect(component.contentLangForm.value).toEqual(['en'])
    })
  })

  it('langChanged records and emits the chosen language', () => {
    const emitted: string[] = []
    component.langChangedEvent.subscribe(v => emitted.push(v))
    component.langChanged({ value: 'hi' } as any)
    expect(component.chosenLanguage).toBe('hi')
    expect(emitted).toEqual(['hi'])
  })

  describe('applyChanges', () => {
    let assign: jest.Mock
    let originalLocation: Location

    beforeEach(() => {
      component.ngOnInit()
      assign = jest.fn()
      originalLocation = window.location
      delete (window as any).location
      ;(window as any).location = { ...originalLocation, origin: 'http://host', assign }
    })

    afterEach(() => {
      ;(window as any).location = originalLocation
    })

    it('saves the chosen locale and content languages', async () => {
      await component.applyChanges()
      expect(userPrefSvc.saveUserPreference).toHaveBeenCalledWith({
        selectedLocale: 'en',
        selectedLangGroup: 'en,hi',
      })
      expect(snackBar.open).toHaveBeenCalledWith('Saved', 'X')
    })

    it('reloads under the new locale path when the app language changes', async () => {
      component.chosenLanguage = 'hi'
      await component.applyChanges()
      expect(assign).toHaveBeenCalledWith('http://host/hi/app/settings')
    })

    it('drops the locale segment when switching back to English', async () => {
      component.appLanguage = 'hi'
      component.chosenLanguage = 'en'
      await component.applyChanges()
      expect(assign).toHaveBeenCalledWith('http://host//app/settings')
    })

    it('lands on the author home when changing language during setup', async () => {
      component.mode = 'setup'
      component.chosenLanguage = 'hi'
      await component.applyChanges()
      expect(assign).toHaveBeenCalledWith('http://host/hi/author')
    })

    it('returns to the saved URL after setup with no language change', async () => {
      component.mode = 'setup'
      configSvc.userUrl = '/author/my-content'
      await component.applyChanges()
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/my-content')
    })

    it('returns to the home page after setup with no saved URL', async () => {
      component.mode = 'setup'
      await component.applyChanges()
      expect(router.navigate).toHaveBeenCalledWith(['page', 'home'])
    })

    it('stays put in settings mode with no language change', async () => {
      await component.applyChanges()
      expect(assign).not.toHaveBeenCalled()
      expect(router.navigate).not.toHaveBeenCalled()
    })
  })

  describe('updateCurrentTabIndex', () => {
    it('records the general tab', () => {
      component.updateCurrentTabIndex({ index: 0 } as any)
      expect(component.selectedIndex).toBe(0)
      expect(router.navigate).toHaveBeenCalledWith([], { queryParams: { tab: 'general' } })
    })

    it('records the notifications tab', () => {
      component.updateCurrentTabIndex({ index: 1 } as any)
      expect(component.selectedIndex).toBe(1)
      expect(router.navigate).toHaveBeenCalledWith([], { queryParams: { tab: 'notifications' } })
    })
  })
})
