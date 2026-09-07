import { Subject, of } from 'rxjs'
import { ErrorSomethingWrongComponent } from './error-something-wrong.component'

describe('ErrorSomethingWrongComponent', () => {
  let component: ErrorSomethingWrongComponent
  let route: any
  let configurationSvc: any
  let prefChangeNotifier$: Subject<any>

  const errorData = {
    mailId: 'help@example.com',
    errorImageLite: 'lite.png',
    errorImageDark: 'dark.png',
  }

  const build = (routeData: any = of({ pageData: { data: errorData } })) => {
    route = { data: routeData }
    return new ErrorSomethingWrongComponent(route, configurationSvc)
  }

  beforeEach(() => {
    prefChangeNotifier$ = new Subject<any>()
    configurationSvc = {
      isDarkMode: false,
      prefChangeNotifier: prefChangeNotifier$,
    }
    component = build()
  })

  it('should be created and read the initial dark mode flag', () => {
    expect(component).toBeTruthy()
    expect(component.isDarkMode).toBe(false)
    expect(component.errorData).toBeNull()
  })

  describe('ngOnInit', () => {
    it('populates errorData from the route data when present', () => {
      component.ngOnInit()
      expect(component.errorData).toEqual(errorData)
    })

    it('sets errorData to null when the route data payload is empty', () => {
      component = build(of({ pageData: { data: null } }))
      component.ngOnInit()
      expect(component.errorData).toBeNull()
    })

    it('does not read the route when errorData is already provided', () => {
      component = build()
      component.errorData = errorData as any
      const dataSpy = jest.spyOn(route.data, 'subscribe')
      component.ngOnInit()
      expect(dataSpy).not.toHaveBeenCalled()
    })

    it('updates isDarkMode when the preference changes (debounced)', () => {
      jest.useFakeTimers()
      component.ngOnInit()
      configurationSvc.isDarkMode = true
      prefChangeNotifier$.next(true)
      jest.advanceTimersByTime(500)
      expect(component.isDarkMode).toBe(true)
      jest.useRealTimers()
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes cleanly after init', () => {
      component.ngOnInit()
      expect(() => component.ngOnDestroy()).not.toThrow()
    })

    it('is safe when nothing was subscribed', () => {
      const c = build()
      expect(() => c.ngOnDestroy()).not.toThrow()
    })
  })
})
