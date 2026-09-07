import { of, throwError } from 'rxjs'
import { SignupAutoComponent } from './signup-auto.component'

describe('SignupAutoComponent', () => {
  let snackBar: any
  let signupAutoService: any
  let route: any
  let component: SignupAutoComponent

  const build = () => new SignupAutoComponent(snackBar, signupAutoService, route)

  beforeEach(() => {
    snackBar = { open: jest.fn() }
    signupAutoService = { signup: jest.fn().mockReturnValue(of({ msg: '1005:ok', email: 'a@b.com' })) }
    route = { paramMap: of({ get: jest.fn().mockReturnValue('unique-123') }) }
    component = build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
    expect(component.fetching).toBe(false)
    expect(component.showResonse).toBe(false)
  })

  describe('ngOnInit', () => {
    it('reads the id from the route and triggers signup', () => {
      const spy = jest.spyOn(component, 'signup')
      component.ngOnInit()
      expect(component.uniqueId).toBe('unique-123')
      expect(spy).toHaveBeenCalledWith('unique-123')
    })
  })

  describe('signup - success codes', () => {
    const run = (msg: string, email = 'user@x.com') => {
      signupAutoService.signup.mockReturnValue(of({ msg, email }))
      component.signup('id-1')
    }

    it('handles code 1001', () => {
      run('1001:err')
      expect(component.msg).toBe('Something went wrong, please contact administrator')
      expect(component.fetching).toBe(false)
      expect(component.showResonse).toBe(true)
      expect(snackBar.open).toHaveBeenCalledWith(component.msg, 'X', { duration: 5000 })
    })

    it('handles code 1002', () => {
      run('1002:err')
      expect(component.msg).toBe('Registered email address is not valid, so please contact administrator')
    })

    it('handles code 1003 and includes the email', () => {
      run('1003:ok', 'me@here.com')
      expect(component.msg).toContain('me@here.com')
      expect(component.msg).toContain('already registered successfully')
    })

    it('handles code 1004', () => {
      run('1004:ok')
      expect(component.msg).toContain('trouble logging in')
    })

    it('handles code 1005 and includes the email', () => {
      run('1005:ok', 'new@here.com')
      expect(component.msg).toContain('new@here.com')
      expect(component.msg).toContain('registered successfully')
    })

    it('handles an unknown code with the default message', () => {
      run('9999:ok')
      expect(component.msg).toBe('Something went wrong, please contact administrator')
    })
  })

  describe('signup - error path', () => {
    it('sets the fallback message and opens the snackbar with the server error', () => {
      signupAutoService.signup.mockReturnValue(throwError(() => ({ error: { msg: 'server down' } })))
      component.signup('id-err')
      expect(component.fetching).toBe(false)
      expect(component.showResonse).toBe(true)
      expect(component.msg).toBe('Something went wrong please try again later!!')
      expect(snackBar.open).toHaveBeenCalledWith('server down', 'X', { duration: 5000 })
    })
  })
})
