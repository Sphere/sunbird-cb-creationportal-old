import { UserImageComponent } from './user-image.component'

describe('UserImageComponent', () => {
  let configSvc: any

  const build = () => new UserImageComponent(configSvc)

  beforeEach(() => {
    configSvc = { instanceConfig: undefined }
  })

  it('should construct with defaults', () => {
    const comp = build()
    expect(comp).toBeTruthy()
    expect(comp.email).toBe('')
    expect(comp.imageType).toBe('initial')
    expect(comp.imageSize).toBe('large')
    expect(comp.errorOccurred).toBe(false)
    expect(comp.verifiedMicrosoftEmail).toBe('')
    expect(comp.shortName).toBe('')
    expect(comp.basePicUrl).toBe('/apis/protected/v8/user/profile/graph/photo/')
  })

  it('should have a no-op ngOnInit', () => {
    const comp = build()
    expect(() => comp.ngOnInit()).not.toThrow()
  })

  describe('ngOnChanges - microsoft email verification', () => {
    it('should set verifiedMicrosoftEmail when email matches a valid extension', () => {
      configSvc.instanceConfig = {
        microsoft: { validEmailExtensions: ['@microsoft.com'] },
      }
      const comp = build()
      comp.email = 'jane@microsoft.com'
      comp.userName = 'Jane Doe'
      comp.ngOnChanges()
      expect(comp.verifiedMicrosoftEmail).toBe('jane@microsoft.com')
    })

    it('should not set verifiedMicrosoftEmail when the extension does not match', () => {
      configSvc.instanceConfig = {
        microsoft: { validEmailExtensions: ['@microsoft.com'] },
      }
      const comp = build()
      comp.email = 'jane@gmail.com'
      comp.userName = 'Jane Doe'
      comp.ngOnChanges()
      expect(comp.verifiedMicrosoftEmail).toBe('')
    })

    it('should skip verification when there is no instance config', () => {
      const comp = build()
      comp.email = 'jane@microsoft.com'
      comp.userName = 'Jane Doe'
      comp.ngOnChanges()
      expect(comp.verifiedMicrosoftEmail).toBe('')
    })

    it('should skip verification when microsoft config has no valid extensions', () => {
      configSvc.instanceConfig = { microsoft: {} }
      const comp = build()
      comp.email = 'jane@microsoft.com'
      comp.userName = 'Jane Doe'
      comp.ngOnChanges()
      expect(comp.verifiedMicrosoftEmail).toBe('')
    })
  })

  describe('ngOnChanges - short name derivation', () => {
    it('should build an uppercased two-letter short name from the user name', () => {
      const comp = build()
      comp.userName = 'John Smith'
      comp.imageType = 'name-initial'
      comp.ngOnChanges()
      expect(comp.shortName).toBe('JS')
      expect(comp.imageType).toBe('name-initial')
    })

    it('should use only the first two words for the short name', () => {
      const comp = build()
      comp.userName = 'Alpha Bravo Charlie'
      comp.ngOnChanges()
      expect(comp.shortName).toBe('AB')
    })

    it('should fall back to initial imageType when the user name is blank', () => {
      const comp = build()
      comp.userName = '  '
      comp.imageType = 'name-initial'
      comp.ngOnChanges()
      expect(comp.imageType).toBe('initial')
      expect(comp.shortName).toBe('')
    })

    it('should fall back to initial imageType when user name is empty', () => {
      const comp = build()
      comp.userName = ''
      comp.imageType = 'rounded'
      comp.ngOnChanges()
      expect(comp.imageType).toBe('initial')
    })
  })
})
