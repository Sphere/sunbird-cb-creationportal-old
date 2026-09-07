import { HorizontalScrollerComponent } from './horizontal-scroller.component'

describe('HorizontalScrollerComponent', () => {
  let component: HorizontalScrollerComponent

  const makeNativeElem = (over: Partial<HTMLElement> = {}) => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    scrollTo: jest.fn(),
    scrollLeft: 0,
    clientWidth: 500,
    scrollWidth: 500,
    ...over,
  })

  beforeEach(() => {
    component = new HorizontalScrollerComponent()
  })

  it('should create with defaults', () => {
    expect(component).toBeTruthy()
    expect(component.loadStatus).toBe('none')
    expect(component.onHover).toBe(false)
    expect(component.enablePrev).toBe(false)
    expect(component.enableNext).toBe(false)
  })

  describe('ngOnInit', () => {
    it('does nothing when there is no scroll element', () => {
      component.horizontalScrollElem = null
      expect(() => component.ngOnInit()).not.toThrow()
    })

    it('registers a scroll listener when the element is present', () => {
      const nativeElement = makeNativeElem()
      component.horizontalScrollElem = { nativeElement } as any

      component.ngOnInit()

      expect(nativeElement.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), undefined)
    })
  })

  describe('ngOnChanges', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('updates navigation button status after the debounce timer', () => {
      const nativeElement = makeNativeElem({ scrollLeft: 10 })
      component.horizontalScrollElem = { nativeElement } as any

      component.ngOnChanges()
      jest.advanceTimersByTime(100)

      expect(component.enablePrev).toBe(true)
    })

    it('is safe when there is no scroll element', () => {
      component.horizontalScrollElem = null
      component.ngOnChanges()
      expect(() => jest.advanceTimersByTime(100)).not.toThrow()
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes an active scroll observer', () => {
      const nativeElement = makeNativeElem()
      component.horizontalScrollElem = { nativeElement } as any
      component.ngOnInit()

      expect(() => component.ngOnDestroy()).not.toThrow()
      expect(nativeElement.removeEventListener).toHaveBeenCalled()
    })

    it('is safe when nothing was subscribed', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })

  describe('showPrev', () => {
    it('scrolls left by one client width', () => {
      const nativeElement = makeNativeElem({ scrollLeft: 800, clientWidth: 300 })
      component.horizontalScrollElem = { nativeElement } as any

      component.showPrev()

      expect(nativeElement.scrollTo).toHaveBeenCalledWith({
        left: 500,
        behavior: 'smooth',
      })
    })

    it('does nothing without a scroll element', () => {
      component.horizontalScrollElem = null
      expect(() => component.showPrev()).not.toThrow()
    })
  })

  describe('showNext', () => {
    it('scrolls right by one client width', () => {
      const nativeElement = makeNativeElem({ scrollLeft: 100, clientWidth: 300 })
      component.horizontalScrollElem = { nativeElement } as any

      component.showNext()

      expect(nativeElement.scrollTo).toHaveBeenCalledWith({
        left: 400,
        behavior: 'smooth',
      })
    })

    it('does nothing without a scroll element', () => {
      component.horizontalScrollElem = null
      expect(() => component.showNext()).not.toThrow()
    })
  })

  describe('updateNavigationBtnStatus', () => {
    const call = (elem: any) => (component as any).updateNavigationBtnStatus(elem)

    it('disables prev when scrolled fully to the left', () => {
      call({ scrollLeft: 0, clientWidth: 500, scrollWidth: 1000 })

      expect(component.enablePrev).toBe(false)
      expect(component.enableNext).toBe(true)
    })

    it('enables both when in the middle of the scroll region', () => {
      call({ scrollLeft: 100, clientWidth: 500, scrollWidth: 1000 })

      expect(component.enablePrev).toBe(true)
      expect(component.enableNext).toBe(true)
    })

    it('disables next when at the end with no more to load', () => {
      component.loadStatus = 'none'
      call({ scrollLeft: 500, clientWidth: 500, scrollWidth: 1000 })

      expect(component.enableNext).toBe(false)
    })

    it('emits loadNext when at the end and more content is available', () => {
      component.loadStatus = 'hasMore'
      const emitSpy = jest.spyOn(component.loadNext, 'emit')

      call({ scrollLeft: 500, clientWidth: 500, scrollWidth: 1000 })

      expect(emitSpy).toHaveBeenCalled()
      expect(component.enableNext).toBe(true)
    })
  })
})
