import { WidgetResolverService } from './widget-resolver.service'
import { RestrictedComponent } from './restricted/restricted.component'
import { UnresolvedComponent } from './unresolved/unresolved.component'

class FakeWidgetComponent {}

describe('WidgetResolverService', () => {
  let domSanitizer: any
  let containerRef: { clear: jest.Mock; createComponent: jest.Mock }
  const globalConfig: any = [{ widgetType: 'card', widgetSubType: 'content', component: FakeWidgetComponent }]

  const makeSvc = (scoped: any = null) => new WidgetResolverService(domSanitizer, globalConfig, scoped)

  beforeEach(() => {
    domSanitizer = { bypassSecurityTrustStyle: jest.fn((s: string) => s) }
    containerRef = { clear: jest.fn(), createComponent: jest.fn(() => ({ instance: {} })) }
  })

  it('getWidgetKey builds the composite key', () => {
    expect(WidgetResolverService.getWidgetKey({ widgetType: 'a', widgetSubType: 'b' } as any)).toBe('widget:a::b')
  })

  it('initialize registers global widgets and marks initialized', () => {
    const svc = makeSvc()
    svc.initialize(null, null, null, null)
    expect(svc.isInitialized).toBe(true)
  })

  it('resolveWidget renders the registered component for a known key', () => {
    const svc = makeSvc()
    svc.initialize(null, null, null, null)
    svc.resolveWidget({ widgetType: 'card', widgetSubType: 'content', widgetData: { x: 1 } } as any, containerRef as any)
    expect(containerRef.clear).toHaveBeenCalled()
    expect(containerRef.createComponent).toHaveBeenCalledWith(FakeWidgetComponent)
  })

  it('resolveWidget renders RestrictedComponent for a restricted key', () => {
    const svc = makeSvc()
    svc.initialize(new Set(['widget:card::content']), null, null, null)
    svc.resolveWidget({ widgetType: 'card', widgetSubType: 'content', widgetData: {} } as any, containerRef as any)
    expect(containerRef.createComponent).toHaveBeenCalledWith(RestrictedComponent)
  })

  it('resolveWidget renders UnresolvedComponent for an unknown key', () => {
    const svc = makeSvc()
    svc.initialize(null, null, null, null)
    svc.resolveWidget({ widgetType: 'nope', widgetSubType: 'x', widgetData: {} } as any, containerRef as any)
    expect(containerRef.createComponent).toHaveBeenCalledWith(UnresolvedComponent)
  })

  it('sets widgetData on the created component instance', () => {
    const instance: any = {}
    containerRef.createComponent.mockReturnValue({ instance })
    const svc = makeSvc()
    svc.initialize(null, null, null, null)
    svc.resolveWidget({ widgetType: 'card', widgetSubType: 'content', widgetData: { hello: 'world' } } as any, containerRef as any)
    expect(instance.widgetData).toEqual({ hello: 'world' })
  })
})
