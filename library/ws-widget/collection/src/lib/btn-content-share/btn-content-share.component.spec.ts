import { BtnContentShareComponent } from './btn-content-share.component'

describe('BtnContentShareComponent', () => {
  let dialog: any
  let configSvc: any

  const build = () => new BtnContentShareComponent(dialog, configSvc)

  beforeEach(() => {
    dialog = { open: jest.fn() }
    configSvc = {
      restrictedFeatures: new Set<string>(),
      rootOrg: 'SomeOrg',
    }
  })

  it('should construct with default flags', () => {
    const comp = build()
    expect(comp).toBeTruthy()
    expect(comp.showBtn).toBe(false)
    expect(comp.isShareEnabled).toBe(false)
    expect(comp.isDisabled).toBe(false)
    expect(comp.showText).toBe(false)
    expect(comp.forPreview).toBe(false)
    expect(comp.isTocBanner).toBe(false)
  })

  describe('ngOnInit', () => {
    it('enables share when the restricted set does not contain "share"', () => {
      const comp = build()
      comp.ngOnInit()
      expect(comp.isShareEnabled).toBe(true)
    })

    it('disables share when "share" is restricted', () => {
      configSvc.restrictedFeatures = new Set<string>(['share'])
      const comp = build()
      comp.ngOnInit()
      expect(comp.isShareEnabled).toBe(false)
    })

    it('leaves isShareEnabled false when restrictedFeatures is undefined', () => {
      configSvc.restrictedFeatures = undefined
      const comp = build()
      comp.ngOnInit()
      expect(comp.isShareEnabled).toBe(false)
    })

    it('shows the button when rootOrg is not "RootOrg"', () => {
      configSvc.rootOrg = 'AnyOtherOrg'
      const comp = build()
      comp.ngOnInit()
      expect(comp.showBtn).toBe(true)
    })

    it('hides the button when rootOrg is "RootOrg"', () => {
      configSvc.rootOrg = 'RootOrg'
      const comp = build()
      comp.ngOnInit()
      expect(comp.showBtn).toBe(false)
    })
  })

  describe('shareContent', () => {
    it('opens the share dialog with the widget content when not gray', () => {
      const comp = build()
      comp.isGray = false
      comp.widgetData = { identifier: 'do_123' } as any
      comp.shareContent()
      expect(dialog.open).toHaveBeenCalledTimes(1)
      const args = dialog.open.mock.calls[0]
      expect(args[1]).toEqual({ data: { content: comp.widgetData } })
    })

    it('opens the dialog when isGray is undefined', () => {
      const comp = build()
      comp.widgetData = { identifier: 'do_456' } as any
      comp.shareContent()
      expect(dialog.open).toHaveBeenCalledTimes(1)
    })

    it('does not open the dialog when isGray is true', () => {
      const comp = build()
      comp.isGray = true
      comp.shareContent()
      expect(dialog.open).not.toHaveBeenCalled()
    })
  })
})
