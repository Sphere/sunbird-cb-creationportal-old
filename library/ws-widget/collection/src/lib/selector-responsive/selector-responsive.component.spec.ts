import { of } from 'rxjs'

import { SelectorResponsiveComponent } from './selector-responsive.component'

describe('SelectorResponsiveComponent', () => {
  let breakpointObserver: any

  const makeComponent = () => new SelectorResponsiveComponent(breakpointObserver)

  const widgetA: any = { widgetType: 'card', widgetData: { a: 1 } }
  const widgetB: any = { widgetType: 'card', widgetData: { b: 2 } }

  beforeEach(() => {
    breakpointObserver = {
      observe: jest.fn().mockReturnValue(of({ matches: false, breakpoints: {} })),
    }
  })

  it('should create with default state', () => {
    const component = makeComponent()
    expect(component).toBeTruthy()
    expect(component.widgetData).toBeNull()
    expect(component.activeWidget).toBeNull()
  })

  it('ngOnInit should do nothing when widgetData is null', () => {
    const component = makeComponent()
    component.widgetData = null
    component.ngOnInit()
    expect(breakpointObserver.observe).not.toHaveBeenCalled()
    expect(component.activeWidget).toBeNull()
  })

  it('ngOnInit should build media queries from min/max width and observe them', () => {
    const component = makeComponent()
    component.widgetData = {
      selectFrom: [
        { minWidth: 600, maxWidth: 1024, widget: widgetA },
        { minWidth: 1025, maxWidth: 0, widget: widgetB },
      ],
    } as any
    component.ngOnInit()

    expect(breakpointObserver.observe).toHaveBeenCalledWith(['(min-width:600px) and (max-width:1024px)', '(min-width:1025px)'])
  })

  it('ngOnInit should set activeWidget for the matching breakpoint index', () => {
    const query = '(min-width:600px) and (max-width:1024px)'
    breakpointObserver.observe.mockReturnValue(of({ matches: true, breakpoints: { [query]: true } }))
    const component = makeComponent()
    component.widgetData = {
      selectFrom: [{ minWidth: 600, maxWidth: 1024, widget: widgetA }],
    } as any
    component.ngOnInit()

    expect(component.activeWidget).toBe(widgetA)
  })

  it('ngOnInit should leave activeWidget null when nothing matches', () => {
    breakpointObserver.observe.mockReturnValue(of({ matches: false, breakpoints: {} }))
    const component = makeComponent()
    component.widgetData = {
      selectFrom: [{ minWidth: 600, maxWidth: 1024, widget: widgetA }],
    } as any
    component.ngOnInit()

    expect(component.activeWidget).toBeNull()
  })

  it('should build a max-width-only query when minWidth is absent', () => {
    const component = makeComponent()
    component.widgetData = {
      selectFrom: [{ minWidth: 0, maxWidth: 599, widget: widgetA }],
    } as any
    component.ngOnInit()

    expect(breakpointObserver.observe).toHaveBeenCalledWith(['(max-width:599px)'])
  })
})
