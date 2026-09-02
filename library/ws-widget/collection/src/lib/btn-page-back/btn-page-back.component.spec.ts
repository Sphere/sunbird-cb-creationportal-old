import { BtnPageBackComponent } from './btn-page-back.component'

describe('BtnPageBackComponent', () => {
  let component: BtnPageBackComponent
  let btnBackSvc: any
  let router: any
  let configSvc: any

  const build = () => new BtnPageBackComponent(btnBackSvc, router, configSvc)

  beforeEach(() => {
    btnBackSvc = {
      getLastUrl: jest.fn().mockReturnValue({
        fragment: 'frag',
        route: '/last',
        queryParams: { a: '1' },
      }),
      checkUrl: jest.fn(),
    }
    router = { url: '/some/current' }
    configSvc = { instanceConfig: undefined }

    component = build()
  })

  it('should create with defaults', () => {
    expect(component).toBeTruthy()
    expect(component.id).toBe('nav-back')
    expect(component.visible).toBe(false)
    expect(component.enablePeopleSearch).toBe(true)
    expect(component.widgetData).toEqual({ url: 'none', titles: [] })
  })

  describe('ngOnInit', () => {
    it('captures the current router url', () => {
      component.ngOnInit()
      expect(component.presentUrl).toBe('/some/current')
    })

    it('filters active hubs from the instance config', () => {
      configSvc.instanceConfig = {
        hubs: [
          { id: 'a', active: true },
          { id: 'b', active: false },
          { id: 'c', active: true },
        ],
      }
      const c = build()

      c.ngOnInit()

      expect(c.hubsList).toEqual([
        { id: 'a', active: true },
        { id: 'c', active: true },
      ])
    })

    it('handles an instance config without a hubs array', () => {
      configSvc.instanceConfig = {}
      const c = build()

      c.ngOnInit()

      expect(c.hubsList).toEqual([])
    })

    it('leaves hubsList untouched when there is no instance config', () => {
      component.ngOnInit()
      expect(component.hubsList).toBeUndefined()
    })
  })

  describe('backUrl getter', () => {
    it('routes to author cbp when on the explore page', () => {
      component.presentUrl = '/page/explore'

      expect(component.backUrl).toEqual({
        queryParams: undefined,
        routeUrl: '/author/cbp',
      })
    })

    it('routes to author cbp when widget url is home', () => {
      component.widgetData = { url: 'home' }

      expect(component.backUrl).toEqual({
        queryParams: undefined,
        routeUrl: '/author/cbp',
      })
    })

    it('uses the second-to-last url for doubleBack', () => {
      component.widgetData = { url: 'doubleBack' }

      const result = component.backUrl

      expect(btnBackSvc.getLastUrl).toHaveBeenCalledWith(2)
      expect(result).toEqual({
        fragment: 'frag',
        queryParams: { a: '1' },
        routeUrl: '/last',
      })
    })

    it('uses the last url for back', () => {
      component.widgetData = { url: 'back' }

      const result = component.backUrl

      expect(btnBackSvc.getLastUrl).toHaveBeenCalledWith()
      expect(result).toEqual({
        fragment: 'frag',
        queryParams: { a: '1' },
        routeUrl: '/last',
      })
    })

    it('registers a custom url via checkUrl and returns it', () => {
      component.widgetData = { url: '/custom/path' }

      const result = component.backUrl

      expect(btnBackSvc.checkUrl).toHaveBeenCalledWith('/custom/path')
      expect(result).toEqual({
        queryParams: undefined,
        routeUrl: '/custom/path',
      })
    })

    it('falls back to author cbp when the url is empty/none-like', () => {
      component.widgetData = { url: undefined }

      const result = component.backUrl

      expect(btnBackSvc.checkUrl).toHaveBeenCalledWith(undefined)
      expect(result).toEqual({
        queryParams: undefined,
        routeUrl: '/author/cbp',
      })
    })
  })

  describe('toggleVisibility', () => {
    it('flips the visible flag', () => {
      expect(component.visible).toBe(false)
      component.toggleVisibility()
      expect(component.visible).toBe(true)
      component.toggleVisibility()
      expect(component.visible).toBe(false)
    })
  })
})
