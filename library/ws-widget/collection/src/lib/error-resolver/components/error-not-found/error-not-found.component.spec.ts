import { Subject, of } from 'rxjs'

import { ErrorNotFoundComponent } from './error-not-found.component'

describe('ErrorNotFoundComponent', () => {
  let route: any
  let configurationSvc: any
  let prefChangeNotifier: Subject<any>

  const errorData = { messageA: 'not found' }

  const build = () => new ErrorNotFoundComponent(route, configurationSvc)

  beforeEach(() => {
    prefChangeNotifier = new Subject<any>()
    route = { data: of({ pageData: { data: errorData } }) }
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
    it('resolves errorData from the route when no input is provided', () => {
      const comp = build()
      comp.ngOnInit()
      expect(comp.errorData).toEqual(errorData)
    })

    it('sets errorData to null when the route payload is empty', () => {
      route.data = of({ pageData: { data: null } })
      const comp = build()
      comp.ngOnInit()
      expect(comp.errorData).toBeNull()
    })

    it('does not subscribe to the route when errorData input is already set', () => {
      const comp = build()
      comp.errorData = { messageA: 'preset' } as any
      const spy = jest.spyOn(route.data, 'subscribe')
      comp.ngOnInit()
      expect(spy).not.toHaveBeenCalled()
      expect(comp.errorData).toEqual({ messageA: 'preset' })
    })

    it('updates isDarkMode when preferences change (after debounce)', () => {
      jest.useFakeTimers()
      const comp = build()
      comp.ngOnInit()
      configurationSvc.isDarkMode = true
      prefChangeNotifier.next(undefined)
      jest.advanceTimersByTime(500)
      expect(comp.isDarkMode).toBe(true)
    })

    it('does not update isDarkMode before the debounce window elapses', () => {
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
    it('unsubscribes from both subscriptions without error', () => {
      const comp = build()
      comp.ngOnInit()
      expect(() => comp.ngOnDestroy()).not.toThrow()
    })

    it('is safe to call when no subscriptions were created', () => {
      const comp = build()
      expect(() => comp.ngOnDestroy()).not.toThrow()
    })
  })
})
