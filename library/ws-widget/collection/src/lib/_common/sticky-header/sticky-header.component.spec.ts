import { StickyHeaderComponent } from './sticky-header.component'

describe('StickyHeaderComponent', () => {
  let component: StickyHeaderComponent

  beforeEach(() => {
    component = new StickyHeaderComponent()
  })

  it('should create an instance', () => {
    expect(component).toBeTruthy()
    expect(component).toBeInstanceOf(StickyHeaderComponent)
  })

  it('should implement ngAfterViewInit without throwing', () => {
    expect(() => component.ngAfterViewInit()).not.toThrow()
  })

  it('should return undefined from ngAfterViewInit (no-op body)', () => {
    expect(component.ngAfterViewInit()).toBeUndefined()
  })
})
