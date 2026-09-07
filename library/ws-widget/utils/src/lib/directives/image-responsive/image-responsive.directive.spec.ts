import { of } from 'rxjs'
import { ImageResponsiveDirective } from './image-responsive.directive'

const BP = {
  xs: '(max-width: 450px)',
  s: '(min-width: 450.001px) and (max-width: 768px)',
  m: '(min-width: 768.001px) and (max-width: 1024px)',
  l: '(min-width: 1024.001px) and (max-width: 1400px)',
  xl: '(min-width: 1400.001px) and (max-width: 1920px)',
  xxl: '(min-width: 1920.001px)',
}

const allFalse = () => ({
  [BP.xs]: false,
  [BP.s]: false,
  [BP.m]: false,
  [BP.l]: false,
  [BP.xl]: false,
  [BP.xxl]: false,
})

describe('ImageResponsiveDirective', () => {
  let breakpointObserver: any

  const observeWith = (active: string | null) => {
    const breakpoints = allFalse()
    if (active) {
      breakpoints[(BP as any)[active]] = true
    }
    breakpointObserver = { observe: jest.fn().mockReturnValue(of({ breakpoints, matches: !!active })) }
  }

  const src = {
    xs: 'img-xs.png',
    s: 'img-s.png',
    m: 'img-m.png',
    l: 'img-l.png',
    xl: 'img-xl.png',
    xxl: 'img-xxl.png',
  }

  it('subscribes on construction and maps xxl breakpoint', () => {
    observeWith('xxl')
    const d = new ImageResponsiveDirective(breakpointObserver)
    d.src = src
    // re-run setSrc now that src is set (constructor ran before src assigned)
    d.ngOnChanges()
    expect(breakpointObserver.observe).toHaveBeenCalled()
    expect(d.currentSize).toBe('xxl')
    expect(d.srcBindUrl).toBe('img-xxl.png')
  })

  it.each([
    ['xl', 'img-xl.png'],
    ['l', 'img-l.png'],
    ['m', 'img-m.png'],
    ['s', 'img-s.png'],
    ['xs', 'img-xs.png'],
  ])('maps %s breakpoint to its src', (size, expected) => {
    observeWith(size)
    const d = new ImageResponsiveDirective(breakpointObserver)
    d.src = src
    d.ngOnChanges()
    expect(d.currentSize).toBe(size)
    expect(d.srcBindUrl).toBe(expected)
  })

  it('defaults to xl when no breakpoint matches', () => {
    observeWith(null)
    const d = new ImageResponsiveDirective(breakpointObserver)
    expect(d.currentSize).toBe('xl')
  })

  it('ngOnChanges does nothing when src is null', () => {
    observeWith(null)
    const d = new ImageResponsiveDirective(breakpointObserver)
    d.srcBindUrl = 'unchanged'
    d.src = null
    d.ngOnChanges()
    expect(d.srcBindUrl).toBe('unchanged')
  })

  it('setSrc leaves srcBindUrl empty when the size key is missing', () => {
    observeWith('m')
    const d = new ImageResponsiveDirective(breakpointObserver)
    // src has no 'm' key
    d.src = { xl: 'only-xl.png' }
    d.ngOnChanges()
    expect(d.srcBindUrl).toBe('')
  })

  it('ngOnDestroy unsubscribes the breakpoint subscription', () => {
    observeWith('xl')
    const d = new ImageResponsiveDirective(breakpointObserver)
    const unsub = jest.spyOn(d.breakpointSubscription as any, 'unsubscribe')
    d.ngOnDestroy()
    expect(unsub).toHaveBeenCalled()
  })

  it('ngOnDestroy is safe when there is no subscription', () => {
    observeWith('xl')
    const d = new ImageResponsiveDirective(breakpointObserver)
    d.breakpointSubscription = null
    expect(() => d.ngOnDestroy()).not.toThrow()
  })
})
