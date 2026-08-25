import { ElementRef } from '@angular/core'

import { InViewPortDirective } from './in-view-port.directive'

describe('InViewPortDirective', () => {
  let directive: InViewPortDirective
  let mockNativeElement: any
  let elRef: ElementRef

  const setRect = (rect: Partial<DOMRect>) => {
    mockNativeElement.getBoundingClientRect = jest.fn(() => rect as DOMRect)
  }

  beforeEach(() => {
    mockNativeElement = {
      offsetWidth: 100,
      offsetHeight: 50,
      getBoundingClientRect: jest.fn(() => ({
        top: 10,
        bottom: 60,
        left: 10,
        right: 110,
      })),
    }
    elRef = { nativeElement: mockNativeElement } as ElementRef
    directive = new InViewPortDirective(elRef)

    // Deterministic viewport
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true, writable: true })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should create an instance', () => {
    expect(directive).toBeTruthy()
    expect(directive).toBeInstanceOf(InViewPortDirective)
  })

  describe('ngOnInit', () => {
    it('should call check and subscribe to scroll and resize', () => {
      const checkSpy = jest.spyOn(directive, 'check')
      directive.ngOnInit()
      expect(checkSpy).toHaveBeenCalled()
      expect(directive['scroll']).toBeDefined()
      expect(typeof directive['scroll'].unsubscribe).toBe('function')
      expect(directive['resize']).toBeDefined()
      expect(typeof directive['resize'].unsubscribe).toBe('function')
      directive.ngOnDestroy()
    })

    it('should re-run check when a scroll event fires (debounced)', () => {
      jest.useFakeTimers()
      directive.ngOnInit()
      const checkSpy = jest.spyOn(directive, 'check')
      window.dispatchEvent(new Event('scroll'))
      jest.advanceTimersByTime(150)
      expect(checkSpy).toHaveBeenCalled()
      directive.ngOnDestroy()
      jest.useRealTimers()
    })

    it('should re-run check when a resize event fires (debounced)', () => {
      jest.useFakeTimers()
      directive.ngOnInit()
      const checkSpy = jest.spyOn(directive, 'check')
      window.dispatchEvent(new Event('resize'))
      jest.advanceTimersByTime(150)
      expect(checkSpy).toHaveBeenCalled()
      directive.ngOnDestroy()
      jest.useRealTimers()
    })
  })

  describe('ngOnDestroy', () => {
    it('should unsubscribe from scroll and resize', () => {
      directive.ngOnInit()
      const scrollUnsub = jest.spyOn(directive['scroll'], 'unsubscribe')
      const resizeUnsub = jest.spyOn(directive['resize'], 'unsubscribe')
      directive.ngOnDestroy()
      expect(scrollUnsub).toHaveBeenCalled()
      expect(resizeUnsub).toHaveBeenCalled()
    })
  })

  describe('check', () => {
    it('should emit true when element is fully visible (both directions)', () => {
      const emitSpy = jest.spyOn(directive.inViewport, 'emit')
      setRect({ top: 10, bottom: 60, left: 10, right: 110 })
      directive.check()
      expect(emitSpy).toHaveBeenCalledWith(true)
    })

    it('should emit false when element has zero size', () => {
      mockNativeElement.offsetWidth = 0
      mockNativeElement.offsetHeight = 0
      const emitSpy = jest.spyOn(directive.inViewport, 'emit')
      directive.check()
      expect(emitSpy).toHaveBeenCalledWith(false)
    })

    it('should emit false when element is out of the vertical viewport', () => {
      const emitSpy = jest.spyOn(directive.inViewport, 'emit')
      setRect({ top: 2000, bottom: 2050, left: 10, right: 110 })
      directive.check()
      expect(emitSpy).toHaveBeenCalledWith(false)
    })

    it('should honor direction "vertical"', () => {
      const emitSpy = jest.spyOn(directive.inViewport, 'emit')
      // horizontally off-screen but vertically visible
      setRect({ top: 10, bottom: 60, left: 5000, right: 5100 })
      directive.check(true, 'vertical')
      expect(emitSpy).toHaveBeenCalledWith(true)
    })

    it('should honor direction "horizontal"', () => {
      const emitSpy = jest.spyOn(directive.inViewport, 'emit')
      // vertically off-screen but horizontally visible
      setRect({ top: 5000, bottom: 5050, left: 10, right: 110 })
      directive.check(true, 'horizontal')
      expect(emitSpy).toHaveBeenCalledWith(true)
    })

    it('should require full visibility when partial is false', () => {
      const emitSpy = jest.spyOn(directive.inViewport, 'emit')
      // top visible but bottom below viewport -> not fully visible
      setRect({ top: 10, bottom: 900, left: 10, right: 110 })
      directive.check(false)
      expect(emitSpy).toHaveBeenCalledWith(false)
    })

    it('should not emit true for an unknown direction', () => {
      const emitSpy = jest.spyOn(directive.inViewport, 'emit')
      setRect({ top: 10, bottom: 60, left: 10, right: 110 })
      directive.check(true, 'diagonal')
      expect(emitSpy).toHaveBeenCalledWith(false)
    })
  })
})
