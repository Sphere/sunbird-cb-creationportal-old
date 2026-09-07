import { ClassChangeOnScrollDirective } from './class-change-on-scroll.directive'

// ScrollingStateEnum: ScrollingUp = 0, ScrollingDown = 1, NoScrolling = 2

describe('ClassChangeOnScrollDirective', () => {
  let directive: ClassChangeOnScrollDirective

  beforeEach(() => {
    directive = new ClassChangeOnScrollDirective()
  })

  afterEach(() => {
    directive.ngOnDestroy()
    jest.useRealTimers()
  })

  it('should create', () => {
    expect(directive).toBeTruthy()
  })

  it('should default to not scrolling', () => {
    expect(directive.isNotScrolling).toBe(true)
    expect(directive.isScrollingUp).toBe(false)
    expect(directive.isScrollingDown).toBe(false)
    expect(directive.hasScrolledDown).toBe(false)
  })

  it('setScrollState should flag scrolling down when scrolled further', () => {
    jest.useFakeTimers()
    ;(directive as any).setScrollState(0, 100)
    expect(directive.isScrollingDown).toBe(true)
    expect(directive.isScrollingUp).toBe(false)
    expect(directive.isNotScrolling).toBe(false)
  })

  it('setScrollState should flag scrolling up when scrolled back', () => {
    jest.useFakeTimers()
    ;(directive as any).setScrollState(100, 0)
    expect(directive.isScrollingUp).toBe(true)
    expect(directive.isScrollingDown).toBe(false)
  })

  it('setScrollState should flag no scrolling when unchanged', () => {
    ;(directive as any).setScrollState(50, 50)
    expect(directive.isNotScrolling).toBe(true)
  })

  it('should reset back to no-scrolling after the configured delay', () => {
    jest.useFakeTimers()
    directive.wsClassOnScrollDirChange = 1000
    ;(directive as any).setScrollState(0, 100)
    expect(directive.isScrollingDown).toBe(true)

    jest.advanceTimersByTime(1000)
    expect(directive.isNotScrolling).toBe(true)
  })

  it('should fall back to a 5000ms reset delay when input is 0', () => {
    jest.useFakeTimers()
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout')
    directive.wsClassOnScrollDirChange = 0
    ;(directive as any).setScrollState(0, 100)
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000)
  })

  it('ngOnInit should react to window scroll events', () => {
    jest.useFakeTimers()
    directive.ngOnInit()

    Object.defineProperty(window, 'scrollY', { value: 120, configurable: true })
    window.dispatchEvent(new Event('scroll'))
    jest.advanceTimersByTime(50)

    expect(directive.hasScrolledDown).toBe(true)
    expect(directive.isScrollingDown).toBe(true)
  })

  it('ngOnInit should not flag scrolled-down for small offsets', () => {
    jest.useFakeTimers()
    directive.ngOnInit()

    Object.defineProperty(window, 'scrollY', { value: 10, configurable: true })
    window.dispatchEvent(new Event('scroll'))
    jest.advanceTimersByTime(50)

    expect(directive.hasScrolledDown).toBe(false)
  })

  it('ngAfterViewInit should be a no-op and not throw', () => {
    expect(() => directive.ngAfterViewInit()).not.toThrow()
  })

  it('ngOnDestroy should unsubscribe the scroll subscription', () => {
    directive.ngOnInit()
    const sub = (directive as any).windowScrollSubscription
    const spy = jest.spyOn(sub, 'unsubscribe')
    directive.ngOnDestroy()
    expect(spy).toHaveBeenCalled()
  })

  it('ngOnDestroy should be safe when never initialised', () => {
    const fresh = new ClassChangeOnScrollDirective()
    expect(() => fresh.ngOnDestroy()).not.toThrow()
  })
})
