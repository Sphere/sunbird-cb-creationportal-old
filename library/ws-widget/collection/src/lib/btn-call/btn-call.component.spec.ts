import { BtnCallComponent } from './btn-call.component'
import { BtnCallDialogComponent } from './btn-call-dialog/btn-call-dialog.component'

describe('BtnCallComponent', () => {
  let component: BtnCallComponent
  let events: { raiseInteractTelemetry: jest.Mock }
  let dialog: { open: jest.Mock }
  let configSvc: any

  const build = () => new BtnCallComponent(events as any, dialog as any, configSvc)

  beforeEach(() => {
    events = { raiseInteractTelemetry: jest.fn() }
    dialog = { open: jest.fn() }
    configSvc = { restrictedFeatures: new Set<string>() }
    component = build()
    component.widgetData = { userName: 'Alice', userPhone: '12345' }
  })

  it('should create', () => {
    expect(component).toBeTruthy()
    expect(component.isCallEnabled).toBe(false)
  })

  describe('ngOnInit', () => {
    it('enables calling when not restricted', () => {
      component.ngOnInit()
      expect(component.isCallEnabled).toBe(true)
    })

    it('disables calling when callUsers is restricted', () => {
      configSvc.restrictedFeatures = new Set(['callUsers'])
      const c = build()
      c.ngOnInit()
      expect(c.isCallEnabled).toBe(false)
    })

    it('leaves calling disabled when there are no restricted features', () => {
      configSvc.restrictedFeatures = undefined
      const c = build()
      c.ngOnInit()
      expect(c.isCallEnabled).toBe(false)
    })
  })

  describe('showCallDialog', () => {
    it('raises telemetry and opens the call dialog with name and phone', () => {
      component.showCallDialog()

      expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('call', 'openDialog', {
        name: 'Alice',
        phone: '12345',
      })
      expect(dialog.open).toHaveBeenCalledWith(BtnCallDialogComponent, {
        data: { name: 'Alice', phone: '12345' },
      })
    })
  })

  describe('raiseTelemetry', () => {
    it('emits an interact telemetry event with the widget data', () => {
      component.raiseTelemetry()

      expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('call', 'openDialog', {
        name: 'Alice',
        phone: '12345',
      })
    })
  })
})
