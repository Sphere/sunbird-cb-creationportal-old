import { LoginRootService } from './login-root.service'
import { LoginComponent } from '../login/login.component'

describe('LoginRootService', () => {
  it('should be created', () => {
    expect(new LoginRootService()).toBeTruthy()
  })

  it('getComponent returns the LoginComponent class', () => {
    expect(new LoginRootService().getComponent()).toBe(LoginComponent)
  })
})
