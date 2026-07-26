import { BtnSettingsService } from './btn-settings.service'

describe('BtnSettingsService', () => {
  let service: BtnSettingsService
  let configSvc: any
  let userPrefSvc: any

  const buildInstanceConfig = () => ({
    themes: [{ themeClass: 'theme-a', themeName: 'A', themeFile: 'file-a', color: { primary: '#111' } }],
    fontSizes: [
      { fontClass: 'font-a', baseFontSize: '14px' },
      { fontClass: 'font-b', baseFontSize: '16px' },
      { fontClass: 'font-c', baseFontSize: '18px' },
    ],
    defaultThemeClass: 'theme-a',
    defaultFontsize: 'font-a',
    locals: [{ locals: ['en'], isRTL: false }],
  })

  beforeEach(() => {
    // updateAppColor reads this meta element
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
      userPreference: {
        selectedTheme: 'theme-a',
        selectedFont: 'font-a',
        selectedLocale: 'en',
        isDarkMode: true,
        completedTour: true,
      },
      instanceConfig: buildInstanceConfig(),
      prefChangeNotifier: { next: jest.fn() },
    }
    userPrefSvc = { saveUserPreference: jest.fn().mockResolvedValue(true) }

    service = new BtnSettingsService('en', configSvc, userPrefSvc)
  })

  afterEach(() => {
    const meta = document.getElementById('id-app-theme-color')
    if (meta) {
      meta.remove()
    }
    document.documentElement.className = ''
  })

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('applyThemeMode toggles day/night classes and updates the config flag', () => {
    service.applyThemeMode(true)
    expect(document.documentElement.classList.contains('night-mode')).toBe(true)
    expect(document.documentElement.classList.contains('day-mode')).toBe(false)
    expect(configSvc.isDarkMode).toBe(true)
    expect(configSvc.prefChangeNotifier.next).toHaveBeenCalledWith({ isDarkMode: true })

    service.applyThemeMode(false)
    expect(document.documentElement.classList.contains('day-mode')).toBe(true)
    expect(configSvc.isDarkMode).toBe(false)
  })

  it('intranetContentMode updates the flag and notifies', () => {
    service.intranetContentMode(false)
    expect(configSvc.isIntranetAllowed).toBe(false)
    expect(configSvc.prefChangeNotifier.next).toHaveBeenCalledWith({ isIntranetAllowed: false })
  })

  it('toggleRTL flips direction and sets the dir attribute', () => {
    configSvc.isRTL = false
    service.toggleRTL()
    expect(configSvc.isRTL).toBe(true)
    expect(document.documentElement.getAttribute('dir')).toBe('rtl')

    service.toggleRTL(false)
    expect(configSvc.isRTL).toBe(false)
    expect(document.documentElement.getAttribute('dir')).toBe('ltr')
  })

  it('applyFont swaps the font class and stores the active font', () => {
    const font = { fontClass: 'font-b', baseFontSize: '16px' } as any
    service.applyFont(font)
    expect(document.documentElement.classList.contains('font-b')).toBe(true)
    expect(configSvc.activeFontObject).toBe(font)
    expect(configSvc.prefChangeNotifier.next).toHaveBeenCalledWith({ selectedFont: 'font-b' })
  })

  it('changeFont applies the font matching the given key', () => {
    service.changeFont('font-c')
    expect(document.documentElement.classList.contains('font-c')).toBe(true)
    expect(configSvc.activeFontObject.fontClass).toBe('font-c')
  })

  it('changeTheme applies the theme matching the given key and updates app color', () => {
    service.changeTheme('theme-a')
    expect(document.documentElement.classList.contains('theme-a')).toBe(true)
    expect(configSvc.activeThemeObject.themeClass).toBe('theme-a')
    expect((document.getElementById('id-app-theme-color') as HTMLMetaElement).content).toBe('#111')
  })

  it('updateAppColor writes the primary color to the meta tag', () => {
    service.updateAppColor({ color: { primary: '#abcdef' } } as any)
    expect((document.getElementById('id-app-theme-color') as HTMLMetaElement).content).toBe('#abcdef')
  })

  it('updateUserLocale persists the locale through the preference service', async () => {
    const result = await service.updateUserLocale('hi')
    expect(result).toBe(true)
    expect(configSvc.userPreference.selectedLocale).toBe('hi')
    expect(userPrefSvc.saveUserPreference).toHaveBeenCalledWith({ selectedLocale: 'hi' })
  })

  it('initializePrefChanges wires theme, font, mode and locale from preferences', () => {
    service.initializePrefChanges(true)
    expect(service.useLinkForThemeInjection).toBe(true)
    expect(configSvc.activeThemeObject.themeClass).toBe('theme-a')
    expect(configSvc.activeFontObject.fontClass).toBe('font-a')
    expect(configSvc.isDarkMode).toBe(true)
    expect(configSvc.activeLocale).toEqual({ locals: ['en'], isRTL: false })
    expect(configSvc.completedTour).toBe(true)
  })
})
