import { Subject } from 'rxjs'

import { AuthRootComponent } from './root.component'

describe('AuthRootComponent', () => {
  let component: AuthRootComponent
  let domSanitizer: any
  let configSvc: any
  let loader: any
  let changeDetector: any
  let snackBar: any
  let changeLoad$: Subject<boolean>

  const setWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true })
  }

  beforeEach(() => {
    changeLoad$ = new Subject<boolean>()
    domSanitizer = {
      bypassSecurityTrustResourceUrl: jest.fn((url: string) => `safe:${url}`),
    }
    configSvc = {
      instanceConfig: Promise.resolve({ logos: { app: 'logo.png' } }),
    }
    loader = {
      changeLoad: changeLoad$.asObservable(),
    }
    changeDetector = {
      detectChanges: jest.fn(),
      detach: jest.fn(),
    }
    snackBar = {
      openFromComponent: jest.fn(),
    }
    component = new AuthRootComponent(domSanitizer, configSvc, loader, changeDetector, snackBar)
    setWidth(1400)
  })

  it('should create an instance with default state', () => {
    expect(component).toBeTruthy()
    expect(component.appIcon).toBeNull()
    expect(component.isLoading).toBe(false)
    expect(component.isWidthMessageShown).toBe(false)
  })

  describe('ngOnInit', () => {
    it('should subscribe to the loader and update isLoading with change detection', async () => {
      await (component as any).initialiseAsync()
      changeLoad$.next(true)
      expect(component.isLoading).toBe(true)
      expect(changeDetector.detectChanges).toHaveBeenCalled()
      changeLoad$.next(false)
      expect(component.isLoading).toBe(false)
    })

    it('should set the appIcon from the instance config logo', async () => {
      await (component as any).initialiseAsync()
      expect(domSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('logo.png')
      expect(component.appIcon).toBe('safe:logo.png')
    })

    it('should not set appIcon when instance config is missing', async () => {
      configSvc.instanceConfig = Promise.resolve(null)
      await (component as any).initialiseAsync()
      expect(component.appIcon).toBeNull()
      expect(domSanitizer.bypassSecurityTrustResourceUrl).not.toHaveBeenCalled()
    })

    it('should show the window-size snackbar for narrow viewports', async () => {
      setWidth(1000)
      await (component as any).initialiseAsync()
      expect(snackBar.openFromComponent).toHaveBeenCalledTimes(1)
      expect(component.isWidthMessageShown).toBe(true)
    })

    it('should not show the snackbar for wide viewports', async () => {
      setWidth(1400)
      await (component as any).initialiseAsync()
      expect(snackBar.openFromComponent).not.toHaveBeenCalled()
      expect(component.isWidthMessageShown).toBe(false)
    })

    it('should not show the snackbar again when already shown', async () => {
      component.isWidthMessageShown = true
      setWidth(1000)
      await (component as any).initialiseAsync()
      expect(snackBar.openFromComponent).not.toHaveBeenCalled()
    })
  })

  describe('onResize', () => {
    it('should show the snackbar when resized below the breakpoint', () => {
      component.onResize({ target: { innerWidth: 800 } })
      expect(snackBar.openFromComponent).toHaveBeenCalledTimes(1)
      expect(component.isWidthMessageShown).toBe(true)
    })

    it('should not show the snackbar when resized above the breakpoint', () => {
      component.onResize({ target: { innerWidth: 1400 } })
      expect(snackBar.openFromComponent).not.toHaveBeenCalled()
      expect(component.isWidthMessageShown).toBe(false)
    })

    it('should not show the snackbar twice on repeated narrow resizes', () => {
      component.onResize({ target: { innerWidth: 800 } })
      component.onResize({ target: { innerWidth: 700 } })
      expect(snackBar.openFromComponent).toHaveBeenCalledTimes(1)
    })
  })

  describe('ngOnDestroy', () => {
    it('should unsubscribe from the loader and detach change detection', async () => {
      await (component as any).initialiseAsync()
      const unsubSpy = jest.spyOn(component.loaderSubscription, 'unsubscribe')
      component.ngOnDestroy()
      expect(unsubSpy).toHaveBeenCalled()
      expect(changeDetector.detach).toHaveBeenCalled()
    })

    it('should detach even when there is no subscription', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
      expect(changeDetector.detach).toHaveBeenCalled()
    })
  })
})
