import { BtnSettingsService } from './btn-settings.service'

/**
 * Covers the fallback-resolution and theme-injection branches the base
 * btn-settings.service.spec.ts leaves out: computeFallbackTheme / computeFallbackFont
 * cascades, getThemeForKey / getFontForKey guards, applyTheme injection and
 * setLocaleSetting.
 */
describe('BtnSettingsService (fallbacks + theme injection)', () => {
  let service: BtnSettingsService
  let configSvc: any
  let userPrefSvc: any

  const instanceConfig = (over: any = {}) => ({
    themes: [
      { themeClass: 'theme-a', themeName: 'A', themeFile: 'file-a', color: { primary: '#111' } },
      { themeClass: 'theme-b', themeName: 'B', themeFile: 'file-b', color: { primary: '#222' } },
    ],
    fontSizes: [
      { fontClass: 'font-a', baseFontSize: '14px' },
      { fontClass: 'font-b', baseFontSize: '16px' },
      { fontClass: 'font-c', baseFontSize: '18px' },
    ],
    defaultThemeClass: 'theme-a',
    defaultFontsize: 'font-a',
    locals: [
      { locals: ['en'], isRTL: false },
      { locals: ['ar'], isRTL: true },
    ],
    ...over,
  })

  const build = () => new BtnSettingsService('en', configSvc, userPrefSvc)

  beforeEach(() => {
    const meta = document.createElement('meta')
    meta.id = 'id-app-theme-color'
    document.head.appendChild(meta)

    configSvc = {
      isDarkMode: false,
      isRTL: false,
      isIntranetAllowed: true,
      completedTour: false,
      activeFontObject: null,
      activeThemeObject: null,
      activeLocale: null,
      userPreference: null,
      instanceConfig: instanceConfig(),
      prefChangeNotifier: { next: jest.fn() },
    }
    userPrefSvc = { saveUserPreference: jest.fn().mockResolvedValue(true) }
    service = build()
  })

  afterEach(() => {
    document.getElementById('id-app-theme-color')?.remove()
    document.querySelectorAll('head link, head script').forEach(el => el.remove())
    document.documentElement.className = ''
    jest.restoreAllMocks()
  })

  describe('theme fallback cascade', () => {
    it('prefers the theme saved in the user preference', () => {
      configSvc.userPreference = { selectedTheme: 'theme-b', selectedFont: 'font-a' }
      service.initializePrefChanges(false)
      expect(configSvc.activeThemeObject.themeClass).toBe('theme-b')
    })

    it('falls back to the instance default when the preference names an unknown theme', () => {
      configSvc.userPreference = { selectedTheme: 'nope', selectedFont: 'font-a' }
      service.initializePrefChanges(false)
      expect(configSvc.activeThemeObject.themeClass).toBe('theme-a')
    })

    it('falls back to the first theme when the default is unknown too', () => {
      configSvc.instanceConfig = instanceConfig({ defaultThemeClass: 'nope' })
      service.initializePrefChanges(false)
      expect(configSvc.activeThemeObject.themeClass).toBe('theme-a')
    })

    it('applies nothing when there is no instance config at all', () => {
      configSvc.instanceConfig = undefined
      expect(() => service.initializePrefChanges(false)).not.toThrow()
      expect(configSvc.activeThemeObject).toBeNull()
    })
  })

  describe('font fallback cascade', () => {
    it('prefers the font saved in the user preference', () => {
      configSvc.userPreference = { selectedTheme: 'theme-a', selectedFont: 'font-c' }
      service.initializePrefChanges(false)
      expect(configSvc.activeFontObject.fontClass).toBe('font-c')
    })

    it('falls back to the configured default font', () => {
      configSvc.userPreference = { selectedTheme: 'theme-a', selectedFont: 'nope' }
      service.initializePrefChanges(false)
      expect(configSvc.activeFontObject.fontClass).toBe('font-a')
    })

    it('falls back to the middle font when the default is unknown', () => {
      configSvc.instanceConfig = instanceConfig({ defaultFontsize: 'nope' })
      service.initializePrefChanges(false)
      expect(configSvc.activeFontObject.fontClass).toBe('font-b')
    })
  })

  describe('changeTheme / changeFont with unknown keys', () => {
    it('changeTheme falls back when handed an unknown key', () => {
      service.initializePrefChanges(false)
      configSvc.activeThemeObject = null

      service.changeTheme('does-not-exist')

      expect(configSvc.activeThemeObject.themeClass).toBe('theme-a')
    })

    it('changeFont falls back when handed an unknown key', () => {
      service.initializePrefChanges(false)
      configSvc.activeFontObject = null

      service.changeFont('does-not-exist')

      expect(configSvc.activeFontObject.fontClass).toBe('font-a')
    })

    it('changeTheme is a no-op without any resolvable theme', () => {
      configSvc.instanceConfig = undefined
      const fresh = build()
      expect(() => fresh.changeTheme('anything')).not.toThrow()
    })

    it('changeFont is a no-op without any resolvable font', () => {
      configSvc.instanceConfig = undefined
      const fresh = build()
      expect(() => fresh.changeFont('anything')).not.toThrow()
    })
  })

  describe('theme stylesheet injection', () => {
    it('injects a <link> for a production build', () => {
      service.initializePrefChanges(true)
      const link = document.head.querySelector('link[href="file-a.css"]')
      expect(link).toBeTruthy()
    })

    it('injects a <script> for a development build', () => {
      service.initializePrefChanges(false)
      const script = document.head.querySelector('script[src="file-a.js"]')
      expect(script).toBeTruthy()
    })

    it('removes the other theme classes before applying the new one', () => {
      document.documentElement.classList.add('theme-b')
      service.initializePrefChanges(false)
      expect(document.documentElement.classList.contains('theme-b')).toBe(false)
      expect(document.documentElement.classList.contains('theme-a')).toBe(true)
    })

    it('writes the theme primary colour onto the meta tag', () => {
      service.initializePrefChanges(false)
      expect((document.getElementById('id-app-theme-color') as HTMLMetaElement).content).toBe('#111')
    })
  })

  describe('setLocaleSetting', () => {
    it('selects the locale matching the user preference and sets ltr', () => {
      configSvc.userPreference = { selectedTheme: 'theme-a', selectedFont: 'font-a', selectedLocale: 'en' }
      service.initializePrefChanges(false)
      expect(configSvc.activeLocale).toEqual({ locals: ['en'], isRTL: false })
      expect(document.documentElement.getAttribute('dir')).toBe('ltr')
    })

    it('sets rtl for a right-to-left locale', () => {
      configSvc.userPreference = { selectedTheme: 'theme-a', selectedFont: 'font-a', selectedLocale: 'ar' }
      service.initializePrefChanges(false)
      expect(configSvc.isRTL).toBe(true)
      expect(document.documentElement.getAttribute('dir')).toBe('rtl')
    })

    it('defaults to English when no locale is stored', () => {
      configSvc.userPreference = null
      service.initializePrefChanges(false)
      expect(configSvc.activeLocale).toEqual({ locals: ['en'], isRTL: false })
    })

    it('leaves the locale null when nothing matches', () => {
      configSvc.instanceConfig = instanceConfig({ locals: [{ locals: ['fr'], isRTL: false }] })
      service.initializePrefChanges(false)
      expect(configSvc.activeLocale).toBeNull()
    })

    it('skips locale setup when the instance config declares none', () => {
      configSvc.instanceConfig = instanceConfig({ locals: undefined })
      expect(() => service.initializePrefChanges(false)).not.toThrow()
    })
  })

  describe('notification suppression during init', () => {
    it('stays quiet while initialising, then notifies afterwards', () => {
      service.initializePrefChanges(false)
      const callsAfterInit = configSvc.prefChangeNotifier.next.mock.calls.length
      expect(callsAfterInit).toBe(0)

      service.toggleRTL(true)

      expect(configSvc.prefChangeNotifier.next).toHaveBeenCalledWith({ isRTL: true })
    })

    it('carries the completed-tour flag across from the preference', () => {
      configSvc.userPreference = { selectedTheme: 'theme-a', selectedFont: 'font-a', completedTour: true }
      service.initializePrefChanges(false)
      expect(configSvc.completedTour).toBe(true)
    })
  })
})
