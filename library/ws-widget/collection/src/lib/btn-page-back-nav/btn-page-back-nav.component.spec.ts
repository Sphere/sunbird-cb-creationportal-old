import { BtnPageBackNavComponent } from './btn-page-back-nav.component'

describe('BtnPageBackNavComponent', () => {
  let component: BtnPageBackNavComponent
  let btnBackSvc: any
  let router: any

  const build = () => new BtnPageBackNavComponent(btnBackSvc, router)

  beforeEach(() => {
    btnBackSvc = {
      getLastUrl: jest.fn(() => ({ fragment: 'frag', route: '/last', queryParams: { a: '1' } })),
      checkUrl: jest.fn(),
    }
    router = { url: '/some/page' }
    component = build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('captures the present url from the router', () => {
      router.url = '/current/route'
      component.ngOnInit()
      expect(component.presentUrl).toBe('/current/route')
    })
  })

  describe('backUrl getter', () => {
    it('routes to author cbp when on the explore page', () => {
      component.presentUrl = '/page/explore'
      expect(component.backUrl).toEqual({ queryParams: undefined, routeUrl: '/author/cbp' })
    })

    it('routes to author cbp when widgetData url is home', () => {
      component.widgetData = { url: 'home' }
      expect(component.backUrl).toEqual({ queryParams: undefined, routeUrl: '/author/cbp' })
    })

    it('uses the second-to-last url for doubleBack', () => {
      component.widgetData = { url: 'doubleBack' }
      const result = component.backUrl
      expect(btnBackSvc.getLastUrl).toHaveBeenCalledWith(2)
      expect(result).toEqual({ fragment: 'frag', queryParams: { a: '1' }, routeUrl: '/last' })
    })

    it('uses the last url for back', () => {
      component.widgetData = { url: 'back' }
      const result = component.backUrl
      expect(btnBackSvc.getLastUrl).toHaveBeenCalledWith()
      expect(result).toEqual({ fragment: 'frag', queryParams: { a: '1' }, routeUrl: '/last' })
    })

    it('registers a plain url with the service and returns it as the route', () => {
      component.widgetData = { url: '/some/target' }
      const result = component.backUrl
      expect(btnBackSvc.checkUrl).toHaveBeenCalledWith('/some/target')
      expect(result).toEqual({ queryParams: undefined, routeUrl: '/some/target' })
    })

    it('falls back to author cbp when the url is falsy', () => {
      component.widgetData = { url: undefined }
      const result = component.backUrl
      expect(result).toEqual({ queryParams: undefined, routeUrl: '/author/cbp' })
    })
  })
})
