import { Subject, of } from 'rxjs'

import { ErrorServiceUnavailableComponent } from './error-service-unavailable.component'

describe('ErrorServiceUnavailableComponent', () => {
  let route: any
  let configurationSvc: any
  let prefChangeNotifier: Subject<any>

  const build = () => new ErrorServiceUnavailableComponent(route, configurationSvc)

  beforeEach(() => {
    prefChangeNotifier = new Subject<any>()
    route = {
      data: of({ pageData: { data: { messageA: 'service down' } } }),
    }
    configurationSvc = {
      isDarkMode: false,
      prefChangeNotifier,
    }
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should construct and seed isDarkMode from the configuration service', () => {
    configurationSvc.isDarkMode = true
    const comp = build()
    expect(comp).toBeTruthy()
    expect(comp.isDarkMode).toBe(true)
    expect(comp.errorData).toBeNull()
  })

  describe('ngOnInit', () => {
    it('should resolve errorData from the route when no input is provided', () => {
      const comp = build()
      comp.ngOnInit()
      expect(comp.errorData).toEqual({ messageA: 'service down' })
    })

    it('should set errorData to null when the route has no data', () => {
      route.data = of({ pageData: { data: null } })
      const comp = build()
      comp.ngOnInit()
      expect(comp.errorData).toBeNull()
    })

    it('should not subscribe to the route when errorData input is already set', () => {
      const comp = build()
      comp.errorData = { messageA: 'preset' } as any
      const spy = jest.spyOn(route.data, 'subscribe')
      comp.ngOnInit()
      expect(spy).not.toHaveBeenCalled()
      expect(comp.errorData).toEqual({ messageA: 'preset' })
    })

    it('should update isDarkMode when preferences change (after debounce)', () => {
      jest.useFakeTimers()
      const comp = build()
      comp.ngOnInit()
      configurationSvc.isDarkMode = true
      prefChangeNotifier.next(undefined)
      jest.advanceTimersByTime(500)
      expect(comp.isDarkMode).toBe(true)
    })

    it('should not update isDarkMode before the debounce window elapses', () => {
      jest.useFakeTimers()
      const comp = build()
      comp.ngOnInit()
      configurationSvc.isDarkMode = true
      prefChangeNotifier.next(undefined)
      jest.advanceTimersByTime(400)
      expect(comp.isDarkMode).toBe(false)
    })
  })

  describe('ngOnDestroy', () => {
    it('should unsubscribe from both subscriptions without error', () => {
      const comp = build()
      comp.ngOnInit()
      expect(() => comp.ngOnDestroy()).not.toThrow()
    })

    it('should be safe to call when no subscriptions were created', () => {
      const comp = build()
      expect(() => comp.ngOnDestroy()).not.toThrow()
    })
  })
})
