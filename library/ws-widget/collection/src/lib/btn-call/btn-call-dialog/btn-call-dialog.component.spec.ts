import { BtnCallDialogComponent, IWidgetBtnCallDialogData } from './btn-call-dialog.component'

describe('BtnCallDialogComponent', () => {
  let component: BtnCallDialogComponent
  let snackBar: any
  let events: any
  let data: IWidgetBtnCallDialogData

  const build = () => {
    component = new BtnCallDialogComponent(snackBar, events, data)
  }

  beforeEach(() => {
    snackBar = { open: jest.fn() }
    events = { raiseInteractTelemetry: jest.fn() }
    data = { name: 'Jane SME', phone: '9998887777' }
    build()
  })

  it('should be created and expose the injected dialog data', () => {
    expect(component).toBeTruthy()
    expect(component.data).toEqual(data)
  })

  it('ngOnInit runs without error', () => {
    expect(() => component.ngOnInit()).not.toThrow()
  })

  describe('copyToClipboard', () => {
    let execSpy: jest.Mock
    const originalExecCommand = (document as any).execCommand

    beforeEach(() => {
      // jsdom does not implement execCommand, so define it directly
      execSpy = jest.fn().mockReturnValue(true)
      ;(document as any).execCommand = execSpy
    })

    afterEach(() => {
      ;(document as any).execCommand = originalExecCommand
    })

    it('copies the phone number to the clipboard and toasts', () => {
      const appendSpy = jest.spyOn(document.body, 'appendChild')
      const removeSpy = jest.spyOn(document.body, 'removeChild')

      component.copyToClipboard('Copied')

      expect(appendSpy).toHaveBeenCalled()
      expect(execSpy).toHaveBeenCalledWith('copy')
      expect(removeSpy).toHaveBeenCalled()
      expect(snackBar.open).toHaveBeenCalledWith('9998887777 : Copied', 'X')

      appendSpy.mockRestore()
      removeSpy.mockRestore()
    })

    it('raises telemetry for the copy action', () => {
      component.copyToClipboard('Copied')
      expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('call', 'copyToClipboard', { name: 'Jane SME', phone: '9998887777' })
    })

    it('does not leave the temporary textarea attached to the body', () => {
      const before = document.body.querySelectorAll('textarea').length
      component.copyToClipboard('Copied')
      const after = document.body.querySelectorAll('textarea').length
      expect(after).toBe(before)
    })
  })

  describe('raiseTelemetry', () => {
    it('raises a callSME interact telemetry event', () => {
      component.raiseTelemetry('callSME')
      expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('call', 'callSME', { name: 'Jane SME', phone: '9998887777' })
    })

    it('raises a copyToClipboard interact telemetry event', () => {
      component.raiseTelemetry('copyToClipboard')
      expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('call', 'copyToClipboard', { name: 'Jane SME', phone: '9998887777' })
    })
  })
})
