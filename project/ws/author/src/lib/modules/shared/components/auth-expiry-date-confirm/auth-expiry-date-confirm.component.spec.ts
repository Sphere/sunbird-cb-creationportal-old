import { FormBuilder } from '@angular/forms'
import { of, throwError } from 'rxjs'
import { AuthExpiryDateConfirmComponent } from './auth-expiry-date-confirm.component'

describe('AuthExpiryDateConfirmComponent', () => {
  let accessService: any
  let dialogRef: any
  let snackBar: any
  let dialog: any
  let apiService: any
  let valueSvc: any
  let notificationSvc: any

  const minDate = new Date('2030-01-01T00:00:00.000Z')

  const data = (over: any = {}) =>
    ({
      identifier: 'do_1',
      expiryDate: '2030-01-01',
      ...over,
    }) as any

  const build = (payload: any = data()) =>
    new AuthExpiryDateConfirmComponent(
      accessService,
      new FormBuilder(),
      dialogRef,
      payload,
      snackBar,
      dialog,
      apiService,
      valueSvc,
      notificationSvc,
    )

  beforeEach(() => {
    accessService = {
      convertToISODate: jest.fn().mockReturnValue(minDate),
      convertToESDate: jest.fn().mockReturnValue('2030-02-01'),
      org: 'org1',
      rootOrg: 'rootOrg1',
      userName: 'User One',
      userId: 'u1',
    }
    dialogRef = { close: jest.fn() }
    snackBar = { openFromComponent: jest.fn() }
    dialog = { open: jest.fn() }
    apiService = { post: jest.fn().mockReturnValue(of(null)) }
    valueSvc = { isXSmall$: of(false) }
    notificationSvc = { markForDeletion: jest.fn().mockReturnValue(of({})) }
  })

  it('should be created', () => {
    expect(build()).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('seeds the form, minDate and mobile flag', () => {
      const component = build()
      component.ngOnInit()
      expect(accessService.convertToISODate).toHaveBeenCalledWith('2030-01-01')
      expect(component.minDate).toBe(minDate)
      expect(component.isMobile).toBe(false)
      expect(component.userActionForm.get('comments')).toBeDefined()
      expect(component.userActionForm.get('expiryDate')!.value).toBe(minDate)
    })

    it('marks mobile when the viewport is XSmall', () => {
      valueSvc.isXSmall$ = of(true)
      const component = build()
      component.ngOnInit()
      expect(component.isMobile).toBe(true)
    })
  })

  describe('showError', () => {
    it('is true when extend is on but the date is unchanged', () => {
      const component = build()
      component.ngOnInit()
      component.userActionForm.get('isExtend')!.setValue(true)
      expect(component.showError).toBe(true)
    })

    it('is false when the date has been changed', () => {
      const component = build()
      component.ngOnInit()
      component.userActionForm.get('isExtend')!.setValue(true)
      component.userActionForm.get('expiryDate')!.setValue(new Date('2031-01-01'))
      expect(component.showError).toBe(false)
    })

    it('is false when extend is off', () => {
      const component = build()
      component.ngOnInit()
      expect(component.showError).toBe(false)
    })
  })

  describe('submitData', () => {
    it('runs the action when a marked-for-deletion form is valid', () => {
      const component = build()
      component.ngOnInit()
      const spy = jest.spyOn(component, 'extendOrExpiry').mockImplementation(() => {})
      component.userActionForm.get('comments')!.setValue('please delete')
      component.userActionForm.get('action')!.setValue(true)
      component.submitData()
      expect(spy).toHaveBeenCalled()
    })

    it('runs the action when an extend form has a new date', () => {
      const component = build()
      component.ngOnInit()
      const spy = jest.spyOn(component, 'extendOrExpiry').mockImplementation(() => {})
      component.userActionForm.get('comments')!.setValue('extend it')
      component.userActionForm.get('isExtend')!.setValue(true)
      component.userActionForm.get('expiryDate')!.setValue(new Date('2031-01-01'))
      component.submitData()
      expect(spy).toHaveBeenCalled()
    })

    it('flags the submit and touches the date when invalid', () => {
      const component = build()
      component.ngOnInit()
      const spy = jest.spyOn(component, 'extendOrExpiry').mockImplementation(() => {})
      component.submitData()
      expect(spy).not.toHaveBeenCalled()
      expect(component.isSubmitPressed).toBe(true)
      expect(component.userActionForm.controls['expiryDate'].touched).toBe(true)
    })
  })

  describe('extendOrExpiry', () => {
    it('posts a marked-for-deletion action and closes on success', () => {
      const component = build()
      component.ngOnInit()
      component.userActionForm.get('comments')!.setValue('bye')
      component.extendOrExpiry()
      expect(component.onAction).toBe(true)
      const [, payload] = apiService.post.mock.calls[0]
      expect(payload.action).toBe('markedForDeletion')
      expect(payload.isExtend).toBe(false)
      expect(payload.identifier).toBe('do_1')
      expect(payload.actor).toBe('u1')
      expect(notificationSvc.markForDeletion).toHaveBeenCalled()
      expect(dialogRef.close).toHaveBeenCalledWith(true)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('posts an extend action without notifying deletion', () => {
      const component = build()
      component.ngOnInit()
      component.userActionForm.get('isExtend')!.setValue(true)
      component.userActionForm.get('comments')!.setValue('more time')
      component.extendOrExpiry()
      const [, payload] = apiService.post.mock.calls[0]
      expect(payload.action).toBe('extended')
      expect(payload.isExtend).toBe(true)
      expect(notificationSvc.markForDeletion).not.toHaveBeenCalled()
      expect(dialogRef.close).toHaveBeenCalledWith(true)
    })

    it('opens the error parser on a 409 conflict', () => {
      apiService.post.mockReturnValue(throwError(() => ({ status: 409, error: { msg: 'conflict' } })))
      const component = build()
      component.ngOnInit()
      component.userActionForm.get('comments')!.setValue('bye')
      component.extendOrExpiry()
      expect(component.onAction).toBe(false)
      expect(dialog.open).toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('shows a failure snackbar for a non-409 error without opening the dialog', () => {
      apiService.post.mockReturnValue(throwError(() => ({ status: 500 })))
      const component = build()
      component.ngOnInit()
      component.userActionForm.get('comments')!.setValue('bye')
      component.extendOrExpiry()
      expect(dialog.open).not.toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('recovers when the deletion notification fails', () => {
      notificationSvc.markForDeletion.mockReturnValue(throwError(() => 'boom'))
      const component = build()
      component.ngOnInit()
      component.userActionForm.get('comments')!.setValue('bye')
      component.extendOrExpiry()
      expect(dialogRef.close).toHaveBeenCalledWith(true)
    })
  })
})
