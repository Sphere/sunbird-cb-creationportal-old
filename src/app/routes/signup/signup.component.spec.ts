import { of, throwError, Subscription } from 'rxjs'

import { SignupComponent } from './signup.component'

describe('SignupComponent', () => {
  let snackBar: any
  let signupService: any
  let component: SignupComponent

  beforeEach(() => {
    snackBar = { open: jest.fn() }
    signupService = { signup: jest.fn().mockReturnValue(of({})) }
    component = new SignupComponent(snackBar, signupService)
    // wire up the toast ViewChild refs used by openSnackbar
    component.toastSuccess = { nativeElement: { value: 'Success message' } } as any
    component.toastError = { nativeElement: { value: 'Error message' } } as any
  })

  it('should create and build the signup form with expected controls', () => {
    expect(component).toBeTruthy()
    expect(component.signupForm).toBeDefined()
    expect(component.signupForm.contains('fname')).toBe(true)
    expect(component.signupForm.contains('lname')).toBe(true)
    expect(component.signupForm.contains('email')).toBe(true)
    expect(component.signupForm.contains('code')).toBe(true)
    expect(component.uploadSaveData).toBe(false)
  })

  it('should mark form invalid when required fields are empty and valid when filled', () => {
    expect(component.signupForm.valid).toBe(false)
    component.signupForm.setValue({
      fname: 'John',
      lname: 'Doe',
      email: 'john@example.com',
      code: 'ABC',
    })
    expect(component.signupForm.valid).toBe(true)
  })

  it('should validate email format', () => {
    const emailCtrl = component.signupForm.get('email')
    emailCtrl!.setValue('not-an-email')
    expect(emailCtrl!.valid).toBe(false)
    emailCtrl!.setValue('valid@example.com')
    expect(emailCtrl!.valid).toBe(true)
  })

  it('ngOnInit should not throw', () => {
    expect(() => component.ngOnInit()).not.toThrow()
  })

  describe('onSubmit', () => {
    it('should call signup, reset the form, reset uploadSaveData and show success snackbar', () => {
      const form = { value: { fname: 'A' }, reset: jest.fn() }
      signupService.signup.mockReturnValue(of({ id: 1 }))

      component.onSubmit(form)

      expect(signupService.signup).toHaveBeenCalledWith(form.value)
      expect(form.reset).toHaveBeenCalled()
      expect(component.uploadSaveData).toBe(false)
      expect(snackBar.open).toHaveBeenCalledWith('Success message', 'X', { duration: 5000 })
    })

    it('should show error snackbar and reset uploadSaveData on failure', () => {
      const form = { value: { fname: 'A' }, reset: jest.fn() }
      signupService.signup.mockReturnValue(throwError(() => ({ error: 'Error:Something bad happened' })))

      component.onSubmit(form)

      expect(form.reset).not.toHaveBeenCalled()
      expect(component.uploadSaveData).toBe(false)
      expect(snackBar.open).toHaveBeenCalledWith('Something bad happened', 'X', { duration: 5000 })
    })

    it('should set uploadSaveData true before subscribe resolves (async signup)', () => {
      const form = { value: {}, reset: jest.fn() }
      // never-emitting observable so uploadSaveData stays true
      signupService.signup.mockReturnValue({ subscribe: jest.fn() } as any)

      component.onSubmit(form)

      expect(component.uploadSaveData).toBe(true)
    })
  })

  describe('ngOnDestroy', () => {
    it('should unsubscribe an open subscription', () => {
      const sub = new Subscription()
      const spy = jest.spyOn(sub, 'unsubscribe')
      component.unseenCtrlSub = sub
      component.ngOnDestroy()
      expect(spy).toHaveBeenCalled()
    })

    it('should not throw when subscription is undefined', () => {
      component.unseenCtrlSub = undefined as any
      expect(() => component.ngOnDestroy()).not.toThrow()
    })

    it('should not unsubscribe an already-closed subscription', () => {
      const sub = new Subscription()
      sub.unsubscribe()
      const spy = jest.spyOn(sub, 'unsubscribe')
      component.unseenCtrlSub = sub
      component.ngOnDestroy()
      expect(spy).not.toHaveBeenCalled()
    })
  })
})
