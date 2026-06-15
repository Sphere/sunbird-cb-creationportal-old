import { AuthNavBarToggleService } from './auth-nav-bar-toggle.service'

describe('AuthNavBarToggleService', () => {
  let service: AuthNavBarToggleService

  beforeEach(() => {
    service = new AuthNavBarToggleService()
  })

  it('is created and visible by default', () => {
    expect(service).toBeTruthy()
    expect(service.isVisible).toBe(true)
  })

  it('updates visibility through the setter', () => {
    service.isVisible = false
    expect(service.isVisible).toBe(false)
  })

  it('toggle sets visibility and emits on toggleNavBar', () => {
    const seen: boolean[] = []
    service.toggleNavBar.subscribe(v => seen.push(v))
    service.toggle(false)
    expect(service.isVisible).toBe(false)
    expect(seen).toEqual([false])
  })
})
