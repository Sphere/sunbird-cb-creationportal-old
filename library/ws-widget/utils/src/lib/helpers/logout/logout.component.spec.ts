import { LogoutComponent } from './logout.component'

describe('LogoutComponent', () => {
  let dialogRef: any
  let authSvc: any
  let configSvc: any
  let utilitySvc: any

  const build = () => new LogoutComponent(dialogRef, authSvc, configSvc, utilitySvc)

  beforeEach(() => {
    dialogRef = { close: jest.fn() }
    authSvc = { logout: jest.fn() }
    configSvc = { restrictedFeatures: undefined, instanceConfig: undefined }
    utilitySvc = { iOsAppRef: false, isAndroidApp: false }
  })

  it('should create', () => {
    expect(build()).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('does nothing when there are no restricted features', () => {
      const c = build()
      c.ngOnInit()
      expect(c.isDownloadableIos).toBe(false)
      expect(c.isDownloadableAndroid).toBe(false)
    })

    it('enables downloads when the feature is not restricted', () => {
      configSvc.restrictedFeatures = new Set<string>()
      const c = build()
      c.ngOnInit()
      expect(c.isDownloadableIos).toBe(true)
      expect(c.isDownloadableAndroid).toBe(true)
    })

    it('disables downloads that are restricted', () => {
      configSvc.restrictedFeatures = new Set<string>(['iosDownload', 'androidDownload'])
      const c = build()
      c.ngOnInit()
      expect(c.isDownloadableIos).toBe(false)
      expect(c.isDownloadableAndroid).toBe(false)
    })
  })

  describe('confirmed', () => {
    it('disables the control and triggers logout', () => {
      const c = build()
      c.confirmed()
      expect(c.disabled).toBe(true)
      expect(authSvc.logout).toHaveBeenCalled()
    })
  })

  describe('isDownloadable getter', () => {
    it('is false when there is no instance config', () => {
      expect(build().isDownloadable).toBe(false)
    })

    it('is false when download is unavailable', () => {
      configSvc.instanceConfig = { isContentDownloadAvailable: false }
      utilitySvc.iOsAppRef = true
      expect(build().isDownloadable).toBe(false)
    })

    it('is false when not running inside a mobile app', () => {
      configSvc.instanceConfig = { isContentDownloadAvailable: true }
      expect(build().isDownloadable).toBe(false)
    })

    it('is true on iOS when download is available', () => {
      configSvc.instanceConfig = { isContentDownloadAvailable: true }
      utilitySvc.iOsAppRef = true
      expect(build().isDownloadable).toBe(true)
    })

    it('is true on Android when download is available', () => {
      configSvc.instanceConfig = { isContentDownloadAvailable: true }
      utilitySvc.isAndroidApp = true
      expect(build().isDownloadable).toBe(true)
    })
  })
})
